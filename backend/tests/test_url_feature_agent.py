"""
PhishLens Agent — Test Suite for URL Feature Extractor Agent, Lexical Heuristics, Shannon Entropy, and Typosquatting Detection.
"""

import json
from unittest.mock import patch, MagicMock
import pytest

from backend.agents.url_feature_agent import (
    _shannon_entropy,
    _is_ip_address,
    analyze_url_features,
    SUSPICIOUS_KEYWORDS,
    OFFICIAL_BRAND_DOMAINS,
    SUSPICIOUS_TLDS,
)


# ===========================================================================
# 1. Lexical and Mathematical Utility Functions
# ===========================================================================

class TestURLLexicalUtils:
    def test_shannon_entropy_calculation(self):
        """Shannon entropy must be 0 for uniform strings and higher for random strings."""
        assert _shannon_entropy("") == 0.0
        assert _shannon_entropy("aaaaaa") == 0.0

        # Normal english words typically have lower entropy (~2.5 - 3.2)
        normal_entropy = _shannon_entropy("google")
        # High randomness DGA / generated domains have higher entropy (> 3.5)
        dga_entropy = _shannon_entropy("x8f7a9q2z1b4w")
        assert dga_entropy > normal_entropy

    @pytest.mark.parametrize(
        "hostname, is_ip",
        [
            ("192.168.1.1", True),
            ("10.0.0.1", True),
            ("255.255.255.255", True),
            ("999.999.999.999", False),
            ("google.com", False),
            ("192.168.1.com", False),
            ("boc.lk", False),
            ("", False),
        ]
    )
    def test_is_ip_address(self, hostname, is_ip):
        """Test IPv4 address detection in URLs."""
        assert _is_ip_address(hostname) == is_ip


# ===========================================================================
# 2. Typosquatting & Brand Spoofing Detection Tests
# ===========================================================================

class TestBrandSpoofingAndTyposquatting:
    @pytest.mark.parametrize(
        "url, expected_brand, should_flag",
        [
            # Sri Lankan Banks
            ("https://boc-online-banking-portal.xyz/login", "Boc", True),
            ("https://boc.lk/ebanking", "Boc", False),  # Official BOC domain
            ("https://combankdigital-secure-verify.top/auth", "Combank", True),
            ("https://www.combankdigital.com/login", "Combank", False),  # Official ComBank
            ("https://sampath-vishwa-otp-verification.xyz", "Sampath", True),
            ("https://www.sampath.lk/en/personal", "Sampath", False),  # Official Sampath
            ("https://peoplesbank-update-account.live/auth", "Peoplesbank", True),
            ("https://www.peoplesbank.lk", "Peoplesbank", False),  # Official People's Bank
            ("https://hnb-solo-payment-fine.xyz/pay", "Hnb", True),
            ("https://hnb.net/login", "Hnb", False),  # Official HNB
            # Sri Lankan Telecom & Utilities
            ("https://dialog-ezcash-billpayment.click/pay", "Dialog", True),
            ("https://www.dialog.lk", "Dialog", False),  # Official Dialog
            ("https://cebcare-electricity-fine.top/pay", "Ceb", True),
            ("https://ceb.lk/bill-payment", "Ceb", False),  # Official CEB
            # Global Brands
            ("https://paypal-account-security-update.com/signin", "Paypal", True),
            ("https://www.paypal.com/signin", "Paypal", False),  # Official PayPal
            ("https://apple-icloud-findmy-security.xyz/verify", "Apple", True),
            ("https://www.apple.com", "Apple", False),  # Official Apple
            ("https://microsoft-online-sharepoint-auth.info/doc", "Microsoft", True),
            ("https://login.microsoft.com", "Microsoft", False),  # Official Microsoft
        ]
    )
    def test_brand_spoofing_detection(self, url, expected_brand, should_flag):
        """Verify typosquatting flags spoofed domains while whitelisting authentic domains."""
        # Use analyze_url_features tool with mocked network calls
        with patch("whois.whois") as mock_whois, \
             patch("socket.create_connection"), \
             patch("ssl.create_default_context"), \
             patch("socket.gethostbyname", return_value="93.184.216.34"), \
             patch("urllib.request.urlopen") as mock_urlopen:
            
            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps({"status": "success", "city": "Colombo", "country": "Sri Lanka"}).encode()
            mock_urlopen.return_value.__enter__.return_value = mock_resp
            
            mock_whois_obj = MagicMock()
            mock_whois_obj.creation_date = None
            mock_whois_obj.registrar = "NameCheap"
            mock_whois.return_value = mock_whois_obj

            res_str = analyze_url_features.invoke({"url": url})
            res = json.loads(res_str)
            assert res["status"] == "success"

            typosquatting = res["typosquatting_analysis"]
            if should_flag:
                assert len(typosquatting) > 0, f"Expected {url} to be flagged for {expected_brand}"
                flagged_brands = [t["brand"] for t in typosquatting]
                assert any(expected_brand.lower() in fb.lower() for fb in flagged_brands)
            else:
                # Should not flag official legitimate domains
                flagged_for_brand = [t for t in typosquatting if expected_brand.lower() in t["brand"].lower()]
                assert len(flagged_for_brand) == 0, f"Official domain {url} was falsely flagged"


# ===========================================================================
# 3. Standard 12-Dimensional URL Feature Vector & Lexical Extraction
# ===========================================================================

class TestURLFeatureVector:
    def test_feature_vector_structure_and_dimensions(self):
        """Test that the 12-dimensional normalized feature vector is correctly formatted."""
        test_url = "https://boc-ebank-login-verify-account.xyz/auth/verify?id=123&token=abc"

        with patch("whois.whois") as mock_whois, \
             patch("socket.create_connection"), \
             patch("ssl.create_default_context"), \
             patch("socket.gethostbyname", return_value="1.2.3.4"), \
             patch("urllib.request.urlopen") as mock_urlopen:

            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps({"status": "fail"}).encode()
            mock_urlopen.return_value.__enter__.return_value = mock_resp

            mock_whois_obj = MagicMock()
            from datetime import datetime, timedelta
            mock_whois_obj.creation_date = datetime.now() - timedelta(days=5)  # 5 days old
            mock_whois_obj.registrar = "Porkbun LLC"
            mock_whois.return_value = mock_whois_obj

            res_str = analyze_url_features.invoke({"url": test_url})
            res = json.loads(res_str)

            assert res["status"] == "success"
            vector = res["url_feature_vector"]
            feature_names = res["url_feature_names"]

            assert len(vector) == 12, "URL feature vector must have exactly 12 dimensions"
            assert len(feature_names) == 12

            # All vector values must be normalized floats in [0.0, 1.0]
            for val in vector:
                assert isinstance(val, (int, float))
                assert 0.0 <= val <= 1.0

            # Verify risk indicators
            risk_indicators = res["risk_indicators"]
            assert any(".xyz" in r for r in risk_indicators)
            assert any("young domain" in r.lower() for r in risk_indicators)

    def test_lexical_features_extraction(self):
        """Test extraction of raw lexical indicators."""
        test_url = "http://admin:pass@192.168.1.100:8080/path//double?login=true#section"

        with patch("whois.whois"), \
             patch("socket.create_connection"), \
             patch("ssl.create_default_context"), \
             patch("socket.gethostbyname", return_value="192.168.1.100"), \
             patch("urllib.request.urlopen") as mock_urlopen:

            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps({"status": "fail"}).encode()
            mock_urlopen.return_value.__enter__.return_value = mock_resp

            res_str = analyze_url_features.invoke({"url": test_url})
            res = json.loads(res_str)

            lex = res["lexical_features"]
            assert lex["is_ip_address"] is True
            assert lex["at_sign_present"] is True
            assert lex["double_slash_in_path"] is True
            assert "login" in res["suspicious_keywords_in_url"]
