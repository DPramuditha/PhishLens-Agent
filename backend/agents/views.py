"""
PhishLens Agent — Django API views.

Provides the /api/scan/ endpoint that accepts a URL and returns
the full phishing analysis report from the ReAct orchestrator.
"""

import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


@csrf_exempt
@require_http_methods(["POST"])
def scan_url_view(request):
    """
    POST /api/scan/
    Body: {"url": "https://example.com"}

    Returns the full PhishLens analysis report as JSON.
    """
    try:
        body = json.loads(request.body)
        url = body.get("url", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse(
            {"error": "Invalid JSON body. Expected: {\"url\": \"https://...\"}"},
            status=400,
        )

    if not url:
        return JsonResponse(
            {"error": "Missing 'url' field in request body."},
            status=400,
        )

    # Basic URL validation
    if not url.startswith(("http://", "https://")):
        return JsonResponse(
            {"error": "URL must start with http:// or https://"},
            status=400,
        )

    # Import here to avoid circular imports and ensure env is loaded
    from .orchestrator import OrchestratorAgent

    try:
        orchestrator = OrchestratorAgent()
        report = orchestrator.run(url)
        return JsonResponse(report, status=200, json_dumps_params={"indent": 2})
    except Exception as e:
        return JsonResponse(
            {"error": f"Analysis failed: {str(e)}"},
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    GET /api/health/
    Simple health check endpoint.
    """
    return JsonResponse({
        "status": "ok",
        "service": "PhishLens Agent",
        "version": "1.0.0",
    })
