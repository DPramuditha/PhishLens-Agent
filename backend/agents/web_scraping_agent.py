import asyncio
import base64
import time
from typing import Dict, Any

from playwright.async_api import async_playwright
from .base_agent import BaseAgent, AgentResult, AgentStatus

class WebScrapingAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="WebScrapingAgent")

    async def run(self, url: str) -> AgentResult:
        start_time = time.time()
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
                )
                page = await context.new_page()

                # Navigate and wait for network idle to ensure full rendering
                await page.goto(url, wait_until="networkidle", timeout=30000)
                
                # Extract page metadata
                title = await page.title()
                
                # Take full page screenshot
                screenshot_bytes = await page.screenshot(full_page=True, type="png")
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
