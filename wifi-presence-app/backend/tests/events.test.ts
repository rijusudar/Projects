import { RoomState, SensorNode } from '@wifi-presence/shared';
import { diffRoomEvents, diffSensorEvents } from '../src/domain/events';

function room(partial: Partial<RoomState> & { roomId: string }): RoomState {
  return {
    name: partial.roomId,
    occupied: false,
    personCount: 0,
    people: [],
    movement: 'still',
    confidence: 0.5,
    confidenceLabel: 'medium',
    sensorIds: [],
    updatedAt: 0,
    ...partial,
  };
}

function sensor(partial: Partial<SensorNode> & { id: string }): SensorNode {
  return {
    name: partial.id,
    type: 'esp32-s3',
    status: 'online',
    csiAvailable: true,
    calibrated: false,
    ...partial,
  };
}

describe('event diffing', () => {
  it('emits person_detected then room_empty', () => {
    const prev = new Map<string, RoomState>();
    prev.set('lr', room({ roomId: 'lr', personCount: 0 }));

    const detected = diffRoomEvents(prev, [room({ roomId: 'lr', personCount: 1, occupied: true })], 100);
    expect(detected.map((e) => e.type)).toContain('person_detected');

    const now = new Map([['lr', room({ roomId: 'lr', personCount: 1, occupied: true })]]);
    const empty = diffRoomEvents(now, [room({ roomId: 'lr', personCount: 0 })], 200);
    expect(empty.map((e) => e.type)).toContain('room_empty');
  });

  it('emits person_entered/person_left on count changes', () => {
    const prev = new Map([['lr', room({ roomId: 'lr', personCount: 1, occupied: true })]]);
    const entered = diffRoomEvents(prev, [room({ roomId: 'lr', personCount: 2, occupied: true })], 1);
    expect(entered.map((e) => e.type)).toContain('person_entered');

    const prev2 = new Map([['lr', room({ roomId: 'lr', personCount: 2, occupied: true })]]);
    const left = diffRoomEvents(prev2, [room({ roomId: 'lr', personCount: 1, occupied: true })], 1);
    expect(left.map((e) => e.type)).toContain('person_left');
  });

  it('emits movement_detected and no_movement on motion transitions', () => {
    const still = new Map([['lr', room({ roomId: 'lr', personCount: 1, occupied: true, movement: 'still' })]]);
    const moving = diffRoomEvents(still, [room({ roomId: 'lr', personCount: 1, occupied: true, movement: 'walking' })], 1);
    expect(moving.map((e) => e.type)).toContain('movement_detected');

    const wasMoving = new Map([['lr', room({ roomId: 'lr', personCount: 1, occupied: true, movement: 'moving' })]]);
    const stopped = diffRoomEvents(wasMoving, [room({ roomId: 'lr', personCount: 1, occupied: true, movement: 'still' })], 1);
    expect(stopped.map((e) => e.type)).toContain('no_movement');
  });

  it('emits sensor connect/disconnect transitions', () => {
    const prev = new Map([['9', sensor({ id: '9', status: 'online' })]]);
    const down = diffSensorEvents(prev, [sensor({ id: '9', status: 'offline' })], 1);
    expect(down.map((e) => e.type)).toContain('sensor_disconnected');

    const prev2 = new Map([['9', sensor({ id: '9', status: 'offline' })]]);
    const up = diffSensorEvents(prev2, [sensor({ id: '9', status: 'online' })], 1);
    expect(up.map((e) => e.type)).toContain('sensor_reconnected');
  });
});
