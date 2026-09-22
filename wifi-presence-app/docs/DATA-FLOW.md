# Data Flow

## Live path (CSI → phone)

```
ESP32 CSI ──UDP:5005──▶ RuView sensing-server
                          │  ws://…/ws/sensing  ({type:"sensing_update", persons, vital_signs, nodes})
                          ▼
                    RuViewAdapter  (parse + reconnect + staleness)
                          │  RuViewSensingUpdate (typed)
                          ▼
                    normalize(update, roomConfig)
                          │  Map<node_id → roomId>, fold persons/nodes/vitals
                          ▼
                    presence.deriveRoomStates(...)  ── temporal association, app confidence
                          │  RoomState[]
                          ├──────────────▶ eventStore.diff(prev, next) ──▶ AppEvent[] (persist)
                          ▼
                    wsHub.broadcast({rooms, sensors, events})   ── bearer-authed WSS
                          │  GatewayMessage
                          ▼
                    RuViewClient.on('rooms'|'event'|'sensors')  (mobile)
                          ▼
                    SensingProvider (context)  ──▶  screens re-render
```

## Frame → RoomState mapping

For each `sensing_update`:

1. **Nodes → sensors.** Each `nodes[]` entry updates a `SensorNode`
   (`rssi_dbm` → signal quality bucket, `sync.is_valid`/`csi_fps_ema` → online + CSI health,
   `sequence`/timestamp → last packet). A node missing for `staleMs` → `offline`.
2. **Node → room.** `roomConfig` maps `node_id → roomId`. Unmapped nodes go to a synthetic
   `unassigned` room so they are visible but not counted against real rooms.
3. **Persons → per-room detections.** RuView person `id`s are per-frame; `normalize`
   attributes each person to the room of the strongest contributing node (best-effort;
   documented limitation), producing `PersonDetection`s. Keypoints with
   `confidence > POSE_MIN_CONFIDENCE` yield a `pose`; otherwise `pose` is omitted and the UI
   draws a marker.
4. **Vitals** attach to the room only when the vitals feature is enabled (privacy default:
   off).
5. **Room occupancy + count + app-confidence** are computed by `presence.ts`.

## Event derivation (diff)

`eventStore.diff(prev, next)` compares previous and next `RoomState`s per room:

| Transition | Event |
|-----------|-------|
| count 0 → ≥1 | `person_detected` (+ `person_entered` per new person) |
| count ≥1 → higher | `person_entered` |
| count → lower (≥1) | `person_left` |
| count ≥1 → 0 | `room_empty` |
| motion still → moving/walking | `movement_detected` |
| motion moving → still (held `noMotionMs`) | `no_movement` |
| sensor online → offline | `sensor_disconnected` |
| sensor offline → online | `sensor_reconnected` |
| health online → offline | `system_offline` |

Events carry `{id, type, roomId?, sensorId?, timestamp, confidence?, meta}` and are appended
to the local store (retention-trimmed) and pushed live over WSS.

## Notification path

`notifications/rules.ts` (mobile) evaluates incoming `AppEvent`s against per-room, per-type
rules (enabled?, min confidence, quiet hours, prolonged-no-movement threshold) and hands the
survivors to the platform notifier. Rules never fire on data the backend did not send.

## Control path (app → gateway → RuView)

- Room CRUD & node mapping: `POST/PUT/DELETE /rooms` on the gateway (persisted; re-drives
  `normalize`).
- Sensor test/reconnect: gateway calls RuView `/api/v1/nodes/:id/sync` / `/health`.
- Calibration: gateway proxies RuView's own recording/adaptive-training endpoints
  (`/api/v1/recording/*`, `/api/v1/adaptive/train`) — **we do not invent a calibration
  algorithm**; the flow orchestrates RuView's.
