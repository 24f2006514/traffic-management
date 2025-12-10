"""Process a video with YOLO and produce an overlay video and JSON results.

Usage:
  python process_video.py --input input.mp4 --output_overlay overlay.mp4 --output_json results.json

This script uses the `ultralytics` package (YOLOv8) if available. It's a minimal example
meant for the hackathon prototype — adapt thresholds, classes and postprocessing as needed.
"""
import argparse
import json
import os
from ultralytics import YOLO
import cv2
import numpy as np


def process_video(input_path, output_overlay, output_json, model_path=None):
    model = YOLO(model_path or 'yolo8n.pt')

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError('Failed to open input video: ' + input_path)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_overlay, fourcc, fps, (w, h))

    results_summary = { 'frames': [] }
    frame_i = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        preds = model(frame)[0]
        boxes = preds.boxes.xyxy.cpu().numpy() if hasattr(preds, 'boxes') else []
        classes = preds.boxes.cls.cpu().numpy() if hasattr(preds, 'boxes') else []

        # draw boxes
        for i, box in enumerate(boxes):
            x1, y1, x2, y2 = map(int, box)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        out.write(frame)

        results_summary['frames'].append({ 'frame': frame_i, 'detections': int(len(boxes)) })
        frame_i += 1

    cap.release()
    out.release()

    with open(output_json, 'w') as f:
        json.dump(results_summary, f, indent=2)

    print('Processed', frame_i, 'frames — overlay:', output_overlay, 'json:', output_json)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--input', '-i', required=True)
    p.add_argument('--output_overlay', '-o', default='processed_overlay.mp4')
    p.add_argument('--output_json', '-j', default='processed_result.json')
    p.add_argument('--model', '-m', help='Path to YOLO model (optional)')
    args = p.parse_args()

    process_video(args.input, args.output_overlay, args.output_json, model_path=args.model)


if __name__ == '__main__':
    main()
