# RuView Integration Findings (Phase 1)

> Source of truth: [github.com/ruvnet/RuView](https://github.com/ruvnet/RuView) — inspected
> for this project. Everything below is taken from the repository README, the
> `docs/user-guide.md` API reference, and the `python/` client. Where the app makes an
> assumption that RuView does **not** back, it is called out explicitly as
> **APP-LEVEL** so we never present it as a RuView capability.

## 1. What RuView actually is

RuView (a.k.a. WiFi-DensePose) is an open-source **WiFi sensing platform written in
Rust** (core engine, 1.85+) with **Python (PyO3) bindings** and a TypeScript/Node
dashboard. It turns WiFi Channel State Information (CSI) from ESP32 sensors into
presence, motion, coarse pose, vital signs, and room fingerprints — no cameras.

License: MIT.

## 2. Supported hardware (verified from repo)

| Board | Status | Notes |
|-------|--------|-------|
| **ESP32-S3** | Primary CSI platform (~$9/node) | Recommended |
| **ESP32-C6** | WiFi-6 research variant | HE-LTF subcarrier tagging (ADR-110) |
| Cognitum Seed | Optional add-on (~$140) | Persistent storage / attestation |
| ESP32-C3, original ESP32 | **NOT supported** | Single-core, insufficient for CSI |

CSI details: 56 subcarriers per link @ ~100 Hz; multi-band fusion → up to 168 virtual
subcarriers; through-wall range ~5 m (signal-dependent). SISO single-antenna CSI has
**lower spatial resolution than multi-antenna research NICs** — the docs say so plainly.

## 3. Sensing server

The Rust `sensing-server` binary ingests CSI over **UDP** from ESP32 nodes, runs the DSP
+ ML pipeline, and exposes HTTP/WebSocket (and optional MQTT). It has a fully working
**simulate** source so the whole stack runs with zero hardware.

Start it:

```bash
# Docker (simulated data, recommended for development)
docker run -e CSI_SOURCE=simulated -p 3000:3000 -p 3001:3001 ruvnet/wifi-densepose:latest

# Live ESP32 sensing
docker run -p 3000:3000 -p 3001:3001 -p 5005:5005/udp \
  -e CSI_SOURCE=esp32 ruvnet/wifi-densepose:latest

# From source
./target/release/sensing-server --source simulate --http-port 3000 --ws-port 3001
```

CLI flags (verified): `--source {auto|simulate|wifi|esp32}`, `--http-port` (default 8080),
`--ws-port` (default 8765), `--udp-port` (default 5005), `--tick-ms`, `--ui-path`,
`--mqtt`, `--mqtt-host`, `--mqtt-tls`, `--privacy-mode`.

> **Port note:** the Docker image serves HTTP on 3000 and WS on 3001; the raw binary
> defaults to HTTP 8080 / WS 8765. Our gateway config takes both as parameters.

## 4. REST API (base `http://<host>:3000` Docker, `:8080` binary)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/health` | `{"status":"ok","source":"simulated","clients":0}` |
| GET | `/api/v1/info` | version, build info, uptime |
| GET | `/api/v1/bssid` | Multi-BSSID WiFi registry |
| GET | `/api/v1/sensing/latest` | Latest CSI frame (amplitude, phase, motion) |
| GET | `/api/v1/vital-signs` | `{"breathing_bpm":16.2,"heart_bpm":72.1,"confidence":0.87}` |
| GET | `/api/v1/pose/current` | 17 COCO keypoints with x,y,z,confidence |
| GET | `/api/v1/mesh` | Fleet-wide mesh sync state |
| GET | `/api/v1/nodes/:id/sync` | Single-node mesh snapshot |
| GET | `/api/v1/mesh/metrics` | Prometheus metrics |
| POST | `/api/v1/recording/start` \| `/stop` | Recording control |
| GET/POST | `/api/v1/models*`, `/api/v1/train*`, `/api/v1/adaptive*` | Model & training mgmt |

## 5. WebSocket stream (the primary real-time feed)

**URL:** `ws://<host>:3001/ws/sensing` (Docker) / `ws://<host>:8765/ws/sensing` (binary).

Each frame (`type: "sensing_update"`) — verbatim shape from the docs:

```json
{
  "type": "sensing_update",
  "persons": [
    { "id": 0, "keypoints": [ {"name":"nose","x":0.52,"y":0.31,"z":0.0,"confidence":0.91} ] }
  ],
  "vital_signs": { "breathing_bpm": 16.2, "heart_bpm": 72.1, "confidence": 0.87 },
  "nodes": [
    { "node_id": 9, "rssi_dbm": -38.0, "amplitude": [ /* ... */ ],
      "sync": { "offset_us": 1163565, "is_leader": false, "is_valid": true,
                "smoothed": true, "sequence": 1234, "csi_fps_ema": 98.7 } }
  ]
}
```

Also available: `ws://<host>:3000/ws/field` — signed **RuField** `FieldEvent`s (egress-safe
subset). We do not depend on it.

## 6. MQTT (optional, ADR-115)

Enable with `--mqtt --mqtt-host <broker> [--mqtt-tls] [--privacy-mode]`. Topic tree:

```
ruview/<node_id>/presence
ruview/<node_id>/motion
ruview/<node_id>/breathing_bpm
ruview/<node_id>/heartrate_bpm
ruview/<node_id>/person_count
```

Plus Home Assistant auto-discovery (HA-DISCO): `homeassistant/+/wifi_densepose_+/+/state`,
21 entities/node (11 raw signals + 10 semantic states such as `room-active`,
`no-movement`, `bed-exit`). `--privacy-mode` strips heart rate, breathing, and pose.

## 7. Authentication & security posture

**RuView ships with NO authentication layer.** It binds `127.0.0.1` by default (loopback);
network exposure is opt-in and the docs recommend fronting it with an authenticating
reverse proxy. **This directly justifies our gateway** (see ARCHITECTURE.md): the mobile
app must never talk to RuView directly over the network.

## 8. Capability reality check (what we may and may not claim)

| Capability | RuView reality | How the app uses it |
|-----------|----------------|---------------------|
| Presence (binary) | Trained model 82.3% held-out accuracy, or phase-variance fallback; `<1 ms` | Primary signal |
| Person count | Adaptive P95 normalization + runtime dedup; up to ~15–20 per mesh | Shown with confidence |
| Motion | Phase-acceleration; fall detection `<200 ms` | `still/walking/moving/unknown` |
| Vital signs | Breathing 6–30 BPM, heart 40–120 BPM, with confidence | Optional, off by default (privacy) |
| **17-keypoint pose** | **On-device model is a STUB: 3.0% PCK@20, runtime returns `confidence=0`.** The 82.69% figure is the offline MM-Fi benchmark model, **not** live single-ESP32 output. | **Skeleton rendered only when keypoint confidence exceeds a threshold; otherwise a presence marker. Default: marker.** |
| Room identity | RF fingerprinting exists, but the WS stream is **per-node**, not per-room | **APP-LEVEL** node→room mapping in the gateway |
| Identity / face / clothing | **Not supported. Do not claim.** | Never surfaced |

## 9. Gaps the app/gateway must fill (APP-LEVEL)

1. **Node → Room mapping.** RuView emits `node_id`; "rooms" are a product concept. The
   gateway owns a configurable map `node_id → roomId` and aggregates per-room state.
2. **Authentication.** Bearer-token auth for mobile clients (RuView has none).
3. **Event history.** RuView streams live state; it does not persist an event timeline for
   the app. The gateway derives and stores enter/leave/motion/sensor events.
4. **Per-person tracking across frames.** RuView person `id`s are per-frame indices, not
   stable identities. The gateway does light temporal association (documented, best-effort).
5. **Application-level confidence** for a whole-room "occupied" state is derived from
   RuView's presence/count/motion signals and node liveness — **documented in
   `domain/presence.ts`**, never fabricated.

## 10. Existing RuView UI / plugin (for reference, not reused)

RuView has its own `dashboard/` + `ui/` (Tauri v2 desktop) and a Claude Code plugin under
`plugins/ruview/`. Our mobile app is a **separate client** of the sensing-server APIs; we
deliberately do not fork RuView's desktop UI.
