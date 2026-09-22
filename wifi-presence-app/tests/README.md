# Tests

The runnable automated suites live next to the code they cover:

## Backend (`../backend/tests`) — `cd backend && npm test`

| File | Covers (Phase 6 items) |
|------|------------------------|
| `presence.test.ts` | Confidence & motion heuristics (app-level metric) |
| `normalize.test.ts` | Node→room mapping, room state, person→room, pose-threshold fallback, sensor-failure staleness |
| `events.test.ts` | Event processing (enter/leave/empty/motion/sensor transitions) |
| `eventStore.test.ts` | History persistence, filtering, retention, delete |
| `reconnect.test.ts` | WebSocket reconnection with backoff; malformed-frame safety; offline mode |
| `e2e.simulated.test.ts` | **End-to-end with simulated RuView**: auth, live room state, health, event history, WSS streaming, room config |

## Mobile (`../mobile/tests`) — `cd mobile && npm test`

| File | Covers |
|------|--------|
| `notifications.test.ts` | Notification rules (enable/disable, per-room scope, confidence gating) |
| `mockClient.test.ts` | Mock sensing client, person tracking, offline transitions, marker-vs-skeleton, room CRUD, UI state feeds |

Component rendering is validated via `npm run typecheck` in each package (strict TypeScript)
plus the Expo toolchain; the unit suites above run headless and deterministically.

Run everything:

```bash
(cd backend && npm ci && npm run typecheck && npm test)
(cd mobile  && npm ci && npm run typecheck && npm test)
```
