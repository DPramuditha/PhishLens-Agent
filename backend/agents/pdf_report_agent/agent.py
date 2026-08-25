"""
PhishLens Agent — Dedicated PDF Threat Report Generation Agent.

Builds structured, multi-page cybersecurity assessment reports in vector PDF format
with embedded webpage screenshots, risk verdict badges, WHOIS/SSL tables,
findings severity breakdown, and remediation advice.
"""

import base64
import io
import os
import time
from datetime import datetime
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from PIL import Image as PILImage
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
)
from reportlab.pdfgen import canvas

from backend.agents.pdf_report_agent.styles import (
    get_pdf_styles,
    create_divider,
    PRIMARY_COLOR,
    SECONDARY_COLOR,
    TEXT_DARK,
    TEXT_MUTED,
    BORDER_COLOR,
    BG_LIGHT,
    RISK_COLORS,
    RISK_BG_COLORS,
)


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to add accurate 'Page X of Y' and security footer."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)

        # Top border line for footer
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(36, 32, 576, 32)

        # Left footer: Brand & classification
        self.drawString(36, 20, "PhishLens AI Cybersecurity Intelligence • Confidential Security Report")

        # Right footer: Page numbers
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 20, page_text)

        self.restoreState()


class PDFReportAgent:
    """
    Autonomous PDF Generation Agent for PhishLens.
    Transforms raw scan outputs and screenshots into a high-impact security PDF report.
    """

    def __init__(self):
        self.styles = get_pdf_styles()

    def _decode_screenshot(self, screenshot_input: Optional[str]) -> Optional[io.BytesIO]:
        """Safely decodes Base64 or loads local file path screenshot into a BytesIO stream."""
        if not screenshot_input:
            return None

        clean_input = screenshot_input.strip()

        # Handle Base64 Data URI
        if clean_input.startswith("data:image/"):
            try:
                base64_data = clean_input.split(",", 1)[1]
                image_bytes = base64.b64decode(base64_data)
                
                # Verify and optimize with PIL
                pil_img = PILImage.open(io.BytesIO(image_bytes))
                pil_img = pil_img.convert("RGB")
                
                buf = io.BytesIO()
                pil_img.save(buf, format="JPEG", quality=85, optimize=True)
                buf.seek(0)
                return buf
            except Exception as e:
                print(f"[PDFReportAgent] Base64 image decoding failed: {e}")
                return None

        # Handle filesystem path if exists
        if os.path.exists(clean_input):
            try:
                pil_img = PILImage.open(clean_input)
                pil_img = pil_img.convert("RGB")
                buf = io.BytesIO()
                pil_img.save(buf, format="JPEG", quality=85, optimize=True)
                buf.seek(0)
                return buf
            except Exception as e:
                print(f"[PDFReportAgent] Image file loading failed: {e}")
                return None

        return None

    def _build_header(self, url: str, scan_time: str, duration: Optional[float] = None) -> list:
        """Constructs top header bar with branding and target URL."""
        parsed = urlparse(url)
        domain = parsed.hostname or url

        header_data = [
            [
                Paragraph("<b>PHISHLENS</b> <font color='#6366F1'>AGENT</font>", self.styles["Title"]),
                Paragraph(f"<b>SCAN ID:</b> {int(time.time())}<br/><b>DATE:</b> {scan_time}", self.styles["TableCell"]),
            ],
            [
                Paragraph(f"<b>TARGET URL:</b> <font color='#4F46E5'>{url}</font><br/><b>DOMAIN:</b> {domain}", self.styles["Body"]),
                Paragraph(f"<b>DURATION:</b> {duration or 'N/A'}s<br/><b>STATUS:</b> COMPLETED", self.styles["TableCell"]),
            ]
        ]

        header_table = Table(header_data, colWidths=[380, 160])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [header_table, create_divider(space_before=8, space_after=12)]

    def _build_verdict_banner(self, report: Dict[str, Any]) -> Table:
        """Constructs a prominent, colored threat verdict card."""
        risk_level = str(report.get("risk_level", "UNKNOWN")).upper()
        risk_score = report.get("risk_score", 0)
        
        badge_bg = RISK_BG_COLORS.get(risk_level, RISK_BG_COLORS["UNKNOWN"])
        badge_fg = RISK_COLORS.get(risk_level, RISK_COLORS["UNKNOWN"])

        brand_info = report.get("brand_impersonation") or {}
        brand_detected = bool(brand_info.get("detected"))
        brand_name = brand_info.get("brand") or "Unknown"
        brand_conf = round((brand_info.get("confidence") or 0) * 100)

        brand_text = "<b>Brand Impersonation:</b> None Detected"
        if brand_detected:
            brand_text = f"<b>Brand Impersonation:</b> <font color='#E11D48'>Mimics {brand_name} ({brand_conf}% Match)</font>"

        banner_data = [
            [
                Paragraph(f"<font size='16'><b>VERDICT: {risk_level}</b></font><br/>"
                          f"<font size='10' color='{badge_fg.hexval()}'>Risk Probability Score: <b>{risk_score}%</b></font>",
                          self.styles["BodyBold"]),
                Paragraph(f"<font size='9'>{brand_text}<br/>"
                          f"<b>Evaluation:</b> Multi-agent structural & visual synthesis</font>",
                          self.styles["Body"]),
            ]
        ]

        banner_table = Table(banner_data, colWidths=[270, 270])
        banner_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), badge_bg),
            ("BOX", (0, 0), (-1, -1), 1.5, badge_fg),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ]))

        return banner_table

    def _build_screenshot_section(self, screenshot_stream: Optional[io.BytesIO]) -> list:
        """Builds screenshot evidence container."""
        story = [
            Paragraph("Visual Forensic Evidence", self.styles["SectionHeader"]),
            Paragraph("Automated headless Chromium capture of target web interface rendered during analysis:", self.styles["Body"]),
            Spacer(1, 4),
        ]

        if screenshot_stream:
            try:
                # Determine image aspect ratio using PIL
                from PIL import Image as PILImage
                screenshot_stream.seek(0)
                pil_img = PILImage.open(screenshot_stream)
                w_orig, h_orig = pil_img.size
                screenshot_stream.seek(0)

                target_w = 540
                aspect = h_orig / max(1, w_orig)
                # Keep height bounded so full-page screenshot does not overwhelm single page in PDF
                target_h = max(180, min(340, target_w * aspect))

                img_flowable = RLImage(screenshot_stream, width=target_w, height=target_h)
                
                # Wrap inside framed table
                frame_table = Table([[img_flowable]], colWidths=[540])
                frame_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#18181B")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#3F3F46")),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]))
                story.append(frame_table)
            except Exception as e:
                print(f"[PDFReportAgent] Error embedding screenshot: {e}")
                story.append(Paragraph("<i>[Screenshot rendered but could not be embedded into document layout]</i>", self.styles["Body"]))
        else:
            story.append(Paragraph("<i>[No visual screenshot captured or target endpoint failed rendering]</i>", self.styles["Body"]))

        story.append(Spacer(1, 10))
        return story

    def _build_technical_tables(self, url_analysis_data: Optional[Dict[str, Any]]) -> list:
        """Constructs WHOIS and SSL Certificate technical telemetry table."""
        if not url_analysis_data:
            return []

        story = [
            Paragraph("Technical Domain & Security Telemetry", self.styles["SectionHeader"]),
            Spacer(1, 4),
        ]

        whois = url_analysis_data.get("whois") or {}
        ssl = url_analysis_data.get("ssl_certificate") or {}
        geo = url_analysis_data.get("server_location") or {}
        rank = url_analysis_data.get("global_ranking") or {}

        tech_rows = [
            [
                Paragraph("<b>Indicator</b>", self.styles["TableHeader"]),
                Paragraph("<b>Observed Telemetry Value</b>", self.styles["TableHeader"]),
                Paragraph("<b>Security Assessment</b>", self.styles["TableHeader"]),
            ],
            [
                Paragraph("Registered Domain", self.styles["TableCellBold"]),
                Paragraph(str(whois.get("registered_domain") or "N/A"), self.styles["TableCell"]),
                Paragraph("Analyzed Host", self.styles["TableCell"]),
            ],
            [
                Paragraph("Domain Creation Date", self.styles["TableCellBold"]),
                Paragraph(str(whois.get("creation_date") or "N/A"), self.styles["TableCell"]),
                Paragraph(f"Age: {whois.get('domain_age_days', 'N/A')} days", self.styles["TableCell"]),
            ],
            [
                Paragraph("SSL Certificate Issuer", self.styles["TableCellBold"]),
                Paragraph(str(ssl.get("issuer") or "N/A"), self.styles["TableCell"]),
                Paragraph("Trusted" if ssl.get("is_trusted") else "<font color='#E11D48'>Untrusted / Self-Signed</font>", self.styles["TableCell"]),
            ],
            [
                Paragraph("Server IP & Geo Location", self.styles["TableCellBold"]),
                Paragraph(f"{geo.get('ip_address', 'N/A')} ({geo.get('city', '')}, {geo.get('country', 'N/A')})", self.styles["TableCell"]),
                Paragraph(str(geo.get('timezone') or "N/A"), self.styles["TableCell"]),
            ],
            [
                Paragraph("Global Traffic Ranking", self.styles["TableCellBold"]),
                Paragraph(f"#{rank.get('rank', 'Unranked')}", self.styles["TableCell"]),
                Paragraph(str(rank.get('source') or "Tranco Top 1M"), self.styles["TableCell"]),
            ],
        ]

        table = Table(tech_rows, colWidths=[150, 240, 150])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("LINEBELOW", (0, 0), (-1, 0), 1.2, PRIMARY_COLOR),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))

        story.append(table)
        story.append(Spacer(1, 12))
        return story

    def _build_findings_and_advice(self, report: Dict[str, Any]) -> list:
        """Constructs Key Findings list and Actionable Security Recommendations."""
        story = []

        # 1. Findings
        findings = report.get("findings") or []
        if findings:
            story.append(Paragraph("Key Security Findings", self.styles["SectionHeader"]))
            story.append(Spacer(1, 4))

            finding_rows = [
                [
                    Paragraph("<b>Category</b>", self.styles["TableHeader"]),
                    Paragraph("<b>Observed Indicator Detail</b>", self.styles["TableHeader"]),
                    Paragraph("<b>Severity</b>", self.styles["TableHeader"]),
                ]
            ]

            for f in findings:
                category = f.get("category", "General")
                detail = f.get("detail", "")
                severity = str(f.get("severity", "low")).upper()
                sev_color = RISK_COLORS.get(severity, TEXT_MUTED).hexval()

                finding_rows.append([
                    Paragraph(category, self.styles["TableCellBold"]),
                    Paragraph(detail, self.styles["TableCell"]),
                    Paragraph(f"<font color='{sev_color}'><b>{severity}</b></font>", self.styles["TableCellBold"]),
                ])

            f_table = Table(finding_rows, colWidths=[130, 330, 80])
            f_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("LINEBELOW", (0, 0), (-1, 0), 1.2, PRIMARY_COLOR),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(f_table)
            story.append(Spacer(1, 12))

        # 2. Safety Advice
        safety_advice = report.get("safety_advice")
        if safety_advice:
            story.append(Paragraph("Safety & Remediation Recommendations", self.styles["SectionHeader"]))
            story.append(Spacer(1, 4))

            advice_data = [[
                Paragraph(f"<b>Recommended Action:</b><br/>{safety_advice}", self.styles["AdviceText"])
            ]]
            advice_table = Table(advice_data, colWidths=[540])
            advice_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EEF2FF")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#C7D2FE")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]))
            story.append(advice_table)
            story.append(Spacer(1, 10))

        return story

    def generate_pdf(
        self,
        url: str,
        report: Dict[str, Any],
        screenshot_data: Optional[str] = None,
        url_analysis_data: Optional[Dict[str, Any]] = None,
        duration: Optional[float] = None,
    ) -> bytes:
        """
        Executes PDF generation pipeline and returns binary PDF bytes stream.
        """
        buffer = io.BytesIO()

        # Letter size with 36pt (0.5 in) margins for professional printable format
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=45,
            title="PhishLens Cyber Threat Assessment Report",
            author="PhishLens Autonomous AI Agent",
        )

        scan_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        screenshot_stream = self._decode_screenshot(screenshot_data)

        story = []

        # 1. Top Header
        story.extend(self._build_header(url=url, scan_time=scan_time, duration=duration))

        # 2. Risk Verdict Card
        story.append(self._build_verdict_banner(report))
        story.append(Spacer(1, 12))

        # 3. Executive Summary
        summary = report.get("summary") or "Automated phishing risk evaluation completed."
        story.append(Paragraph("Executive Summary", self.styles["SectionHeader"]))
        story.append(Paragraph(summary, self.styles["SummaryText"]))
        story.append(Spacer(1, 10))

        # 4. Screenshot Visual Forensic Evidence
        story.extend(self._build_screenshot_section(screenshot_stream))

        # 5. Technical Telemetry Tables
        story.extend(self._build_technical_tables(url_analysis_data))

        # 6. Key Findings & Recommendations
        story.extend(self._build_findings_and_advice(report))

        # Build PDF using NumberedCanvas for automatic page numbering
        doc.build(story, canvasmaker=NumberedCanvas)

        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
