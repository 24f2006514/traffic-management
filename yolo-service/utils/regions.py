"""Region utilities for assigning detection centers to named regions.

Provides:
- `EXAMPLE_REGIONS`: dict of example regions (polygon coordinates or bbox)
- `assign_region(x, y, regions)`: returns region name or 'unknown'
- `load_regions_from_json(path)`: load regions from a simple JSON file

Region format (per-region value) supports two shapes:
- polygon: { "type": "polygon", "pts": [[x1,y1],[x2,y2],...] }
- bbox: { "type": "bbox", "bbox": [x1,y1,x2,y2] }

The coordinate space is the same as video frames (pixels).
"""
from typing import Dict, Any, List, Tuple
import json


EXAMPLE_REGIONS: Dict[str, Dict[str, Any]] = {
    "left_lane": {
        "type": "polygon",
        "pts": [[0, 0], [600, 0], [600, 720], [0, 720]]
    },
    "right_lane": {
        "type": "polygon",
        "pts": [[600, 0], [1280, 0], [1280, 720], [600, 720]]
    }
}


def _point_in_polygon(x: float, y: float, pts: List[Tuple[float, float]]) -> bool:
    # Ray casting algorithm for point-in-polygon
    inside = False
    n = len(pts)
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def assign_region(cx: float, cy: float, regions: Dict[str, Dict[str, Any]]) -> str:
    """Return the name of the region containing point (cx,cy) or 'unknown'."""
    for name, info in regions.items():
        typ = info.get("type")
        if typ == "polygon":
            pts = info.get("pts", [])
            if _point_in_polygon(cx, cy, pts):
                return name
        elif typ == "bbox":
            x1, y1, x2, y2 = info.get("bbox", [0, 0, 0, 0])
            if cx >= x1 and cx <= x2 and cy >= y1 and cy <= y2:
                return name
    return "unknown"


def load_regions_from_json(path: str) -> Dict[str, Dict[str, Any]]:
    """Load regions from JSON file. Expects the same shape as EXAMPLE_REGIONS."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


if __name__ == "__main__":
    print("EXAMPLE_REGIONS keys:", list(EXAMPLE_REGIONS.keys()))
