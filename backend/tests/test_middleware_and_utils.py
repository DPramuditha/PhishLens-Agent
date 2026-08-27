"""
PhishLens Agent — Test Suite for Middleware (CORS, JWT Auth, Rate Limiting, Request Logging) and API Response Utilities.
"""

import json
from django.contrib.auth.models import AnonymousUser, User
from django.http import HttpResponse, JsonResponse
import pytest

from backend.core.middleware.cors import CORSMiddleware
from backend.core.middleware.jwt_auth import (
    JWTAuthenticationMiddleware,
    jwt_required,
    optional_jwt,
)
from backend.core.middleware.rate_limit import RateLimitMiddleware
from backend.core.middleware.request_logging import RequestLoggingMiddleware
from backend.core.utils.responses import (
    api_success,
    api_error,
    api_unauthorized,
    api_forbidden,
    api_not_found,
)


# ===========================================================================
# 1. CORS Middleware Tests
# ===========================================================================

class TestCORSMiddleware:
    def test_cors_preflight_options(self, request_factory):
        """OPTIONS preflight request should return CORS headers with 200 OK."""
        middleware = CORSMiddleware(lambda r: HttpResponse("ok"))
        req = request_factory.options("/api/scan/")
        resp = middleware(req)

        assert resp.status_code == 200
        assert resp["Access-Control-Allow-Origin"] == "*"
        assert "OPTIONS" in resp["Access-Control-Allow-Methods"]
        assert "Authorization" in resp["Access-Control-Allow-Headers"]
        assert resp["Access-Control-Max-Age"] == "86400"

    def test_cors_standard_request(self, request_factory):
        """Standard GET request should have CORS headers attached."""
        middleware = CORSMiddleware(lambda r: HttpResponse("scanned data", status=200))
        req = request_factory.get("/api/scan/")
        resp = middleware(req)

        assert resp.status_code == 200
        assert resp["Access-Control-Allow-Origin"] == "*"
        assert resp.content.decode() == "scanned data"


# ===========================================================================
# 2. JWT Authentication Middleware & Decorators Tests
# ===========================================================================

class TestJWTAuthenticationMiddleware:
    def test_valid_bearer_token(self, request_factory, sample_user, user_jwt_token):
        """Valid Bearer token in Authorization header populates request.user."""
        middleware = JWTAuthenticationMiddleware(lambda r: HttpResponse(f"User: {r.user.username}"))
        req = request_factory.get("/api/chats/", HTTP_AUTHORIZATION=f"Bearer {user_jwt_token}")
        resp = middleware(req)

        assert resp.status_code == 200
        assert req.user.is_authenticated
        assert req.user.id == sample_user.id
        assert req.user.email == sample_user.email
        assert req.token_payload is not None

    def test_cookie_fallback_token(self, request_factory, sample_user, user_jwt_token):
        """JWT token present in cookies populates request.user."""
        middleware = JWTAuthenticationMiddleware(lambda r: HttpResponse(f"User: {r.user.username}"))
        req = request_factory.get("/api/chats/")
        req.COOKIES["jwt_token"] = user_jwt_token
        resp = middleware(req)

        assert resp.status_code == 200
        assert req.user.is_authenticated
        assert req.user.id == sample_user.id

    def test_invalid_forged_token(self, request_factory):
        """Forged / invalid token assigns AnonymousUser and sets auth_error."""
        middleware = JWTAuthenticationMiddleware(lambda r: HttpResponse("ok"))
        req = request_factory.get("/api/chats/", HTTP_AUTHORIZATION="Bearer fake.forged.jwt.token")
        resp = middleware(req)

        assert resp.status_code == 200
        assert isinstance(req.user, AnonymousUser)
        assert not req.user.is_authenticated
        assert req.auth_error is not None

    def test_no_token_provided(self, request_factory):
        """Request without token assigns AnonymousUser."""
        middleware = JWTAuthenticationMiddleware(lambda r: HttpResponse("ok"))
        req = request_factory.get("/api/chats/")
        resp = middleware(req)

        assert resp.status_code == 200
        assert isinstance(req.user, AnonymousUser)
        assert not req.user.is_authenticated

    def test_jwt_required_decorator_blocks_unauth(self, request_factory):
        """@jwt_required decorator returns 401 when request is unauthenticated."""
        @jwt_required
        def secret_view(request):
            return api_success(data={"secret": 12345})

        req = request_factory.get("/api/secret/")
        req.user = AnonymousUser()
        resp = secret_view(req)

        assert resp.status_code == 401
        data = json.loads(resp.content)
        assert data["code"] == "UNAUTHORIZED"

    def test_jwt_required_decorator_allows_auth(self, request_factory, sample_user, user_jwt_token):
        """@jwt_required decorator allows authenticated user with valid token."""
        @jwt_required
        def secret_view(request):
            return api_success(data={"secret": "phishlens_vault"})

        req = request_factory.get("/api/secret/", HTTP_AUTHORIZATION=f"Bearer {user_jwt_token}")
        req.user = sample_user
        resp = secret_view(req)

        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["secret"] == "phishlens_vault"

    def test_optional_jwt_decorator(self, request_factory, sample_user, user_jwt_token):
        """@optional_jwt decorator populates user if token exists or allows guest."""
        @optional_jwt
        def guest_or_user_view(request):
            username = request.user.username if request.user.is_authenticated else "Guest"
            return api_success(data={"user": username})

        # Test guest access
        req_guest = request_factory.get("/api/scan/")
        req_guest.user = AnonymousUser()
        resp_guest = guest_or_user_view(req_guest)
        assert resp_guest.status_code == 200
        assert json.loads(resp_guest.content)["user"] == "Guest"

        # Test authenticated access
        req_user = request_factory.get("/api/scan/", HTTP_AUTHORIZATION=f"Bearer {user_jwt_token}")
        req_user.user = AnonymousUser()
        resp_user = guest_or_user_view(req_user)
        assert resp_user.status_code == 200
        assert json.loads(resp_user.content)["user"] == sample_user.username


# ===========================================================================
# 3. Rate Limiting Middleware Tests
# ===========================================================================

class TestRateLimitMiddleware:
    def test_rate_limit_allows_under_threshold(self, request_factory):
        """Requests under threshold pass successfully."""
        middleware = RateLimitMiddleware(lambda r: HttpResponse("ok"))
        middleware.max_requests_per_window = 5

        req = request_factory.get("/api/scan/", REMOTE_ADDR="192.168.1.50")
        for _ in range(4):
            resp = middleware(req)
            assert resp.status_code == 200

    def test_rate_limit_blocks_exceeded(self, request_factory):
        """Requests exceeding threshold return HTTP 429 Too Many Requests."""
        middleware = RateLimitMiddleware(lambda r: HttpResponse("ok"))
        middleware.max_requests_per_window = 3

        req = request_factory.get("/api/scan/", REMOTE_ADDR="10.0.0.99")
        # Consume allowed requests
        for _ in range(3):
            r = middleware(req)
            assert r.status_code == 200

        # Next request must be throttled
        blocked = middleware(req)
        assert blocked.status_code == 429
        data = json.loads(blocked.content)
        assert data["code"] == "RATE_LIMIT_EXCEEDED"

    def test_rate_limit_exemptions(self, request_factory):
        """Health check endpoint and OPTIONS requests are exempt from rate limits."""
        middleware = RateLimitMiddleware(lambda r: HttpResponse("ok"))
        middleware.max_requests_per_window = 1

        req_health = request_factory.get("/api/health/", REMOTE_ADDR="10.0.0.1")
        for _ in range(5):
            assert middleware(req_health).status_code == 200

        req_options = request_factory.options("/api/scan/", REMOTE_ADDR="10.0.0.1")
        for _ in range(5):
            assert middleware(req_options).status_code == 200


# ===========================================================================
# 4. Request Logging Middleware Tests
# ===========================================================================

class TestRequestLoggingMiddleware:
    def test_logging_middleware_passes_through(self, request_factory):
        """RequestLoggingMiddleware passes requests through and records status."""
        middleware = RequestLoggingMiddleware(lambda r: HttpResponse("logged", status=201))
        req = request_factory.post("/api/scan/", data={"url": "https://test.com"})
        resp = middleware(req)
        assert resp.status_code == 201
        assert resp.content.decode() == "logged"


# ===========================================================================
# 5. Response Utility Functions Tests
# ===========================================================================

class TestResponseUtils:
    def test_api_success_dict(self):
        """api_success unrolls dict data into root JSON object."""
        resp = api_success(data={"token": "abc123xyz", "user_id": 42}, message="Login OK", status=200)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["token"] == "abc123xyz"
        assert data["user_id"] == 42
        assert data["message"] == "Login OK"

    def test_api_success_list(self):
        """api_success wraps non-dict data in data key."""
        resp = api_success(data=["item1", "item2"], status=200)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["data"] == ["item1", "item2"]

    def test_api_error(self):
        """api_error returns error, code, and details."""
        resp = api_error("Invalid parameters", status=400, code="BAD_REQUEST", details={"field": "url"})
        assert resp.status_code == 400
        data = json.loads(resp.content)
        assert data["error"] == "Invalid parameters"
        assert data["code"] == "BAD_REQUEST"
        assert data["details"]["field"] == "url"

    def test_api_unauthorized(self):
        """api_unauthorized returns 401 with UNAUTHORIZED code."""
        resp = api_unauthorized("Token missing")
        assert resp.status_code == 401
        data = json.loads(resp.content)
        assert data["code"] == "UNAUTHORIZED"
        assert data["error"] == "Token missing"

    def test_api_forbidden(self):
        """api_forbidden returns 403 with FORBIDDEN code."""
        resp = api_forbidden("Admin access only")
        assert resp.status_code == 403
        data = json.loads(resp.content)
        assert data["code"] == "FORBIDDEN"
        assert data["error"] == "Admin access only"

    def test_api_not_found(self):
        """api_not_found returns 404 with NOT_FOUND code."""
        resp = api_not_found("Scan session not found")
        assert resp.status_code == 404
        data = json.loads(resp.content)
        assert data["code"] == "NOT_FOUND"
        assert data["error"] == "Scan session not found"
