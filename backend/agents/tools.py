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
    async def _capture():
        async with async_playwright() as p:
            # Optimize startup time with lean arguments
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--blink-settings=imagesEnabled=true" # Ensure images render for visual check
                ]
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/115.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()

            # Latency Optimization: Block analytical/ad resources that delay load times
            # but don't impact the layout or branding of the site.
            blocked_patterns = [
                r"analytics", r"telemetry", r"tracking", r"doubleclick", r"google-analytics",
                r"facebook\.net", r"hotjar", r"mixpanel", r"adsystem", r"optimizely"
            ]
            async def route_handler(route):
                request_url = route.request.url.lower()
                if any(re.search(pattern, request_url) for pattern in blocked_patterns):
                    await route.abort()
                else:
                    await route.continue_()

            await page.route("**/*", route_handler)

            title = "Unknown Page"
            final_url = url
            status = "success"
            err_msg = None

            try:
                # Latency Optimization: Use "load" instead of "networkidle" (which waits for 500ms quiet)
                # and bound the load time to 20 seconds max.
                await page.goto(url, wait_until="load", timeout=20000)
                title = await page.title()
                final_url = page.url
            except Exception as nav_ex:
                # Fallback: If page load times out, proceed to screenshot whatever has loaded anyway
                err_msg = f"Navigation completed with warning/timeout: {str(nav_ex)}"
                try:
                    title = await page.title() or "Loaded partially"
                    final_url = page.url
                except Exception:
                    pass

            # Capture screenshot
            try:
                screenshot_bytes = await page.screenshot(full_page=True, type="png", timeout=15000)
            except Exception as ss_ex:
                # If full_page screenshot fails or times out, capture viewport screenshot immediately
                screenshot_bytes = await page.screenshot(full_page=False, type="png")
                err_msg = f"Full-page capture timed out, viewport captured instead: {str(ss_ex)}"

            # Save screenshot to disk
            timestamp = int(time.time())
            safe_domain = re.sub(r"[^a-zA-Z0-9]", "_", _extract_domain(url))
            filename = f"{safe_domain}_{timestamp}.png"
            filepath = SCREENSHOTS_DIR / filename
            filepath.write_bytes(screenshot_bytes)

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
# Tool 2 — Visual ML Model (Placeholder)
# ---------------------------------------------------------------------------

@tool
def run_visual_ml_model(screenshot_path: str) -> str:
    """
    Run the custom CNN/Siamese visual similarity model on a website screenshot
    to detect brand impersonation.

    This model compares the visual appearance of the captured screenshot against
    a database of known brand login pages (Google, Facebook, PayPal, etc.)
    to identify if the website is visually mimicking a legitimate brand.

    NOTE: This model is not yet integrated. It will return a placeholder result.
    Still call this tool so the pipeline is complete — the result will indicate
    the model was skipped.

    Args:
        screenshot_path: Absolute file path to the screenshot PNG captured by capture_screenshot
    """
    return json.dumps({
        "status": "skipped",
        "screenshot_path": screenshot_path,
        "message": "Custom CNN/Siamese visual ML model is not yet integrated. "
                   "Brand impersonation detection via visual similarity is pending. "
                   "Please rely on HTML and URL analysis for now.",
        "brand_detected": None,
        "confidence": None,
    }, indent=2)
