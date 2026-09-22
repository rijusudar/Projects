# Architecture (Phase 2)

## Decision: use the gateway

The reference prompt allows skipping the gateway "if RuView already provides a suitable
direct WebSocket/MQTT interface." Inspection (see RUVIEW-INTEGRATION.md §7) shows RuView
**has no authentication and binds loopback by default**, and its stream is **per-node, not
per-room**. Therefore the gateway is **required**, not optional. It is the only component
that talks to RuView; the mobile app never does.

```
 ┌─────────────────────┐
 │  WiFi Router / AP   │
 └──────────┬──────────┘
            │ WiFi / CSI
 ┌──────────▼──────────┐        CSI over UDP :5005
 │ ESP32-S3 / -C6 CSI  │───────────────────────────┐
 │       nodes         │                            │
 └─────────────────────┘                            ▼
                                        ┌────────────────────────┐
                                        │   RuView sensing-server │  (Rust)
                                        │  REST :3000  WS :3001   │  no auth, loopback
                                        └───────────┬─────────────┘
                                    ws://…/ws/sensing│ + REST polling
                                                     ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │                        GATEWAY  (Node + TypeScript)                     │
 │  RuViewAdapter ── normalize (node→room) ── presence/tracking ── store   │
 │        │                                                    │           │
 │   auth (bearer) ── HTTP REST (rooms/sensors/events/health) ─┤           │
 │        │          WSS hub (fan-out normalized events) ──────┘           │
 └───────────────────────────────┬───────────────────────────────────────┘
                        HTTPS / WSS (token auth, LAN-first)
                                 ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │              MOBILE APP  (React Native + TypeScript / Expo)             │
 │  RuViewClient (talks to GATEWAY only) → SensingProvider → screens       │
 │  Dashboard · Rooms · LiveRoom · Sensors · Events · Settings · Calibrate │
 └───────────────────────────────────────────────────────────────────────┘
```

## Component responsibilities

### RuView sensing-server (upstream, unmodified)
CSI ingest, DSP, ML inference, presence/pose/vitals/mesh. We treat it as a black box with
the documented REST + WS contract. Runs in **simulate** mode for development.

### Gateway (`/backend`)
- **RuViewAdapter** — one resilient WS connection to `…/ws/sensing` + REST helpers
  (`/health`, `/api/v1/mesh`, `/api/v1/pose/current`). Exponential-backoff reconnection,
  heartbeat/staleness detection, emits typed `sensing_update` objects.
- **normalize** — maps RuView `node_id` → `roomId` (config), folds per-node + per-person +
  vital data into **per-room `RoomState`**, and diffs consecutive states into **`AppEvent`s**
  (person detected, entered, left, empty, motion, sensor up/down).
- **presence/tracking (`domain/presence.ts`)** — derives room occupancy, person count, a
  documented **application-level confidence**, and does best-effort temporal person
  association. All heuristics live here and are unit-tested.
- **store** — `roomConfig` (rooms + node mapping, JSON on disk) and `eventStore`
  (append-only event log with retention + delete, JSON on disk; pluggable).
- **server** — `httpApi` (bearer-authenticated REST for the app) and `wsHub`
  (bearer-authenticated WSS that broadcasts `RoomState` snapshots + new `AppEvent`s).
- **auth** — static bearer token(s) from config/env. LAN-first; TLS is the deployer's
  responsibility when crossing an untrusted network (documented).
- **mockRuViewServer** — a faithful stand-in for the RuView WS/REST contract so the whole
  gateway (and its tests) run with **no RuView and no hardware**.

### Mobile app (`/mobile`)
- **RuViewClient** — the app-facing sensing abstraction (`connect/disconnect/
  subscribePresence/subscribeMotion/subscribePose/getHealth/getSensors`). Talks **only** to
  the gateway. A `MockRuViewClient` implements the same interface for hardware-free UI dev.
- **SensingProvider** — React context holding rooms, sensors, events, connection status.
- **screens/components** — the security-app UX. The visualization is explicitly labelled
  "WiFi sensing — not video."

## Separation of concerns

- The UI depends only on `sensing/types.ts` + the `RuViewClient` interface. It has **no
  knowledge** of MQTT, UDP, Rust, CSI, or the RuView wire format.
- All RuView-specific parsing lives in `backend/src/ruview/`. Swapping RuView versions =
  editing the adapter + normalize, nothing in the app.
- Shared types live in `/shared` and are imported by both sides.

## Privacy / local-first

- Default deployment is LAN-only; no third-party cloud. Cloud relay is opt-in and out of
  scope for the default build.
- Raw CSI never leaves the gateway; only normalized `RoomState`/`AppEvent` reach the app.
- Vital signs (breathing/heart) are **off by default** and gated behind an explicit
  setting; RuView's `--privacy-mode` is recommended and documented.
- Event history is stored locally with a configurable retention window and a "delete all"
  action.

## Deferred / experimental (clearly marked)

- Live 17-keypoint skeletons (RuView on-device pose is a stub → marker fallback).
- Stable cross-frame person identity (best-effort only).
- MQTT ingestion path (adapter interface defined; WS path is the default).
- Bluetooth provisioning & true OS background monitoring (native-module work; interfaces
  stubbed, not shipped).
