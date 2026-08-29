"""
PhishLens Agent — Two-Stage Visual Computer Vision Pipeline.

Stage 1: Binary Phishing Classifier (EfficientNet-B0)
- Pre-trained on ImageNet and fine-tuned on phishing & legitimate webpage screenshots.
- Accepts a 224x224 normalized image tensor and outputs phishing probability score p in [0.0, 1.0].
- Screenshots with phishing probability >= 0.60 are classified as PHISHING and passed to Stage 2.

Stage 2: ResNet-50 Siamese Network for Brand Identification
- Twin ResNet-50 encoder backbones with Adaptive Concat Pooling (GAP+GMP -> 4096-D)
  and a 128-dimensional normalized projection head.
- Embeds brand logo images into a 128-D unit hypersphere similarity space (L2-normalized).
- Measures cosine similarity against a reference brand gallery to identify the specific brand
  being impersonated.
"""

import io
import base64
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image, ImageDraw, ImageFont


def _load_image(image_input: Any) -> Optional[Image.Image]:
    """
    Loads a PIL Image from:
    1. Base64 Data URI (e.g. 'data:image/png;base64,...')
    2. Raw Base64 string
    3. Raw bytes / BytesIO
    4. PIL Image instance
    5. Local file path string
    """
    if image_input is None:
        return None
    if isinstance(image_input, Image.Image):
        return image_input.copy()
    if isinstance(image_input, (bytes, bytearray)):
        return Image.open(io.BytesIO(image_input))
    if isinstance(image_input, io.BytesIO):
        return Image.open(image_input)
    if isinstance(image_input, str):
        cleaned = image_input.strip()
        if not cleaned:
            return None
        # Handle Base64 Data URI
        if cleaned.startswith("data:image/") and ";base64," in cleaned:
            try:
                b64_str = cleaned.split(";base64,")[1]
                img_bytes = base64.b64decode(b64_str)
                return Image.open(io.BytesIO(img_bytes))
            except Exception:
                return None
        # Handle raw Base64 string (if long and not a valid file path)
        if len(cleaned) > 256 and not os.path.exists(cleaned):
            try:
                img_bytes = base64.b64decode(cleaned)
                return Image.open(io.BytesIO(img_bytes))
            except Exception:
                pass
        # Handle local file path if present
        if os.path.exists(cleaned):
            try:
                return Image.open(cleaned)
            except Exception:
                return None
    return None


# ---------------------------------------------------------------------------
# Model Weight Paths & Constants
# ---------------------------------------------------------------------------
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
STAGE1_MODEL_PATH = MODELS_DIR / "phishing_model_stage1.pth"
STAGE2_MODEL_PATH = MODELS_DIR / "resnet50_siamese_brand_model.pth"

STAGE1_THRESHOLD = 0.60
STAGE2_SIMILARITY_THRESHOLD = 0.85

# Image Preprocessing Transform for 224x224 CNN input
val_test_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


# ---------------------------------------------------------------------------
# Stage 2 Siamese Network Architecture Definitions
# ---------------------------------------------------------------------------
class AdaptiveConcatPool2d(nn.Module):
    """Combines Global Average Pooling (GAP) and Global Max Pooling (GMP) to capture
    both global silhouette and sharp local edge/typography features (4096-D)."""
    def __init__(self):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        avg_feat = torch.flatten(self.avg_pool(x), 1)
        max_feat = torch.flatten(self.max_pool(x), 1)
        return torch.cat([avg_feat, max_feat], dim=1)


class ResNet50SiameseNetwork(nn.Module):
    """
    High-Capacity ResNet-50 Siamese Network with Concat Pooling and 128-D L2-normalized head.
    Outputs 128-dimensional unit hypersphere embedding vectors.
    """
    def __init__(self, embedding_dim: int = 128, pretrained: bool = False, dropout_rate: float = 0.25):
        super().__init__()
        base_model = models.resnet50(weights=None)
        # Backbone feature extractor (layers up to layer4)
        self.encoder = nn.Sequential(*list(base_model.children())[:-2])
        self.concat_pool = AdaptiveConcatPool2d()

        # 128-dimensional Projection Head
        self.projection_head = nn.Sequential(
            nn.Linear(4096, 512),
            nn.BatchNorm1d(512),
            nn.PReLU(),
            nn.Dropout(p=dropout_rate),
            nn.Linear(512, embedding_dim),
            nn.BatchNorm1d(embedding_dim)
        )

    def forward_one(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.encoder(x)
        pooled = self.concat_pool(feat)
        emb = self.projection_head(pooled)
        emb = F.normalize(emb, p=2, dim=1)  # L2 unit hypersphere projection
        return emb

    def forward(self, img1: torch.Tensor, img2: Optional[torch.Tensor] = None):
        if img2 is None:
            return self.forward_one(img1)
        return self.forward_one(img1), self.forward_one(img2)

    def get_embedding(self, img_tensor: torch.Tensor) -> torch.Tensor:
        return self.forward_one(img_tensor)


# ---------------------------------------------------------------------------
# Lazy Model Caching
# ---------------------------------------------------------------------------
_stage1_model: Optional[nn.Module] = None
_stage2_model: Optional[ResNet50SiameseNetwork] = None
_brand_gallery_embeddings: Optional[Dict[str, torch.Tensor]] = None


def _get_stage1_model() -> nn.Module:
    """Load and cache the Stage 1 EfficientNet-B0 binary classification model."""
    global _stage1_model
    if _stage1_model is not None:
        return _stage1_model

    model = models.efficientnet_b0(weights=None)
    num_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(num_features, 512),
        nn.ReLU(),
        nn.BatchNorm1d(512),
        nn.Dropout(p=0.2),
        nn.Linear(512, 1)
    )

    if STAGE1_MODEL_PATH.exists():
        state_dict = torch.load(STAGE1_MODEL_PATH, map_location="cpu")
        model.load_state_dict(state_dict)
    model.eval()

    _stage1_model = model
    return _stage1_model


def _get_stage2_siamese_model() -> ResNet50SiameseNetwork:
    """Load and cache the Stage 2 ResNet-50 Siamese brand identification model."""
    global _stage2_model
    if _stage2_model is not None:
        return _stage2_model

    model = ResNet50SiameseNetwork(embedding_dim=128, pretrained=False, dropout_rate=0.25)
    if STAGE2_MODEL_PATH.exists():
        state_dict = torch.load(STAGE2_MODEL_PATH, map_location="cpu")
        model.load_state_dict(state_dict)
    model.eval()

    _stage2_model = model
    return _stage2_model


# ---------------------------------------------------------------------------
# Brand Gallery Profiles & Canonical Embeddings
# Focus on Sri Lankan Banking, Financial Services, Telcos, and Global Targets
# ---------------------------------------------------------------------------
TARGET_BRAND_PROFILES = [
    # --- Sri Lankan Commercial & State Banks ---
    {"name": "Bank of Ceylon (BOC)", "category": "Sri Lankan Banking", "keywords": ["boc", "bank of ceylon", "boc online", "boc smartpay", "boc.lk", "smart online"], "bg": (255, 199, 44), "fg": (0, 0, 0)},
    {"name": "People's Bank", "category": "Sri Lankan Banking", "keywords": ["peoples bank", "peoples wave", "peoples web", "peoplesbank.lk", "peoples online"], "bg": (186, 12, 47), "fg": (255, 255, 255)},
    {"name": "Commercial Bank of Ceylon (ComBank)", "category": "Sri Lankan Banking", "keywords": ["commercial bank", "combank", "combank digital", "combank online", "commercialbank.lk"], "bg": (0, 51, 141), "fg": (255, 255, 255)},
    {"name": "Hatton National Bank (HNB)", "category": "Sri Lankan Banking", "keywords": ["hatton national bank", "hnb", "hnb solo", "hnb digital", "hnb.net", "hnb online"], "bg": (245, 185, 0), "fg": (0, 32, 96)},
    {"name": "Sampath Bank", "category": "Sri Lankan Banking", "keywords": ["sampath bank", "sampath vishwa", "vishwa", "sampath.lk", "vishwa online"], "bg": (235, 104, 0), "fg": (0, 0, 0)},
    {"name": "National Development Bank (NDB)", "category": "Sri Lankan Banking", "keywords": ["ndb", "ndb bank", "ndb neos", "ndbbank.com", "ndb online"], "bg": (243, 112, 33), "fg": (0, 38, 86)},
    {"name": "Seylan Bank", "category": "Sri Lankan Banking", "keywords": ["seylan", "seylan bank", "seylan online", "seylan.lk", "seylan internet banking"], "bg": (208, 2, 27), "fg": (255, 255, 255)},
    {"name": "Nations Trust Bank (NTB) / FriMi", "category": "Sri Lankan Banking", "keywords": ["nations trust bank", "ntb", "frimi", "frimi.lk", "nationstrust.com", "frimi digital"], "bg": (230, 0, 75), "fg": (255, 255, 255)},
    {"name": "DFCC Bank", "category": "Sri Lankan Banking", "keywords": ["dfcc", "dfcc bank", "dfcc direct", "dfcc.lk", "virtual wallet"], "bg": (227, 6, 19), "fg": (255, 255, 255)},
    {"name": "National Savings Bank (NSB)", "category": "Sri Lankan Banking", "keywords": ["nsb", "national savings bank", "nsb online", "nsb.lk"], "bg": (255, 204, 0), "fg": (0, 51, 102)},
    {"name": "Pan Asia Bank (PABC)", "category": "Sri Lankan Banking", "keywords": ["pan asia bank", "pabc", "panasia.lk"], "bg": (227, 82, 5), "fg": (255, 255, 255)},
    {"name": "Union Bank of Colombo", "category": "Sri Lankan Banking", "keywords": ["union bank", "union bank colombo", "unionb.com"], "bg": (0, 164, 228), "fg": (0, 53, 142)},
    {"name": "Amana Bank", "category": "Sri Lankan Banking", "keywords": ["amana bank", "amana online", "amanabank.lk"], "bg": (0, 138, 59), "fg": (212, 175, 55)},
    {"name": "Cargills Bank", "category": "Sri Lankan Banking", "keywords": ["cargills bank", "cargills", "cargillsbank.com"], "bg": (218, 41, 28), "fg": (255, 255, 255)},
    {"name": "Central Bank of Sri Lanka (CBSL)", "category": "Sri Lankan Regulatory / Finance", "keywords": ["central bank of sri lanka", "cbsl", "cbsl.gov.lk"], "bg": (0, 43, 91), "fg": (197, 160, 89)},

    # --- Sri Lankan Mobile Money & Fintech Payments ---
    {"name": "LankaPay / LankaQR", "category": "Sri Lankan Payment Network", "keywords": ["lankapay", "lankaqr", "justpay", "lankaclear.com"], "bg": (10, 88, 202), "fg": (253, 126, 20)},
    {"name": "eZ Cash (Dialog)", "category": "Sri Lankan Mobile Money", "keywords": ["ez cash", "ezcash", "dialog finance", "ezcash.lk"], "bg": (237, 28, 36), "fg": (255, 222, 23)},
    {"name": "mCash (SLT-Mobitel)", "category": "Sri Lankan Mobile Money", "keywords": ["mcash", "mobitel finance", "mcash.lk"], "bg": (0, 168, 89), "fg": (0, 51, 102)},
    {"name": "Dialog Axiata", "category": "Sri Lankan Telecommunications", "keywords": ["dialog", "dialog axiata", "mydialog", "dialog.lk"], "bg": (237, 28, 36), "fg": (0, 84, 166)},
    {"name": "SLT-MOBITEL", "category": "Sri Lankan Telecommunications", "keywords": ["slt", "mobitel", "slt-mobitel", "slt.lk"], "bg": (0, 91, 170), "fg": (0, 177, 64)},

    # --- Sri Lankan Utilities & Public Services ---
    {"name": "Ceylon Electricity Board (CEB)", "category": "Sri Lankan Utilities", "keywords": ["ceb", "ceb care", "ceb.lk", "cebcare"], "bg": (198, 12, 48), "fg": (255, 204, 0)},
    {"name": "National Water Supply and Drainage Board (NWSDB)", "category": "Sri Lankan Utilities", "keywords": ["nwsdb", "water board", "waterboard.lk"], "bg": (0, 120, 215), "fg": (255, 255, 255)},
    {"name": "Sri Lanka Post", "category": "Sri Lankan Public Services", "keywords": ["sri lanka post", "sl post", "slpost.gov.lk", "parcel tracking"], "bg": (142, 20, 39), "fg": (242, 169, 0)},

    # --- Major Global Target Brands ---
    {"name": "Microsoft", "category": "Global Technology", "keywords": ["microsoft", "office365", "outlook", "live.com", "azure", "onedrive"], "bg": (255, 255, 255), "fg": (115, 115, 115)},
    {"name": "Google", "category": "Global Technology", "keywords": ["google", "gmail", "google drive", "google workspace", "accounts.google"], "bg": (255, 255, 255), "fg": (66, 133, 244)},
    {"name": "PayPal", "category": "Global Payments", "keywords": ["paypal", "paypal.com", "send money", "paypal me"], "bg": (255, 255, 255), "fg": (0, 48, 135)},
    {"name": "Apple", "category": "Global Technology", "keywords": ["apple", "icloud", "apple id", "app store", "itunes"], "bg": (255, 255, 255), "fg": (0, 0, 0)},
    {"name": "Amazon", "category": "Global E-Commerce", "keywords": ["amazon", "prime", "aws", "amazon pay", "order confirmation"], "bg": (255, 255, 255), "fg": (255, 153, 0)},
    {"name": "Netflix", "category": "Global Entertainment", "keywords": ["netflix", "watch netflix", "subscription renewal"], "bg": (0, 0, 0), "fg": (229, 9, 20)},
    {"name": "Facebook", "category": "Global Social Media", "keywords": ["facebook", "meta", "facebook login", "fb.com", "meta business"], "bg": (255, 255, 255), "fg": (24, 119, 242)},
    {"name": "Instagram", "category": "Global Social Media", "keywords": ["instagram", "instagram login", "ig"], "bg": (255, 255, 255), "fg": (193, 53, 132)},
    {"name": "WhatsApp", "category": "Global Communication", "keywords": ["whatsapp", "whatsapp web", "whatsapp login"], "bg": (37, 211, 102), "fg": (255, 255, 255)},
    {"name": "Bank of America", "category": "Global Banking", "keywords": ["bank of america", "bofa", "online banking", "bankofamerica"], "bg": (255, 255, 255), "fg": (227, 24, 55)},
    {"name": "Chase Bank", "category": "Global Banking", "keywords": ["chase", "chase bank", "jpmorgan chase", "chase online"], "bg": (255, 255, 255), "fg": (17, 126, 219)},
    {"name": "Wells Fargo", "category": "Global Banking", "keywords": ["wells fargo", "wellsfargo", "wf online"], "bg": (255, 255, 255), "fg": (215, 25, 32)},
    {"name": "Adobe", "category": "Global Software", "keywords": ["adobe", "acrobat", "creative cloud", "pdf sign"], "bg": (255, 255, 255), "fg": (250, 15, 0)},
    {"name": "DHL", "category": "Global Logistics", "keywords": ["dhl", "dhl express", "package tracking", "parcel delivery"], "bg": (255, 204, 0), "fg": (212, 5, 17)},
    {"name": "LinkedIn", "category": "Global Social Media", "keywords": ["linkedin", "linkedin login", "networking"], "bg": (255, 255, 255), "fg": (10, 102, 194)},
    {"name": "Yahoo", "category": "Global Portal", "keywords": ["yahoo", "yahoo mail", "yahoo login"], "bg": (255, 255, 255), "fg": (96, 1, 210)},
    {"name": "eBay", "category": "Global E-Commerce", "keywords": ["ebay", "ebay auction", "buy on ebay"], "bg": (255, 255, 255), "fg": (230, 50, 50)},
    {"name": "Steam", "category": "Global Gaming", "keywords": ["steam", "valvesoftware", "steam community", "steam gift"], "bg": (23, 26, 33), "fg": (102, 192, 244)},
    {"name": "Binance", "category": "Global Cryptocurrency", "keywords": ["binance", "crypto exchange", "binance login", "bnb"], "bg": (24, 26, 32), "fg": (240, 185, 11)},
    {"name": "Coinbase", "category": "Global Cryptocurrency", "keywords": ["coinbase", "coinbase wallet", "crypto wallet"], "bg": (255, 255, 255), "fg": (0, 82, 255)},
    {"name": "Roblox", "category": "Global Gaming", "keywords": ["roblox", "robux", "roblox login"], "bg": (255, 255, 255), "fg": (0, 0, 0)},
    {"name": "Spotify", "category": "Global Entertainment", "keywords": ["spotify", "music streaming", "spotify premium"], "bg": (25, 20, 20), "fg": (30, 215, 96)},
    {"name": "Twitter / X", "category": "Global Social Media", "keywords": ["twitter", "x.com", "tweet", "x login"], "bg": (255, 255, 255), "fg": (0, 0, 0)},
    {"name": "Dropbox", "category": "Global Cloud Storage", "keywords": ["dropbox", "shared file", "dropbox login"], "bg": (255, 255, 255), "fg": (0, 97, 254)},
    {"name": "DocuSign", "category": "Global Business", "keywords": ["docusign", "document signing", "review document"], "bg": (255, 255, 255), "fg": (33, 76, 222)},
    {"name": "ChatGPT / OpenAI", "category": "Global AI Services", "keywords": ["chatgpt", "openai", "chat.openai"], "bg": (52, 53, 65), "fg": (16, 163, 127)},
]



def has_logo_structure(crop_img: Image.Image, min_variance: float = 12.0) -> bool:
    """
    Checks whether an image crop contains meaningful visual structure and edge contrast
    (e.g., logo, text, glyph, emblem) rather than a solid/blank background.
    """
    try:
        import numpy as np
        arr = np.array(crop_img.convert("L"))
        return float(np.std(arr)) > min_variance
    except Exception:
        return True


def _generate_canonical_brand_canvas(brand_info: Dict[str, Any]) -> Image.Image:
    """Generates a standardized high-contrast brand anchor image with structured emblem for gallery indexing."""
    name = brand_info["name"]
    bg = brand_info["bg"]
    fg = brand_info["fg"]
    img = Image.new("RGB", (224, 224), color=bg)
    draw = ImageDraw.Draw(img)
    # Draw geometric emblem border & badge container
    draw.rectangle([30, 30, 194, 194], fill=fg, outline=bg, width=3)
    draw.rectangle([45, 45, 179, 179], fill=bg, outline=fg, width=2)
    # Draw centered brand textual descriptor
    draw.text((55, 95), name[:14], fill=fg)
    return img


def _get_brand_gallery_embeddings() -> Dict[str, torch.Tensor]:
    """Generates and caches 128-D normalized embedding vectors for all reference target brands."""
    global _brand_gallery_embeddings
    if _brand_gallery_embeddings is not None:
        return _brand_gallery_embeddings

    siamese_model = _get_stage2_siamese_model()
    gallery: Dict[str, torch.Tensor] = {}

    with torch.no_grad():
        for brand_info in TARGET_BRAND_PROFILES:
            name = brand_info["name"]
            anchor_img = _generate_canonical_brand_canvas(brand_info)
            tensor = val_test_transform(anchor_img).unsqueeze(0)
            emb = siamese_model.forward_one(tensor)  # (1, 128) unit vector
            gallery[name] = emb

    _brand_gallery_embeddings = gallery
    return _brand_gallery_embeddings


# ---------------------------------------------------------------------------
# Logo & Viewport Region Localization Heuristic
# ---------------------------------------------------------------------------
def extract_logo_candidate_regions(screenshot: Image.Image) -> List[Tuple[str, Image.Image]]:
    """
    Extracts high-probability candidate brand logo and viewport regions from a website screenshot:
    1. Top-Left Header Logo (Standard web convention for brand logos)
    2. Top-Center Header Logo (Common for mobile & modern centered login portals)
    3. Center Form/Auth Box Region (Common for OAuth & Login card banners)
    4. Top Navigation Bar strip
    5. Top-of-fold viewport (top 850px)
    6. Full Screenshot fallback
    """
    w, h = screenshot.size
    candidates: List[Tuple[str, Image.Image]] = []

    # Calculate effective top header and navbar heights (bounded for tall full-page captures)
    header_max_h = min(int(h * 0.25), 350)
    navbar_max_h = min(int(h * 0.18), 220)
    auth_top = min(int(h * 0.15), 180)
    auth_bot = min(int(h * 0.65), 750)

    # 1. Top-Left Header crop (0% to 40% width, top header height)
    crop_tl = screenshot.crop((0, 0, int(w * 0.40), header_max_h))
    candidates.append(("top_left_header", crop_tl))

    # 2. Top-Center Header crop (25% to 75% width, top header height)
    crop_tc = screenshot.crop((int(w * 0.25), 0, int(w * 0.75), header_max_h))
    candidates.append(("top_center_header", crop_tc))

    # 3. Center Login/Authentication Box crop (20% to 80% width, auth region height)
    crop_center = screenshot.crop((int(w * 0.20), auth_top, int(w * 0.80), max(auth_top + 100, auth_bot)))
    candidates.append(("center_auth_box", crop_center))

    # 4. Top Navigation Bar strip (Full width, top navbar height)
    crop_nav = screenshot.crop((0, 0, w, navbar_max_h))
    candidates.append(("top_navbar", crop_nav))

    # 5. Top-of-fold viewport crop (top 850px)
    if h > 850:
        crop_fold = screenshot.crop((0, 0, w, 850))
        candidates.append(("top_fold_viewport", crop_fold))

    # 6. Full screenshot
    candidates.append(("full_page", screenshot))

    return candidates


# ---------------------------------------------------------------------------
# Stage 2: ResNet-50 Siamese Brand Identification Function
# ---------------------------------------------------------------------------
def predict_brand_impersonation(screenshot_input: Any, threshold: float = STAGE2_SIMILARITY_THRESHOLD) -> Dict[str, Any]:
    """
    Identifies the brand being impersonated in a webpage screenshot using the
    ResNet-50 Siamese Network in 128-dimensional Cosine Similarity space.

    Requires both high similarity (>= 0.85) AND margin over secondary candidate (>= 0.04),
    or near-perfect similarity (>= 0.95) to prevent false brand matches on generic layouts.

    Args:
        screenshot_input: Base64 data URI, raw bytes, PIL Image, or file path.
        threshold: Minimum cosine similarity threshold (default 0.85) to declare brand match.

    Returns:
        dict: Brand identification results containing detected brand name,
              similarity score, confidence, and top candidate ranking.
    """
    img = _load_image(screenshot_input)
    if img is None:
        return {
            "status": "error",
            "error": "Invalid screenshot input (could not decode image).",
            "brand_impersonation_detected": False,
            "identified_brand": None,
            "similarity_score": None,
            "confidence": None,
            "top_candidates": []
        }

    try:
        img = img.convert("RGB")
        candidates = extract_logo_candidate_regions(img)
        siamese_model = _get_stage2_siamese_model()
        gallery = _get_brand_gallery_embeddings()

        best_brand: Optional[str] = None
        best_similarity = -1.0
        best_crop_name = "top_left_header"
        all_brand_scores: Dict[str, float] = {}

        # Focus brand matching on header, logo strip, login card, and full image for isolated logos
        w, h = img.size
        logo_candidates = [c for c in candidates if c[0] in ["top_left_header", "top_center_header", "top_navbar", "center_auth_box"]]
        if w <= 600 or h <= 600 or len(candidates) <= 1:
            logo_candidates.append(("full_page", img))

        with torch.no_grad():
            for crop_name, crop_img in logo_candidates:
                # Filter out solid/blank regions with no visual logo structure
                if not has_logo_structure(crop_img, min_variance=15.0):
                    continue

                crop_tensor = val_test_transform(crop_img).unsqueeze(0)
                crop_emb = siamese_model.forward_one(crop_tensor)  # (1, 128)

                for brand_name, brand_emb in gallery.items():
                    # Cosine similarity in normalized L2 space
                    sim = F.cosine_similarity(crop_emb, brand_emb, dim=1).item()

                    if brand_name not in all_brand_scores or sim > all_brand_scores[brand_name]:
                        all_brand_scores[brand_name] = sim

                    if sim > best_similarity:
                        best_similarity = sim
                        best_brand = brand_name
                        best_crop_name = crop_name

        # If no valid structured region found or no matches
        if not all_brand_scores:
            return {
                "status": "success",
                "brand_impersonation_detected": False,
                "identified_brand": None,
                "similarity_score": 0.0,
                "confidence": 0.0,
                "best_region": "top_left_header",
                "threshold": threshold,
                "top_candidates": []
            }

        # Sort top candidates
        sorted_candidates = sorted(all_brand_scores.items(), key=lambda x: x[1], reverse=True)
        top_candidates_list = [{"brand": b, "similarity": round(s, 4)} for b, s in sorted_candidates[:5]]

        top_brand, top_sim = sorted_candidates[0]
        second_sim = sorted_candidates[1][1] if len(sorted_candidates) > 1 else 0.0
        margin = top_sim - second_sim

        # Distinctive brand match requires either:
        # 1. Similarity >= threshold (0.85) AND clear margin >= 0.04 over runner-up, OR
        # 2. Near-perfect canonical match (similarity >= 0.95)
        detected = (top_sim >= threshold and margin >= 0.04) or (top_sim >= 0.95)
        confidence = max(0.0, min(1.0, (top_sim - 0.50) / 0.50)) if detected else 0.0

        return {
            "status": "success",
            "brand_impersonation_detected": detected,
            "identified_brand": top_brand if detected else None,
            "similarity_score": round(top_sim, 4),
            "confidence": round(confidence, 4),
            "best_region": best_crop_name,
            "threshold": threshold,
            "margin": round(margin, 4),
            "top_candidates": top_candidates_list,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "brand_impersonation_detected": False,
            "identified_brand": None,
            "similarity_score": None,
            "confidence": None,
            "top_candidates": []
        }


# ---------------------------------------------------------------------------
# Visual Annotation Engine (In-Memory Base64)
# ---------------------------------------------------------------------------
def generate_annotated_screenshot(
    screenshot_input: Any,
    prediction: str,
    prob: float,
    brand_impersonation: Dict[str, Any],
    best_region: Optional[str] = None
) -> Optional[str]:
    """
    Generates an annotated visual evidence screenshot with bounding boxes
    and threat badges highlighting detected visual phishing indicators.
    Returns the annotated image as an in-memory Base64 Data URI string.
    """
    img = _load_image(screenshot_input)
    if img is None:
        return None

    try:
        annotated_img = img.convert("RGBA")
        draw = ImageDraw.Draw(annotated_img)
        w, h = annotated_img.size

        is_phishing = prediction == "phishing"
        brand_name = brand_impersonation.get("brand")

        if is_phishing:
            # Determine bounding box based on detected region (bounded for tall full-page captures)
            header_max_h = min(int(h * 0.25), 350)
            navbar_max_h = min(int(h * 0.18), 220)
            auth_top = min(int(h * 0.15), 180)
            auth_bot = min(int(h * 0.65), 750)

            if best_region == "top_left_header":
                box = (10, 10, int(w * 0.40), header_max_h)
            elif best_region == "top_center_header":
                box = (int(w * 0.25), 10, int(w * 0.75), header_max_h)
            elif best_region == "center_auth_box":
                box = (int(w * 0.20), auth_top, int(w * 0.80), max(auth_top + 100, auth_bot))
            elif best_region == "top_navbar":
                box = (10, 10, w - 10, navbar_max_h)
            elif best_region == "top_fold_viewport":
                box = (10, 10, w - 10, min(h, 850))
            else:
                box = (10, 10, int(w * 0.45), header_max_h)

            if brand_name:
                color = (220, 38, 38, 255)  # Crimson red
                label = f"Logo Detected: {brand_name}"
            else:
                color = (234, 88, 12, 255)  # Orange warning
                label = f"Suspicious Logo Region ({prob * 100:.1f}%)"

            # Draw simple square bounding box around the logo region
            draw.rectangle(box, outline=color, width=3)

            # Draw small label tag above the box
            label_h = 22
            label_w = len(label) * 7 + 16
            label_box = (box[0], max(0, box[1] - label_h), min(w, box[0] + label_w), box[1])
            if box[1] < label_h:
                label_box = (box[0], box[3], min(w, box[0] + label_w), box[3] + label_h)
            draw.rectangle(label_box, fill=color)
            draw.text((label_box[0] + 8, label_box[1] + 4), label, fill=(255, 255, 255, 255))
        else:
            # Clean top banner for verified legitimate site
            color = (22, 163, 74, 255)  # Emerald green
            conf_pct = (1.0 - prob) * 100.0 if prob is not None else 95.0
            label = f"[OK] VISUALLY VERIFIED LEGITIMATE (Visual ML Confidence: {conf_pct:.1f}%)"
            banner_h = 32
            draw.rectangle((0, 0, w, banner_h), fill=color)
            draw.text((16, 8), label, fill=(255, 255, 255, 255))

        # Save into in-memory buffer as Base64 Data URI
        buf = io.BytesIO()
        annotated_img.convert("RGB").save(buf, format="PNG")
        buf.seek(0)
        b64_encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64_encoded}"

    except Exception:
        return None


# ---------------------------------------------------------------------------
# Integrated Two-Stage Prediction Pipeline (Multi-Crop & Decision Fusion)
# ---------------------------------------------------------------------------
def predict_screenshot(screenshot_input: Any) -> Dict[str, Any]:
    """
    Executes the complete Two-Stage Computer Vision Phishing & Brand Identification Pipeline:

    Stage 1: Binary Classification (EfficientNet-B0)
      - Evaluates full screenshot as primary classifier.
      - If full page has high height, evaluates top-fold viewport.
      - Predicts phishing probability score p_stage1 in [0.0, 1.0].

    Stage 2: Brand Identification (ResNet-50 Siamese Network)
      - Evaluates candidate header and logo regions.
      - Measures 128-D cosine similarity against reference brand gallery.
      - Requires distinctive margin to avoid false positive brand matches.

    Two-Stage Decision Fusion:
      - Phishing is declared if Stage 1 >= 0.60 OR Stage 2 detects brand impersonation.
      - Calibrates final probability and confidence.

    Args:
        screenshot_input: Base64 data URI, raw bytes, PIL Image, or file path.

    Returns:
        dict: Unified analysis result containing Stage 1 binary prediction,
              Stage 2 brand identification, annotated Base64 screenshot, and report keys.
    """
    img = _load_image(screenshot_input)
    if img is None:
        return {
            "status": "error",
            "error": "Screenshot input is empty or could not be loaded into an image.",
            "prediction": None,
            "probability": None,
            "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
            "annotated_screenshot_data": None,
            "annotated_screenshot_path": None,
        }

    try:
        img_rgb = img.convert("RGB")
        w, h = img_rgb.size
        stage1_model = _get_stage1_model()

        # -----------------------------------------------------------------------
        # STAGE 1: EfficientNet-B0 Binary Classification
        # -----------------------------------------------------------------------
        with torch.no_grad():
            t_full = val_test_transform(img_rgb).unsqueeze(0)
            p_full = torch.sigmoid(stage1_model(t_full)).item()

            p_view = 0.0
            if h >= 400:
                view_img = img_rgb.crop((0, 0, w, min(h, 750)))
                t_view = val_test_transform(view_img).unsqueeze(0)
                p_view = torch.sigmoid(stage1_model(t_view)).item()

        prob_stage1 = max(p_full, p_view)
        stage1_pred = "phishing" if prob_stage1 >= STAGE1_THRESHOLD else "legitimate"

        # -----------------------------------------------------------------------
        # STAGE 2: ResNet-50 Siamese Brand Identification
        # -----------------------------------------------------------------------
        stage2_out = predict_brand_impersonation(img_rgb, threshold=STAGE2_SIMILARITY_THRESHOLD)
        brand_detected = bool(stage2_out.get("brand_impersonation_detected", False))
        identified_brand = stage2_out.get("identified_brand")
        brand_conf = stage2_out.get("confidence") or 0.0
        best_similarity = stage2_out.get("similarity_score") or 0.0
        best_region = stage2_out.get("best_region", "top_left_header")

        stage2_result: Dict[str, Any] = {
            "triggered": True,
            "brand_impersonation_detected": brand_detected,
            "identified_brand": identified_brand,
            "similarity_score": best_similarity,
            "confidence": brand_conf,
            "best_region": best_region,
            "top_candidates": stage2_out.get("top_candidates", []),
        }

        # -----------------------------------------------------------------------
        # UNIFIED TWO-STAGE DECISION FUSION
        # -----------------------------------------------------------------------
        if brand_detected and identified_brand:
            # High-confidence brand impersonation detected
            prediction = "phishing"
            effective_prob = max(prob_stage1, 0.75 + 0.20 * brand_conf)
            effective_prob = min(0.99, effective_prob)
            confidence = effective_prob
            message = (
                f"Stage 2 Siamese Network detected brand impersonation of '{identified_brand}' "
                f"(similarity: {best_similarity:.4f}, confidence: {brand_conf:.4f}). "
                f"Stage 1 Visual ML phishing probability: {prob_stage1:.4f}."
            )
        elif stage1_pred == "phishing":
            # Stage 1 binary classifier flagged phishing
            prediction = "phishing"
            effective_prob = prob_stage1
            confidence = prob_stage1
            message = (
                f"Stage 1 Visual ML classified screenshot as PHISHING (probability: {prob_stage1:.4f}). "
                f"Stage 2 Siamese Network did not match a specific known brand gallery logo (generic phishing design)."
            )
        else:
            # Both stages verified legitimate
            prediction = "legitimate"
            effective_prob = prob_stage1
            confidence = 1.0 - prob_stage1
            message = (
                f"Stage 1 Visual ML classified screenshot as LEGITIMATE (phishing probability: {prob_stage1:.4f}, "
                f"confidence: {confidence:.4f}). No brand impersonation detected in Stage 2."
            )

        brand_impersonation_dict = {
            "detected": brand_detected,
            "brand": identified_brand,
            "confidence": brand_conf,
            "similarity_score": best_similarity,
        }

        # Generate Visual Annotation Evidence (In-Memory Base64)
        annotated_screenshot_data = generate_annotated_screenshot(
            screenshot_input=img_rgb,
            prediction=prediction,
            prob=effective_prob,
            brand_impersonation=brand_impersonation_dict,
            best_region=best_region
        )

        screenshot_data_str = screenshot_input if isinstance(screenshot_input, str) and screenshot_input.startswith("data:image/") else None
        if screenshot_data_str is None:
            buf = io.BytesIO()
            img_rgb.save(buf, format="PNG")
            screenshot_data_str = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

        return {
            "status": "success",
            "screenshot_data": screenshot_data_str,
            "screenshot_path": None,
            "annotated_screenshot_data": annotated_screenshot_data,
            "annotated_screenshot_path": None,
            "annotated_screenshot_url": annotated_screenshot_data,
            "stage1_binary_classification": {
                "prediction": stage1_pred,
                "phishing_probability": round(prob_stage1, 4),
                "confidence": round(prob_stage1 if stage1_pred == "phishing" else (1.0 - prob_stage1), 4),
                "threshold": STAGE1_THRESHOLD
            },
            "stage2_brand_identification": stage2_result,
            # Synthesized decision keys for orchestrator and report generator
            "prediction": prediction,
            "probability": round(effective_prob, 4),
            "confidence": round(confidence, 4),
            "brand_impersonation": brand_impersonation_dict,
            "message": message,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "prediction": None,
            "probability": None,
            "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
            "annotated_screenshot_data": None,
            "annotated_screenshot_path": None,
        }


