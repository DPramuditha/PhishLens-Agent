"""
PhishLens Agent — Authentication API Views.

Endpoints:
- POST   /api/auth/google/ -> Exchange Google ID token for PhishLens JWT
- GET    /api/auth/me/ -> Return current authenticated user profile
- POST   /api/auth/login/ -> Email & password login
- POST   /api/auth/register/ -> Email registration with strong password
- POST   /api/auth/profile/update/ -> Update user profile
- POST   /api/auth/profile/avatar/ -> Upload custom profile picture
- DELETE /api/auth/profile/avatar/ -> Remove custom profile picture
- POST   /api/auth/change-password/ -> Change user password
- POST   /api/auth/logout/ -> Invalidate session / client logout
"""

import json
from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from backend.core.middleware.jwt_auth import jwt_required
from backend.core.utils.responses import (
    api_success,
    api_error,
    api_unauthorized,
)
from backend.apps.authentication.services import AuthService


@csrf_exempt
@require_http_methods(["POST"])
def google_auth_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/google/
    Body: {"credential": "<google_id_token>"} or {"access_token": "<google_access_token>"}
    """
    try:
        data = json.loads(request.body)
        raw_credential = data.get("credential")
        raw_access_token = data.get("access_token")
        credential = raw_credential.strip() if isinstance(raw_credential, str) else ""
        access_token = raw_access_token.strip() if isinstance(raw_access_token, str) else ""
    except (json.JSONDecodeError, AttributeError):
        return api_error("Invalid JSON body. Expected: {\"credential\": \"...\"} or {\"access_token\": \"...\"}", status=400)

    if not credential and not access_token:
        return api_error("Missing 'credential' or 'access_token' parameter in request body.", status=400)

    res, err = AuthService.handle_google_login(credential=credential, access_token=access_token, request=request)
    if err:
        return api_unauthorized(err)

    return api_success(data=res, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def email_register_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/register/
    Body: {"name": "...", "email": "...", "password": "..."}
    """
    try:
        data = json.loads(request.body)
        name = data.get("name", "")
        email = data.get("email", "")
        password = data.get("password", "")
    except (json.JSONDecodeError, AttributeError):
        return api_error("Invalid JSON payload.", status=400)

    res, err, status_code = AuthService.register_email_user(name, email, password, request=request)
    if err:
        return api_error(err, status=status_code)

    return api_success(data=res, status=status_code)


@csrf_exempt
@require_http_methods(["POST"])
def email_login_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/login/
    Body: {"email": "...", "password": "..."}
    """
    try:
        data = json.loads(request.body)
        email = data.get("email", "")
        password = data.get("password", "")
    except (json.JSONDecodeError, AttributeError):
        return api_error("Invalid JSON payload.", status=400)

    res, err = AuthService.login_email_user(email, password, request=request)
    if err:
        return api_unauthorized(err)

    return api_success(data=res, status=200)


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
def current_user_view(request: HttpRequest) -> HttpResponse:
    """
    GET /api/auth/me/
    Returns currently authenticated user profile from DB profile and JWT claims.
    """
    user = request.user
    token_payload = getattr(request, "token_payload", {}) or {}
    picture = AuthService.get_user_picture(user, request=request) or token_payload.get("picture", "")
    name = f"{user.first_name} {user.last_name}".strip() or token_payload.get("name") or user.username

    return api_success(
        data={
            "user": {
                "id": user.id,
                "email": user.email or user.username,
                "name": name,
                "picture": picture,
                "is_staff": user.is_staff,
            }
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def update_profile_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/profile/update/
    Body: {"name": "Updated Name"}
    """
    try:
        data = json.loads(request.body)
        name = data.get("name", "")
    except (json.JSONDecodeError, AttributeError):
        return api_error("Invalid JSON body.", status=400)

    res, err = AuthService.update_user_profile(request.user, name, request=request)
    if err:
        return api_error(err, status=400)

    return api_success(data=res, message="Profile updated successfully.", status=200)


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def upload_avatar_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/profile/avatar/
    Multipart form data containing image file in 'avatar', 'picture', 'image', or 'file'.
    """
    image_file = (
        request.FILES.get("avatar")
        or request.FILES.get("picture")
        or request.FILES.get("image")
        or request.FILES.get("file")
    )
    if not image_file:
        return api_error("No image file provided in request. Please upload using 'avatar' field.", status=400)

    res, err = AuthService.upload_user_avatar(request.user, image_file, request=request)
    if err:
        return api_error(err, status=400)

    return api_success(data=res, message="Profile picture updated successfully.", status=200)


@csrf_exempt
@require_http_methods(["DELETE", "POST"])
@jwt_required
def delete_avatar_view(request: HttpRequest) -> HttpResponse:
    """
    DELETE /api/auth/profile/avatar/ or POST /api/auth/profile/avatar/delete/
    Removes the custom uploaded avatar.
    """
    res, err = AuthService.remove_user_avatar(request.user, request=request)
    if err:
        return api_error(err, status=400)

    return api_success(data=res, message="Profile picture removed successfully.", status=200)


@csrf_exempt
@require_http_methods(["POST"])
@jwt_required
def change_password_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/change-password/
    Body: {"current_password": "...", "new_password": "..."}
    """
    try:
        data = json.loads(request.body)
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")
    except (json.JSONDecodeError, AttributeError):
        return api_error("Invalid JSON body.", status=400)

    if not current_password or not new_password:
        return api_error("Both current_password and new_password are required.", status=400)

    success, err = AuthService.change_user_password(request.user, current_password, new_password)
    if not success:
        return api_error(err or "Failed to change password.", status=400)

    return api_success(message="Password changed successfully.", status=200)


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request: HttpRequest) -> HttpResponse:
    """
    POST /api/auth/logout/
    Client-side JWT clearance confirmation.
    """
    response = api_success(message="Successfully logged out.", status=200)
    response.delete_cookie("jwt_token")
    response.delete_cookie("access_token")
    return response

