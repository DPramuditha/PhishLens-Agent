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
    # General Phishing & Auth Keywords
    "login", "verify", "secure", "account", "update", "bank", "confirm",
    "password", "signin", "sign-in", "webscr", "ebayisapi", "suspend",
    "billing", "paypal", "apple", "icloud", "recover", "unlock",
    "authenticate", "credential", "wallet", "alert", "notification",
    "portal", "validation", "security-check", "session", "support-ticket",
    # Sri Lankan Specific Banking & Service Keywords
    "vishwa", "smartpay", "combankdigital", "peopleswave", "solo", "frimi",
    "ezcash", "mcash", "cebcare", "billpayment", "electricitybill", "waterboard",
    "trafficfine", "policefine", "parceldelivery", "slpost", "customsclearance",
    "epf", "etf", "lankaqr", "justpay", "cbsl", "nic", "identitycard",
    "ebanking", "ibanking", "digitalbanking", "cardverification", "otp"
]

# Comprehensive Brand Definitions with official domain patterns
# Maps brand identifiers to their authentic legitimate root domains
OFFICIAL_BRAND_DOMAINS = {
    # --- Sri Lankan State & Commercial Banks ---
    "boc": ["boc.lk"],
    "bank of ceylon": ["boc.lk"],
    "peoplesbank": ["peoplesbank.lk"],
    "peoples bank": ["peoplesbank.lk"],
    "peopleswave": ["peoplesbank.lk"],
    "combank": ["combank.lk", "commercialbank.lk", "combankdigital.com"],
    "commercial bank": ["combank.lk", "commercialbank.lk", "combankdigital.com"],
    "combankdigital": ["combank.lk", "commercialbank.lk", "combankdigital.com"],
    "sampath": ["sampath.lk"],
    "sampath bank": ["sampath.lk"],
    "vishwa": ["sampath.lk"],
    "hnb": ["hnb.net", "hnb.lk"],
    "hatton national bank": ["hnb.net", "hnb.lk"],
    "hnb solo": ["hnb.net", "hnb.lk"],
    "ndb": ["ndbbank.com"],
    "ndb bank": ["ndbbank.com"],
    "ndb neos": ["ndbbank.com"],
    "seylan": ["seylan.lk"],
    "seylan bank": ["seylan.lk"],
    "nationstrust": ["nationstrust.com"],
    "nations trust bank": ["nationstrust.com"],
    "frimi": ["frimi.lk", "nationstrust.com"],
    "dfcc": ["dfcc.lk"],
    "dfcc bank": ["dfcc.lk"],
    "nsb": ["nsb.lk"],
    "national savings bank": ["nsb.lk"],
    "panasia": ["panasia.lk"],
    "pan asia bank": ["panasia.lk"],
    "unionb": ["unionb.com"],
    "union bank": ["unionb.com"],
    "amanabank": ["amanabank.lk"],
    "amana bank": ["amanabank.lk"],
    "cargillsbank": ["cargillsbank.com"],
    "cargills bank": ["cargillsbank.com"],
    "cbsl": ["cbsl.gov.lk"],
    "central bank of sri lanka": ["cbsl.gov.lk"],
    "sdb": ["sdb.lk"],
    "rdb": ["rdb.lk"],
    "mbsl": ["mbslbank.com"],

    # --- Sri Lankan Telecom, Mobile Money & Payments ---
    "dialog": ["dialog.lk"],
    "dialog axiata": ["dialog.lk"],
    "mydialog": ["dialog.lk"],
    "ezcash": ["ezcash.lk", "dialog.lk"],
    "slt": ["slt.lk"],
    "mobitel": ["mobitel.lk", "slt.lk"],
    "slt-mobitel": ["slt.lk", "mobitel.lk"],
    "mcash": ["mcash.lk", "mobitel.lk"],
    "lankapay": ["lankapay.net", "lankaclear.com"],
    "lankaqr": ["lankapay.net", "lankaclear.com"],
    "justpay": ["lankapay.net", "lankaclear.com"],
    "airtel": ["airtel.lk", "airtel.in"],
    "hutch": ["hutch.lk"],

    # --- Sri Lankan Utilities & Government Portals ---
    "ceb": ["ceb.lk"],
    "cebcare": ["ceb.lk"],
    "waterboard": ["waterboard.lk"],
    "nwsdb": ["waterboard.lk"],
    "slpost": ["slpost.gov.lk"],
    "sri lanka post": ["slpost.gov.lk"],
    "police": ["police.lk", "police.gov.lk"],
    "sri lanka police": ["police.lk", "police.gov.lk"],
    "customs": ["customs.gov.lk"],
    "ird": ["ird.gov.lk"],
    "cert": ["cert.gov.lk"],
    "dmt": ["dmt.gov.lk"],
    "gic": ["gic.gov.lk"],
    "gov.lk": ["gov.lk"],

    # --- Sri Lankan E-Commerce & Services ---
    "daraz": ["daraz.lk"],
    "ikman": ["ikman.lk"],
    "kapruka": ["kapruka.com"],
    "pickme": ["pickme.lk"],

    # --- Major Global Target Brands ---
    "google": ["google.com", "google.lk", "accounts.google.com"],
    "microsoft": ["microsoft.com", "live.com", "office.com", "azure.com"],
    "apple": ["apple.com", "icloud.com"],
    "paypal": ["paypal.com"],
    "amazon": ["amazon.com", "aws.amazon.com"],
    "netflix": ["netflix.com"],
    "facebook": ["facebook.com", "fb.com", "meta.com"],
    "instagram": ["instagram.com"],
    "whatsapp": ["whatsapp.com"],
    "twitter": ["twitter.com", "x.com"],
    "linkedin": ["linkedin.com"],
    "dropbox": ["dropbox.com"],
    "yahoo": ["yahoo.com"],
    "chase": ["chase.com"],
    "bankofamerica": ["bankofamerica.com"],
    "wellsfargo": ["wellsfargo.com"],
    "citibank": ["citi.com", "citibank.com"],
    "binance": ["binance.com"],
    "coinbase": ["coinbase.com"],
    "steam": ["steampowered.com", "steamcommunity.com"],
    "docusign": ["docusign.com"],
}

KNOWN_BRANDS = list(OFFICIAL_BRAND_DOMAINS.keys())

# High-Risk / Abused Free & Disposable TLDs commonly seen in phishing & smishing
SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "buzz", "club", "work",
    "click", "live", "shop", "vip", "icu", "cam", "monster", "fit", "rest",
    "online", "site", "website", "space", "fun", "uno", "link", "info",
    "kim", "bid", "loan", "stream", "gdn", "date", "racing", "download"
}


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

        # --- Typosquatting & Brand Spoofing Detection ---
        typosquatting_matches = []
        domain_lower = hostname.lower()

        # Helper to check if domain is an official domain of the brand
        def _is_official_domain(d: str, valid_domains: list) -> bool:
            for vd in valid_domains:
                if d == vd or d.endswith("." + vd):
                    return True
            return False

        for brand_key, official_domains in OFFICIAL_BRAND_DOMAINS.items():
            # Check if brand keyword appears in hostname (or path with security keywords)
            if len(brand_key) >= 3 and brand_key in domain_lower:
                # If the domain is NOT one of the authentic registered domains for this brand
                if not _is_official_domain(domain_lower, official_domains):
                    official_desc = ", ".join(official_domains[:2])
                    typosquatting_matches.append({
                        "brand": brand_key.title(),
                        "target_entity": brand_key,
                        "official_domain": official_desc,
                        "pattern": f"Suspicious domain '{hostname}' mimics '{brand_key.title()}' but is not an authorized official domain ({official_desc}).",
                        "severity": "critical" if any(b in brand_key for b in ["boc", "combank", "sampath", "peoples", "hnb", "seylan", "dialog", "ceb", "slpost", "paypal", "google", "apple", "microsoft"]) else "high"
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
            updated_date = getattr(w, 'updated_date', None)
            if isinstance(updated_date, list):
                updated_date = updated_date[0]

            from datetime import datetime, timezone
            domain_age_days = None
            if creation_date:
                try:
                    if hasattr(creation_date, "tzinfo") and creation_date.tzinfo is not None:
                        now_dt = datetime.now(creation_date.tzinfo)
                    else:
                        now_dt = datetime.now()
                    domain_age_days = max(0, (now_dt - creation_date).days)
                except Exception:
                    # Fallback naive comparison
                    try:
                        naive_creation = creation_date.replace(tzinfo=None) if hasattr(creation_date, "replace") else creation_date
                        domain_age_days = max(0, (datetime.now() - naive_creation).days)
                    except Exception:
                        domain_age_days = None

            # Extract the registered domain name from WHOIS
            registered_domain = None
            if hasattr(w, 'domain_name'):
                dn = w.domain_name
                if isinstance(dn, list):
                    registered_domain = dn[0]
                elif isinstance(dn, str):
                    registered_domain = dn

            whois_data = {
                "registrar": w.registrar,
                "registered_domain": registered_domain,
                "creation_date": str(creation_date) if creation_date else None,
                "updated_date": str(updated_date) if updated_date else None,
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

        # --- SSL Certificate ---
        ssl_certificate = {}
        try:
            import ssl
            import socket
            port = 443
            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    # Extract subject Common Name
                    subject_parts = dict(x[0] for x in cert.get("subject", ()))
                    issuer_parts = dict(x[0] for x in cert.get("issuer", ()))
                    ssl_certificate = {
                        "subject": subject_parts.get("commonName", None),
                        "issuer": issuer_parts.get("organizationName", None) or issuer_parts.get("commonName", None),
                        "is_trusted": True,
                        "not_before": cert.get("notBefore", None),
                        "not_after": cert.get("notAfter", None),
                        "serial_number": cert.get("serialNumber", None),
                        "status": "success",
                    }
        except ssl.SSLCertVerificationError as ssl_verify_err:
            # Certificate exists but is not trusted (self-signed, expired, etc.)
            ssl_certificate = {
                "subject": None,
                "issuer": None,
                "is_trusted": False,
                "not_before": None,
                "not_after": None,
                "error": str(ssl_verify_err),
                "status": "untrusted",
            }
        except Exception as ssl_err:
            ssl_certificate = {
                "status": "error",
                "error": str(ssl_err),
            }

        # --- Server Location (IP Geolocation) ---
        server_location = {}
        try:
            import socket as _socket
            ip_address = _socket.gethostbyname(hostname)
            # Use free ip-api.com for geolocation
            import urllib.request
            geo_url = f"http://ip-api.com/json/{ip_address}?fields=status,country,city,timezone,isp,org"
            geo_req = urllib.request.Request(geo_url, headers={"User-Agent": "PhishLens/1.0"})
            with urllib.request.urlopen(geo_req, timeout=8) as geo_resp:
                geo_data = json.loads(geo_resp.read().decode())
                if geo_data.get("status") == "success":
                    server_location = {
                        "ip_address": ip_address,
                        "city": geo_data.get("city", None),
                        "country": geo_data.get("country", None),
                        "timezone": geo_data.get("timezone", None),
                        "isp": geo_data.get("isp", None),
                        "organization": geo_data.get("org", None),
                        "status": "success",
                    }
                else:
                    server_location = {
                        "ip_address": ip_address,
                        "status": "error",
                        "error": "Geolocation lookup failed",
                    }
        except Exception as geo_err:
            server_location = {
                "status": "error",
                "error": str(geo_err),
            }

        # --- Global Ranking (Tranco List) ---
        global_ranking = {}
        try:
            import urllib.request
            # Use Tranco list API for domain ranking
            rank_domain = hostname.lstrip("www.")
            rank_url = f"https://tranco-list.eu/api/ranks/domain/{rank_domain}"
            rank_req = urllib.request.Request(rank_url, headers={"User-Agent": "PhishLens/1.0"})
            with urllib.request.urlopen(rank_req, timeout=8) as rank_resp:
                rank_data = json.loads(rank_resp.read().decode())
                ranks = rank_data.get("ranks", [])
                if ranks and len(ranks) > 0:
                    # Get the most recent ranking
                    latest = ranks[0]
                    global_ranking = {
                        "rank": latest.get("rank", None),
                        "source": "Tranco",
                        "status": "success",
                    }
                else:
                    global_ranking = {
                        "rank": None,
                        "source": "Tranco",
                        "status": "unranked",
                    }
        except Exception as rank_err:
            global_ranking = {
                "rank": None,
                "source": "Tranco",
                "status": "error",
                "error": str(rank_err),
            }

        # --- Risk indicators ---
        risk_indicators = []
        if tld.lower() in SUSPICIOUS_TLDS:
            risk_indicators.append(f"Domain uses high-risk disposable/abused TLD (.{tld}) commonly used in phishing campaigns")
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
            for tm in typosquatting_matches:
                risk_indicators.append(tm["pattern"])
        if scheme != "https":
            risk_indicators.append("Initial URL scheme is insecure HTTP")
        if whois_data.get("domain_age_days") is not None and whois_data["domain_age_days"] < 30:
            risk_indicators.append(f"Very young domain -- registered only {whois_data['domain_age_days']} days ago")

        # Compute standardized 12-dimensional URL Feature Vector
        domain_age_val = whois_data.get("domain_age_days")
        if domain_age_val is not None:
            age_risk = 1.0 if domain_age_val < 30 else (0.5 if domain_age_val < 180 else 0.0)
        else:
            age_risk = 0.5 # Unknown/anonymized WHOIS slight risk

        url_vector = [
            round(min(1.0, url_length / 150.0), 4),                                # 1. url_length_norm
            round(min(1.0, len(hostname) / 60.0), 4),                               # 2. hostname_length_norm
            round(min(1.0, dot_count / 5.0), 4),                                   # 3. dot_count_norm
            round(min(1.0, hyphen_count / 4.0), 4),                                # 4. hyphen_count_norm
            1.0 if has_ip else 0.0,                                                # 5. is_ip_address_flag
            round(min(1.0, entropy / 5.0), 4),                                     # 6. domain_entropy_norm
            1.0 if at_sign else 0.0,                                                # 7. at_sign_flag
            round(min(1.0, subdomain_depth / 4.0), 4),                             # 8. subdomain_depth_norm
            round(min(1.0, len(url_suspicious_keywords) / 3.0), 4),                # 9. suspicious_keywords_norm
            1.0 if len(typosquatting_matches) > 0 else 0.0,                        # 10. typosquatting_flag
            1.0 if (ssl_certificate.get("status") == "success" and ssl_certificate.get("is_trusted")) else 0.0,  # 11. ssl_valid_flag
            round(age_risk, 4),                                                     # 12. domain_age_risk_norm
        ]

        url_feature_names = [
            "url_length_norm", "hostname_length_norm", "dot_count_norm",
            "hyphen_count_norm", "is_ip_address_flag", "domain_entropy_norm",
            "at_sign_flag", "subdomain_depth_norm", "suspicious_keywords_norm",
            "typosquatting_flag", "ssl_valid_flag", "domain_age_risk_norm"
        ]

        result = {
            "status": "success",
            "url": url,
            "url_feature_vector": url_vector,
            "url_feature_names": url_feature_names,
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
            "ssl_certificate": ssl_certificate,
            "server_location": server_location,
            "global_ranking": global_ranking,
            "risk_indicators": risk_indicators,
        }

        return json.dumps(result, indent=2, default=str)

    except Exception as e:
        return json.dumps({
            "status": "error",
            "url": url,
            "error": str(e),
        }, indent=2)
