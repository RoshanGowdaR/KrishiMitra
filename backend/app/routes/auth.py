import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import get_supabase_client
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


def _build_uid(user_id: str) -> str:
    digest = hashlib.sha1(user_id.encode("utf-8")).hexdigest()[:10].upper()
    return f"KM{digest}"


def _is_missing_social_columns_error(exc: Exception) -> bool:
    message = str(exc).lower()
    has_missing_signal = (
        "does not exist" in message
        or "could not find" in message
        or "schema cache" in message
    )
    if not has_missing_signal:
        return False
    return any(token in message for token in ["user_uid", "role", "account_status", "profile_photo_url", "updated_at"])


def _legacy_profile_payload(payload: "UpdateProfileRequest", current_user: dict) -> dict:
    return {
        'id': current_user['id'],
        'name': payload.name,
        'state': payload.state,
        'district': payload.district,
        'taluk': payload.taluk,
        'village': payload.village,
        'preferred_language': payload.preferred_language,
    }


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
    profile_photo_url: str | None = None


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
        'user_uid': current_user.get('user_uid') or _build_uid(current_user['id']),
        'name': payload.name,
        'state': payload.state,
        'district': payload.district,
        'taluk': payload.taluk,
        'village': payload.village,
        'preferred_language': payload.preferred_language,
        'profile_photo_url': payload.profile_photo_url,
        'role': current_user.get('role') or 'farmer',
        'account_status': current_user.get('account_status') or 'active',
        'updated_at': datetime.utcnow().isoformat() + 'Z',
    }

    try:
        response = (
            supabase
            .table('users')
            .upsert(update_payload, on_conflict='id')
            .execute()
        )
    except Exception as upsert_error:
        if _is_missing_social_columns_error(upsert_error):
            response = (
                supabase
                .table('users')
                .upsert(_legacy_profile_payload(payload, current_user), on_conflict='id')
                .execute()
            )
        else:
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
                        'profile_photo_url': payload.profile_photo_url,
                        'updated_at': datetime.utcnow().isoformat() + 'Z',
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


@router.post('/update-profile')
def update_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    return upsert_profile(payload=payload, current_user=current_user)
