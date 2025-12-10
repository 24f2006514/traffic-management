# YOLO Service (local)

This folder contains a minimal local YOLO processing service used by the TRADEV hackathon prototype.

Structure
- `model/best.pt` — place your YOLO model here (rename to `best.pt`).
- `scripts/process_video.py` — run offline processing of a video to produce overlay and JSON results.
- `scripts/detect_live.py` — run live detection from camera or RTSP and optionally POST alerts to backend.
- `utils/` — small helpers: `traffic_counter.py`, `region_extractor.py`, `api_client.py`.
- `requirements.txt` — Python dependencies.

Quick start (Windows PowerShell)

```powershell
cd path\to\tradev\yolo-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# place your model file at model\best.pt or pass --model to scripts
python scripts\process_video.py --input ..\frontend\public\processed_overlay.mp4 --output_overlay processed_overlay_out.mp4 --output_json processed_result.json --model model\best.pt
```

Live detection example

```powershell
python scripts\detect_live.py --source 0 --model model\best.pt --backend http://localhost:3000/alerts
```

Notes
- These scripts are intentionally minimal — replace the model loading / postprocessing with
  your preferred YOLO code (Ultralytics YOLOv8 used here for convenience).
- For production or demo stability, pin versions in `requirements.txt` and test on your hardware.
