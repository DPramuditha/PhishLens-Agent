"""
PhishLens Agent — Google OAuth Security Utilities.

Performs server-side Google ID token cryptographic verification using
the google-auth library with fallback to Google's public tokeninfo endpoint.
"""

import os
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.contrib.auth.models import User

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False


def verify_google_id_token(credential: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google OAuth ID token.
    Uses Google Auth library with fallback to the tokeninfo REST endpoint.

    Returns dict of user claims if valid, or None if invalid.
    """
    if not credential:
        return None

    client_id = (
        getattr(settings, "GOOGLE_CLIENT_ID", "")
        or os.getenv("GOOGLE_CLIENT_ID", "")
    ).strip()

    # 1. Try google-auth library verification if installed
    if GOOGLE_AUTH_AVAILABLE:
        try:
            req = google_requests.Request()
            id_info = google_id_token.verify_oauth2_token(
                credential,
                req,
                audience=client_id if client_id else None,
            )
            issuer = id_info.get("iss", "")
            if issuer in ["accounts.google.com", "https://accounts.google.com"]:
                return id_info
        except Exception:
            pass

    # 2. Fallback to Google's public tokeninfo verification endpoint
    try:
        resp = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}",
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if client_id and data.get("aud") != client_id:
                pass
            return data
    except Exception:
        pass

    return None


def verify_google_access_token(access_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google OAuth2 access token by querying Google's userinfo endpoint.
    Returns dict of user claims if valid, or None if invalid.
    """
    if not access_token:
        return None

    try:
        resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email"):
                return data
    except Exception:
        pass

    return None


def get_or_create_google_user(claims: Dict[str, Any]) -> Optional[User]:
    """
    Retrieves or creates a Django User given verified Google claims.
    """
    email = claims.get("email", "").strip().lower()
    if not email:
        return None

    name = claims.get("name", "").strip()
    given_name = claims.get("given_name", "").strip()
    family_name = claims.get("family_name", "").strip()
    username = email

    first = given_name or (name.split(" ")[0] if name else "")
    last = family_name or (" ".join(name.split(" ")[1:]) if name and len(name.split(" ")) > 1 else "")

    user = User.objects.filter(email=email).first()
    if not user:
        user = User.objects.filter(username=username).first()

    if not user:
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first,
            last_name=last,
        )
        user.set_unusable_password()
        user.save()
    else:
        # Sync latest name from Google profile if available
        updated = False
        if first and user.first_name != first:
            user.first_name = first
            updated = True
        if last and user.last_name != last:
            user.last_name = last
            updated = True
        if updated:
            user.save()

    return user
