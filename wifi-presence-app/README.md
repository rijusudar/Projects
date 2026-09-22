# WiFi Presence — Home Monitoring on RuView

A production-quality mobile app that turns [RuView / WiFi-DensePose](https://github.com/ruvnet/RuView)
WiFi sensing into a modern home-security-style monitoring experience — **without cameras**.
Instead of video pixels, it renders a real-time WiFi-sensing visualization of detected people,
their approximate position and movement, and a clearly-labelled confidence.

> **WiFi sensing detects inferred presence and movement. It is not a video camera.**
> It cannot identify a specific person, read faces or clothing, or guarantee detection
> through every wall or of every person. Every claim in this app is scoped to what RuView
> actually provides (see [`docs/RUVIEW-INTEGRATION.md`](docs/RUVIEW-INTEGRATION.md)).

## What's here

```
wifi-presence-app/
├── docs/        RuView integration findings, architecture, data-flow, API contract, troubleshooting
├── shared/      Shared TypeScript domain types (imported by both sides)
├── backend/     Gateway: RuView adapter + mock server + normalization + REST/WSS + tests
├── mobile/      React Native + TypeScript (Expo) app: 7 screens + WiFi-field visualization
└── tests/       Pointer to the runnable suites in backend/ and mobile/
```

### Why a gateway (and not a direct RuView connection)?

RuView **ships with no authentication and binds loopback by default**, and its real-time
stream is **per-node, not per-room**. So the gateway is required: it authenticates mobile
clients, holds the single RuView connection, maps nodes → rooms, derives events, persists
history, and fans out to many phones. The mobile UI depends only on the gateway's contract
and knows nothing about RuView, MQTT, UDP, or CSI. Full rationale in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start (no hardware)

**1. Gateway + simulated RuView**

```bash
cd backend
npm install
MOCK_RUVIEW=true npm run dev
# → gateway on http://localhost:8090, mock RuView on :3000/:3001
```

**2. Mobile app**

```bash
cd mobile
npm install
npm start          # open in Expo Go / simulator
```

The app defaults to **Mock mode** (fully local synthetic sensing — every screen works with
no gateway and no hardware). Switch to **Gateway mode** in Settings and enter your gateway's
LAN URL + shared secret to use real sensing.

## Connecting real hardware (Phase 5)

1. Flash ESP32-S3 / ESP32-C6 nodes and stream CSI to the RuView `sensing-server` (UDP `:5005`).
2. Run RuView: `sensing-server --source esp32 --http-port 3000 --ws-port 3001`
   (or the Docker image). RuView details: [`docs/RUVIEW-INTEGRATION.md`](docs/RUVIEW-INTEGRATION.md).
3. Point the gateway at it:
   ```bash
   RUVIEW_WS_URL=ws://<ruview-host>:3001/ws/sensing \
   RUVIEW_HTTP_URL=http://<ruview-host>:3000 \
   GATEWAY_SHARED_SECRET=<your-secret> \
   npm start   # (after: npm run build)
   ```
4. Map each RuView `node_id` to a room (Rooms → Calibrate, or `POST /rooms`).
5. Calibrate each room — the flow drives **RuView's own** recording + adaptive-training
   endpoints; the app invents no calibration algorithm.

## Screens

- **Dashboard** — home status, people/occupied-rooms/sensor counts, overall confidence, room cards.
- **Live Room** — the WiFi-field visualization: signal field, furniture, person marker or
  COCO skeleton (only when keypoints are confident), movement, confidence. Labelled "LIVE" and
  "not video".
- **Rooms** — configure rooms and their node mapping; jump to calibration.
- **Sensors** — per-node status, RSSI/signal quality, CSI availability/fps, firmware, last
  packet; test / reconnect.
- **Events** — local timeline (detected/entered/left/empty/motion/sensor up-down).
- **Settings** — source (mock/gateway), vitals opt-in (off by default), per-room
  notifications, data retention, delete history, the privacy statement.
- **Calibration** — the guided baseline → occupied → validate → save flow.

## Capability honesty

| Shown | Backed by |
|-------|-----------|
| Presence, person count, motion | RuView (model 82.3% accuracy / phase-variance fallback; P95 counting) |
| Confidence values | RuView where provided; otherwise a **documented app-level metric** (`backend/src/domain/presence.ts`) — never fabricated |
| 17-keypoint skeleton | Only when RuView returns confident keypoints; **default is a marker** because RuView's on-device pose is a stub (`confidence 0`) |
| Rooms | **App-level** node→room mapping (RuView is per-node) |
| Identity / faces / clothing | **Not shown — RuView cannot do it** |

## Privacy / local-first

LAN-only by default, no third-party cloud; raw CSI never leaves the gateway (only normalized
room state + events reach the phone); vitals off by default; bearer-auth on every client;
configurable retention + one-tap history deletion. Use TLS (`wss://`) when crossing an
untrusted network.

## Tests

```bash
cd backend && npm test        # 26 tests: adapter, reconnection, normalize, events, store, e2e simulated
cd mobile  && npm test        # notification rules + mock client (tracking / offline / marker-vs-skeleton)
```

Both packages also have `npm run typecheck`. See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## Status of each phase

- **Phase 1 (research)** ✓ — `docs/RUVIEW-INTEGRATION.md` from real repo inspection.
- **Phase 2 (architecture)** ✓ — `docs/ARCHITECTURE.md`, `DATA-FLOW.md`, `API-CONTRACT.md`.
- **Phase 3 (backend integration + mock)** ✓ — adapter, normalization, mock RuView, tests pass.
- **Phase 4 (mobile UI)** ✓ — all 7 screens, visualization, mock mode; typechecked + unit-tested.
- **Phase 5 (real hardware)** — integration path implemented against RuView's documented APIs;
  requires physical ESP32-S3 nodes to validate on-device (clearly marked where experimental).
- **Phase 6 (testing)** ✓ — automated suites above, including an end-to-end simulated run.

Experimental / native-module work (OS background monitoring, Bluetooth provisioning, live
skeletons) is interface-stubbed and marked as such — the app is modular so RuView can be
upgraded underneath it.
