import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_supabase_client

security = HTTPBearer(auto_error=False)

ADMIN_EMAILS = {"gowdaroshan49@gmail.com"}


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
    return any(token in message for token in ["user_uid", "role", "account_status", "profile_photo_url"])


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials or credentials.scheme.lower() != 'bearer':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing or invalid token')

    token = credentials.credentials
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.get_user(jwt=token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid Supabase token') from exc

    auth_user = getattr(auth_response, 'user', None)
    if not auth_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found for token')

    user_id = getattr(auth_user, 'id', None)
    user_email = getattr(auth_user, 'email', None)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token payload')

    try:
        response = (
            supabase
            .table('users')
            .select('id, user_uid, name, state, district, taluk, village, preferred_language, role, profile_photo_url, account_status')
            .eq('id', user_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        if not _is_missing_social_columns_error(exc):
            raise

        # Legacy schema fallback while social migration is pending.
        response = (
            supabase
            .table('users')
            .select('id, name, state, district, taluk, village, preferred_language')
            .eq('id', user_id)
            .limit(1)
            .execute()
        )

    if response.data:
        user = response.data[0]
        if 'email' not in user:
            user['email'] = user_email
        if not user.get('user_uid'):
            user['user_uid'] = _build_uid(user_id)
        if user_email in ADMIN_EMAILS:
            user['role'] = 'admin'
        user['role'] = user.get('role') or 'farmer'
        user['profile_photo_url'] = user.get('profile_photo_url')
        user['account_status'] = user.get('account_status') or 'active'

        if user['account_status'] in {'suspended', 'blocked'}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is {user['account_status']}. Contact admin.",
            )
        return user

    # Allow first-login users without a profile row yet.
    return {
        'id': user_id,
        'user_uid': _build_uid(user_id),
        'email': user_email,
        'name': None,
        'state': None,
        'district': None,
        'taluk': None,
        'village': None,
        'preferred_language': None,
        'role': 'admin' if user_email in ADMIN_EMAILS else 'farmer',
        'profile_photo_url': None,
        'account_status': 'active',
    }
