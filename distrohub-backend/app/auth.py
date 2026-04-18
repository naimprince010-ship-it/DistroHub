import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import db
from app.models import UserRole

JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "distrohub_super_secret_key_123456789")
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

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
            options=JWT_DECODE_OPTIONS,
        )
        return payload
    except JWTError:
        return None


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
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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
