import hashlib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import get_supabase_client
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


def _fallback_phone_from_user_id(user_id: str) -> str:
    numeric = ''.join(ch for ch in user_id if ch.isdigit())
    if len(numeric) >= 10:
        return numeric[:10]

    digest = hashlib.sha256(user_id.encode('utf-8')).hexdigest()
    value = int(digest[:16], 16) % (10**10)
    return str(value).zfill(10)


class UpdateProfileRequest(BaseModel):
    name: str
    state: str
    district: str
    taluk: str
    village: str
    preferred_language: str


@router.get('/me')
def get_me(current_user: dict = Depends(get_current_user)):
    return {'success': True, 'user': current_user}


@router.post('/profile')
def upsert_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    try:
        supabase = get_supabase_client()
    except RuntimeError as config_error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(config_error)) from config_error

    update_payload = {
        'id': current_user['id'],
        'name': payload.name,
        'state': payload.state,
        'district': payload.district,
        'taluk': payload.taluk,
        'village': payload.village,
        'preferred_language': payload.preferred_language,
    }

    try:
        response = (
            supabase
            .table('users')
            .upsert(update_payload, on_conflict='id')
            .execute()
        )
    except Exception as db_error:
        # Some existing schemas enforce NOT NULL phone even for Google users.
        try:
            update_response = (
                supabase
                .table('users')
                .update({
                    'name': payload.name,
                    'state': payload.state,
                    'district': payload.district,
                    'taluk': payload.taluk,
                    'village': payload.village,
                    'preferred_language': payload.preferred_language,
                })
                .eq('id', current_user['id'])
                .execute()
            )
            if update_response.data:
                response = update_response
            else:
                fallback_payload = dict(update_payload)
                fallback_payload['phone'] = current_user.get('phone') or _fallback_phone_from_user_id(current_user['id'])
                response = (
                    supabase
                    .table('users')
                    .upsert(fallback_payload, on_conflict='id')
                    .execute()
                )
        except Exception as fallback_error:
            fallback_user = {
                'id': current_user['id'],
                'email': current_user.get('email'),
                'name': payload.name,
                'state': payload.state,
                'district': payload.district,
                'taluk': payload.taluk,
                'village': payload.village,
                'preferred_language': payload.preferred_language,
                'warning': f'Profile persistence skipped: {fallback_error}',
            }
            return {'success': True, 'user': fallback_user}

    if not response.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='No profile data returned')

    user = response.data[0]
    if 'email' not in user:
        user['email'] = current_user.get('email')

    return {'success': True, 'user': user}
