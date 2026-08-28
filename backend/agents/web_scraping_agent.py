import asyncio
import base64
import time
from typing import Dict, Any

from playwright.async_api import async_playwright
from backend.agents.base_agent import BaseAgent, AgentResult, AgentStatus

class WebScrapingAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="WebScrapingAgent")

    async def run(self, url: str) -> AgentResult:
        start_time = time.time()
        try:
            async with async_playwright() as p:
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
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    ignore_https_errors=True,
                )
                await context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                    window.chrome = { runtime: {} };
                    try {
                        Object.defineProperty(document.fonts, 'ready', { get: () => Promise.resolve() });
                        Object.defineProperty(document.fonts, 'status', { get: () => 'loaded' });
                    } catch (e) {}
                """)
                page = await context.new_page()

                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                except Exception:
                    pass

                await page.wait_for_timeout(1500)
                
                # Unblock styles and animations
                try:
                    await page.evaluate("""
                        () => {
                            const style = document.createElement('style');
                            style.innerHTML = `
                                *, *::before, *::after {
                                    transition: none !important;
                                    animation: none !important;
                                }
                                [data-aos], .aos-init, .aos-animate, .wow {
                                    opacity: 1 !important;
                                    transform: none !important;
                                    visibility: visible !important;
                                }
                                html, body {
                                    overflow: visible !important;
                                    height: auto !important;
                                }
                                #popup-container, .home-pop-up, #overlay, .modal-backdrop, .modal,
                                [class*="popup"]:not([class*="nav"]):not([class*="menu"]),
                                [id*="popup"]:not([id*="nav"]):not([id*="menu"]),
                                [class*="cookie"], [id*="cookie"],
                                .splash-screen, #splash-screen,
                                .preloader, #preloader, .loader, #loader, .spinner, .loading-overlay {
                                    display: none !important;
                                    opacity: 0 !important;
                                    visibility: hidden !important;
                                }
                            `;
                            document.head.appendChild(style);
                            document.querySelectorAll('[data-aos], .aos-init, .wow').forEach(el => {
                                el.classList.add('aos-animate');
                                el.style.opacity = '1';
                                el.style.visibility = 'visible';
                            });
                            document.querySelectorAll('img').forEach(img => {
                                img.loading = 'eager';
                                if (img.dataset.src) img.src = img.dataset.src;
                                if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                            });
                        }
                    """)
                    await page.evaluate("""
                        async () => {
                            const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
                            for (let y = 0; y < scrollHeight; y += 800) {
                                window.scrollTo(0, y);
                                window.dispatchEvent(new Event('scroll'));
                                await new Promise(r => setTimeout(r, 40));
                            }
                            window.scrollTo(0, 0);
                        }
                    """)
                    await page.wait_for_timeout(600)
                except Exception:
                    pass

                # Extract page metadata
                title = await page.title() or "Untitled Page"
                
                # Take full page screenshot
                screenshot_bytes = await page.screenshot(full_page=True, animations="disabled", timeout=15000)
                screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

                await browser.close()

                duration = time.time() - start_time
                payload: Dict[str, Any] = {
                    "title": title,
                    "screenshot_b64": screenshot_b64,
                }
                
                return AgentResult(
                    name=self.name,
                    status=AgentStatus.COMPLETED,
                    duration_sec=duration,
                    data=payload
                )
        except Exception as e:
            duration = time.time() - start_time
            return AgentResult(
                name=self.name,
                status=AgentStatus.FAILED,
                duration_sec=duration,
                error=str(e)
            )
