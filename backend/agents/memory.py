"""
PhishLens Agent — Short-Term and Long-Term Memory Architecture.

Implements:
1. Short-Term Memory: Thread-scoped conversation state using LangGraph Checkpointer (PostgresSaver / InMemorySaver).
   Maintains messages history, active scan context, and allows multi-turn follow-up dialogue within /chat/<id>.
2. Long-Term Memory: Cross-thread persistent store using LangGraph Store (PostgresStore / InMemoryStore + Django models).
   Hierarchical namespaces for:
   - ("users", user_id, "preferences") -> User alert preferences and custom policies
   - ("users", user_id, "whitelist") -> Trusted domain whitelist
   - ("domain_intel", domain) -> Domain reputation and historical scan summaries across all sessions
   - ("global_threat_intel", "flagged_domains") -> Known malicious indicators
3. LangChain Memory Tools for agent reasoning:
   - get_domain_threat_history
   - check_domain_whitelist
   - save_domain_threat_intel
   - get_user_security_preferences
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib.parse import urlparse

from django.conf import settings
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)

# Load env variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


def get_postgres_connection_uri() -> str:
    """Builds PostgreSQL connection URI from environment or Django settings."""
    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "phishlens_db")

    try:
        if settings.configured:
            db_conf = settings.DATABASES.get("default", {})
            db_user = db_conf.get("USER") or db_user
            db_pass = db_conf.get("PASSWORD") or db_pass
            db_host = db_conf.get("HOST") or db_host
            db_port = db_conf.get("PORT") or db_port
            db_name = db_conf.get("NAME") or db_name
    except Exception:
        pass

    if db_pass:
        return f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}?sslmode=disable"
    return f"postgresql://{db_user}@{db_host}:{db_port}/{db_name}?sslmode=disable"


# ---------------------------------------------------------------------------
# 1. Short-Term Memory Manager (Thread-Scoped Checkpointer)
# ---------------------------------------------------------------------------

class ShortTermMemoryManager:
    """
    Manages short-term conversation state for a single thread/chat session.
    Backed by PostgresSaver when available, with automatic InMemorySaver fallback.
    """

    def __init__(self):
        self._cm = None
        self.checkpointer = None
        self._init_checkpointer()

    def _init_checkpointer(self):
        """Initializes the checkpointer."""
        try:
            from langgraph.checkpoint.postgres import PostgresSaver
            conn_uri = get_postgres_connection_uri()
            self._cm = PostgresSaver.from_conn_string(conn_uri)
            self.checkpointer = self._cm.__enter__()
            self.checkpointer.setup()
            logger.info("ShortTermMemoryManager: Initialized PostgresSaver checkpointer.")
        except Exception as e:
            logger.warning(f"ShortTermMemoryManager: PostgresSaver fallback ({e}). Using MemorySaver.")
            self.checkpointer = MemorySaver()

    def get_thread_config(self, thread_id: str) -> Dict[str, Any]:
        """Returns standard LangGraph runnable config for thread-scoped execution."""
        return {"configurable": {"thread_id": str(thread_id)}}


# Singleton instance
short_term_memory = ShortTermMemoryManager()


# ---------------------------------------------------------------------------
# 2. Long-Term Memory Manager (Cross-Session Persistent Store)
# ---------------------------------------------------------------------------

class LongTermMemoryManager:
    """
    Manages long-term memories across conversations and sessions.
    Stores domain reputation, user preferences, threat intelligence, and whitelists.
    Synchronizes with Django AgentMemoryRecord model for persistence.
    """

    def __init__(self):
        self._cm = None
        self.store = None
        self._init_store()

    def _init_store(self):
        """Initializes the long-term store."""
        try:
            from langgraph.store.postgres import PostgresStore
            conn_uri = get_postgres_connection_uri()
            self._cm = PostgresStore.from_conn_string(conn_uri)
            self.store = self._cm.__enter__()
            self.store.setup()
            logger.info("LongTermMemoryManager: Initialized PostgresStore.")
        except Exception as e:
            logger.warning(f"LongTermMemoryManager: PostgresStore fallback ({e}). Using InMemoryStore.")
            from langgraph.store.memory import InMemoryStore
            self.store = InMemoryStore()

    def _namespace_to_str(self, namespace: Sequence[str]) -> str:
        """Converts namespace tuple/list to string representation for database indexing."""
        if isinstance(namespace, (list, tuple)):
            return "/".join(str(s) for s in namespace)
        return str(namespace)

    def put(self, namespace: Sequence[str], key: str, value: Dict[str, Any], user=None) -> None:
        """
        Stores a JSON document under a specific namespace and key in both
        LangGraph Store and Django AgentMemoryRecord for persistent querying.
        """
        # 1. Save in LangGraph store
        try:
            if self.store:
                self.store.put(tuple(namespace), key, value)
        except Exception as e:
            logger.warning(f"Error putting to LangGraph store: {e}")

        # 2. Mirror into Django AgentMemoryRecord
        try:
            from backend.agents.models import AgentMemoryRecord
            ns_str = self._namespace_to_str(namespace)
            AgentMemoryRecord.objects.update_or_create(
                namespace=ns_str,
                key=key,
                defaults={"value": value, "user": user},
            )
        except Exception as e:
            logger.error(f"Error saving to AgentMemoryRecord: {e}")

    def get(self, namespace: Sequence[str], key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a document from long-term memory.
        Checks LangGraph store first, then Django AgentMemoryRecord database table.
        """
        # 1. Try LangGraph store
        try:
            if self.store:
                item = self.store.get(tuple(namespace), key)
                if item and hasattr(item, "value"):
                    return item.value
                elif isinstance(item, dict):
                    return item
        except Exception as e:
            logger.debug(f"LangGraph store get failed: {e}")

        # 2. Fallback to Django AgentMemoryRecord
        try:
            from backend.agents.models import AgentMemoryRecord
            ns_str = self._namespace_to_str(namespace)
            record = AgentMemoryRecord.objects.filter(namespace=ns_str, key=key).first()
            if record:
                return record.value
        except Exception as e:
            logger.error(f"Database lookup for memory failed: {e}")

        return None

    def search(self, namespace: Sequence[str], query: Optional[str] = None, filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Searches memories within a namespace."""
        results = []
        try:
            if self.store and hasattr(self.store, "search"):
                items = self.store.search(tuple(namespace), filter=filter_dict, query=query)
                for it in items:
                    if hasattr(it, "value"):
                        results.append(it.value)
                    elif isinstance(it, dict):
                        results.append(it)
                if results:
                    return results
        except Exception:
            pass

        # Fallback to database query
        try:
            from backend.agents.models import AgentMemoryRecord
            ns_str = self._namespace_to_str(namespace)
            qs = AgentMemoryRecord.objects.filter(namespace=ns_str)
            if query:
                qs = qs.filter(key__icontains=query)
            for rec in qs[:20]:
                results.append(rec.value)
        except Exception as e:
            logger.error(f"Database memory search error: {e}")

        return results

    # ── High-Level Domain Reputation & Intelligence APIs ────────────────────

    def record_domain_scan(
        self,
        domain: str,
        url: str,
        risk_score: int,
        risk_level: str,
        findings: List[Dict[str, Any]],
        brand: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """
        Records a completed scan into the long-term domain reputation memory.
        Tracks first seen, last seen, scan count, and risk trajectory over time.
        """
        clean_domain = domain.strip().lower()
        if not clean_domain:
            return

        namespace = ("domain_intel",)
        existing = self.get(namespace, clean_domain) or {}

        scan_history = existing.get("history", [])
        scan_entry = {
            "timestamp": time.time(),
            "url": url,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "brand": brand,
            "findings_count": len(findings) if findings else 0,
        }
        scan_history.append(scan_entry)
        # Keep last 10 scans
        scan_history = scan_history[-10:]

        first_seen = existing.get("first_seen", time.time())
        scan_count = existing.get("scan_count", 0) + 1

        updated_intel = {
            "domain": clean_domain,
            "first_seen": first_seen,
            "last_seen": time.time(),
            "scan_count": scan_count,
            "latest_risk_score": risk_score,
            "latest_risk_level": risk_level,
            "suspected_brand": brand or existing.get("suspected_brand"),
            "history": scan_history,
        }

        self.put(namespace, clean_domain, updated_intel)

        # If high risk or critical, mirror to global threat intelligence namespace
        if risk_score >= 61:
            global_ns = ("global_threat_intel",)
            self.put(global_ns, clean_domain, {
                "domain": clean_domain,
                "flagged_at": time.time(),
                "risk_score": risk_score,
                "risk_level": risk_level,
                "brand": brand,
                "reason": findings[0].get("detail", "High risk indicators") if findings else "High risk score",
            })

    def get_domain_history(self, domain: str) -> Optional[Dict[str, Any]]:
        """Retrieves cross-session scan history and reputation for a domain."""
        clean_domain = domain.strip().lower()
        return self.get(("domain_intel",), clean_domain)

    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Retrieves user's security preferences from long-term memory."""
        defaults = {
            "alert_sensitivity": "normal", # "strict", "normal", "lenient"
            "technical_depth": "detailed", # "simple", "detailed", "developer"
            "auto_block_critical": True,
        }
        if not user_id:
            return defaults
        data = self.get(("user_preferences",), str(user_id))
        if data:
            defaults.update(data)
        return defaults

    def set_user_preference(self, user_id: str, key: str, value: Any) -> None:
        """Stores a custom preference for a user."""
        if not user_id:
            return
        prefs = self.get_user_preferences(user_id)
        prefs[key] = value
        self.put(("user_preferences",), str(user_id), prefs)

    GLOBAL_TRUSTED_DOMAINS = {
        # Authentic Sri Lankan State & Commercial Banking Domains
        "boc.lk", "peoplesbank.lk", "combank.lk", "commercialbank.lk", "combankdigital.com",
        "sampath.lk", "hnb.net", "hnb.lk", "ndbbank.com", "seylan.lk", "nationstrust.com",
        "frimi.lk", "dfcc.lk", "nsb.lk", "panasia.lk", "unionb.com", "amanabank.lk",
        "cargillsbank.com", "cbsl.gov.lk", "sdb.lk", "rdb.lk", "mbslbank.com",
        # Authentic Sri Lankan Telecom, Fintech & Public Utilities
        "dialog.lk", "slt.lk", "mobitel.lk", "ezcash.lk", "mcash.lk", "lankapay.net",
        "lankaclear.com", "airtel.lk", "hutch.lk", "ceb.lk", "waterboard.lk",
        # Authentic Sri Lankan Government & Regulatory Portals
        "gov.lk", "cert.gov.lk", "police.lk", "police.gov.lk", "slpost.gov.lk",
        "customs.gov.lk", "ird.gov.lk", "dmt.gov.lk", "gic.gov.lk", "news.lk",
        # Authentic Sri Lankan E-Commerce
        "daraz.lk", "ikman.lk", "kapruka.com", "pickme.lk",
        # Top Global Trusted Services
        "google.com", "google.lk", "microsoft.com", "apple.com", "paypal.com",
        "amazon.com", "github.com", "wikipedia.org", "netflix.com", "linkedin.com",
        "facebook.com", "instagram.com", "twitter.com", "x.com", "youtube.com",
    }

    def is_whitelisted(self, domain: str, user_id: Optional[str] = None) -> bool:
        """Checks if a domain is trusted either in the user's whitelist or global trusted list."""
        clean_domain = domain.strip().lower()
        # Remove www. prefix for clean matching
        if clean_domain.startswith("www."):
            clean_domain = clean_domain[4:]

        # Check built-in verified domains
        if clean_domain in self.GLOBAL_TRUSTED_DOMAINS:
            return True
        for trusted in self.GLOBAL_TRUSTED_DOMAINS:
            if clean_domain.endswith("." + trusted):
                return True

        if user_id:
            user_wl = self.get(("user_whitelist", str(user_id)), clean_domain)
            if user_wl:
                return True
        global_wl = self.get(("global_whitelist",), clean_domain)
        return bool(global_wl)

    def add_to_whitelist(self, domain: str, reason: str = "User trusted", user_id: Optional[str] = None) -> None:
        """Adds a domain to user or global whitelist in long-term memory."""
        clean_domain = domain.strip().lower()
        if user_id:
            self.put(("user_whitelist", str(user_id)), clean_domain, {
                "domain": clean_domain,
                "added_at": time.time(),
                "reason": reason,
            })
        else:
            self.put(("global_whitelist",), clean_domain, {
                "domain": clean_domain,
                "added_at": time.time(),
                "reason": reason,
            })


# Singleton instance
long_term_memory = LongTermMemoryManager()


# ---------------------------------------------------------------------------
# 3. LangChain Tools for Long-Term Memory
# ---------------------------------------------------------------------------

@tool
def get_domain_threat_history(domain: str) -> str:
    """
    Look up long-term memory for past security scans and reputation of a domain.
    Use this to see if the domain was previously analyzed in past chats, what risk score
    it had, whether it has changed over time, and if it has recurring phishing flags.

    Args:
        domain: The domain name to look up (e.g. 'paypal-security-update.com')
    """
    clean = domain.strip().lower()
    if clean.startswith(("http://", "https://")):
        clean = urlparse(clean).hostname or clean

    intel = long_term_memory.get_domain_history(clean)
    if not intel:
        return json.dumps({
            "status": "not_found",
            "domain": clean,
            "message": "No prior scan history found in long-term memory for this domain. This is the first time it has been analyzed."
        })

    return json.dumps({
        "status": "found",
        "domain": clean,
        "first_seen_timestamp": intel.get("first_seen"),
        "total_previous_scans": intel.get("scan_count", 1),
        "latest_risk_score": intel.get("latest_risk_score"),
        "latest_risk_level": intel.get("latest_risk_level"),
        "suspected_brand": intel.get("suspected_brand"),
        "recent_scan_history": intel.get("history", []),
    })


@tool
def check_domain_whitelist(domain: str) -> str:
    """
    Check if a domain is explicitly trusted/whitelisted in long-term memory.

    Args:
        domain: The domain name to check (e.g. 'google.com', 'microsoft.com')
    """
    clean = domain.strip().lower()
    if clean.startswith(("http://", "https://")):
        clean = urlparse(clean).hostname or clean

    is_trusted = long_term_memory.is_whitelisted(clean)
    return json.dumps({
        "domain": clean,
        "is_whitelisted": is_trusted,
        "status": "trusted" if is_trusted else "unverified"
    })


@tool
def save_domain_threat_intel(domain: str, notes: str) -> str:
    """
    Save custom threat intelligence notes or threat analyst remarks for a domain into long-term memory.

    Args:
        domain: The domain to annotate
        notes: Analyst notes describing phishing techniques, impersonated brands, or observed IOCs
    """
    clean = domain.strip().lower()
    if clean.startswith(("http://", "https://")):
        clean = urlparse(clean).hostname or clean

    namespace = ("domain_notes",)
    existing = long_term_memory.get(namespace, clean) or {"notes": []}
    existing_notes = existing.get("notes", [])
    existing_notes.append({
        "timestamp": time.time(),
        "notes": notes
    })
    long_term_memory.put(namespace, clean, {"notes": existing_notes})
    return f"Successfully saved threat intelligence notes for {clean} into long-term memory."
