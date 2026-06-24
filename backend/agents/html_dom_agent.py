"""
PhishLens Agent — HTML/DOM Extraction Agent.

Extracts structural HTML/DOM features from a web page to detect
phishing indicators such as login forms, external links, hidden iframes,
and suspicious form actions.
"""

import json
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from langchain_core.tools import tool


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "account", "update", "bank", "confirm",
    "password", "signin", "sign-in", "webscr", "ebayisapi", "suspend",
    "billing", "paypal", "apple", "icloud", "recover", "unlock",
    "authenticate", "credential", "wallet", "alert", "notification",
]

KNOWN_BRANDS = [
    "google", "facebook", "apple", "microsoft", "amazon", "netflix",
    "paypal", "instagram", "twitter", "linkedin", "dropbox", "yahoo",
    "outlook", "chase", "wellsfargo", "bankofamerica", "citibank",
    "whatsapp", "telegram", "spotify", "adobe", "github", "steam",
]


# ---------------------------------------------------------------------------
# Tool — HTML/DOM Extraction Agent
# ---------------------------------------------------------------------------

@tool
def extract_html_features(url: str) -> str:
    """
    Extract structural HTML/DOM features from a web page for phishing analysis.

    This tool fetches the raw HTML source of the target URL and analyses
    its DOM structure to detect phishing indicators such as:
    - Login forms and password fields
    - External links pointing to different domains
    - Hidden iframes
    - Suspicious form action URLs
    - External resource loading from foreign domains

    Use this tool AFTER capturing the screenshot to gather structural evidence.

    Returns a JSON object with extracted features and risk indicators.

    Args:
        url: The full URL to analyse (e.g. "https://example.com")
    """
    import re
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    # Normalize URL scheme
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "http://" + url

    try:
        parsed_url = urlparse(url)
        base_domain = parsed_url.hostname or ""

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/115.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True, verify=False)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # --- Forms ---
        forms = soup.find_all("form")
        form_details = []
        for form in forms:
            action = form.get("action", "")
            method = form.get("method", "GET").upper()
            action_domain = urlparse(action).hostname if action.startswith("http") else base_domain
            form_details.append({
                "action": action,
                "method": method,
                "action_domain": action_domain,
                "action_is_external": action_domain != base_domain if action_domain else False,
            })

        # --- Input fields ---
        inputs = soup.find_all("input")
        password_fields = [i for i in inputs if i.get("type", "").lower() == "password"]
        email_fields = [i for i in inputs if i.get("type", "").lower() == "email"]
        text_fields = [i for i in inputs if i.get("type", "").lower() in ("text", "")]
        hidden_fields = [i for i in inputs if i.get("type", "").lower() == "hidden"]

        # --- Links ---
        links = soup.find_all("a", href=True)
        internal_links = 0
        external_links = 0
        null_links = 0
        for link in links:
            href = link["href"]
            if href in ("#", "", "javascript:void(0)", "javascript:;"):
                null_links += 1
            elif href.startswith("http"):
                link_domain = urlparse(href).hostname or ""
                if link_domain == base_domain or link_domain.endswith(f".{base_domain}"):
                    internal_links += 1
                else:
                    external_links += 1
            else:
                internal_links += 1

        # --- Iframes ---
        iframes = soup.find_all("iframe")
        iframe_details = []
        for iframe in iframes:
            src = iframe.get("src", "")
            hidden = iframe.get("style", "")
            iframe_details.append({
                "src": src,
                "potentially_hidden": "display:none" in hidden.replace(" ", "").lower()
                                      or "visibility:hidden" in hidden.replace(" ", "").lower(),
            })

        # --- Favicon ---
        favicon_link = soup.find("link", rel=lambda r: r and "icon" in r.lower() if isinstance(r, str) else
                                 any("icon" in x.lower() for x in r) if r else False)
        favicon_src = favicon_link.get("href", "") if favicon_link else ""
        favicon_domain = urlparse(favicon_src).hostname if favicon_src.startswith("http") else base_domain
        favicon_is_external = favicon_domain != base_domain if favicon_domain else False

        # --- External resources (scripts, stylesheets) ---
        scripts = soup.find_all("script", src=True)
        stylesheets = soup.find_all("link", rel="stylesheet")
        external_scripts = 0
        external_stylesheets = 0
        for script in scripts:
            src = script.get("src", "")
            if src.startswith("http"):
                script_domain = urlparse(src).hostname or ""
                if script_domain != base_domain:
                    external_scripts += 1
        for css in stylesheets:
            href = css.get("href", "")
            if href.startswith("http"):
                css_domain = urlparse(href).hostname or ""
                if css_domain != base_domain:
                    external_stylesheets += 1

        # --- Meta tags ---
        title_tag = soup.find("title")
        meta_desc = soup.find("meta", attrs={"name": "description"})

        # --- Suspicious text patterns ---
        page_text = soup.get_text(separator=" ", strip=True).lower()
        suspicious_text_matches = [
            kw for kw in SUSPICIOUS_KEYWORDS if kw in page_text
        ]

        # --- Brand mentions in text ---
        brand_mentions = [
            brand for brand in KNOWN_BRANDS if brand in page_text
        ]

        # --- Risk indicators ---
        risk_indicators = []
        if len(password_fields) > 0:
            risk_indicators.append("Page contains password input field(s)")
        if len(form_details) > 0 and any(f["action_is_external"] for f in form_details):
            risk_indicators.append("Form submits data to an external domain")
        if external_links > internal_links and len(links) > 3:
            risk_indicators.append("More external links than internal links")
        if null_links > len(links) * 0.5 and len(links) > 3:
            risk_indicators.append("High proportion of null/dead links")
        if favicon_is_external:
            risk_indicators.append("Favicon loaded from external domain")
        if len(iframe_details) > 0:
            risk_indicators.append(f"Page contains {len(iframe_details)} iframe(s)")
        if len(suspicious_text_matches) >= 3:
            risk_indicators.append(f"Multiple suspicious keywords found: {', '.join(suspicious_text_matches[:5])}")

        result = {
            "status": "success",
            "url": url,
            "base_domain": base_domain,
            "page_title": title_tag.string if title_tag else None,
            "meta_description": meta_desc.get("content", "") if meta_desc else None,
            "forms": {
                "count": len(form_details),
                "details": form_details,
            },
            "input_fields": {
                "total": len(inputs),
                "password_fields": len(password_fields),
                "email_fields": len(email_fields),
                "text_fields": len(text_fields),
                "hidden_fields": len(hidden_fields),
            },
            "links": {
                "total": len(links),
                "internal": internal_links,
                "external": external_links,
                "null_or_dead": null_links,
            },
            "iframes": {
                "count": len(iframe_details),
                "details": iframe_details,
            },
            "favicon": {
                "source": favicon_src,
                "domain": favicon_domain,
                "is_external": favicon_is_external,
            },
            "external_resources": {
                "scripts": external_scripts,
                "stylesheets": external_stylesheets,
            },
            "suspicious_keywords_found": suspicious_text_matches,
            "brand_mentions_in_text": brand_mentions,
            "risk_indicators": risk_indicators,
        }

        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({
            "status": "error",
            "url": url,
            "error": str(e),
        }, indent=2)
