"""
PhishLens Agent — Tool definitions for the ReAct orchestrator.

Each function is decorated with @tool and has a descriptive docstring
that the LLM reads to decide when to call it.
"""

import asyncio
import base64
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse

from langchain_core.tools import tool
from playwright.async_api import async_playwright
from backend.agents.visual_model import predict_screenshot

# Disable Playwright waiting for font load to prevent screenshot hangs/timeouts
os.environ["PW_TEST_SCREENSHOT_NO_FONTS_READY"] = "1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SCREENSHOTS_DIR = Path(__file__).resolve().parent.parent.parent / "media" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


def _extract_domain(url: str) -> str:
    """Extract the registered domain from a URL."""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    return hostname


# ---------------------------------------------------------------------------
# Tool 1 — Web Scraping Agent (Screenshot Capture)
# ---------------------------------------------------------------------------

@tool
def capture_screenshot(url: str) -> str:
    """
    Capture a full-page screenshot of the target URL using an optimized headless browser.

    Use this tool FIRST when analysing a website for phishing.
    It navigates to the URL using an optimized network profile,
    blocks unnecessary scripts/trackers to minimize load latency,
    and saves a PNG screenshot to disk.

    Returns a JSON object with:
    - screenshot_path: file path to the saved screenshot
    - page_title: the <title> of the page
    - final_url: the URL after any redirects
    - status: "success" or "error"
    - error: error message if status is "error"

    Args:
        url: The full URL to capture (e.g. "https://example.com")
    """
    # Normalize URL scheme
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "http://" + url

    async def _capture():
        async with async_playwright() as p:
            # Optimize startup time with lean arguments and bot-bypass flags
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-web-security",  # Disable CORS/web security to load all fonts/assets
                    "--disable-blink-features=AutomationControlled",
                    "--blink-settings=imagesEnabled=true" # Ensure images render for visual check
                ]
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                ignore_https_errors=True,  # Bypass certificate verification errors
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0.0.0 Safari/537.36"
                ),
            )
            # Add headers to match a real browser
            await context.set_extra_http_headers({
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            })
            page = await context.new_page()

            # Latency Optimization: Block analytical/ad resources that delay load times
            # but don't impact the layout or branding of the site.
            blocked_patterns = [
                r"analytics", r"telemetry", r"tracking", r"doubleclick", r"google-analytics",
                r"facebook\.net", r"hotjar", r"mixpanel", r"adsystem", r"optimizely"
            ]
            async def route_handler(route):
                try:
                    request_url = route.request.url.lower()
                    if any(re.search(pattern, request_url) for pattern in blocked_patterns):
                        await route.abort()
                    else:
                        await route.continue_()
                except Exception:
                    try:
                        await route.continue_()
                    except Exception:
                        pass

            await page.route("**/*", route_handler)

            title = "Unknown Page"
            final_url = url
            status = "success"
            err_msg = None

            try:
                # Latency Optimization: Use "domcontentloaded" to avoid waiting for heavy ads/trackers
                # and bound the load time to 20 seconds max.
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                # Let dynamic JS/SPA frameworks and images finish rendering
                await page.wait_for_timeout(2000)
                title = await page.title()
                final_url = page.url
            except Exception as nav_ex:
                # Fallback: If page load times out, wait a moment and proceed anyway
                err_msg = f"Navigation completed with warning/timeout: {str(nav_ex)}"
                try:
                    await page.wait_for_timeout(1500)
                    title = await page.title() or "Loaded partially"
                    final_url = page.url
                except Exception:
                    pass

            # Capture screenshot
            screenshot_bytes = None
            
            # Step 1: Capture viewport screenshot first (fast, reliable, almost never crashes)
            try:
                screenshot_bytes = await page.screenshot(full_page=False, type="png", timeout=15000)
            except Exception as ss_viewport_ex:
                err_msg = f"Viewport screenshot failed: {str(ss_viewport_ex)}"

            # Step 2: Try capturing full-page screenshot (if it crashes, we already have viewport bytes)
            if screenshot_bytes:
                try:
                    full_page_bytes = await page.screenshot(full_page=True, type="png", timeout=25000)
                    screenshot_bytes = full_page_bytes
                except Exception as ss_full_ex:
                    # Keep viewport bytes, log warning
                    err_msg = f"Full-page capture failed/timed out, viewport returned: {str(ss_full_ex)}"

            # Save screenshot to disk
            timestamp = int(time.time())
            safe_domain = re.sub(r"[^a-zA-Z0-9]", "_", _extract_domain(url))
            filename = f"{safe_domain}_{timestamp}.png"
            filepath = SCREENSHOTS_DIR / filename
            
            if screenshot_bytes:
                filepath.write_bytes(screenshot_bytes)
            else:
                # Solid light-gray placeholder PNG
                placeholder_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                filepath.write_bytes(base64.b64decode(placeholder_b64))
                if not err_msg:
                    err_msg = "Could not capture screenshot of target website. A blank/placeholder image was saved instead."

            await browser.close()

            return {
                "screenshot_path": str(filepath),
                "page_title": title,
                "final_url": final_url,
                "status": status,
                "warning": err_msg
            }

    try:
        # Handle event loop — may already be running in Django
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            result = loop.run_until_complete(_capture())
        else:
            result = asyncio.run(_capture())

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({
            "screenshot_path": None,
            "page_title": None,
            "final_url": None,
            "status": "error",
            "error": str(e),
        }, indent=2)



# ---------------------------------------------------------------------------
# Tool 2 — Visual ML Model
# ---------------------------------------------------------------------------

@tool
def run_visual_ml_model(screenshot_path: str) -> str:
    """
    Run the custom PyTorch visual classification model on a website screenshot
    to detect if it is phishing or legitimate.

    This model performs binary classification of the screenshot to determine if the
    overall visual design represents a phishing attempt (probability >= 0.60).

    Args:
        screenshot_path: Absolute file path to the screenshot PNG captured by capture_screenshot
    """
    result = predict_screenshot(screenshot_path)
    return json.dumps(result, indent=2)
