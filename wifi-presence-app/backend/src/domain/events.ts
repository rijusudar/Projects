import { AppEvent, AppEventType, RoomState, SensorNode } from '@wifi-presence/shared';

let seq = 0;
export function eventId(now = Date.now()): string {
  seq = (seq + 1) % 1_000_000;
  return `evt_${now}_${seq}`;
}

function ev(
  type: AppEventType,
  now: number,
  extra: Partial<AppEvent> = {},
): AppEvent {
  return { id: eventId(now), type, timestamp: now, ...extra };
}

/**
 * Diff previous vs next room states + sensor states into a list of AppEvents.
 * Pure and deterministic (given `now`) — unit-tested in tests/events.test.ts.
 */
export function diffRoomEvents(
  prev: Map<string, RoomState>,
  next: RoomState[],
  now = Date.now(),
): AppEvent[] {
  const out: AppEvent[] = [];
  for (const room of next) {
    const before = prev.get(room.roomId);
    const prevCount = before?.personCount ?? 0;
    const nextCount = room.personCount;

    if (prevCount === 0 && nextCount > 0) {
      out.push(ev('person_detected', now, { roomId: room.roomId, confidence: room.confidence }));
    }
    if (nextCount > prevCount && prevCount > 0) {
      out.push(ev('person_entered', now, { roomId: room.roomId, confidence: room.confidence }));
    }
    if (nextCount < prevCount && nextCount > 0) {
      out.push(ev('person_left', now, { roomId: room.roomId }));
    }
    if (prevCount > 0 && nextCount === 0) {
      out.push(ev('room_empty', now, { roomId: room.roomId }));
    }

    const prevMoving = before ? isMoving(before.movement) : false;
    const nextMoving = isMoving(room.movement);
    if (!prevMoving && nextMoving) {
      out.push(ev('movement_detected', now, { roomId: room.roomId, confidence: room.confidence }));
    }
    if (prevMoving && !nextMoving && room.occupied) {
      out.push(ev('no_movement', now, { roomId: room.roomId }));
    }
  }
  return out;
}

export function diffSensorEvents(
  prev: Map<string, SensorNode>,
  next: SensorNode[],
  now = Date.now(),
): AppEvent[] {
  const out: AppEvent[] = [];
  for (const s of next) {
    const before = prev.get(s.id);
    if (!before) continue;
    const wasOnline = before.status !== 'offline';
    const isOnline = s.status !== 'offline';
    if (wasOnline && !isOnline) {
      out.push(ev('sensor_disconnected', now, { sensorId: s.id, roomId: s.roomId }));
    }
    if (!wasOnline && isOnline) {
      out.push(ev('sensor_reconnected', now, { sensorId: s.id, roomId: s.roomId }));
    }
  }
  return out;
}

function isMoving(m: string): boolean {
  return m === 'walking' || m === 'moving';
}
