import os
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# Path to the visual ML model weights
MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "phishing_model_stage1.pth"

# Model transform: Resize to 224x224 and normalize as in the training notebook
val_test_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

_visual_model = None

def _get_visual_model():
    """Load and cache the trained visual ML model on demand."""
    global _visual_model
    if _visual_model is not None:
        return _visual_model

    # Reconstruct the model architecture matching phishing_model_stage1.pth
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

    # Load state dict (force CPU since we don't need GPU for single-image inference)
    state_dict = torch.load(MODEL_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    
    _visual_model = model
    return _visual_model


def predict_screenshot(screenshot_path: str) -> dict:
    """
    Run the custom PyTorch visual classification model on a website screenshot
    to detect if it is phishing or legitimate.

    Args:
        screenshot_path: Absolute file path to the screenshot PNG.

    Returns:
        dict: A dictionary containing the prediction result, probability,
              confidence, and message.
    """
    if not screenshot_path or not os.path.exists(screenshot_path):
        return {
            "status": "error",
            "error": f"Screenshot path '{screenshot_path}' does not exist or is empty.",
            "prediction": None,
            "probability": None
        }

    try:
        # Load and preprocess image
        img = Image.open(screenshot_path).convert("RGB")
        transformed_img = val_test_transform(img).unsqueeze(0)

        # Run inference
        model = _get_visual_model()
        with torch.no_grad():
            logits = model(transformed_img)
            prob = torch.sigmoid(logits).item()

        # Classify based on the 0.60 threshold from training notebook
        prediction = "phishing" if prob >= 0.60 else "legitimate"
        confidence = prob if prediction == "phishing" else (1.0 - prob)

        message = (
            f"Visual ML model classified the screenshot as {prediction.upper()} "
            f"with a phishing probability of {prob:.4f} (confidence: {confidence:.4f})."
        )

        return {
            "status": "success",
            "screenshot_path": screenshot_path,
            "prediction": prediction,
            "probability": round(prob, 4),
            "confidence": round(confidence, 4),
            "message": message,
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "prediction": None,
            "probability": None
        }
