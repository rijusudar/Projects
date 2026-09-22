import { AppEvent, RoomState } from '../src/sensing/types';
import {
  DEFAULT_RULES,
  NotificationRule,
  evaluateNotification,
  setNotificationDelivery,
} from '../src/notifications/rules';

function room(id: string, name: string): RoomState {
  return {
    roomId: id,
    name,
    occupied: true,
    personCount: 1,
    people: [],
    movement: 'walking',
    confidence: 0.8,
    confidenceLabel: 'high',
    sensorIds: ['9'],
    updatedAt: Date.now(),
  };
}

function event(partial: Partial<AppEvent> & { type: AppEvent['type'] }): AppEvent {
  return { id: 'e1', timestamp: Date.now(), ...partial };
}

describe('notification rules', () => {
  const delivered: Array<{ title: string; body: string }> = [];
  beforeEach(() => {
    delivered.length = 0;
    setNotificationDelivery({ notify: (title, body) => delivered.push({ title, body }) });
  });

  it('fires a default person_detected notification above min confidence', () => {
    const fired = evaluateNotification(
      event({ type: 'person_detected', roomId: 'lr', confidence: 0.8 }),
      [room('lr', 'Living Room')],
      DEFAULT_RULES,
    );
    expect(fired).toBe(true);
    expect(delivered[0].title).toBe('Person detected');
    expect(delivered[0].body).toContain('Living Room');
  });

  it('suppresses a low-confidence detection below the rule threshold', () => {
    const fired = evaluateNotification(
      event({ type: 'person_detected', roomId: 'lr', confidence: 0.2 }),
      [room('lr', 'Living Room')],
      DEFAULT_RULES,
    );
    expect(fired).toBe(false);
    expect(delivered).toHaveLength(0);
  });

  it('respects a disabled rule', () => {
    const rules: NotificationRule[] = [{ id: 'r', type: 'person_detected', enabled: false }];
    expect(
      evaluateNotification(event({ type: 'person_detected', roomId: 'lr', confidence: 0.9 }), [], rules),
    ).toBe(false);
  });

  it('filters by room when a rule scopes to a specific room', () => {
    const rules: NotificationRule[] = [{ id: 'r', type: 'person_detected', enabled: true, roomId: 'bedroom' }];
    expect(evaluateNotification(event({ type: 'person_detected', roomId: 'lr' }), [], rules)).toBe(false);
    expect(evaluateNotification(event({ type: 'person_detected', roomId: 'bedroom' }), [], rules)).toBe(true);
  });

  it('always notifies on sensor_disconnected by default', () => {
    expect(
      evaluateNotification(event({ type: 'sensor_disconnected', sensorId: '9' }), [], DEFAULT_RULES),
    ).toBe(true);
  });
});
