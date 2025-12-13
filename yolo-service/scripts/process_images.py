import os
import json
import math
import time
from pathlib import Path

import cv2
import numpy as np

# Ultralytics YOLO
try:
    from ultralytics import YOLO
except:
    YOLO = None
    print("⚠️ Ultralytics not installed. Run: pip install ultralytics")


BASE = Path(__file__).resolve().parents[1]
CONFIG_PATH = BASE / "configs" / "video_configs.json"
OUT_PATH = BASE / "out" / "processed_result.json"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

# Vehicle service time
VEHICLE_TIMES = {
    'car': 2.0,
    'truck': 2.5,
    'bus': 2.5,
    'motorcycle': 1.2,
    'bicycle': 1.5
}

VALID_CLASSES = set(VEHICLE_TIMES.keys())

MIN_GREEN = 10
MAX_GREEN = 60
SAFETY_BUFFER = 3


def point_in_poly(px, py, polygon):
    """Return True if point is inside polygon."""
    if not polygon:
        return True

    pts = np.array([[p['x'], p['y']] for p in polygon], np.int32)
    inside = cv2.pointPolygonTest(pts, (int(px), int(py)), False) >= 0
    return inside


def compute_green(counts):
    total = sum(counts.values())
    if total == 0:
        return MIN_GREEN

    total_time = sum(counts[c] * VEHICLE_TIMES.get(c, 2.0) for c in counts)
    avg_service = total_time / total
    green = math.ceil(total * avg_service + SAFETY_BUFFER)

    return max(MIN_GREEN, min(MAX_GREEN, int(green)))


def load_model():
    """Load YOLOv8n.pt"""
    if YOLO is None:
        raise RuntimeError("Ultralytics not installed")

    model_path = BASE / "model" / "yolov8n.pt"
    if not model_path.exists():
        raise FileNotFoundError(f"YOLO model not found: {model_path}")

    print(f"\n🔵 Loading YOLO model: {model_path}\n")
    return YOLO(str(model_path))


def resolve_image_path(raw_path):
    if not raw_path:
        return None

    p = Path(raw_path)

    # Absolute path
    if p.is_absolute():
        return p

    repo_root = BASE.parent
    candidates = [
        Path.cwd() / p,
        repo_root / p,
        BASE / p
    ]

    # Handle "/yolo-service/images/..."
    parts = p.parts
    if parts and parts[0].lower().startswith("yolo"):
        candidates.append(BASE / Path(*parts[1:]))

    for c in candidates:
        if c.exists():
            return c

    return candidates[-1]


def process_all_images(config_path=CONFIG_PATH, model=None):
    """Main pipeline"""
    if not config_path.exists():
        raise FileNotFoundError(f"Config file missing: {config_path}")

    configs = json.loads(config_path.read_text())
    if model is None:
        model = load_model()

    out = {"timestamp": time.time(), "lanes": []}

    for lane in configs:
        lane_id = lane.get("lane_id")
        polygon = lane.get("polygon", [])
        img_path_raw = lane.get("path")

        resolved = resolve_image_path(img_path_raw)

        print(f"\n==============================")
        print(f"🚦 LANE {lane_id}")
        print(f"Raw path: {img_path_raw}")
        print(f"Resolved: {resolved}")
        print("==============================\n")

        img = cv2.imread(str(resolved))

        if img is None:
            print(f"❌ Cannot load image: {resolved}")
            out["lanes"].append({
                "laneId": lane_id,
                "image": img_path_raw,
                "image_resolved": str(resolved),
                "counts": {},
                "total": 0,
                "green_time": MIN_GREEN,
                "detections": []
            })
            continue

        # YOLO inference
        print(f"🔍 Running YOLO on lane {lane_id}...")
        results = model(img)

        counts = {}
        detections = []

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = r.names.get(cls_id, "unknown").lower()

                # Fix YOLO's weird class names
                if cls_name == "buss":
                    cls_name = "bus"

                xy = box.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = map(float, xy)
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2

                print(f"➡️ YOLO detected: {cls_name} at ({cx:.1f}, {cy:.1f})")

                if cls_name not in VALID_CLASSES:
                    print(f"   ⛔ rejected — invalid class")
                    continue

                # POLYGON FILTER
                inside = point_in_poly(cx, cy, polygon)
                if not inside:
                    print(f"   ⛔ rejected — OUTSIDE polygon")
                    continue

                print(f"   ✅ accepted")

                counts[cls_name] = counts.get(cls_name, 0) + 1
                detections.append({
                    "class": cls_name,
                    "bbox": [x1, y1, x2, y2],
                    "cx": cx,
                    "cy": cy
                })

        green_time = compute_green(counts)

        lane_result = {
            "laneId": lane_id,
            "image": img_path_raw,
            "image_resolved": str(resolved),
            "counts": counts,
            "total": sum(counts.values()),
            "green_time": green_time,
            "detections": detections
        }

        out["lanes"].append(lane_result)

    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\n✅ Saved output → {OUT_PATH}\n")

    return out


if __name__ == "__main__":
    model = load_model()
    process_all_images(model=model)
