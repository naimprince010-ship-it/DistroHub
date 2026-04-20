import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import db
from app.models import UserRole

_jwt_secret_from_env = os.environ.get("JWT_SECRET_KEY")
if not _jwt_secret_from_env:
    import logging as _logging
    _logging.getLogger(__name__).warning(
        "[AUTH] WARNING: JWT_SECRET_KEY env var not set! Using insecure fallback key. "
        "Set JWT_SECRET_KEY in production environment variables."
    )
else:
    # Safely log that we found a secret and its prefix to help owner verify configuration
    print(f"[AUTH] JWT_SECRET_KEY loaded (Prefix: {_jwt_secret_from_env[:4]}... Length: {len(_jwt_secret_from_env)})")

JWT_SECRET = _jwt_secret_from_env or "distrohub_super_secret_key_123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
# Clock skew between client and server (serverless / devices) — reduces spurious exp failures
JWT_DECODE_OPTIONS = {"leeway": 120}

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """
    Verify and decode JWT token.
    Returns payload if valid, raises HTTPException if invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
            options=JWT_DECODE_OPTIONS,
        )
        return payload
    except jwt.ExpiredSignatureError:
        print("[AUTH] Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTClaimsError:
        print("[AUTH] Invalid token claims")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session attributes. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        print(f"[AUTH] JWT Verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"[AUTH] Unexpected error during token verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication process failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _normalize_role(raw) -> UserRole:
    """Avoid ValueError on DB values like 'Admin' / unexpected strings."""
    if raw is None:
        return UserRole.SALES_REP
    s = str(raw).strip().lower()
    if s == UserRole.ADMIN.value:
        return UserRole.ADMIN
    if s == UserRole.SALES_REP.value:
        return UserRole.SALES_REP
    return UserRole.SALES_REP

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # verify_token now raises HTTPException internally on error
    payload = verify_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Support both InMemoryDatabase and SupabaseDatabase
    if hasattr(db, 'users'):
        # InMemoryDatabase
        user = db.users.get(user_id)
    else:
        # SupabaseDatabase - get user by ID
        try:
            result = db.client.table("users").select("*").eq("id", user_id).execute()
            user = result.data[0] if result.data else None
            if user:
                user["role"] = _normalize_role(user.get("role"))
        except Exception as e:
            # Transient DB/network errors must NOT return 401 (frontend clears session on 401)
            print(f"[AUTH] Error fetching user from Supabase: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database temporarily unavailable. Please retry.",
            )
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user
