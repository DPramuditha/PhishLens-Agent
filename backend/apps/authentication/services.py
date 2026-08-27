"""
PhishLens Agent — Authentication Business Logic Services.
"""

import os
import uuid
from typing import Any, Dict, Optional, Tuple
from PIL import Image

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from backend.apps.authentication.models import UserProfile
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
    - Profile picture / avatar upload & removal
    """

    @staticmethod
    def get_user_picture(user: User, request=None) -> str:
        """Retrieves active avatar URL from user profile if available."""
        if not user or not user.is_authenticated:
            return ""
        try:
            profile = getattr(user, "profile", None)
            if not profile:
                profile = UserProfile.objects.filter(user=user).first()
            if profile:
                return profile.get_avatar_url(request=request)
        except Exception:
            pass
        return ""

    @staticmethod
    def handle_google_login(
        credential: Optional[str] = None,
        access_token: Optional[str] = None,
        request=None,
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

        raw_picture = claims.get("picture", "")
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if not profile.avatar and raw_picture and not profile.avatar_url:
            profile.avatar_url = raw_picture
            profile.save(update_fields=["avatar_url"])

        picture = profile.get_avatar_url(request=request) or raw_picture
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
        name: str, email: str, password: str, request=None
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

        UserProfile.objects.get_or_create(user=user)

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
    def login_email_user(email: str, password: str, request=None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
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

        profile, _ = UserProfile.objects.get_or_create(user=user)
        picture = profile.get_avatar_url(request=request)

        name = f"{user.first_name} {user.last_name}".strip() or user.username
        token = generate_jwt_token(user, picture=picture)

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
    def update_user_profile(user: User, name: str, request=None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Updates user display name and re-issues token."""
        name = (name or "").strip()
        if not name or len(name) < 2:
            return None, "Name must be at least 2 characters long."

        name_parts = name.split(" ")
        user.first_name = name_parts[0]
        user.last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        picture = profile.get_avatar_url(request=request)

        token = generate_jwt_token(user, picture=picture)
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
    def upload_user_avatar(
        user: User,
        image_file,
        request=None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Validates, processes, and stores an uploaded user profile image.
        Returns (result_dict, error_message).
        """
        if not image_file:
            return None, "No image file provided."

        # Maximum file size: 5 MB
        max_size_bytes = 5 * 1024 * 1024
        if hasattr(image_file, "size") and image_file.size > max_size_bytes:
            return None, "Profile picture exceeds maximum allowed size (5 MB)."

        filename = getattr(image_file, "name", "") or ""
        ext = os.path.splitext(filename)[1].lower()
        allowed_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
        if ext and ext not in allowed_extensions:
            return None, "Unsupported file format. Please upload a JPG, PNG, WEBP, or GIF image."

        # Deep image content & integrity verification using Pillow
        try:
            image_file.seek(0)
            img = Image.open(image_file)
            img.verify()

            # Re-open after verify to inspect format
            image_file.seek(0)
            img = Image.open(image_file)
            format_name = (img.format or "").upper()
            if format_name not in {"JPEG", "PNG", "WEBP", "GIF"}:
                return None, f"Unsupported image format: {format_name}."
        except Exception as e:
            return None, f"Invalid or corrupted image file: {str(e)}"

        # Prepare unique storage filename
        out_ext = ".jpg" if format_name == "JPEG" else f".{format_name.lower()}"
        unique_name = f"avatar_{user.id}_{uuid.uuid4().hex[:10]}{out_ext}"

        # Fetch or create UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Safely remove old avatar file from disk if present
        if profile.avatar and hasattr(profile.avatar, "path"):
            try:
                if os.path.isfile(profile.avatar.path):
                    os.remove(profile.avatar.path)
            except Exception:
                pass

        # Save new image file into avatar field
        image_file.seek(0)
        profile.avatar.save(unique_name, image_file, save=True)

        picture_url = profile.get_avatar_url(request=request)
        name = f"{user.first_name} {user.last_name}".strip() or user.username
        token = generate_jwt_token(user, picture=picture_url)

        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email or user.username,
                "name": name,
                "picture": picture_url,
                "is_staff": user.is_staff,
            },
        }, None

    @staticmethod
    def remove_user_avatar(
        user: User,
        request=None,
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Removes custom uploaded avatar and resets profile picture.
        """
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.avatar and hasattr(profile.avatar, "path"):
            try:
                if os.path.isfile(profile.avatar.path):
                    os.remove(profile.avatar.path)
            except Exception:
                pass
        profile.avatar = None
        profile.avatar_url = ""
        profile.save()

        name = f"{user.first_name} {user.last_name}".strip() or user.username
        token = generate_jwt_token(user, picture="")

        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email or user.username,
                "name": name,
                "picture": "",
                "is_staff": user.is_staff,
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

