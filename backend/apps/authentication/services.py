"""
PhishLens Agent — Authentication Business Logic Services.
"""

from typing import Any, Dict, Optional, Tuple

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from backend.core.security import (
    generate_jwt_token,
    verify_google_id_token,
    verify_google_access_token,
    get_or_create_google_user,
    validate_password_strength,
    validate_email_address,
)


class AuthService:
    """
    Encapsulates all authentication workflows:
    - Google OAuth ID token & access token verification & user provisioning
    - Email & Password registration with strict validation
    - Email & Password login
    - User profile update
    - Password change
    """

    @staticmethod
    def handle_google_login(
        credential: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Verifies Google token (ID token or access token) and returns JWT payload & user dict."""
        claims = None
        if credential:
            claims = verify_google_id_token(credential)
        if not claims and access_token:
            claims = verify_google_access_token(access_token)

        if not claims:
            return None, "Google token verification failed. Token is invalid or expired."

        user = get_or_create_google_user(claims)
        if not user:
            return None, "Failed to retrieve or create user account for Google profile."

        picture = claims.get("picture", "")
        token = generate_jwt_token(user, picture=picture)
        name = f"{user.first_name} {user.last_name}".strip() or claims.get("name", user.username)

        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": name,
                "picture": picture,
            },
        }, None

    @staticmethod
    def register_email_user(
        name: str, email: str, password: str
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str], int]:
        """
        Validates credentials and registers a new Django user with PBKDF2 hashed password.
        Returns (result_dict, error_message, status_code).
        """
        name = (name or "").strip()
        email = (email or "").strip().lower()

        if not name or len(name) < 2:
            return None, "A valid name with at least 2 characters is required.", 400

        is_valid_email, email_err = validate_email_address(email)
        if not is_valid_email:
            return None, email_err or "Invalid email format.", 400

        is_strong_pw, pw_err = validate_password_strength(password)
        if not is_strong_pw:
            return None, pw_err or "Password does not meet complexity requirements.", 400

        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            return None, f"An account with email '{email}' already exists.", 409

        name_parts = name.split(" ")
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        token = generate_jwt_token(user)
        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": name,
                "picture": "",
            },
        }, None, 201

    @staticmethod
    def login_email_user(email: str, password: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Authenticates user via email and password."""
        email = (email or "").strip().lower()
        if not email or not password:
            return None, "Both email and password are required."

        user_obj = User.objects.filter(email=email).first() or User.objects.filter(username=email).first()
        if not user_obj:
            return None, "Invalid email or password."

        user = authenticate(username=user_obj.username, password=password)
        if not user or not user.is_active:
            return None, "Invalid email or password."

        name = f"{user.first_name} {user.last_name}".strip() or user.username
        token = generate_jwt_token(user)

        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": name,
                "picture": "",
            },
        }, None

    @staticmethod
    def update_user_profile(user: User, name: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Updates user display name and re-issues token."""
        name = (name or "").strip()
        if not name or len(name) < 2:
            return None, "Name must be at least 2 characters long."

        name_parts = name.split(" ")
        user.first_name = name_parts[0]
        user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        user.save()

        token = generate_jwt_token(user)
        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": name,
                "picture": "",
            },
        }, None

    @staticmethod
    def change_user_password(
        user: User, current_password: str, new_password: str
    ) -> Tuple[bool, Optional[str]]:
        """Validates current password and updates to new password."""
        if not user.check_password(current_password):
            return False, "Current password is incorrect."

        is_strong, err = validate_password_strength(new_password)
        if not is_strong:
            return False, err or "New password does not meet complexity requirements."

        user.set_password(new_password)
        user.save()
        return True, None
