# TRADEV — Emergency Route Clearance (Hackathon Prototype)

A full-stack application for real-time traffic monitoring and emergency route clearance using YOLO object detection.

## Project Structure

- **frontend/** — React + Vite SPA with live traffic map, emergency alerts form, and playback player
- **backend/** — Node.js + Express + Socket.IO server for alerts and traffic data
- **yolo-service/** — Python YOLO-based detection service for video processing and live camera feeds

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

### YOLO Service
```bash
cd yolo-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
python scripts/process_video.py --input video.mp4 --output_overlay out.mp4 --output_json results.json
```

## Features

- Real-time traffic detection and monitoring
- Emergency alert submission and broadcasting via WebSocket
- Playback of processed video with detection overlays
- Multiple data adapters (Mock, Live, Playback)
- YOLO-based vehicle detection and counting

## API Endpoints

See `docs/api-contracts.md` for full endpoint documentation.

## Architecture

See `docs/architecture-diagram.png` and `docs/demo-instructions.md` for deployment and demo setup.

## Tech Stack

- **Frontend:** React 18, Vite, Socket.IO client
- **Backend:** Node.js, Express 4, Socket.IO, CORS
- **ML:** Python, Ultralytics YOLOv8, OpenCV
- **Deployment:** Frontend (Vercel), Backend + YOLO (Local)

---

For detailed setup and deployment instructions, see the README files in each service folder.
