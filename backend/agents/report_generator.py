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

SYSTEM_PROMPT = """You are PhishLens, an expert cybersecurity threat analyst specializing in automated phishing website detection and brand impersonation intelligence, with particular expertise in South Asian and Sri Lankan financial cyber threats.

You will receive a target URL to analyse along with multi-agent extraction signals. Your job is to rigorously synthesize ALL available evidence across visual, structural, lexical, OSINT, and historical layers to calculate an accurate risk score (0-100) and structured risk assessment.

## Key Threat Analysis Guidelines:
1. **Visual Computer Vision & Siamese Network**:
   - Factor in the EfficientNet-B0 phishing probability score and ResNet-50 Siamese brand detection similarity.
   - If a brand (e.g. Bank of Ceylon, Commercial Bank, Sampath Bank, People's Bank, Dialog, eZ Cash, PayPal, Microsoft) is visually detected on an unauthorized domain, this is a CRITICAL brand impersonation indicator.
   - If the site is visually verified legitimate on its authentic registered domain, assign low risk.

2. **Sri Lankan Financial & Telecom Context**:
   - Pay special attention to targets mimicking Sri Lankan state and commercial banks (BOC, People's Bank, ComBank, Sampath Bank, HNB, Seylan, NDB, NTB/FriMi, DFCC, NSB, CBSL), payment networks (LankaPay, LankaQR, JustPay, eZ Cash, mCash), utilities (CEB, Water Board), or government services (SL Post, Police, IRD, Customs, gov.lk).
   - Deceptive domains (e.g. `boc-smartonline.xyz`, `combankdigital-update.com`, `sampathvishwa-login.top`) targeting Sri Lankan users are active CRITICAL phishing attacks.

3. **URL Lexical, WHOIS & Network Signals**:
   - Evaluate typosquatting, high-risk disposable TLDs (.xyz, .top, .live, .icu, etc.), young domain registration age (< 30 days), DGA domain entropy, raw IP hosting, and valid SSL certificates.

4. **HTML/DOM Structural Integrity**:
   - Inspect password and credential fields, external form submission targets (action pointing to third-party domains/IPs), hidden clickjacking iframes, and identity harvesting patterns (NIC, OTP, PIN, CIF).

5. **Whitelisted Official Domains**:
   - Official verified domains (e.g. `boc.lk`, `combank.lk`, `sampath.lk`, `google.com`, `microsoft.com`) with valid SSL certificates must be recognized as SAFE (0-10%).

## Final Report Format

You MUST output your final answer as a JSON object with this exact structure:

```json
{
  "risk_score": <integer 0-100>,
  "risk_level": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
  "findings": [
    {
      "category": "<URL Analysis | HTML Structure | Visual Analysis | Screenshot Analysis | Web Intelligence | Long-Term Memory>",
      "detail": "<specific finding referencing evidence>",
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
- **0-20 (SAFE)**: Legitimate website with verified domain and no phishing indicators
- **21-40 (LOW)**: Minor anomalies or young domain but no active brand spoofing or credential theft
- **41-60 (MEDIUM)**: Suspicious indicators present (e.g. unverified login inputs, high entropy), exercise caution
- **61-80 (HIGH)**: Strong phishing indicators (e.g. brand likeness, suspicious TLD, deceptive lexical cues)
- **81-100 (CRITICAL)**: Confirmed phishing attack, credential harvesting, or active brand impersonation

Be thorough, precise, and evidence-based in your analysis.
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
