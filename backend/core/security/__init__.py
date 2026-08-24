"""
PhishLens Agent — Core Security Layer.
"""

from backend.core.security.jwt_utils import (
    get_jwt_secret,
    get_jwt_algorithm,
    get_jwt_expiry_seconds,
    generate_jwt_token,
    decode_jwt_token,
)
from backend.core.security.oauth import (
    verify_google_id_token,
    get_or_create_google_user,
)
from backend.core.security.password_validation import (
    validate_password_strength,
    validate_email_address,
)

__all__ = [
    "get_jwt_secret",
    "get_jwt_algorithm",
    "get_jwt_expiry_seconds",
    "generate_jwt_token",
    "decode_jwt_token",
    "verify_google_id_token",
    "get_or_create_google_user",
    "validate_password_strength",
    "validate_email_address",
]
