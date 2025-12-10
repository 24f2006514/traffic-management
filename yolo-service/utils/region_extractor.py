"""Extract regions of interest (ROI) from frames.

Provides a convenience function to crop a polygon or bounding box region from an image.
"""
import numpy as np


def crop_bbox(frame, bbox):
    """Crop a bounding box from a frame.

    bbox = (x1, y1, x2, y2)
    """
    x1, y1, x2, y2 = map(int, bbox)
    h, w = frame.shape[:2]
    x1 = max(0, min(w-1, x1))
    x2 = max(0, min(w-1, x2))
    y1 = max(0, min(h-1, y1))
    y2 = max(0, min(h-1, y2))
    return frame[y1:y2, x1:x2]


def mask_polygon(frame, polygon):
    mask = np.zeros(frame.shape[:2], dtype=np.uint8)
    pts = np.array(polygon, dtype=np.int32)
    cv2 = __import__('cv2')
    cv2.fillPoly(mask, [pts], 255)
    return cv2.bitwise_and(frame, frame, mask=mask)


if __name__ == '__main__':
    print('region_extractor utilities')
