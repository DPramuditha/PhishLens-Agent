"""
PhishLens Agent — URL Feature Extractor Agent.

Analyses lexical and registration attributes of a URL to detect
phishing indicators such as suspicious length, IP-based domains,
high entropy, typosquatting, and young domain age via WHOIS.
"""

import json
import math
import re
from collections import Counter
from urllib.parse import urlparse

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
# Helpers
# ---------------------------------------------------------------------------

def _shannon_entropy(text: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not text:
        return 0.0
    freq = Counter(text)
    length = len(text)
    return -sum(
        (count / length) * math.log2(count / length)
        for count in freq.values()
    )


def _is_ip_address(hostname: str) -> bool:
    """Check if the hostname is an IP address."""
    parts = hostname.split(".")
    if len(parts) == 4:
        return all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)
    return False


# ---------------------------------------------------------------------------
# Tool — URL Feature Extractor Agent
# ---------------------------------------------------------------------------

@tool
def analyze_url_features(url: str) -> str:
    """
    Analyse lexical and registration features of a URL for phishing detection.

    This tool examines the URL structure itself (without visiting the page)
    to detect phishing indicators such as:
    - Suspiciously long URLs
    - IP address usage instead of domain name
    - Excessive subdomains
    - High Shannon entropy (randomness) in the domain
    - Typosquatting patterns against known brands
    - Domain age and registrar info via WHOIS lookup

    Use this tool to complement HTML and screenshot analysis with URL-level signals.

    Returns a JSON object with URL features, WHOIS data, and risk indicators.

    Args:
        url: The full URL to analyse (e.g. "https://example.com/login")
    """
    # Normalize URL scheme
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "http://" + url

    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        path = parsed.path or ""
        scheme = parsed.scheme or ""

        # --- Lexical features ---
        url_length = len(url)
        dot_count = hostname.count(".")
        hyphen_count = hostname.count("-")
        at_sign = "@" in url
        double_slash_in_path = "//" in path
        has_ip = _is_ip_address(hostname)

        # Subdomain analysis
        parts = hostname.split(".")
        # Remove TLD and domain - rest are subdomains
        subdomain_count = max(0, len(parts) - 2) if not has_ip else 0
        subdomain_depth = subdomain_count

        # TLD
        tld = parts[-1] if parts else ""

        # Shannon entropy
        domain_without_tld = ".".join(parts[:-1]) if len(parts) > 1 else hostname
        entropy = round(_shannon_entropy(domain_without_tld), 4)

        # Special characters in URL
        special_char_count = len(re.findall(r"[~!@#$%^&*()_+=\[\]{};:'\",<>?\\|`]", url))

        # Suspicious keywords in URL
        url_lower = url.lower()
        url_suspicious_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in url_lower]

        # --- Typosquatting detection ---
        typosquatting_matches = []
        domain_lower = hostname.lower()
        for brand in KNOWN_BRANDS:
            if brand in domain_lower and brand + "." not in domain_lower.split(".")[-2] + ".":
                # Brand appears in domain but is not the exact domain
                # e.g. "google-login.com" or "paypal.secure-verify.com"
                if not domain_lower.endswith(f"{brand}.com") and \
                   not domain_lower.endswith(f"{brand}.org") and \
                   not domain_lower.endswith(f"{brand}.net"):
                    typosquatting_matches.append({
                        "brand": brand,
                        "pattern": f"Brand '{brand}' found in domain '{hostname}' -- possible impersonation",
                    })

        # --- WHOIS lookup ---
        whois_data = {}
        try:
            import whois
            w = whois.whois(hostname)
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            expiration_date = w.expiration_date
            if isinstance(expiration_date, list):
                expiration_date = expiration_date[0]

            from datetime import datetime
            domain_age_days = None
            if creation_date:
                domain_age_days = (datetime.now() - creation_date).days

            whois_data = {
                "registrar": w.registrar,
                "creation_date": str(creation_date) if creation_date else None,
                "expiration_date": str(expiration_date) if expiration_date else None,
                "domain_age_days": domain_age_days,
                "name_servers": w.name_servers[:3] if w.name_servers else None,
                "country": w.country,
                "status": "success",
            }
        except Exception as whois_err:
            whois_data = {
                "status": "error",
                "error": str(whois_err),
            }

        # --- Risk indicators ---
        risk_indicators = []
        if url_length > 75:
            risk_indicators.append(f"Suspiciously long URL ({url_length} characters)")
        if has_ip:
            risk_indicators.append("Domain is an IP address instead of a hostname")
        if at_sign:
            risk_indicators.append("URL contains '@' symbol -- possible URL obfuscation")
        if double_slash_in_path:
            risk_indicators.append("Path contains '//' -- possible redirect trick")
        if subdomain_depth >= 3:
            risk_indicators.append(f"Excessive subdomain depth ({subdomain_depth} levels)")
        if entropy > 3.5:
            risk_indicators.append(f"High domain entropy ({entropy}) -- possibly random/generated domain")
        if hyphen_count >= 3:
            risk_indicators.append(f"Excessive hyphens in domain ({hyphen_count})")
        if len(url_suspicious_keywords) > 0:
            risk_indicators.append(f"Suspicious keywords in URL: {', '.join(url_suspicious_keywords)}")
        if len(typosquatting_matches) > 0:
            risk_indicators.append(f"Possible typosquatting of: {', '.join(m['brand'] for m in typosquatting_matches)}")
        if scheme != "https":
            risk_indicators.append("Site does not use HTTPS")
        if whois_data.get("domain_age_days") is not None and whois_data["domain_age_days"] < 30:
            risk_indicators.append(f"Very young domain -- registered only {whois_data['domain_age_days']} days ago")

        result = {
            "status": "success",
            "url": url,
            "lexical_features": {
                "url_length": url_length,
                "hostname": hostname,
                "scheme": scheme,
                "tld": tld,
                "dot_count": dot_count,
                "hyphen_count": hyphen_count,
                "at_sign_present": at_sign,
                "double_slash_in_path": double_slash_in_path,
                "is_ip_address": has_ip,
                "subdomain_count": subdomain_count,
                "subdomain_depth": subdomain_depth,
                "special_char_count": special_char_count,
                "domain_entropy": entropy,
            },
            "suspicious_keywords_in_url": url_suspicious_keywords,
            "typosquatting_analysis": typosquatting_matches,
            "whois": whois_data,
            "risk_indicators": risk_indicators,
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({
            "status": "error",
            "url": url,
            "error": str(e),
        }, indent=2)
