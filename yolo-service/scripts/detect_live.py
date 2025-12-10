"""Run live detection from a camera/RTSP source and optionally POST alerts to backend.

Usage:
  python detect_live.py --source 0 --model model/best.pt --backend http://localhost:3000/alerts

This is a simple loop capturing frames, running YOLO detections and printing counts.
"""
import argparse
import time
import requests
from ultralytics import YOLO
import cv2


def detect_live(source, model_path=None, backend_url=None, skip_frames=3):
    model = YOLO(model_path or 'yolo8n.pt')
    cap = cv2.VideoCapture(int(source) if str(source).isdigit() else source)
    if not cap.isOpened():
        raise RuntimeError('Failed to open source: ' + str(source))

    frame_i = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_i % skip_frames == 0:
                preds = model(frame)[0]
                count = len(preds.boxes) if hasattr(preds, 'boxes') else 0
                print(f'Frame {frame_i}: detections={count}')
                if backend_url and count > 5:
                    # send a simple alert
                    payload = { 'incident': 'heavy_traffic', 'location': 'camera', 'count': int(count) }
                    try:
                        requests.post(backend_url, json=payload, timeout=2)
                    except Exception as e:
                        print('Failed to send alert:', e)

            frame_i += 1
            # tiny sleep to avoid pegging CPU if needed
            time.sleep(0.01)
    finally:
        cap.release()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', default=0)
    p.add_argument('--model', help='Path to YOLO model')
    p.add_argument('--backend', help='Backend alerts POST URL')
    args = p.parse_args()
    detect_live(args.source, model_path=args.model, backend_url=args.backend)


if __name__ == '__main__':
    main()
