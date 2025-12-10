# Demo Instructions

This guide walks through setting up and running the TRADEV hackathon prototype locally.

## Prerequisites

- Node.js 16+ (for backend and frontend build)
- Python 3.8+ (for YOLO service)
- Git
- A camera or sample video for YOLO processing (optional)

## Local Setup (All Services)

### 1. Clone and Enter Root
```bash
git clone <repo-url>
cd tradev
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create .env file (optional, uses defaults)
echo "PORT=3000" > .env
npm run dev
# Backend listens on http://localhost:3000
```

### 3. Frontend Setup (new terminal)
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173 (default Vite)
```

### 4. YOLO Service Setup (new terminal)
```bash
cd yolo-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
# Place your model at model/best.pt or use YOLOv8n (auto-download)
```

## Running Demo Scenarios

### Scenario 1: Submit Alert via Frontend
1. Open http://localhost:5173 in browser
2. Fill in "Incident type" (e.g., "accident")
3. Fill in "Location" (e.g., "downtown")
4. Click "Send Alert"
5. Check backend logs — should log alert received

### Scenario 2: Live Detection from Camera
(In yolo-service terminal, with camera connected)
```bash
python scripts/detect_live.py --source 0 --backend http://localhost:3000/alerts
```
When vehicles detected (>5), script POSTs alerts to backend.

### Scenario 3: Offline Video Processing
1. Place a sample video at `frontend/public/sample.mp4`
2. Run:
```bash
cd yolo-service
python scripts/process_video.py \
  --input ../frontend/public/sample.mp4 \
  --output_overlay ../frontend/public/processed_overlay.mp4 \
  --output_json ../frontend/public/processed_result.json \
  --model model/best.pt
```
3. Open frontend, select "Playback" adapter
4. Video plays with detection overlays

## Frontend Adapters

The frontend supports three data adapters:

- **Mock** — Simulates random vehicle counts every 1 second
- **Live** — Connects to backend WebSocket (requires backend running)
- **Playback** — Loads `processed_result.json` from disk

Select adapter from the SettingsBar component.

## Verifying Setup

### Check Backend
```bash
curl http://localhost:3000/traffic/status
# Should return { "vehicles": 0, "latest": null } or similar
```

### Check Frontend Build
```bash
cd frontend
npm run build
# Output in dist/ folder
```

### Check YOLO Dependencies
```bash
cd yolo-service
python -c "from ultralytics import YOLO; print('YOLO OK')"
```

## Deployment Hints

- **Frontend to Vercel:**
  1. Push frontend/ to a Git repo
  2. Import in Vercel dashboard
  3. Set build command: `npm run build`
  4. Set output dir: `dist`

- **Backend + YOLO Locally:**
  1. Use systemd (Linux) or Task Scheduler (Windows) to keep services alive
  2. Use a process manager like PM2 or forever
  3. Expose via reverse proxy (nginx/Apache) if needed

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check port 3000 is free; NODE_ENV=development |
| YOLO slow on first run | YOLOv8n downloads ~25MB model on first use |
| Frontend can't reach backend | Check CORS enabled; backend must be running |
| Video processing fails | Verify ffmpeg installed; check video format |

## Next Steps

- Integrate a real traffic data API (Google Maps, HERE, TomTom)
- Implement persistent storage (PostgreSQL, MongoDB)
- Add user authentication (JWT, OAuth)
- Deploy to production with SSL/TLS
- Implement real-time route optimization with OSRM or Vroom
