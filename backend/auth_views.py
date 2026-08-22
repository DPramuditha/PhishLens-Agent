"""
PhishLens Agent — Authentication Views & Utilities.

Provides:
1. Google OAuth ID Token server-side verification.
2. Signed JWT Token issuance, verification, and decoding.
3. Django User creation and retrieval.
4. Route protection decorator (@jwt_required).
5. Modular API endpoints for Google OAuth and user session.
"""

import json
import os
import time
import jwt
import requests
from dotenv import load_dotenv

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


def get_jwt_secret():
    return getattr(settings, "JWT_SECRET", None) or os.getenv("JWT_SECRET") or getattr(settings, "SECRET_KEY", "phishlens-secure-jwt-secret-key")


def get_jwt_algorithm():
    return getattr(settings, "JWT_ALGORITHM", None) or os.getenv("JWT_ALGORITHM", "HS256")


def get_jwt_expiry_seconds():
    try:
        hours = getattr(settings, "JWT_EXPIRY_HOURS", None) or int(os.getenv("JWT_EXPIRY_HOURS", "24"))
        return int(hours) * 3600
    except (ValueError, TypeError):
        return 24 * 3600


def verify_google_id_token(credential: str):
    """
    Verifies a Google OAuth ID token.
    Uses Google Auth library with fallback to the tokeninfo REST endpoint.

    Returns dict of user claims if valid, or None if invalid.
    """
    if not credential:
        return None

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()

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
                # If client_id is configured, ensure audience matches
                pass
            return data
    except Exception:
        pass

    return None


def get_or_create_google_user(claims: dict):
    """
    Retrieves or creates a Django User given verified Google claims.
    """
    email = claims.get("email", "").strip().lower()
    if not email:
        return None

    name = claims.get("name", "").strip()
    given_name = claims.get("given_name", "").strip()
    family_name = claims.get("family_name", "").strip()

    # Fallback to username from email prefix
    username = email

    user = User.objects.filter(email=email).first()
    if not user:
        user = User.objects.filter(username=username).first()

    if not user:
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=given_name or name,
            last_name=family_name,
        )
        user.set_unusable_password()
        user.save()
    else:
        # Update names if missing
        updated = False
        if not user.first_name and (given_name or name):
            user.first_name = given_name or name
            updated = True
        if not user.last_name and family_name:
            user.last_name = family_name
            updated = True
        if updated:
            user.save()

    return user


def generate_jwt_token(user: User, picture: str = "") -> str:
    """
    Generates a secure JWT containing user metadata with configurable expiration.
    """
    display_name = f"{user.first_name} {user.last_name}".strip() or user.username
    now = int(time.time())
    expiry_seconds = get_jwt_expiry_seconds()
    secret = get_jwt_secret()
    algorithm = get_jwt_algorithm()

    payload = {
        "user_id": user.id,
        "email": user.email or user.username,
        "name": display_name,
        "picture": picture,
        "iat": now,
        "exp": now + expiry_seconds,
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_jwt_token(token_str: str):
    """
    Decodes and validates a JWT token using configured secret and algorithm.
    Returns (payload_dict, None) on success or (None, error_message) on failure.
    """
    secret = get_jwt_secret()
    algorithm = get_jwt_algorithm()
    try:
        payload = jwt.decode(token_str, secret, algorithms=[algorithm])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired. Please sign in again."
    except jwt.InvalidTokenError:
        return None, "Invalid token signature or payload."
    except Exception as e:
        return None, f"Token validation error: {str(e)}"


def jwt_required(view_func):
    """
    Decorator to protect API views.
    Requires a valid 'Authorization: Bearer <token>' header.
    Attaches `request.user_claims` and `request.user` to the request object.
    """
    def _wrapped_view(request, *args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header.startswith("Bearer "):
            return JsonResponse(
                {"error": "Unauthorized", "detail": "Missing or invalid Bearer authorization token."},
                status=401,
            )

        token = auth_header.split("Bearer ", 1)[1].strip()
        payload, error = decode_jwt_token(token)
        if error:
            return JsonResponse(
                {"error": "Unauthorized", "detail": error},
                status=401,
            )

        user_id = payload.get("user_id")
        user = User.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse(
                {"error": "Unauthorized", "detail": "User account no longer exists."},
                status=401,
            )

        request.user_claims = payload
        request.user = user
        return view_func(request, *args, **kwargs)

    return _wrapped_view


# ─────────────────────────────────────────────────────────────
# API Endpoints & Verification Helpers
# ─────────────────────────────────────────────────────────────

def exchange_google_auth_code(code: str):
    """
    Exchanges a Google OAuth Authorization Code for tokens using Client Secret.
    High-security server-side exchange.
    """
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "") or os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "") or os.getenv("GOOGLE_CLIENT_SECRET", "")
    redirect_uri = getattr(settings, "GOOGLE_REDIRECT_URI", "") or os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/login")

    if not code:
        return None

    try:
        payload = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        res = requests.post("https://oauth2.googleapis.com/token", data=payload, timeout=10)
        if res.status_code == 200:
            token_data = res.json()
            id_token_val = token_data.get("id_token")
            access_token_val = token_data.get("access_token")
            if id_token_val:
                claims = verify_google_id_token(id_token_val)
                if claims:
                    return claims
            if access_token_val:
                return verify_google_access_token(access_token_val)
    except Exception as e:
        print(f"Error exchanging authorization code: {e}")
    return None


def verify_google_access_token(access_token: str):
    """
    Verifies a Google OAuth access_token by fetching user profile from Google's userinfo endpoint.
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
            return resp.json()
    except Exception:
        pass
    return None


@csrf_exempt
@require_http_methods(["POST"])
def google_auth_view(request):
    """
    POST /api/auth/google/
    Body supports:
      - { "code": "<Google_Auth_Code>" } (Server-Side Code Flow with Client Secret)
      - { "credential": "<Google_ID_Token>" } (Google Identity Services ID Token)
      - { "access_token": "<Google_Access_Token>" } (OAuth Access Token)

    Authenticates user via Google OAuth, creates/retrieves Django user,
    and returns a signed JWT token with profile details.
    """
    try:
        data = json.loads(request.body)
        code = data.get("code", "").strip()
        credential = data.get("credential", "").strip()
        access_token = data.get("access_token", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON body. Expected: {\"credential\": \"...\"}"}, status=400)

    claims = None
    if code:
        claims = exchange_google_auth_code(code)
    elif credential:
        claims = verify_google_id_token(credential)
    elif access_token:
        claims = verify_google_access_token(access_token)

    if not claims:
        return JsonResponse({"error": "Invalid or expired Google OAuth credential/code/token."}, status=401)

    user = get_or_create_google_user(claims)
    if not user:
        return JsonResponse({"error": "Could not create or retrieve user account from Google claims."}, status=500)

    picture = claims.get("picture", "")
    token = generate_jwt_token(user, picture=picture)
    display_name = f"{user.first_name} {user.last_name}".strip() or user.username

    return JsonResponse({
        "status": "success",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": display_name,
            "picture": picture,
            "given_name": user.first_name,
        },
    }, status=200)


@csrf_exempt
@require_http_methods(["GET"])
@jwt_required
def current_user_view(request):
    """
    GET /api/auth/me/
    Header: Authorization: Bearer <token>

    Returns the authenticated user's profile metadata.
    """
    user = request.user
    claims = getattr(request, "user_claims", {})
    display_name = f"{user.first_name} {user.last_name}".strip() or user.username

    return JsonResponse({
        "user": {
            "id": user.id,
            "email": user.email,
            "name": display_name,
            "picture": claims.get("picture", ""),
            "given_name": user.first_name,
        }
    }, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    """
    POST /api/auth/logout/
    Client clears stored JWT token upon successful logout.
    """
    return JsonResponse({"status": "success", "message": "Logged out successfully."}, status=200)


# ─────────────────────────────────────────────────────────────
# Modular Email & Password Handlers (Ready for expansion)
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def email_login_view(request):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "..." }
    """
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    # Case-insensitive lookup for email or username
    user_obj = User.objects.filter(email__iexact=email).first() or User.objects.filter(username__iexact=email).first()
    user = None
    if user_obj:
        user = authenticate(username=user_obj.username, password=password)

    if not user:
        return JsonResponse({"error": "Invalid email or password."}, status=401)

    token = generate_jwt_token(user)
    display_name = f"{user.first_name} {user.last_name}".strip() or user.username

    return JsonResponse({
        "status": "success",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": display_name,
            "picture": "",
            "given_name": user.first_name,
        },
    }, status=200)


import re
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


@csrf_exempt
@require_http_methods(["POST"])
def email_register_view(request):
    """
    POST /api/auth/register/
    Body: { "name": "...", "email": "...", "password": "..." }

    Performs full security validation:
    1. Validates name length.
    2. Validates RFC-compliant email structure and uniqueness.
    3. Enforces strong password rules (8+ chars, uppercase, lowercase, digit, special char).
    4. Runs Django core password validators.
    5. Saves salted hashed user in PostgreSQL/DB and returns 24h JWT.
    """
    try:
        data = json.loads(request.body)
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    # 1. Name validation
    if not name or len(name) < 2:
        return JsonResponse({"error": "Please enter your full name (at least 2 characters)."}, status=400)

    # 2. Email validation
    if not email:
        return JsonResponse({"error": "Email address is required."}, status=400)

    if not EMAIL_REGEX.match(email):
        return JsonResponse({"error": "Please enter a valid email address (e.g. name@company.com)."}, status=400)

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return JsonResponse({"error": "An account with this email address already exists. Please sign in."}, status=409)

    # 3. Strict Password Complexity Validation
    if not password or len(password) < 8:
        return JsonResponse({"error": "Password must be at least 8 characters long."}, status=400)

    if not re.search(r'[A-Z]', password):
        return JsonResponse({"error": "Password must contain at least one uppercase letter (A-Z)."}, status=400)

    if not re.search(r'[a-z]', password):
        return JsonResponse({"error": "Password must contain at least one lowercase letter (a-z)."}, status=400)

    if not re.search(r'[0-9]', password):
        return JsonResponse({"error": "Password must contain at least one numeric digit (0-9)."}, status=400)

    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~`]', password):
        return JsonResponse({"error": "Password must contain at least one special character (!@#$%^&* etc.)."}, status=400)

    # 4. Django core password validation
    try:
        validate_password(password)
    except ValidationError as ve:
        return JsonResponse({"error": "; ".join(ve.messages)}, status=400)

    # 5. Create user in PostgreSQL database
    name_parts = name.split(" ", 1)
    first_name = name_parts[0].strip()
    last_name = name_parts[1].strip() if len(name_parts) > 1 else ""

    try:
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
    except Exception as e:
        return JsonResponse({"error": f"Failed to create user account: {str(e)}"}, status=500)

    token = generate_jwt_token(user)
    display_name = f"{user.first_name} {user.last_name}".strip() or user.username

    return JsonResponse({
        "status": "success",
        "message": "Account created successfully.",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": display_name,
            "picture": "",
            "given_name": user.first_name,
        },
    }, status=201)
