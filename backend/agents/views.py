"""
PhishLens Agent — Django API Views for Scans, Chat Sessions, and Agent Memory.

Endpoints:
- POST /api/scan/ -> Run phishing analysis on a URL (supports optional chat_id)
- GET /api/chats/ -> List recent chat sessions (supports search ?q=...)
- POST /api/chats/ -> Create a new unique chat session
- GET /api/chats/<chat_id>/ -> Retrieve full chat history, reports, screenshots, traces
- PATCH /api/chats/<chat_id>/ -> Rename chat session
- DELETE /api/chats/<chat_id>/ -> Delete chat session
- POST /api/chats/<chat_id>/message/ -> Send follow-up or scan within chat
- GET /api/chats/<chat_id>/memory/ -> Inspect agent short-term & long-term memory
- GET /api/health/ -> Health check
"""

import json
import os
import uuid
from urllib.parse import urlparse

from django.conf import settings
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from dotenv import load_dotenv

from backend.auth_views import optional_jwt
from backend.agents.models import ChatSession, ChatMessage, AgentMemoryRecord
from backend.agents.memory import long_term_memory
from backend.agents.pdf_report_agent import PDFReportAgent

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def _resolve_screenshot_url(request, screenshot_val: str) -> str:
    """Helper to return Base64 data URI or convert local filesystem screenshot path to client-accessible URL."""
    if not screenshot_val:
        return None
    if screenshot_val.startswith("data:image/") or screenshot_val.startswith("http://") or screenshot_val.startswith("https://"):
        return screenshot_val
    
    filename = os.path.basename(screenshot_val)
    # Use request build_absolute_uri or localhost default
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if not media_url.endswith("/"):
        media_url += "/"
    return f"http://localhost:8000{media_url}screenshots/{filename}"


def _format_chat_message(request, msg: ChatMessage) -> dict:
    """Formats a ChatMessage model instance for API responses."""
    screenshot_url = msg.screenshot_data or _resolve_screenshot_url(request, msg.screenshot_path)
    annotated_url = msg.annotated_screenshot_data or None
    return {
        "id": str(msg.id),
        "sender": msg.sender,
        "message_type": msg.message_type,
        "text": msg.text,
        "target_url": msg.target_url,
        "screenshot_data": msg.screenshot_data,
        "screenshot_path": msg.screenshot_path,
        "screenshot_url": screenshot_url,
        "annotated_screenshot_data": annotated_url,
        "annotated_screenshot_url": annotated_url,
        "report": msg.report,
        "url_analysis_data": msg.url_analysis_data,
        "tool_trace": msg.tool_trace,
        "overall_status": msg.overall_status,
        "duration_sec": msg.duration_sec,
        "error": msg.error,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


# ---------------------------------------------------------------------------
# Scan View
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@optional_jwt
def scan_url_view(request):
    """
    POST /api/scan/
    Body: {"url": "https://example.com", "chat_id": "<optional-uuid>"}

    Performs full multi-agent phishing analysis with short & long term memory.
    """
    try:
        body = json.loads(request.body)
        url = body.get("url", "").strip()
        chat_id = body.get("chat_id", "").strip() or None
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

    if not url.startswith(("http://", "https://")):
        url = "http://" + url

    from backend.agents.orchestrator import OrchestratorAgent

    try:
        orchestrator = OrchestratorAgent()
        result = orchestrator.run(url=url, chat_id=chat_id, user=getattr(request, "user", None))
        
        # Add resolved screenshot URLs (prioritize Base64 in-memory data)
        result["screenshot_url"] = result.get("screenshot_data") or _resolve_screenshot_url(request, result.get("screenshot_path"))
        result["annotated_screenshot_url"] = result.get("annotated_screenshot_data") or _resolve_screenshot_url(request, result.get("annotated_screenshot_path"))

        return JsonResponse(result, status=200, json_dumps_params={"indent": 2})
    except Exception as e:
        return JsonResponse(
            {"error": f"Analysis failed: {str(e)}"},
            status=500,
        )


# ---------------------------------------------------------------------------
# Chat Sessions List & Create
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET", "POST"])
@optional_jwt
def chats_list_create_view(request):
    """
    GET /api/chats/?q=<search_term>
    List chat sessions for the current user.

    POST /api/chats/
    Body: {"title": "Scan: domain.com", "id": "<optional_uuid>"}
    Create a new chat session.
    """
    user = getattr(request, "user", None)
    is_authenticated = user and getattr(user, "is_authenticated", False)

    if request.method == "GET":
        query = request.GET.get("q", "").strip()
        
        if is_authenticated:
            qs = ChatSession.objects.filter(user=user)
        else:
            # For guest/anonymous, return recent anonymous sessions
            qs = ChatSession.objects.filter(user__isnull=True)

        if query:
            qs = qs.filter(
                Q(title__icontains=query) |
                Q(messages__target_url__icontains=query) |
                Q(messages__text__icontains=query)
            ).distinct()

        chats_data = []
        for chat in qs.order_by("-updated_at")[:50]:
            last_msg = chat.last_message
            last_report = None
            last_screenshot = None
            if last_msg:
                last_report = last_msg.report
                last_screenshot = last_msg.screenshot_data or _resolve_screenshot_url(request, last_msg.screenshot_path)

            chats_data.append({
                "id": str(chat.id),
                "title": chat.title,
                "created_at": chat.created_at.isoformat(),
                "updated_at": chat.updated_at.isoformat(),
                "message_count": chat.messages.count(),
                "last_message": {
                    "text": last_msg.text if last_msg else None,
                    "target_url": last_msg.target_url if last_msg else None,
                    "risk_level": last_report.get("risk_level") if isinstance(last_report, dict) else None,
                    "risk_score": last_report.get("risk_score") if isinstance(last_report, dict) else None,
                    "screenshot_url": last_screenshot,
                } if last_msg else None,
            })

        return JsonResponse({"chats": chats_data}, status=200)

    elif request.method == "POST":
        try:
            body = json.loads(request.body) if request.body else {}
        except json.JSONDecodeError:
            body = {}

        custom_id = body.get("id")
        title = body.get("title", "New Scan").strip() or "New Scan"

        if custom_id:
            try:
                session_id = uuid.UUID(custom_id)
            except ValueError:
                return JsonResponse({"error": "Invalid UUID provided for chat id."}, status=400)
        else:
            session_id = uuid.uuid4()

        chat = ChatSession.objects.create(
            id=session_id,
            title=title,
            user=user if is_authenticated else None,
        )

        return JsonResponse({
            "id": str(chat.id),
            "title": chat.title,
            "created_at": chat.created_at.isoformat(),
            "updated_at": chat.updated_at.isoformat(),
        }, status=201)


# ---------------------------------------------------------------------------
# Chat Session Detail, Rename, Delete
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
@optional_jwt
def chat_detail_view(request, chat_id):
    """
    GET /api/chats/<chat_id>/ -> Fetch full chat session and messages
    PATCH /api/chats/<chat_id>/ -> Rename chat title {"title": "..."}
    DELETE /api/chats/<chat_id>/ -> Delete chat session
    """
    try:
        session_uuid = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse({"error": "Invalid UUID format for chat_id."}, status=400)

    chat = ChatSession.objects.filter(id=session_uuid).first()
    if not chat:
        # If not found, allow creating on the fly for seamless routing
        if request.method == "GET":
            chat = ChatSession.objects.create(
                id=session_uuid,
                title="New Scan",
                user=getattr(request, "user", None) if getattr(request, "user", None) and request.user.is_authenticated else None,
            )
        else:
            return JsonResponse({"error": "Chat session not found."}, status=404)

    if request.method == "GET":
        messages = [_format_chat_message(request, m) for m in chat.messages.all()]
        return JsonResponse({
            "id": str(chat.id),
            "title": chat.title,
            "created_at": chat.created_at.isoformat(),
            "updated_at": chat.updated_at.isoformat(),
            "messages": messages,
        }, status=200)

    elif request.method == "PATCH":
        try:
            body = json.loads(request.body)
            new_title = body.get("title", "").strip()
            if not new_title:
                return JsonResponse({"error": "Missing or empty 'title' field."}, status=400)
            chat.title = new_title
            chat.save()
            return JsonResponse({
                "id": str(chat.id),
                "title": chat.title,
                "updated_at": chat.updated_at.isoformat(),
            }, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        chat.delete()
        return JsonResponse({"status": "deleted", "id": str(session_uuid)}, status=200)


# ---------------------------------------------------------------------------
# Chat Message / Follow-up View
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@optional_jwt
def chat_message_view(request, chat_id):
    """
    POST /api/chats/<chat_id>/message/
    Body: {"message": "Why is the SSL cert invalid?", "url": "https://..."}

    Handles both URL scans and follow-up conversational dialogue in the chat thread.
    """
    try:
        session_uuid = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse({"error": "Invalid UUID for chat_id."}, status=400)

    try:
        body = json.loads(request.body)
        message_text = body.get("message", "").strip()
        url = body.get("url", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    from backend.agents.orchestrator import OrchestratorAgent
    orchestrator = OrchestratorAgent()

    # If URL is explicitly provided or message looks like a URL, execute URL scan
    potential_url = url or message_text
    if potential_url.startswith(("http://", "https://", "www.")) or "." in potential_url and " " not in potential_url:
        result = orchestrator.run(
            url=potential_url,
            chat_id=str(session_uuid),
            user=getattr(request, "user", None),
        )
        if result.get("screenshot_path"):
            result["screenshot_url"] = _resolve_screenshot_url(request, result["screenshot_path"])
        return JsonResponse(result, status=200)

    # Otherwise, execute follow-up conversation using short-term and long-term memory
    followup_result = orchestrator.run_followup_chat(
        chat_id=str(session_uuid),
        user_message=message_text,
        user=getattr(request, "user", None),
    )
    return JsonResponse(followup_result, status=200)


# ---------------------------------------------------------------------------
# Chat Memory Inspection View
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET"])
@optional_jwt
def chat_memory_view(request, chat_id):
    """
    GET /api/chats/<chat_id>/memory/
    Returns a summary of short-term thread state and long-term memory for this chat.
    """
    domain = request.GET.get("domain", "").strip()
    domain_intel = None
    if domain:
        domain_intel = long_term_memory.get_domain_history(domain)

    user = getattr(request, "user", None)
    user_prefs = None
    if user and getattr(user, "is_authenticated", False):
        user_prefs = long_term_memory.get_user_preferences(str(user.id))

    return JsonResponse({
        "chat_id": str(chat_id),
        "domain": domain,
        "domain_intelligence": domain_intel,
        "user_preferences": user_prefs,
    }, status=200)


# ---------------------------------------------------------------------------
# User Screenshots Gallery View
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET"])
@optional_jwt
def user_screenshots_view(request):
    """
    GET /api/screenshots/?q=<search_term>&risk=<filter>
    Retrieves all website screenshots related to the logged-in user (or guest sessions).
    """
    user = getattr(request, "user", None)
    is_authenticated = user and getattr(user, "is_authenticated", False)

    has_screenshot_q = (
        (Q(screenshot_data__isnull=False) & ~Q(screenshot_data="")) |
        (Q(screenshot_path__isnull=False) & ~Q(screenshot_path=""))
    )

    if is_authenticated:
        qs = ChatMessage.objects.filter(
            chat__user=user
        ).filter(has_screenshot_q)
    else:
        qs = ChatMessage.objects.filter(
            chat__user__isnull=True
        ).filter(has_screenshot_q)

    query = request.GET.get("q", "").strip()
    if query:
        qs = qs.filter(
            Q(target_url__icontains=query) |
            Q(chat__title__icontains=query) |
            Q(text__icontains=query)
        )

    risk_filter = request.GET.get("risk", "").strip().upper()
    if risk_filter and risk_filter != "ALL":
        qs = qs.filter(report__risk_level__iexact=risk_filter)

    items = []
    for msg in qs.select_related("chat").order_by("-created_at")[:100]:
        resolved_ss = msg.screenshot_data or _resolve_screenshot_url(request, msg.screenshot_path)
        if not resolved_ss:
            continue

        report = msg.report if isinstance(msg.report, dict) else {}
        domain = None
        if msg.target_url:
            try:
                domain = urlparse(msg.target_url).netloc
            except Exception:
                domain = msg.target_url

        items.append({
            "id": str(msg.id),
            "chat_id": str(msg.chat.id) if msg.chat else None,
            "chat_title": msg.chat.title if msg.chat else "Scan",
            "target_url": msg.target_url,
            "domain": domain,
            "screenshot_url": resolved_ss,
            "risk_level": report.get("risk_level", "UNKNOWN"),
            "risk_score": report.get("risk_score"),
            "summary": report.get("summary"),
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        })

    return JsonResponse({"screenshots": items, "count": len(items)}, status=200)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """GET /api/health/"""
    return JsonResponse({
        "status": "ok",
        "service": "PhishLens Agent",
        "version": "2.0.0",
        "database": settings.DATABASES.get("default", {}).get("ENGINE", "unknown"),
        "memory_support": {
            "short_term": "PostgresSaver Checkpointer",
            "long_term": "PostgresStore + AgentMemoryRecord",
        }
    })


# ---------------------------------------------------------------------------
# PDF Report Export Endpoints
# ---------------------------------------------------------------------------

@csrf_exempt
@require_http_methods(["POST"])
@optional_jwt
def export_pdf_view(request):
    """
    POST /api/scan/pdf/
    Body: {
        "url": "https://example.com",
        "report": { ... },
        "screenshot_data": "data:image/...",
        "url_analysis_data": { ... },
        "duration": 3.4
    }
    Generates and streams a high-resolution PDF threat assessment report.
    """
    try:
        body = json.loads(request.body) if request.body else {}
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    url = body.get("url") or body.get("target_url") or "Unknown Target"
    report = body.get("report") or {}
    screenshot_data = body.get("screenshot_data") or body.get("screenshot_url")
    url_analysis_data = body.get("url_analysis_data")
    duration = body.get("duration") or body.get("total_duration_sec")

    parsed = urlparse(url)
    clean_domain = parsed.hostname or url.replace("://", "_").replace("/", "_")
    filename = f"PhishLens_Security_Report_{clean_domain}.pdf"

    try:
        agent = PDFReportAgent()
        pdf_bytes = agent.generate_pdf(
            url=url,
            report=report,
            screenshot_data=screenshot_data,
            url_analysis_data=url_analysis_data,
            duration=duration,
        )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = len(pdf_bytes)
        return response
    except Exception as e:
        return JsonResponse({"error": f"Failed to generate PDF report: {str(e)}"}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
@optional_jwt
def export_chat_pdf_view(request, chat_id):
    """
    GET /api/chats/<chat_id>/pdf/
    Generates and streams the PDF report for a saved chat session from database.
    """
    try:
        session_uuid = uuid.UUID(str(chat_id))
    except ValueError:
        return JsonResponse({"error": "Invalid UUID format for chat_id."}, status=400)

    chat = ChatSession.objects.filter(id=session_uuid).first()
    if not chat:
        return JsonResponse({"error": "Chat session not found."}, status=404)

    # Find the latest scan message with a report
    scan_msg = chat.messages.filter(report__isnull=False).order_by("-created_at").first()
    if not scan_msg:
        # Fallback to any assistant message
        scan_msg = chat.messages.filter(sender="assistant").order_by("-created_at").first()

    report = scan_msg.report if scan_msg and scan_msg.report else {
        "risk_level": "UNKNOWN",
        "risk_score": 0,
        "summary": scan_msg.text if scan_msg else "No scan data available.",
    }
    url = scan_msg.target_url if scan_msg and scan_msg.target_url else chat.title
    screenshot_data = scan_msg.screenshot_data if scan_msg else None
    url_analysis_data = scan_msg.url_analysis_data if scan_msg else None
    duration = scan_msg.duration_sec if scan_msg else None

    parsed = urlparse(url)
    clean_domain = parsed.hostname or url.replace("://", "_").replace("/", "_")
    filename = f"PhishLens_Security_Report_{clean_domain}.pdf"

    try:
        agent = PDFReportAgent()
        pdf_bytes = agent.generate_pdf(
            url=url,
            report=report,
            screenshot_data=screenshot_data,
            url_analysis_data=url_analysis_data,
            duration=duration,
        )

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = len(pdf_bytes)
        return response
    except Exception as e:
        return JsonResponse({"error": f"Failed to generate PDF report: {str(e)}"}, status=500)

