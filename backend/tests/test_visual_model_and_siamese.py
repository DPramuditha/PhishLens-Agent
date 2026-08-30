"""
PhishLens Agent — Test Suite for Computer Vision ML Pipeline (Stage 1 Binary Classifier & Stage 2 Siamese Brand Network).
"""

import base64
import io
import torch
from PIL import Image
import pytest

from backend.agents.visual_model import (
    _load_image,
    AdaptiveConcatPool2d,
    ResNet50SiameseNetwork,
    predict_screenshot,
    predict_brand_impersonation,
    extract_logo_candidate_regions,
    generate_annotated_screenshot,
    val_test_transform,
    STAGE1_THRESHOLD,
    STAGE2_SIMILARITY_THRESHOLD,
)


# ===========================================================================
# 1. Image Preprocessing & Decoding Utilities Tests
# ===========================================================================

class TestImageUtilities:
    def test_load_image_from_pil(self):
        """_load_image accepts and copies a PIL Image."""
        img = Image.new("RGB", (100, 100), color="blue")
        loaded = _load_image(img)
        assert isinstance(loaded, Image.Image)
        assert loaded.size == (100, 100)

    def test_load_image_from_bytes(self):
        """_load_image accepts raw image bytes."""
        img = Image.new("RGB", (50, 50), color="red")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        loaded = _load_image(raw_bytes)
        assert isinstance(loaded, Image.Image)
        assert loaded.size == (50, 50)

    def test_load_image_from_data_uri(self, sample_png_b64):
        """_load_image parses base64 Data URI."""
        loaded = _load_image(sample_png_b64)
        assert isinstance(loaded, Image.Image)

    def test_load_image_invalid_inputs(self):
        """_load_image gracefully returns None for empty or invalid inputs."""
        assert _load_image(None) is None
        assert _load_image("") is None
        assert _load_image("not-a-valid-image-data-or-path") is None

    def test_val_test_transform_tensor_shape(self):
        """val_test_transform transforms any PIL image to 3x224x224 normalized tensor."""
        img = Image.new("RGB", (400, 300), color="green")
        tensor = val_test_transform(img)
        assert isinstance(tensor, torch.Tensor)
        assert tensor.shape == (3, 224, 224)


# ===========================================================================
# 2. Siamese Neural Network Architecture Tests
# ===========================================================================

class TestSiameseArchitecture:
    def test_adaptive_concat_pool_2d(self):
        """AdaptiveConcatPool2d concatenates GAP and GMP outputs."""
        pool = AdaptiveConcatPool2d()
        # Mock feature map: (batch_size=2, channels=2048, H=7, W=7)
        dummy_feat = torch.randn(2, 2048, 7, 7)
        out = pool(dummy_feat)
        # GAP (2048) + GMP (2048) = 4096 dimensions
        assert out.shape == (2, 4096)

    def test_resnet50_siamese_l2_normalization(self):
        """Siamese network projection head outputs unit L2-normalized 128-D embeddings."""
        model = ResNet50SiameseNetwork(embedding_dim=128, pretrained=False)
        model.eval()

        dummy_img = torch.randn(2, 3, 224, 224)
        with torch.no_grad():
            emb = model.forward_one(dummy_img)

        assert emb.shape == (2, 128)
        # Check that L2 norm of each embedding vector is approximately 1.0 (hypersphere)
        norms = torch.norm(emb, p=2, dim=1)
        for n in norms:
            assert abs(float(n) - 1.0) < 1e-4

    def test_siamese_twin_forward_pass(self):
        """Siamese network can compute twin representations simultaneously."""
        model = ResNet50SiameseNetwork(embedding_dim=128, pretrained=False)
        model.eval()

        img1 = torch.randn(1, 3, 224, 224)
        img2 = torch.randn(1, 3, 224, 224)

        with torch.no_grad():
            emb1, emb2 = model(img1, img2)

        assert emb1.shape == (1, 128)
        assert emb2.shape == (1, 128)

        # Cosine similarity in range [-1.0, 1.0]
        cos_sim = torch.cosine_similarity(emb1, emb2).item()
        assert -1.0 <= cos_sim <= 1.0


# ===========================================================================
# 3. Visual Model High-Level Pipeline Tests
# ===========================================================================

class TestVisualPipeline:
    def test_threshold_constants(self):
        """Test threshold constants."""
        assert STAGE1_THRESHOLD == 0.60
        assert STAGE2_SIMILARITY_THRESHOLD == 0.85

    def test_extract_logo_candidate_regions(self):
        """extract_logo_candidate_regions crops potential header and logo areas."""
        img = Image.new("RGB", (1280, 800), color="white")
        regions = extract_logo_candidate_regions(img)
        assert isinstance(regions, list)
        assert len(regions) >= 1
        # Each region has (location_name, PIL.Image)
        for loc_name, crop_img in regions:
            assert isinstance(loc_name, str)
            assert isinstance(crop_img, Image.Image)

    def test_predict_screenshot_with_none(self):
        """predict_screenshot handles None or invalid input safely."""
        res = predict_screenshot(None)
        assert isinstance(res, dict)
        assert res.get("status") == "error" or "error" in res

    def test_predict_screenshot_synthetic_image(self):
        """predict_screenshot runs two-stage classification on a synthetic image."""
        img = Image.new("RGB", (640, 480), color=(240, 240, 240))
        res = predict_screenshot(img)
        assert isinstance(res, dict)
        assert res.get("status") == "success"
        assert "prediction" in res
        assert "probability" in res
        assert "brand_impersonation" in res

    def test_predict_screenshot_phishing_login_interface(self):
        """predict_screenshot correctly flags a phishing login page as phishing with high probability."""
        from PIL import ImageDraw
        login_img = Image.new("RGB", (1280, 800), color=(240, 242, 245))
        draw = ImageDraw.Draw(login_img)
        draw.rectangle([400, 200, 880, 600], fill=(255, 255, 255), outline=(200, 200, 200), width=2)
        draw.rectangle([450, 300, 830, 350], fill=(250, 250, 250), outline=(150, 150, 150), width=1)
        draw.rectangle([450, 380, 830, 430], fill=(250, 250, 250), outline=(150, 150, 150), width=1)
        draw.rectangle([450, 470, 830, 520], fill=(24, 119, 242))
        draw.text((460, 240), "Sign in to your account", fill=(0, 0, 0))
        draw.text((460, 315), "Email or Phone", fill=(120, 120, 120))
        draw.text((460, 395), "Password", fill=(120, 120, 120))
        draw.text((600, 485), "Log In", fill=(255, 255, 255))

        res = predict_screenshot(login_img)
        assert res["status"] == "success"
        assert res["prediction"] == "phishing"
        assert res["probability"] >= 0.60
        assert res["stage1_binary_classification"]["prediction"] == "phishing"

    def test_predict_screenshot_brand_impersonation_detection(self):
        """predict_screenshot detects brand impersonation when a brand logo is present."""
        from backend.agents.visual_model import _generate_canonical_brand_canvas, TARGET_BRAND_PROFILES
        boc_profile = next(b for b in TARGET_BRAND_PROFILES if "Ceylon" in b["name"])
        boc_canvas = _generate_canonical_brand_canvas(boc_profile)

        res = predict_screenshot(boc_canvas)
        assert res["status"] == "success"
        assert res["prediction"] == "phishing"
        assert res["brand_impersonation"]["detected"] is True
        assert res["brand_impersonation"]["brand"] == "Bank of Ceylon (BOC)"
        assert res["probability"] >= 0.70

    def test_predict_screenshot_blank_image_legitimate(self):
        """predict_screenshot does not false-positive on blank/plain images."""
        blank_white = Image.new("RGB", (1280, 800), (255, 255, 255))
        res = predict_screenshot(blank_white)
        assert res["status"] == "success"
        assert res["prediction"] == "legitimate"
        assert res["brand_impersonation"]["detected"] is False

    def test_generate_annotated_screenshot(self):
        """generate_annotated_screenshot creates an annotated PNG base64 string."""
        img = Image.new("RGB", (400, 300), color="white")
        annotated_b64 = generate_annotated_screenshot(
            screenshot_input=img,
            prediction="phishing",
            prob=0.88,
            brand_impersonation={"detected": True, "brand": "Bank of Ceylon", "confidence": 0.94}
        )
        assert isinstance(annotated_b64, str)
        assert annotated_b64.startswith("data:image/png;base64,")

    def test_predict_screenshot_brand_impersonation_when_weights_unreadable(self, monkeypatch):
        """predict_screenshot operates safely even when .pth weight files are unreadable (e.g. Git LFS pointers in CI)."""
        import backend.agents.visual_model as vm

        # Reset cached model instances
        monkeypatch.setattr(vm, "_stage1_model", None)
        monkeypatch.setattr(vm, "_stage2_model", None)
        monkeypatch.setattr(vm, "_brand_gallery_embeddings", None)

        def mock_torch_load(*args, **kwargs):
            raise RuntimeError("Corrupted weights or Git LFS pointer file")

        monkeypatch.setattr(torch, "load", mock_torch_load)

        from backend.agents.visual_model import _generate_canonical_brand_canvas, TARGET_BRAND_PROFILES
        boc_profile = next(b for b in TARGET_BRAND_PROFILES if "Ceylon" in b["name"])
        boc_canvas = _generate_canonical_brand_canvas(boc_profile)

        res = predict_screenshot(boc_canvas)
        assert res["status"] == "success"
        assert res["prediction"] == "phishing"
        assert res["brand_impersonation"]["detected"] is True
        assert res["brand_impersonation"]["brand"] == "Bank of Ceylon (BOC)"


