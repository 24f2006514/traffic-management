# API Contracts

This document outlines the HTTP and WebSocket API endpoints for the TRADEV backend.

## HTTP Endpoints

### Alerts

**POST /alerts**
Submit a new emergency alert.

Request body:
```json
{
  "incident": "string (e.g., 'accident', 'congestion', 'hazard')",
  "location": "string (lat,lng or description)",
  "time": "number (optional, defaults to server time)"
}
```

Response (201 Created):
```json
{
  "id": 1,
  "incident": "accident",
  "location": "40.7128,-74.0060",
  "ts": 1702000000000
}
```

### Traffic

**GET /traffic/status**
Get current traffic status summary.

Response (200 OK):
```json
{
  "vehicles": 12,
  "latest": {
    "id": 1,
    "incident": "congestion",
    "location": "downtown",
    "ts": 1702000000000
  }
}
```

## WebSocket Events

### Client → Server

**connect**
Establish WebSocket connection. Server logs connection ID.

**disconnect**
Client disconnecting. Server logs disconnect.

### Server → Client

**alert**
Broadcast when a new alert is submitted.

Payload:
```json
{
  "id": 1,
  "incident": "accident",
  "location": "40.7128,-74.0060",
  "ts": 1702000000000
}
```

**traffic_update**
Broadcast traffic status updates (if implemented).

Payload:
```json
{
  "vehicles": 15,
  "timestamp": 1702000000000
}
```

## Error Responses

All endpoints return 4xx/5xx errors with:
```json
{
  "error": "descriptive error message"
}
```

Common errors:
- `400 Bad Request` — Missing or invalid payload fields
- `500 Internal Server Error` — Server-side exception

## Example Requests

### cURL: Submit Alert
```bash
curl -X POST http://localhost:3000/alerts \
  -H "Content-Type: application/json" \
  -d '{"incident":"accident","location":"downtown"}'
```

### cURL: Get Traffic Status
```bash
curl http://localhost:3000/traffic/status
```

### WebSocket Client (JavaScript)
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');
socket.on('alert', (payload) => console.log('New alert:', payload));
```
