"""
PhishLens Agent — Tool definitions for the ReAct orchestrator.

Each function is decorated with @tool and has a descriptive docstring
that the LLM reads to decide when to call it.
"""

import asyncio
import base64
import io
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse

from typing import Optional, Dict, Any, List
from langchain_core.tools import tool
from playwright.async_api import async_playwright
from backend.agents.visual_model import predict_screenshot
from backend.agents.web_search_agent import search_web_threat_intel

# Disable Playwright waiting for font load to prevent screenshot hangs/timeouts
os.environ["PW_TEST_SCREENSHOT_NO_FONTS_READY"] = "1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_domain(url: str) -> str:
    """Extract the registered domain from a URL."""
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    return hostname


# ---------------------------------------------------------------------------
# Tool 1 — Web Scraping Agent (Screenshot Capture in Memory)
# ---------------------------------------------------------------------------

@tool
def capture_screenshot(url: str) -> str:
    """
    Capture a full-page/viewport screenshot of the target URL using a stealth headless browser.

    Use this tool FIRST when analysing a website for phishing.
    It navigates to the URL, allows dynamic SPA frameworks (React/Vue) and stylesheets to paint,
    dismisses loading overlays, and returns a 1280x800 PNG screenshot directly as a Base64 data URI
    without writing any media files to disk.

    Returns a JSON object with:
    - screenshot_data: Base64 data URI of the captured screenshot (data:image/png;base64,...)
    - screenshot_url: Base64 data URI for direct rendering
    - screenshot_path: None (stored in-memory/DB only)
    - page_title: the <title> of the page
    - final_url: the URL after any redirects
    - status: "success" or "error"
    - warning: warning message if partial load occurred
    - error: error message if status is "error"

    Args:
        url: The full URL to capture (e.g. "https://example.com")
    """
    # Normalize URL scheme
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "http://" + url

    async def _capture():
        async with async_playwright() as p:
            # Modern Headless Chromium with proper software rasterization
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--headless=new",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-web-security",
                    "--allow-running-insecure-content",
                    "--window-size=1280,800",
                ]
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                ignore_https_errors=True,
                bypass_csp=True,
                device_scale_factor=1,
            )
            # Anti-bot detection stealth & font loading unblocker
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                window.chrome = { runtime: {} };
                try {
                    Object.defineProperty(document.fonts, 'ready', { get: () => Promise.resolve() });
                    Object.defineProperty(document.fonts, 'status', { get: () => 'loaded' });
                } catch (e) {}
            """)

            # Set realistic headers
            await context.set_extra_http_headers({
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            })

            page = await context.new_page()

            # Auto-dismiss any unexpected alert/confirm dialogs
            page.on("dialog", lambda dialog: asyncio.create_task(dialog.dismiss()))

            title = "Unknown Page"
            final_url = url
            status = "success"
            err_msg = None

            try:
                # Navigate with domcontentloaded (fast & reliable)
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                final_url = page.url
            except Exception as nav_ex:
                err_msg = f"Page load warning/timeout: {str(nav_ex)}"
                try:
                    final_url = page.url
                except Exception:
                    pass

            # Inject comprehensive DOM unblocking, animations override, modal hiding, and lazyload resolution
            try:
                await page.wait_for_timeout(1500)
                await page.evaluate("""
                    () => {
                        // Force font readiness
                        try {
                            Object.defineProperty(document.fonts, 'ready', { get: () => Promise.resolve() });
                            Object.defineProperty(document.fonts, 'status', { get: () => 'loaded' });
                        } catch (e) {}

                        // 1. Inject global CSS overrides for animations, modals, loaders, and overflow
                        const style = document.createElement('style');
                        style.id = 'phishlens-screenshot-enhancements';
                        style.innerHTML = `
                            *, *::before, *::after {
                                transition: none !important;
                                transition-duration: 0s !important;
                                animation: none !important;
                                animation-duration: 0s !important;
                                animation-delay: 0s !important;
                            }
                            [data-aos], .aos-init, .aos-animate {
                                opacity: 1 !important;
                                transform: none !important;
                                visibility: visible !important;
                                transition: none !important;
                            }
                            .wow {
                                visibility: visible !important;
                                opacity: 1 !important;
                                animation: none !important;
                            }
                            [data-sal], [data-scroll], .fade-in, .animated {
                                opacity: 1 !important;
                                transform: none !important;
                                visibility: visible !important;
                            }
                            html, body {
                                overflow: visible !important;
                                height: auto !important;
                                min-height: 100% !important;
                                max-height: none !important;
                            }
                            /* Hide obstructive popups, modals, overlays, cookie banners, loaders */
                            #popup-container, .home-pop-up, #overlay, .modal-backdrop, .modal,
                            [class*="popup"]:not([class*="nav"]):not([class*="menu"]),
                            [id*="popup"]:not([id*="nav"]):not([id*="menu"]),
                            [class*="cookie"], [id*="cookie"],
                            .splash-screen, #splash-screen,
                            .preloader, #preloader, .loader, #loader, .spinner, .loading-overlay, #loading {
                                display: none !important;
                                opacity: 0 !important;
                                visibility: hidden !important;
                                pointer-events: none !important;
                                z-index: -9999 !important;
                            }
                        `;
                        document.head.appendChild(style);

                        // 2. Add aos-animate class and inline visibility to all animated elements
                        document.querySelectorAll('[data-aos], .aos-init, .wow, [data-sal]').forEach(el => {
                            el.classList.add('aos-animate');
                            el.style.opacity = '1';
                            el.style.visibility = 'visible';
                            el.style.transform = 'none';
                        });

                        // 3. Force lazy-loaded images to eager and set src/srcset
                        document.querySelectorAll('img').forEach(img => {
                            img.loading = 'eager';
                            if (img.dataset.src) img.src = img.dataset.src;
                            if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                            if (img.dataset.original) img.src = img.dataset.original;
                            if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
                            img.style.opacity = '1';
                            img.style.visibility = 'visible';
                        });

                        // 4. Force background images on elements with data-bg or data-background
                        document.querySelectorAll('[data-bg], [data-background], [data-bg-src]').forEach(el => {
                            const bg = el.dataset.bg || el.dataset.background || el.dataset.bgSrc;
                            if (bg) el.style.backgroundImage = `url("${bg}")`;
                        });
                    }
                """)

                # Step-by-step scroll across full page height to trigger IntersectionObservers & lazy loaders
                await page.evaluate("""
                    async () => {
                        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                        const step = 800;
                        for (let y = 0; y < scrollHeight; y += step) {
                            window.scrollTo(0, y);
                            window.dispatchEvent(new Event('scroll'));
                            await new Promise(r => setTimeout(r, 50));
                        }
                        window.scrollTo(0, 0);
                        window.dispatchEvent(new Event('scroll'));
                        window.dispatchEvent(new Event('resize'));
                    }
                """)
                await page.wait_for_timeout(800)
                title = await page.title() or "Untitled Page"
            except Exception:
                try:
                    title = await page.title() or "Untitled Page"
                except Exception:
                    pass

            # Capture full website screenshot in memory (with viewport fallback)
            screenshot_bytes = None
            try:
                screenshot_bytes = await page.screenshot(
                    full_page=True,
                    animations="disabled",
                    timeout=15000
                )
            except Exception as full_ex:
                # Fallback to viewport screenshot if full-page capture encounters an issue
                try:
                    screenshot_bytes = await page.screenshot(
                        full_page=False,
                        animations="disabled",
                        timeout=8000
                    )
                except Exception as ss_ex:
                    err_msg = f"Screenshot capture error: {str(ss_ex)}"

            has_valid_ss = bool(screenshot_bytes and len(screenshot_bytes) > 500)
            if has_valid_ss:
                b64_str = base64.b64encode(screenshot_bytes).decode("utf-8")
                screenshot_data = f"data:image/png;base64,{b64_str}"
            else:
                # Generate high-resolution 1280x800 fallback banner canvas in memory
                from PIL import Image, ImageDraw
                fallback_img = Image.new("RGB", (1280, 800), color=(24, 24, 27))
                draw = ImageDraw.Draw(fallback_img)
                # Header warning banner
                draw.rectangle((0, 0, 1280, 80), fill=(220, 38, 38))
                draw.text((40, 28), f"[!] PHISHLENS SCREENSHOT CAPTURE NOTICE: {url}", fill=(255, 255, 255))
                draw.text((40, 120), f"Target URL: {url}", fill=(220, 220, 220))
                draw.text((40, 160), f"Status: {err_msg or 'Connection could not be established'}", fill=(180, 180, 180))
                draw.text((40, 200), "The visual analysis will proceed using available DOM & lexical signals.", fill=(140, 140, 140))
                
                buf = io.BytesIO()
                fallback_img.save(buf, format="PNG")
                buf.seek(0)
                b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
                screenshot_data = f"data:image/png;base64,{b64_str}"
                if not err_msg:
                    err_msg = "Screenshot capture produced empty bytes; created informative diagnostic canvas."

            await browser.close()

            return {
                "screenshot_data": screenshot_data,
                "screenshot_url": screenshot_data,
                "screenshot_path": None,
                "has_valid_screenshot": has_valid_ss,
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
        try:
            from PIL import Image, ImageDraw
            fallback_img = Image.new("RGB", (1280, 800), color=(24, 24, 27))
            draw = ImageDraw.Draw(fallback_img)
            draw.rectangle((0, 0, 1280, 80), fill=(220, 38, 38))
            draw.text((40, 28), f"[!] PHISHLENS SCREENSHOT CAPTURE NOTICE: {url}", fill=(255, 255, 255))
            draw.text((40, 120), f"Target URL: {url}", fill=(220, 220, 220))
            draw.text((40, 160), f"Status: {str(e)}", fill=(180, 180, 180))
            draw.text((40, 200), "Visual ML analysis will evaluate diagnostic canvas.", fill=(140, 140, 140))
            buf = io.BytesIO()
            fallback_img.save(buf, format="PNG")
            buf.seek(0)
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
            screenshot_data = f"data:image/png;base64,{b64_str}"
        except Exception:
            screenshot_data = None

        return json.dumps({
            "screenshot_data": screenshot_data,
            "screenshot_url": screenshot_data,
            "screenshot_path": None,
            "page_title": "Screenshot Error",
            "final_url": url,
            "status": "error",
            "warning": f"Screenshot capture error: {str(e)}",
            "error": str(e),
        }, indent=2)


# ---------------------------------------------------------------------------
# Tool 2 — Two-Stage Visual ML Model (In-Memory Base64 Support)
# ---------------------------------------------------------------------------

@tool
def run_visual_ml_model(screenshot_data: Optional[str] = "", screenshot_path: Optional[str] = "") -> str:
    """
    Run the custom PyTorch two-stage visual computer vision model on a website screenshot:
    
    - Stage 1 (Binary Phishing Classifier - EfficientNet-B0): Performs binary classification
      of the full-page screenshot into phishing vs legitimate (threshold probability >= 0.60).
    - Stage 2 (Brand Identification - ResNet-50 Siamese Network): If Stage 1 flags phishing,
      Stage 2 localizes the brand logo, computes 128-D cosine similarity embeddings, and matches
      against the reference brand gallery to identify the specific impersonated brand.

    Args:
        screenshot_data: Base64 data URI string of the screenshot (data:image/png;base64,...)
        screenshot_path: Optional legacy file path or data URI
    """
    target_input = (screenshot_data or "").strip() or (screenshot_path or "").strip()
    if not target_input:
        return json.dumps({
            "status": "error",
            "error": "No screenshot input provided for visual ML model.",
            "prediction": "unknown",
            "probability": None,
            "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
            "annotated_screenshot_data": None,
        })
    try:
        from backend.agents.visual_model import predict_screenshot
        result = predict_screenshot(target_input)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({
            "status": "error",
            "error": f"Visual model execution error: {str(e)}",
            "prediction": "unknown",
            "probability": None,
            "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
            "annotated_screenshot_data": None,
        }, indent=2)

