"""
PhishLens Agent — Standardized JSON API Response Utilities.
"""

from typing import Any, Dict, Optional
from django.http import JsonResponse


def api_success(
    data: Optional[Dict[str, Any]] = None,
    message: Optional[str] = None,
    status: int = 200,
    **kwargs: Any
) -> JsonResponse:
    """Standard success response."""
    payload: Dict[str, Any] = {}
    if message:
        payload["message"] = message
    if data is not None:
        if isinstance(data, dict):
            payload.update(data)
        else:
            payload["data"] = data
    payload.update(kwargs)
    return JsonResponse(payload, status=status)


def api_error(
    error: str,
    status: int = 400,
    code: Optional[str] = None,
    details: Optional[Any] = None,
    **kwargs: Any
) -> JsonResponse:
    """Standard error response."""
    payload: Dict[str, Any] = {"error": error}
    if code:
        payload["code"] = code
    if details is not None:
        payload["details"] = details
    payload.update(kwargs)
    return JsonResponse(payload, status=status)


def api_unauthorized(
    error: str = "Authentication required or invalid token.",
    **kwargs: Any
) -> JsonResponse:
    """Standard 401 Unauthorized response."""
    return api_error(error=error, status=401, code="UNAUTHORIZED", **kwargs)


def api_forbidden(
    error: str = "Permission denied.",
    **kwargs: Any
) -> JsonResponse:
    """Standard 403 Forbidden response."""
    return api_error(error=error, status=403, code="FORBIDDEN", **kwargs)


def api_not_found(
    error: str = "Resource not found.",
    **kwargs: Any
) -> JsonResponse:
    """Standard 404 Not Found response."""
    return api_error(error=error, status=404, code="NOT_FOUND", **kwargs)
