"""
PhishLens Agent — Report Generation Layer.

Contains the system prompt that instructs the LLM how to reason
through the analysis and produce the final structured risk report,
as well as the report parsing logic.
"""

import json
import re
from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# System Prompt — Controls Agent Reasoning & Report Format
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are PhishLens, an expert cybersecurity analyst specializing in phishing website detection.

You will receive a target URL to analyse. Your job is to use ALL available tools to gather evidence, then synthesise a final phishing risk report.

## Your Workflow (follow this order):

1. **capture_screenshot** — Take a screenshot of the website to see what users see.
2. **extract_html_features** — Extract HTML/DOM structural features from the page source.
3. **analyze_url_features** — Analyse the URL's lexical structure and WHOIS registration data.
4. **search_web_threat_intel** — Search the live web via Tavily for security advisories, scam reports, blacklist entries, and official domain records.
5. **run_visual_ml_model** — Run the visual ML model on the screenshot to get binary classification of the full-page screenshot as either phishing or legitimate, along with its probability score.

After calling ALL tools and reviewing their outputs, synthesise your findings into a final report. Ensure you explicitly factor in the visual ML model's prediction and probability score, as well as live web intelligence/reputation findings.

## Final Report Format

You MUST output your final answer as a JSON object with this exact structure:

```json
{
  "risk_score": <integer 0-100>,
  "risk_level": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
  "findings": [
    {
      "category": "<URL Analysis | HTML Structure | Visual Analysis | Screenshot Analysis | Web Intelligence>",
      "detail": "<specific finding>",
      "severity": "<low | medium | high | critical>"
    }
  ],
  "brand_impersonation": {
    "detected": <true | false>,
    "brand": "<brand name or null>",
    "confidence": <0.0-1.0 or null>
  },
  "safety_advice": "<actionable advice for the user>",
  "summary": "<one-paragraph executive summary of the analysis>"
}
```

## Scoring Guidelines:
- **0-20 (SAFE)**: Legitimate website with no phishing indicators
- **21-40 (LOW)**: Minor suspicious elements but likely safe
- **41-60 (MEDIUM)**: Multiple suspicious indicators, exercise caution
- **61-80 (HIGH)**: Strong phishing indicators, likely malicious
- **81-100 (CRITICAL)**: Clear phishing attempt, do not interact

Be thorough, precise, and evidence-based in your analysis. Reference specific data from each tool's output.
"""


# ---------------------------------------------------------------------------
# Report Parsing
# ---------------------------------------------------------------------------

def parse_report(raw_content: str) -> Optional[Dict[str, Any]]:
    """
    Extract the JSON report from the LLM's final response.
    The LLM may wrap it in markdown code blocks.

    Args:
        raw_content: The raw text content from the LLM's final message.

    Returns:
        Parsed report dictionary, or a dict with parse_error if extraction fails.
    """
    if not raw_content:
        return None

    # Try to find JSON in code block
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", raw_content, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to parse the whole content as JSON
    try:
        return json.loads(raw_content)
    except json.JSONDecodeError:
        pass

    # Try to find any JSON object in the text
    brace_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # Could not parse — return the raw text wrapped in a dict
    return {
        "raw_response": raw_content,
        "parse_error": "Could not extract structured JSON from LLM response",
    }


def extract_tool_trace(messages) -> list:
    """
    Extract a trace of tool calls from the conversation messages
    for debugging and transparency.

    Args:
        messages: List of LangChain message objects from the agent conversation.

    Returns:
        List of dicts describing each tool call and result.
    """
    trace = []
    for msg in messages:
        msg_type = type(msg).__name__

        if msg_type == "AIMessage" and hasattr(msg, "tool_calls") and msg.tool_calls:
            for tc in msg.tool_calls:
                trace.append({
                    "step": "tool_call",
                    "tool": tc.get("name", "unknown"),
                    "args": tc.get("args", {}),
                })
        elif msg_type == "ToolMessage":
            trace.append({
                "step": "tool_result",
                "tool": getattr(msg, "name", "unknown"),
                "content_preview": str(msg.content)[:200] + "..."
                if len(str(msg.content)) > 200
                else str(msg.content),
            })

    return trace
