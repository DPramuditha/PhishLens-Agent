"""
PhishLens Agent — Test Suite for Core Security, JWT Utilities, Password Validation, and Authentication APIs.
"""

import io
import json
import time
import uuid
from unittest.mock import patch
from PIL import Image

import jwt
import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

from backend.apps.authentication.services import AuthService
from backend.apps.authentication.views import (
    google_auth_view,
    current_user_view,
    email_login_view,
    email_register_view,
    update_profile_view,
    upload_avatar_view,
    delete_avatar_view,
    change_password_view,
    logout_view,
)

from backend.core.security.jwt_utils import (
    generate_jwt_token,
    decode_jwt_token,
    get_jwt_secret,
    get_jwt_algorithm,
)
from backend.core.security.password_validation import (
    validate_password_strength,
    validate_email_address,
)


# ===========================================================================
# 1. JWT Utilities Tests
# ===========================================================================

class TestJWTUtils:
    def test_generate_and_decode_jwt_token(self, sample_user):
        """Test token issuance with user claims and successful decoding."""
        token = generate_jwt_token(
            sample_user,
            picture="https://phishlens.ai/avatar.jpg"
        )
        assert isinstance(token, str)
        assert len(token) > 20

        payload, err = decode_jwt_token(token)
        assert err is None
        assert payload["user_id"] == sample_user.id
        assert payload["email"] == sample_user.email
        assert payload["name"] == f"{sample_user.first_name} {sample_user.last_name}"
        assert payload["picture"] == "https://phishlens.ai/avatar.jpg"
        assert "exp" in payload
        assert "iat" in payload

    def test_decode_invalid_jwt_token(self):
        """Test decoding of malformed or invalid tokens."""
        payload, err = decode_jwt_token("invalid.token.string")
        assert payload is None
        assert "Invalid token" in err

    def test_decode_tampered_jwt_signature(self, sample_user):
        """Test token signed with wrong secret is rejected."""
        tampered_token = jwt.encode(
            {"email": sample_user.email, "user_id": sample_user.id, "sub": str(sample_user.id), "exp": int(time.time()) + 3600, "iat": int(time.time())},
            "completely_wrong_secret_key",
            algorithm=get_jwt_algorithm()
        )
        payload, err = decode_jwt_token(tampered_token)
        assert payload is None
        assert "Invalid token" in err or "signature" in str(err).lower()

    def test_decode_expired_jwt_token(self, sample_user):
        """Test expired token returns expired error."""
        expired_payload = {
            "sub": str(sample_user.id),
            "user_id": sample_user.id,
            "email": sample_user.email,
            "exp": int(time.time()) - 3600,  # 1 hour in the past
            "iat": int(time.time()) - 7200,
        }
        expired_token = jwt.encode(expired_payload, get_jwt_secret(), algorithm=get_jwt_algorithm())
        payload, err = decode_jwt_token(expired_token)
        assert payload is None
        assert "Token has expired" in err


# ===========================================================================
# 2. Password & Email Validation Tests
# ===========================================================================

class TestValidationRules:
    @pytest.mark.parametrize(
        "password, expected_valid",
        [
            ("StrongPass123!@", True),
            ("Secur3#PhishLens2026", True),
            ("short1!", False),             # < 8 chars
            ("lowercaseonly123!", False),   # No uppercase
            ("UPPERCASEONLY123!", False),   # No lowercase
            ("NoNumbersAtAll!#", False),    # No digit
            ("NoSpecialChars123", False),   # No special char
            ("", False),                    # Empty
            (None, False),                  # None
        ]
    )
    def test_password_strength_validation(self, password, expected_valid):
        """Verify strict password complexity rules."""
        is_valid, _ = validate_password_strength(password)
        assert is_valid == expected_valid

    @pytest.mark.parametrize(
        "email, expected_valid",
        [
            ("user@phishlens.ai", True),
            ("dimuthu.pramuditha@domain.com", True),
            ("sec-analyst+test@sub.corp.lk", True),
            ("invalid-email", False),
            ("@missing-local.com", False),
            ("missing-domain@", False),
            ("spaces in@email.com", False),
            ("", False),
            (None, False),
        ]
    )
    def test_email_validation(self, email, expected_valid):
        """Verify RFC compliant email pattern matching."""
        is_valid, _ = validate_email_address(email)
        assert is_valid == expected_valid


# ===========================================================================
# 3. AuthService Unit Tests
# ===========================================================================

class TestAuthService:
    def test_register_email_user_success(self):
        """Test user registration creates user with hashed password and returns JWT."""
        unique_email = f"analyst_{uuid.uuid4().hex[:6]}@phishlens.ai"
        res, err, status_code = AuthService.register_email_user(
            name="Security Analyst",
            email=unique_email,
            password="SecurePassword123!#"
        )
        assert err is None
        assert status_code == 201
        assert "token" in res
        assert res["user"]["email"] == unique_email
        assert res["user"]["name"] == "Security Analyst"

        user_in_db = User.objects.get(email=unique_email)
        assert user_in_db.check_password("SecurePassword123!#")

    def test_register_duplicate_email(self, sample_user):
        """Test registration with existing email returns 409 conflict."""
        res, err, status_code = AuthService.register_email_user(
            name="Duplicate User",
            email=sample_user.email,
            password="SecurePassword123!#"
        )
        assert res is None
        assert status_code == 409
        assert "already exists" in err

    def test_login_email_user_success(self, sample_user):
        """Test email login with valid password."""
        res, err = AuthService.login_email_user(
            email=sample_user.email,
            password="SecurePassword123!#"
        )
        assert err is None
        assert "token" in res
        assert res["user"]["email"] == sample_user.email

    def test_login_email_user_wrong_password(self, sample_user):
        """Test email login with incorrect password."""
        res, err = AuthService.login_email_user(
            email=sample_user.email,
            password="WrongPassword999!"
        )
        assert res is None
        assert "Invalid email or password" in err

    def test_update_user_profile(self, sample_user):
        """Test updating profile name renewals JWT."""
        res, err = AuthService.update_user_profile(sample_user, "Updated Name")
        assert err is None
        assert res["user"]["name"] == "Updated Name"
        assert "token" in res

    def test_change_user_password(self, sample_user):
        """Test change password validates old and sets new password."""
        success, err = AuthService.change_user_password(
            user=sample_user,
            current_password="SecurePassword123!#",
            new_password="NewSecurePass456!@"
        )
        assert success is True
        assert err is None
        sample_user.refresh_from_db()
        assert sample_user.check_password("NewSecurePass456!@")

    def test_upload_avatar_success(self, sample_user):
        """Test uploading a valid PNG profile picture."""
        buf = io.BytesIO()
        img = Image.new("RGB", (100, 100), color="red")
        img.save(buf, format="PNG")
        buf.seek(0)
        uploaded = SimpleUploadedFile("avatar.png", buf.read(), content_type="image/png")

        res, err = AuthService.upload_user_avatar(sample_user, uploaded)
        assert err is None
        assert res is not None
        assert "token" in res
        assert res["user"]["picture"].startswith("/media/avatars/") or "http" in res["user"]["picture"]

        # Decode token to verify picture claim is embedded
        payload, dec_err = decode_jwt_token(res["token"])
        assert dec_err is None
        assert payload["picture"] == res["user"]["picture"]

    def test_upload_avatar_invalid_extension(self, sample_user):
        """Test upload rejection for disallowed file extensions."""
        uploaded = SimpleUploadedFile("script.py", b"print('hacked')", content_type="text/x-python")
        res, err = AuthService.upload_user_avatar(sample_user, uploaded)
        assert res is None
        assert "Unsupported file format" in err or "format" in err.lower()

    def test_upload_avatar_corrupted_file(self, sample_user):
        """Test upload rejection for corrupt / non-image data with image extension."""
        uploaded = SimpleUploadedFile("fake.png", b"not-an-image-data-string", content_type="image/png")
        res, err = AuthService.upload_user_avatar(sample_user, uploaded)
        assert res is None
        assert "corrupted" in err.lower() or "invalid" in err.lower()

    def test_upload_avatar_oversized(self, sample_user):
        """Test upload rejection for files exceeding 5MB."""
        buf = io.BytesIO()
        img = Image.new("RGB", (20, 20), color="blue")
        img.save(buf, format="PNG")
        buf.seek(0)
        uploaded = SimpleUploadedFile("large.png", buf.read(), content_type="image/png")
        uploaded.size = 6 * 1024 * 1024  # 6 MB

        res, err = AuthService.upload_user_avatar(sample_user, uploaded)
        assert res is None
        assert "exceeds maximum" in err.lower()

    def test_remove_avatar_success(self, sample_user):
        """Test avatar removal resets profile picture."""
        buf = io.BytesIO()
        img = Image.new("RGB", (50, 50), color="green")
        img.save(buf, format="PNG")
        buf.seek(0)
        uploaded = SimpleUploadedFile("temp.png", buf.read(), content_type="image/png")
        AuthService.upload_user_avatar(sample_user, uploaded)

        res, err = AuthService.remove_user_avatar(sample_user)
        assert err is None
        assert res["user"]["picture"] == ""

        payload, dec_err = decode_jwt_token(res["token"])
        assert dec_err is None
        assert payload["picture"] == ""



# ===========================================================================
# 4. Authentication Views & Endpoints Tests
# ===========================================================================

class TestAuthViews:
    def test_register_view_success(self, request_factory):
        """POST /api/auth/register/ with valid payload returns 201."""
        unique_email = f"reg_{uuid.uuid4().hex[:6]}@phishlens.ai"
        req = request_factory.post(
            "/api/auth/register/",
            data=json.dumps({
                "name": "New Officer",
                "email": unique_email,
                "password": "Password123!@"
            }),
            content_type="application/json"
        )
        resp = email_register_view(req)
        assert resp.status_code == 201
        data = json.loads(resp.content)
        assert "token" in data
        assert data["user"]["email"] == unique_email

    def test_register_view_invalid_json(self, request_factory):
        """POST /api/auth/register/ with broken JSON returns 400."""
        req = request_factory.post(
            "/api/auth/register/",
            data="not-valid-json",
            content_type="application/json"
        )
        resp = email_register_view(req)
        assert resp.status_code == 400

    def test_login_view_success(self, request_factory, sample_user):
        """POST /api/auth/login/ returns 200 and token."""
        req = request_factory.post(
            "/api/auth/login/",
            data=json.dumps({
                "email": sample_user.email,
                "password": "SecurePassword123!#"
            }),
            content_type="application/json"
        )
        resp = email_login_view(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert "token" in data
        assert data["user"]["email"] == sample_user.email

    def test_current_user_view_authenticated(self, request_factory, sample_user, auth_headers):
        """GET /api/auth/me/ returns authenticated user details."""
        req = request_factory.get("/api/auth/me/", **auth_headers)
        # Apply JWT auth middleware behavior
        from backend.core.middleware.jwt_auth import JWTAuthenticationMiddleware
        mw = JWTAuthenticationMiddleware(current_user_view)
        resp = mw(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["user"]["email"] == sample_user.email

    def test_current_user_view_unauthenticated(self, request_factory):
        """GET /api/auth/me/ without token returns 401."""
        req = request_factory.get("/api/auth/me/")
        from backend.core.middleware.jwt_auth import JWTAuthenticationMiddleware
        mw = JWTAuthenticationMiddleware(current_user_view)
        resp = mw(req)
        assert resp.status_code == 401

    def test_google_auth_view_with_mocked_token(self, request_factory):
        """POST /api/auth/google/ with mocked Google access token."""
        with patch("backend.core.security.oauth.requests.get") as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "email": "google_analyst@phishlens.ai",
                "name": "Google Analyst",
                "given_name": "Google",
                "family_name": "Analyst",
                "picture": "https://lh3.googleusercontent.com/pic.jpg",
            }
            req = request_factory.post(
                "/api/auth/google/",
                data=json.dumps({"access_token": "ya29.mock_token"}),
                content_type="application/json"
            )
            resp = google_auth_view(req)
            assert resp.status_code == 200
            data = json.loads(resp.content)
            assert data["user"]["email"] == "google_analyst@phishlens.ai"
            assert "token" in data

    def test_logout_view(self, request_factory):
        """POST /api/auth/logout/ returns 200 and deletes cookies."""
        req = request_factory.post("/api/auth/logout/")
        resp = logout_view(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert "Successfully logged out" in data["message"]

    def test_upload_avatar_view_success(self, request_factory, sample_user, auth_headers):
        """POST /api/auth/profile/avatar/ uploads image and returns new JWT token and user picture."""
        buf = io.BytesIO()
        img = Image.new("RGB", (64, 64), color="purple")
        img.save(buf, format="PNG")
        buf.seek(0)
        uploaded = SimpleUploadedFile("avatar.png", buf.read(), content_type="image/png")

        req = request_factory.post("/api/auth/profile/avatar/", data={"avatar": uploaded}, **auth_headers)
        from backend.core.middleware.jwt_auth import JWTAuthenticationMiddleware
        mw = JWTAuthenticationMiddleware(upload_avatar_view)
        resp = mw(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert "token" in data
        assert data["user"]["picture"] != ""

    def test_upload_avatar_view_no_file(self, request_factory, sample_user, auth_headers):
        """POST /api/auth/profile/avatar/ without file returns 400."""
        req = request_factory.post("/api/auth/profile/avatar/", data={}, **auth_headers)
        from backend.core.middleware.jwt_auth import JWTAuthenticationMiddleware
        mw = JWTAuthenticationMiddleware(upload_avatar_view)
        resp = mw(req)
        assert resp.status_code == 400

    def test_delete_avatar_view_success(self, request_factory, sample_user, auth_headers):
        """DELETE /api/auth/profile/avatar/ removes avatar."""
        req = request_factory.delete("/api/auth/profile/avatar/", **auth_headers)
        from backend.core.middleware.jwt_auth import JWTAuthenticationMiddleware
        mw = JWTAuthenticationMiddleware(delete_avatar_view)
        resp = mw(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["user"]["picture"] == ""


