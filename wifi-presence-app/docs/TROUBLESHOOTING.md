# Troubleshooting

## Gateway

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| `/health` shows `ruview.connected: false` | RuView not running / wrong URL | Start RuView (`--source simulate` for no hardware), check `RUVIEW_WS_URL` (Docker WS is `:3001`, binary default `:8765`). |
| `system: "offline"` but connected true | No frames within `STALE_FRAME_MS` | Confirm RuView is emitting; in simulate mode check `--tick-ms`. Raise `STALE_FRAME_MS` on slow links. |
| Mobile gets `401` | Wrong shared secret / expired token | Match `GATEWAY_SHARED_SECRET`; the app re-auths on reconnect. |
| All rooms show occupied | Motion-only presence firing on ambient signal | Calibrate rooms; raise the presence threshold; ensure nodes are mapped to the right rooms. |
| A room never occupies | Node not mapped, or node offline | Check `/sensors` — the node's `roomId` and `status`; map it via `PUT /rooms/:id` `nodeIds`. |
| No pose/skeleton ever | Expected on single-ESP32 setups | RuView's on-device pose is a stub (`confidence 0`). The app shows a marker; skeletons need a backend returning confident keypoints. |
| Events not persisting | `DATA_DIR` not writable | Point `DATA_DIR` at a writable path; the store degrades to in-memory on disk errors. |

Run the gateway with no hardware:

```bash
cd backend && npm install && MOCK_RUVIEW=true npm run dev
# gateway on :8090, mock RuView on :3000/:3001
```

## Mobile app

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| Stuck "disconnected" in Gateway mode | Phone not on same LAN, or wrong URL | Use the gateway's LAN IP (not `localhost`); allow the app's local-network permission on iOS. |
| Works in Mock, fails on Gateway | Auth or TLS | Verify shared secret; if using `wss://`, ensure the cert is trusted on device. |
| Metro can't resolve `@wifi-presence/shared` | watchFolder not picked up | Restart Metro with cache clear: `npx expo start -c`. `metro.config.js` already adds `../shared`. |
| `react-native-svg` errors | Version mismatch with Expo SDK | Use `npx expo install react-native-svg` to pin the SDK-matched version. |
| Notifications never appear | `expo-notifications` not configured / permissions | Grant notification permission; in dev, delivery falls back to console logs. |

## RuView / hardware

- **ESP32 not detected:** only ESP32-S3 and ESP32-C6 are supported; original ESP32 and
  ESP32-C3 lack the cores for CSI. Confirm the node streams CSI to the server's UDP port
  (default `5005`).
- **Low signal quality / no CSI:** move nodes so the monitored area is between them; through
  a wall the range is ~5 m and signal-dependent. Re-run calibration after moving nodes.
- **Person count looks wrong:** RuView counts per-mesh with adaptive normalization; tune via
  RuView's `/api/v1/config/dedup-factor`. The app surfaces the count but does not override it.

## Tests

```bash
cd backend && npm test     # 26 tests incl. simulated end-to-end
cd mobile  && npm test     # notification rules + mock client / offline / tracking
cd backend && npm run typecheck
cd mobile  && npm run typecheck
```

If the e2e test fails on `EADDRINUSE`, another process holds ports 3398/3399 — stop it or
change the ports in `tests/e2e.simulated.test.ts`.
