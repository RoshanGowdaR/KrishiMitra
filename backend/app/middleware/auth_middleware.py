from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_supabase_client

security = HTTPBearer(auto_error=False)


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
        return user

    # Allow first-login users without a profile row yet.
    return {
        'id': user_id,
        'email': user_email,
        'name': None,
        'state': None,
        'district': None,
        'taluk': None,
        'village': None,
        'preferred_language': None,
    }
