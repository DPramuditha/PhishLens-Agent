"""
PhishLens Agent — JWT Authentication Middleware & Route Protection Decorators.

Provides:
1. `JWTAuthenticationMiddleware`: Attaches authenticated Django User to `request.user`
   from Authorization header (`Bearer <token>`) or `jwt_token` cookie.
2. `@jwt_required`: View decorator strictly requiring valid JWT.
3. `@optional_jwt`: View decorator populating user if valid token present, but allowing guests.
"""

from functools import wraps
from typing import Callable

from django.contrib.auth.models import AnonymousUser, User
from django.http import HttpRequest, HttpResponse, JsonResponse

from backend.core.security.jwt_utils import decode_jwt_token
from backend.core.utils.responses import api_unauthorized


class JWTAuthenticationMiddleware:
    """
    Global Django Middleware for JWT Authentication.

    Inspects incoming requests for:
    1. `Authorization: Bearer <token>` header
    2. `jwt_token` cookie
    3. `access_token` query parameter (optional fallback)

    Decodes claims and populates:
    - `request.user`: Authenticated Django User object or `AnonymousUser()`
    - `request.token_payload`: Dict of token claims or `None`
    - `request.auth_error`: String error if token was malformed/expired or `None`
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        token = self._extract_token(request)

        request.token_payload = None
        request.auth_error = None

        if token:
            payload, err = decode_jwt_token(token)
            if payload:
                request.token_payload = payload
                user_id = payload.get("user_id") or payload.get("sub")
                email = payload.get("email")

                user = None
                if user_id:
                    try:
                        user = User.objects.filter(id=int(user_id)).first()
                    except (ValueError, TypeError):
                        pass

                if not user and email:
                    user = User.objects.filter(email=email).first()
                if not user and email:
                    user = User.objects.filter(username=email).first()

                if user and user.is_active:
                    request.user = user
                else:
                    # Anonymous or inactive user
                    request.user = AnonymousUser()
                    request.auth_error = "User not found or inactive"
            else:
                request.user = AnonymousUser()
                request.auth_error = err or "Invalid or expired token"
        else:
            if not hasattr(request, "user") or request.user is None:
                request.user = AnonymousUser()

        response = self.get_response(request)
        return response

    @staticmethod
    def _extract_token(request: HttpRequest) -> str:
        """Extracts JWT token from Authorization header or cookies."""
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ["bearer", "jwt"]:
                return parts[1]
            elif len(parts) == 1:
                return parts[0]

        # Cookie fallback
        token = request.COOKIES.get("jwt_token") or request.COOKIES.get("access_token")
        if token:
            return token

        return ""


def jwt_required(view_func: Callable) -> Callable:
    """
    Decorator for views that strictly require a valid JWT token.
    Returns 401 Unauthorized if user is not authenticated.
    """
    @wraps(view_func)
    def wrapper(request: HttpRequest, *args, **kwargs) -> HttpResponse:
        # Check if middleware already authenticated the user
        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            return view_func(request, *args, **kwargs)

        # Fallback explicit token verification if middleware was bypassed
        auth_error = getattr(request, "auth_error", None)
        token = JWTAuthenticationMiddleware._extract_token(request)
        if not token:
            return api_unauthorized("Authorization header missing or malformed. Expected 'Bearer <token>'.")

        payload, err = decode_jwt_token(token)
        if not payload or err:
            return api_unauthorized(f"Invalid or expired token: {err or auth_error or 'Signature verification failed'}")

        # Set user if found
        user_id = payload.get("user_id") or payload.get("sub")
        email = payload.get("email")
        user = User.objects.filter(id=user_id).first() if user_id else None
        if not user and email:
            user = User.objects.filter(email=email).first()

        if not user or not user.is_active:
            return api_unauthorized("User account associated with this token is invalid or inactive.")

        request.user = user
        request.token_payload = payload
        return view_func(request, *args, **kwargs)

    return wrapper


def optional_jwt(view_func: Callable) -> Callable:
    """
    Decorator for views that can optionally accept a JWT token (e.g. Guest scans).
    If a valid token is present, request.user is set to that User; otherwise AnonymousUser.
    """
    @wraps(view_func)
    def wrapper(request: HttpRequest, *args, **kwargs) -> HttpResponse:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            token = JWTAuthenticationMiddleware._extract_token(request)
            if token:
                payload, err = decode_jwt_token(token)
                if payload:
                    user_id = payload.get("user_id") or payload.get("sub")
                    email = payload.get("email")
                    found_user = User.objects.filter(id=user_id).first() if user_id else None
                    if not found_user and email:
                        found_user = User.objects.filter(email=email).first()
                    if found_user and found_user.is_active:
                        request.user = found_user
                        request.token_payload = payload

        return view_func(request, *args, **kwargs)

    return wrapper
