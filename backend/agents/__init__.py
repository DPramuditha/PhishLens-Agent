"""
PhishLens Agent — agents package init.

Provides lazy exports for the orchestrator and tool functions.
"""


def __getattr__(name):
    if name == "OrchestratorAgent":
        from backend.agents.orchestrator import OrchestratorAgent
        return OrchestratorAgent
    if name == "capture_screenshot":
        from backend.agents.tools import capture_screenshot
        return capture_screenshot
    if name == "run_visual_ml_model":
        from backend.agents.tools import run_visual_ml_model
        return run_visual_ml_model
    if name == "extract_html_features":
        from backend.agents.html_dom_agent import extract_html_features
        return extract_html_features
    if name == "analyze_url_features":
        from backend.agents.url_feature_agent import analyze_url_features
        return analyze_url_features
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


__all__ = [
    "OrchestratorAgent",
    "capture_screenshot",
    "extract_html_features",
    "analyze_url_features",
    "run_visual_ml_model",
]
