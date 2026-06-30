"""
PhishLens Agent — Test script for the ReAct Orchestrator.

Run from the project root:
    python -m backend.agents.test_orchestrator
"""

import asyncio
import json
import sys
import os

import nest_asyncio

# Apply nest_asyncio
nest_asyncio.apply()

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from backend.agents.orchestrator import OrchestratorAgent


def main():
    """Run the PhishLens orchestrator against a test URL."""
    # Default test URL or accept from command line
    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://example.com"

    print(f"{'='*60}")
    print(f"  PhishLens Agent — ReAct Orchestrator Test")
    print(f"{'='*60}")
    print(f"\n  Target URL: {test_url}\n")

    orchestrator = OrchestratorAgent()

    # Run the analysis
    result = orchestrator.run(test_url)

    # Print results
    print(f"\n{'='*60}")
    print(f"  FINAL SCANNING REPORT")
    print(f"{'='*60}\n")

    # Print summary info
    print(f"  Status:   {result.get('overall_status', 'UNKNOWN')}")
    print(f"  Duration: {result.get('total_duration_sec', 0):.2f}s")

    # Print the parsed report
    report = result.get("report")
    if report and not report.get("parse_error"):
        print(f"\n  Risk Score: {report.get('risk_score', 'N/A')}")
        print(f"  Risk Level: {report.get('risk_level', 'N/A')}")
        print(f"\n  Summary: {report.get('summary', 'N/A')}")

        findings = report.get("findings", [])
        if findings:
            print(f"\n  Findings ({len(findings)}):")
            for i, f in enumerate(findings, 1):
                print(f"    {i}. [{f.get('severity', '?').upper()}] "
                      f"{f.get('category', '?')}: {f.get('detail', '?')}")

        brand = report.get("brand_impersonation", {})
        if brand.get("detected"):
            print(f"\n  [WARNING] Brand Impersonation Detected: {brand.get('brand')} "
                  f"(confidence: {brand.get('confidence')})")
        else:
            print(f"\n  [OK] No brand impersonation detected.")

        print(f"\n  Safety Advice: {report.get('safety_advice', 'N/A')}")
    else:
        print(f"\n  Could not parse structured report from LLM.")
        if report:
            print(f"  Raw response preview: {str(report.get('raw_response', ''))[:300]}")

    # Print tool trace
    tool_trace = result.get("tool_trace", [])
    if tool_trace:
        print(f"\n  Tool Call Trace ({len(tool_trace)} steps):")
        for step in tool_trace:
            if step["step"] == "tool_call":
                print(f"    -> Called: {step['tool']}({step.get('args', {})})")
            elif step["step"] == "tool_result":
                print(f"    <- Result from {step['tool']}: {step.get('content_preview', '')[:100]}...")

    # Also save full JSON report to file
    report_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "media", "reports"
    )
    os.makedirs(report_path, exist_ok=True)
    report_file = os.path.join(report_path, "last_test_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"\n  Full report saved to: {report_file}")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
