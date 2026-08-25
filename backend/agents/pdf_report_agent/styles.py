"""
PhishLens Agent — PDF Styling & Layout Theme Definitions.
"""

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import HRFlowable


# ── Color Palette ─────────────────────────────────────────────────────────

PRIMARY_COLOR = colors.HexColor("#4F46E5")      # Indigo 600
SECONDARY_COLOR = colors.HexColor("#7C3AED")    # Violet 600
TEXT_DARK = colors.HexColor("#0F172A")          # Slate 900
TEXT_MUTED = colors.HexColor("#64748B")         # Slate 500
BORDER_COLOR = colors.HexColor("#E2E8F0")       # Slate 200
BG_LIGHT = colors.HexColor("#F8FAFC")           # Slate 50
BG_DARK_CARD = colors.HexColor("#0F172A")       # Slate 900

# Threat Level Colors
RISK_COLORS = {
    "CRITICAL": colors.HexColor("#E11D48"),     # Rose 600
    "HIGH": colors.HexColor("#EA580C"),         # Orange 600
    "MEDIUM": colors.HexColor("#D97706"),       # Amber 600
    "LOW": colors.HexColor("#0284C7"),          # Sky 600
    "SAFE": colors.HexColor("#059669"),         # Emerald 600
    "UNKNOWN": colors.HexColor("#64748B"),      # Slate 500
}

RISK_BG_COLORS = {
    "CRITICAL": colors.HexColor("#FFE4E6"),     # Rose 100
    "HIGH": colors.HexColor("#FFEDD5"),         # Orange 100
    "MEDIUM": colors.HexColor("#FEF3C7"),       # Amber 100
    "LOW": colors.HexColor("#E0F2FE"),          # Sky 100
    "SAFE": colors.HexColor("#D1FAE5"),         # Emerald 100
    "UNKNOWN": colors.HexColor("#F1F5F9"),      # Slate 100
}


# ── Style Factory ──────────────────────────────────────────────────────────

def get_pdf_styles():
    """Builds and returns a cohesive ReportLab style dictionary for PhishLens reports."""
    base_styles = getSampleStyleSheet()

    styles = {
        "Title": ParagraphStyle(
            "PhishLensTitle",
            parent=base_styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=TEXT_DARK,
            spaceAfter=4,
        ),
        "Subtitle": ParagraphStyle(
            "PhishLensSubtitle",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=TEXT_MUTED,
            spaceAfter=12,
        ),
        "SectionHeader": ParagraphStyle(
            "PhishLensSectionHeader",
            parent=base_styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=PRIMARY_COLOR,
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "SubSectionHeader": ParagraphStyle(
            "PhishLensSubSectionHeader",
            parent=base_styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=TEXT_DARK,
            spaceBefore=8,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "Body": ParagraphStyle(
            "PhishLensBody",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=TEXT_DARK,
            spaceAfter=6,
        ),
        "BodyBold": ParagraphStyle(
            "PhishLensBodyBold",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=14,
            textColor=TEXT_DARK,
        ),
        "SummaryText": ParagraphStyle(
            "PhishLensSummary",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=TEXT_DARK,
        ),
        "AdviceText": ParagraphStyle(
            "PhishLensAdvice",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#1E293B"),
        ),
        "FindingBullet": ParagraphStyle(
            "PhishLensFindingBullet",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=TEXT_DARK,
            leftIndent=12,
            firstLineIndent=-8,
            spaceAfter=4,
        ),
        "TableHeader": ParagraphStyle(
            "PhishLensTableHeader",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#475569"),
            alignment=0,
        ),
        "TableCell": ParagraphStyle(
            "PhishLensTableCell",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=TEXT_DARK,
        ),
        "TableCellBold": ParagraphStyle(
            "PhishLensTableCellBold",
            parent=base_styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=TEXT_DARK,
        ),
        "Footer": ParagraphStyle(
            "PhishLensFooter",
            parent=base_styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=TEXT_MUTED,
            alignment=1,
        ),
    }

    return styles


def create_divider(color=BORDER_COLOR, thickness=1, space_before=6, space_after=10):
    """Creates a horizontal divider flowable."""
    return HRFlowable(
        width="100%",
        thickness=thickness,
        color=color,
        spaceBefore=space_before,
        spaceAfter=space_after,
    )
