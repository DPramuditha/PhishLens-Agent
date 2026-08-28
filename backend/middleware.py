"""
PhishLens Agent — Backward Compatibility Layer for Middleware.
Re-exports from backend.core.middleware.
"""

from backend.core.middleware.jwt_auth import (
    JWTAuthenticationMiddleware,
    jwt_required,
    optional_jwt,
)
from backend.core.middleware.cors import CORSMiddleware
from backend.core.middleware.rate_limit import RateLimitMiddleware
from backend.core.middleware.request_logging import RequestLoggingMiddleware

__all__ = [
    "JWTAuthenticationMiddleware",
    "CORSMiddleware",
    "RateLimitMiddleware",
    "RequestLoggingMiddleware",
    "jwt_required",
    "optional_jwt",
]
