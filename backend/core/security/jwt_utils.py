"""
PhishLens Agent — JWT Security Utilities.

Handles:
- JWT token generation with user claims and expiration
- Cryptographic signature validation
- Token decoding and error handling
"""

import os
import time
from typing import Any, Dict, Optional, Tuple

import jwt
from django.conf import settings
from django.contrib.auth.models import User


def get_jwt_secret() -> str:
    """Retrieves configured JWT secret key."""
    return (
        getattr(settings, "JWT_SECRET", None)
        or os.getenv("JWT_SECRET")
        or getattr(settings, "SECRET_KEY", "phishlens-secure-jwt-secret-key")
    )


def get_jwt_algorithm() -> str:
    """Retrieves configured JWT signing algorithm."""
    return (
        getattr(settings, "JWT_ALGORITHM", None)
        or os.getenv("JWT_ALGORITHM", "HS256")
    )


def get_jwt_expiry_seconds() -> int:
    """Retrieves token lifespan in seconds (default 24h)."""
    try:
        hours = (
            getattr(settings, "JWT_EXPIRY_HOURS", None)
            or int(os.getenv("JWT_EXPIRY_HOURS", "24"))
        )
        return int(hours) * 3600
    except (ValueError, TypeError):
        return 24 * 3600


def generate_jwt_token(user: User, picture: Optional[str] = None) -> str:
    """
    Issues a cryptographically signed JWT token for a Django user.
    """
    now = int(time.time())
    expiry = now + get_jwt_expiry_seconds()
    name = f"{user.first_name} {user.last_name}".strip() or user.username

    payload = {
        "sub": str(user.id),
        "user_id": user.id,
        "email": user.email or user.username,
        "name": name,
        "picture": picture or "",
        "iat": now,
        "exp": expiry,
        "iss": "phishlens-api",
    }

    token = jwt.encode(
        payload,
        get_jwt_secret(),
        algorithm=get_jwt_algorithm(),
    )
    # PyJWT >= 2.0 returns str directly
    return token if isinstance(token, str) else token.decode("utf-8")


def decode_jwt_token(token: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Validates and decodes a JWT token.

    Returns:
        (payload, None) if token is valid.
        (None, error_message) if token is invalid or expired.
    """
    if not token:
        return None, "No token provided"

    # Strip 'Bearer ' prefix if present
    if token.startswith("Bearer ") or token.startswith("bearer "):
        token = token.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(
            token,
            get_jwt_secret(),
            algorithms=[get_jwt_algorithm()],
            options={"require": ["exp", "iat", "sub"]},
        )
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError as e:
        return None, f"Invalid token: {str(e)}"
    except Exception as e:
        return None, f"Token decode error: {str(e)}"
