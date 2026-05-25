"""
NutriVision — AI Pipeline (Hybrid YOLO + CLIP)
================================================
Dual-model pipeline:
  1. YOLOv8             → detect objects + bounding boxes
  2. OpenAI CLIP         → classify cropped food regions
     (openai/clip-vit-base-patch32)

CLIP compares each image crop against a custom FOOD_LABELS
list, so it can recognise any food we define — not limited
to a fixed 101-class dataset.

If YOLO finds nothing, the entire image is classified by CLIP.
"""

import json
import os
import torch
from PIL import Image

# CRITICAL FIX: PyTorch 2.6+ weights_only security
# Patch torch.load to allow unsafe loading for YOLOv8 models
_original_torch_load = torch.load
def _patched_torch_load(f, *args, **kwargs):
    kwargs.setdefault('weights_only', False)
    return _original_torch_load(f, *args, **kwargs)
torch.load = _patched_torch_load

from ultralytics import YOLO
from transformers import CLIPProcessor, CLIPModel

# ───────────────────────────────────────────────
# Load Models
# ───────────────────────────────────────────────

# YOLO for object detection + bounding boxes
# Downloads directly from Hugging Face hub on first startup
from huggingface_hub import hf_hub_download
model_path = hf_hub_download(repo_id="ansh-09/nutrivision-yolo", filename="yolov8n.pt")
_yolo_model = YOLO(model_path)

# CLIP model + processor (downloads ~600 MB on first run, cached after)
print("[AI] Loading CLIP classifier (openai/clip-vit-base-patch32)…")
_clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
_clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
_clip_model.eval()
print("[AI] CLIP classifier loaded.")

# ───────────────────────────────────────────────
# Food Nutrition Database
# ───────────────────────────────────────────────

_db_path = os.path.join(os.path.dirname(__file__), "food_database.json")
with open(_db_path, "r", encoding="utf-8") as f:
    FOOD_DATABASE = json.load(f)


# ───────────────────────────────────────────────
# Custom Food Labels for CLIP
# ───────────────────────────────────────────────
# CLIP compares the image against ALL of these text
# prompts and picks the best match.  The labels map
# directly to keys in food_database.json.

FOOD_LABELS = [
    # Grains / staples
    "rice", "fried_rice", "biryani", "chapati", "naan",
    "pasta", "noodles", "idli", "dosa",

    # Protein
    "chicken_curry", "egg", "omelette", "fish",
    "steak", "sushi", "paneer",

    # Curries / soups
    "dal", "soup", "salad",

    # Fruits
    "banana", "apple", "orange", "guava", "grapes", "black_grapes", "blue_grapes",

    # Vegetables
    "broccoli", "carrot",

    # Fast food / snacks
    "pizza", "burger", "sandwich", "hot_dog",
    "french_fries", "samosa",

    # Desserts
    "cake", "donut", "ice_cream",
]

# Build the text prompts once (prefixed for better CLIP accuracy)
_CLIP_PROMPTS = [f"a photo of {label.replace('_', ' ')}" for label in FOOD_LABELS]


# ───────────────────────────────────────────────
# Non-food YOLO classes to always ignore
# ───────────────────────────────────────────────

IGNORE_CLASSES = {
    "person", "bicycle", "car", "motorcycle", "airplane", "bus",
    "train", "truck", "boat", "traffic light", "fire hydrant",
    "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe",
    "backpack", "umbrella", "handbag", "tie", "suitcase",
    "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket",
    "chair", "couch", "potted plant", "bed",
    "dining table", "toilet",
    "tv", "laptop", "mouse", "remote", "keyboard", "cell phone",
    "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
}

# YOLO classes that are already accurate food labels —
# skip CLIP classification for these.
SAFE_YOLO_FOODS = {
    "banana", "apple", "orange", "broccoli", "carrot",
}

# Default portion weights (grams) per food type
DEFAULT_WEIGHTS = {
    "rice": 220, "fried_rice": 220, "dal": 180, "chapati": 40,
    "salad": 100, "chicken_curry": 180, "egg": 60, "omelette": 100,
    "banana": 120, "apple": 180, "orange": 150, "guava": 150, "grapes": 100,
    "black_grapes": 100, "blue_grapes": 100,
    "pizza": 300, "burger": 200, "sandwich": 180, "cake": 300,
    "donut": 70, "pasta": 220, "noodles": 200, "fish": 150,
    "paneer": 100, "biryani": 450, "idli": 40, "dosa": 100,
    "samosa": 80, "naan": 80, "hot_dog": 100, "french_fries": 120,
    "broccoli": 100, "carrot": 80, "steak": 200, "sushi": 150,
    "ice_cream": 100, "soup": 250,
    "_default": 150,
}

AVERAGE_FRUIT_WEIGHTS = {
    "banana": 120,
    "apple": 180,
    "orange": 150,
    "guava": 150,
    "grapes": 130,
    "black_grapes": 130,
    "blue_grapes": 130,
    "carrot": 70,
    "broccoli": 100
}

# ───────────────────────────────────────────────
# classify_food_clip(image) — CLIP zero-shot
# ───────────────────────────────────────────────

def classify_food(pil_image):
    """
    Run CLIP zero-shot classification on a PIL image.
    Compares the image against every prompt in _CLIP_PROMPTS
    and returns the FOOD_LABELS entry with the highest score.
    """
    try:
        inputs = _clip_processor(
            text=_CLIP_PROMPTS,
            images=pil_image,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = _clip_model(**inputs)

        # cosine similarities → softmax probabilities
        logits = outputs.logits_per_image[0]
        probs = logits.softmax(dim=0)
        best_idx = probs.argmax().item()

        label = FOOD_LABELS[best_idx]
        confidence = probs[best_idx].item()
        print(f"[CLIP] Classified as '{label}' ({confidence:.1%})")

        # Low-confidence filter — reject unreliable predictions
        if confidence < 0.35:
            print(f"[CLIP] Confidence too low ({confidence:.1%}), using _default")
            return "_default"

        return label

    except Exception as e:
        print(f"[AI] CLIP classification error: {e}")
        return "_default"


# ───────────────────────────────────────────────
# detect_food_items(image_path) — Hybrid pipeline
# ───────────────────────────────────────────────

def detect_food_items(image_path):
    """
    Hybrid detection pipeline:
      1. Run YOLO on the image for object detection + bboxes
      2. If the YOLO label is a SAFE_YOLO_FOOD → keep it
         Otherwise crop the region → classify with CLIP
      3. If YOLO finds nothing → classify the full image

    Returns list of dicts:
        { "food_name", "bbox", "mask_area" }
    """
    try:
        full_image = Image.open(image_path).convert("RGB")
    except Exception as e:
        print(f"[AI] Image read error: {e}")
        return []

    img_w, img_h = full_image.size

    # Step 1 — YOLO detection
    try:
        yolo_results = _yolo_model(image_path, conf=0.30)
    except Exception as e:
        print(f"[AI] YOLO error: {e}")
        yolo_results = []

    detections = []

    for r in yolo_results:
        if r.boxes is None:
            continue

        for box in r.boxes:
            cls_id = int(box.cls[0])
            yolo_label = _yolo_model.names[cls_id].lower()

            # Skip non-food objects
            if yolo_label in IGNORE_CLASSES:
                continue

            # Extract bounding box
            try:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                bbox = [round(x1), round(y1), round(x2), round(y2)]
            except Exception:
                bbox = [0, 0, img_w, img_h]
                x1, y1, x2, y2 = 0, 0, img_w, img_h

            # Step 2 — Decide: keep YOLO label or classify with CLIP
            if yolo_label in SAFE_YOLO_FOODS:
                # YOLO identified a fruit/vegetable — keep directly
                food_name = yolo_label
            else:
                # Crop region and run CLIP classification
                try:
                    crop = full_image.crop((
                        max(0, int(x1)),
                        max(0, int(y1)),
                        min(img_w, int(x2)),
                        min(img_h, int(y2)),
                    ))
                    food_name = classify_food(crop)
                except Exception:
                    food_name = "_default"

            # Estimate mask area from bbox
            mask_area = abs(int(x2) - int(x1)) * abs(int(y2) - int(y1))

            detections.append({
                "food_name": food_name,
                "bbox": bbox,
                "mask_area": mask_area,
            })

    # Step 3 — Fallback: if YOLO found nothing, classify whole image
    if len(detections) == 0:
        food_name = classify_food(full_image)
        detections.append({
            "food_name": food_name,
            "bbox": [0, 0, img_w, img_h],
            "mask_area": img_w * img_h,
        })

    return detections


# ───────────────────────────────────────────────
# calculate_nutrition(food_name, weight)
# ───────────────────────────────────────────────

def calculate_nutrition(food_name, weight):
    """
    Scale per-100g macros by the estimated weight.
    Falls back to _default entry if the food isn't in the database.
    """
    food_name = food_name.lower()
    entry = FOOD_DATABASE.get(food_name, FOOD_DATABASE.get("_default", {}))
    factor = weight / 100.0

    return {
        "calories": round(entry.get("calories_per_100g", 0) * factor, 1),
        "protein":  round(entry.get("protein_per_100g", 0) * factor, 1),
        "carbs":    round(entry.get("carbs_per_100g", 0) * factor, 1),
        "fat":      round(entry.get("fat_per_100g", 0) * factor, 1),
    }


# ───────────────────────────────────────────────
# estimate_weight(mask_area, food_name)
# ───────────────────────────────────────────────

def estimate_weight(mask_area, food_name):
    """
    Get a default weight for the food item.
    """
    food_name = food_name.lower()
    return DEFAULT_WEIGHTS.get(food_name, 150)