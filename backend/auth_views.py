"""
PhishLens Agent — Backward Compatibility Layer for Auth Views & Security.
Re-exports from backend.core.security, backend.core.middleware, and backend.apps.authentication.
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
    verify_google_access_token,
    get_or_create_google_user,
)
from backend.core.security.password_validation import (
    validate_password_strength,
    validate_email_address,
)
from backend.core.middleware.jwt_auth import (
    jwt_required,
    optional_jwt,
    JWTAuthenticationMiddleware,
)
from backend.apps.authentication.views import (
    google_auth_view,
    current_user_view,
    email_login_view,
    email_register_view,
    update_profile_view,
    change_password_view,
    logout_view,
)
from backend.apps.authentication.services import AuthService

__all__ = [
    "get_jwt_secret",
    "get_jwt_algorithm",
    "get_jwt_expiry_seconds",
    "generate_jwt_token",
    "decode_jwt_token",
    "verify_google_id_token",
    "verify_google_access_token",
    "get_or_create_google_user",
    "validate_password_strength",
    "validate_email_address",
    "jwt_required",
    "optional_jwt",
    "JWTAuthenticationMiddleware",
    "google_auth_view",
    "current_user_view",
    "email_login_view",
    "email_register_view",
    "update_profile_view",
    "change_password_view",
    "logout_view",
    "AuthService",
]
