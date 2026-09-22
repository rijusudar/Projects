# API Contract — Gateway ⇄ Mobile

This is the **only** API the mobile app depends on. All RuView specifics are hidden behind
it. Base URL `http(s)://<gateway-host>:8090`. All endpoints except `/health` require
`Authorization: Bearer <token>`.

## Auth

- `POST /auth/token` → `{ "token": "<opaque>", "expiresAt": <epochMs> }`
  - Body `{ "clientId": string, "secret": string }`. In the default LAN build a single
    pre-shared secret is accepted (`GATEWAY_SHARED_SECRET`). Returns 401 on mismatch.
- All other calls: `Authorization: Bearer <token>`; 401 if missing/invalid.

## REST

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `HealthStatus` (no auth) |
| GET | `/rooms` | `RoomState[]` (current snapshot) |
| GET | `/rooms/:id` | `RoomState` |
| POST | `/rooms` | body `RoomConfigInput` → `RoomConfig` |
| PUT | `/rooms/:id` | body `Partial<RoomConfigInput>` → `RoomConfig` |
| DELETE | `/rooms/:id` | `{ ok: true }` |
| GET | `/sensors` | `SensorNode[]` |
| POST | `/sensors/:id/test` | `{ ok: boolean, rssiDbm?, csiFps?, message }` |
| POST | `/sensors/:id/reconnect` | `{ ok: boolean }` |
| PUT | `/sensors/:id` | body `{ name?, roomId? }` → `SensorNode` |
| GET | `/events?limit=&since=&roomId=&type=` | `AppEvent[]` (newest first) |
| DELETE | `/events` | `{ deleted: number }` (clears local history) |
| GET | `/settings` | `GatewaySettings` |
| PUT | `/settings` | body `Partial<GatewaySettings>` → `GatewaySettings` |
| POST | `/calibration/start` | body `{ roomId }` → `CalibrationSession` |
| GET | `/calibration/:sessionId` | `CalibrationSession` |
| POST | `/calibration/:sessionId/step` | body `{ step }` → `CalibrationSession` |
| POST | `/calibration/:sessionId/finish` | `{ ok, profileSaved }` |

`HealthStatus`:
```jsonc
{
  "system": "online" | "offline",
  "ruview": { "connected": true, "source": "simulated", "lastFrameMs": 1719, "url": "ws://…" },
  "sensors": { "online": 3, "total": 3 },
  "rooms": { "occupied": 1, "total": 3 },
  "peopleDetected": 2,
  "overallConfidence": 0.83,
  "updatedAt": 1737550000000
}
```

## WebSocket  `wss://<host>:8090/ws?token=<bearer>`

Server → client messages (`GatewayMessage`):

```jsonc
// full snapshot on connect and on room-config change
{ "type": "snapshot", "rooms": RoomState[], "sensors": SensorNode[], "health": HealthStatus }

// incremental room state (throttled, ~5 Hz)
{ "type": "rooms", "rooms": RoomState[] }

// a single new event
{ "type": "event", "event": AppEvent }

// health / connection change
{ "type": "health", "health": HealthStatus }
```

Client → server:
```jsonc
{ "type": "subscribe", "rooms": string[] }   // optional room filter; default = all
{ "type": "ping" }                            // → { "type": "pong", "t": <epochMs> }
```

## Shared types (see `/shared/src/types.ts` — authoritative)

```ts
type MovementState = "still" | "walking" | "moving" | "unknown";
type ConfidenceLabel = "high" | "medium" | "low";

interface PersonDetection {
  id: string;
  roomId: string;
  position?: { x: number; y: number; z?: number };      // normalized 0..1, coarse
  movement?: { state: MovementState; direction?: number; velocity?: number };
  pose?: { keypoints: Array<{ name: string; x: number; y: number; confidence: number }> };
  confidence: number;                                     // 0..1, from RuView where available
  timestamp: number;
}

interface RoomState {
  roomId: string;
  name: string;
  occupied: boolean;
  personCount: number;
  people: PersonDetection[];
  movement: MovementState;
  confidence: number;          // app-level room confidence, see domain/presence.ts
  confidenceLabel: ConfidenceLabel;
  sensorIds: string[];
  vitals?: { breathingBpm?: number; heartBpm?: number; confidence?: number };  // opt-in
  lastDetectedAt?: number;
  updatedAt: number;
}

interface SensorNode {
  id: string;                  // stringified RuView node_id
  name: string;
  type: "esp32-s3" | "esp32-c6" | "unknown";
  roomId?: string;
  status: "online" | "offline" | "degraded";
  rssiDbm?: number;
  signalQuality?: ConfidenceLabel;
  csiAvailable: boolean;
  csiFps?: number;
  firmware?: string;
  ipAddress?: string;
  lastPacketAt?: number;
  calibrated: boolean;
}

type AppEventType =
  | "person_detected" | "person_entered" | "person_left" | "room_empty"
  | "movement_detected" | "no_movement"
  | "sensor_disconnected" | "sensor_reconnected" | "system_offline" | "system_online";

interface AppEvent {
  id: string;
  type: AppEventType;
  roomId?: string;
  sensorId?: string;
  timestamp: number;
  confidence?: number;
  meta?: Record<string, unknown>;
}
```

## Error shape

Non-2xx responses: `{ "error": { "code": string, "message": string } }`.
`401 unauthorized`, `404 not_found`, `400 bad_request`, `502 ruview_unavailable`.
