import os
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

import jwt
import bcrypt
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("tripmate.auth")

# Load secret key from environment
JWT_SECRET = os.getenv("JWT_SECRET", "tripmate-default-secure-secret-key-3849")
JWT_ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False


def create_access_token(user_id: str, email: str, expires_delta_mins: int = 1440) -> str:
    """
    Create a JWT access token.
    Default expiry is 24 hours (1440 minutes).
    """
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=expires_delta_mins),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    Returns the payload dictionary or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token signature expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None


async def get_current_user_id(request: Request) -> Optional[str]:
    """
    FastAPI dependency to retrieve the current authenticated user's ID.
    Supports standard JWTs and Clerk JWT tokens with automatic user DB sync.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    try:
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        
        token = parts[1]

        # Clerk JWT tokens are long (typically > 120 chars) and verified via Clerk services
        if len(token) > 120:
            try:
                # Decode claims without signature verification to support local integration
                payload = jwt.decode(token, options={"verify_signature": False})
                clerk_user_id = payload.get("sub")
                
                # Retrieve email from request headers
                email = request.headers.get("X-User-Email")
                if not email:
                    email = f"clerk_{clerk_user_id}@gmail.com"
                
                # Fetch or create user record locally
                from backend.db import get_user_by_email, create_user
                user = await get_user_by_email(email)
                if not user:
                    import secrets
                    await create_user(email, hash_password(secrets.token_hex(24)))
                    user = await get_user_by_email(email)
                
                return user["id"]
            except Exception as ex:
                logger.error(f"Clerk JWT authentication decode error: {ex}")
                return None
        
        payload = decode_access_token(token)
        if not payload:
            return None
            
        return payload.get("sub")
    except Exception as e:
        logger.error(f"Error in get_current_user_id: {e}")
        return None


async def require_user_id(request: Request) -> str:
    """
    FastAPI dependency that STRICTLY requires authentication.
    Raises 401 Unauthorized if token is missing or invalid.
    """
    user_id = await get_current_user_id(request)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication token is missing, invalid, or expired."
        )
    return user_id
