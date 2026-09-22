import { AppEvent, AppEventType, RoomState } from '../sensing/types';

/**
 * Per-room, per-type notification rules evaluated against incoming AppEvents. Rules never
 * fire on data the backend did not send. Delivery is abstracted so the app runs without
 * expo-notifications installed (falls back to console). We deliberately do NOT support
 * identifying a specific person — RuView cannot, so the app must not claim to.
 */
export interface NotificationRule {
  id: string;
  roomId?: string; // undefined = any room
  type: AppEventType;
  enabled: boolean;
  minConfidence?: number;
  /** for no_movement: minimum minutes before alerting (prolonged inactivity). */
  prolongedMinutes?: number;
}

export const DEFAULT_RULES: NotificationRule[] = [
  { id: 'r1', type: 'person_detected', enabled: true, minConfidence: 0.4 },
  { id: 'r2', type: 'sensor_disconnected', enabled: true },
  { id: 'r3', type: 'system_offline', enabled: true },
  { id: 'r4', type: 'no_movement', enabled: false, prolongedMinutes: 30 },
];

export interface NotificationDelivery {
  notify(title: string, body: string): void;
}

/** Default delivery: tries expo-notifications, else logs. Swapped in tests. */
let delivery: NotificationDelivery = {
  notify(title, body) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Notifications = require('expo-notifications');
      void Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
    } catch {
      // eslint-disable-next-line no-console
      console.log(`[notify] ${title} — ${body}`);
    }
  },
};

export function setNotificationDelivery(d: NotificationDelivery): void {
  delivery = d;
}

const TITLES: Record<AppEventType, string> = {
  person_detected: 'Person detected',
  person_entered: 'Person entered',
  person_left: 'Person left',
  room_empty: 'Room empty',
  movement_detected: 'Movement detected',
  no_movement: 'No movement',
  sensor_disconnected: 'Sensor offline',
  sensor_reconnected: 'Sensor back online',
  system_offline: 'System offline',
  system_online: 'System online',
};

/** Returns true if a notification was delivered for this event. */
export function evaluateNotification(
  event: AppEvent,
  rooms: RoomState[],
  rules: NotificationRule[],
): boolean {
  const effective = rules.length ? rules : DEFAULT_RULES;
  const room = rooms.find((r) => r.roomId === event.roomId);
  for (const rule of effective) {
    if (!rule.enabled) continue;
    if (rule.type !== event.type) continue;
    if (rule.roomId && rule.roomId !== event.roomId) continue;
    if (rule.minConfidence !== undefined && (event.confidence ?? 0) < rule.minConfidence) continue;
    const where = room ? ` — ${room.name}` : event.roomId ? ` — ${event.roomId}` : '';
    delivery.notify(TITLES[event.type], `${describe(event)}${where}`);
    return true;
  }
  return false;
}

function describe(event: AppEvent): string {
  if (event.confidence !== undefined) {
    const pct = Math.round(event.confidence * 100);
    return `WiFi sensing · ${pct}% confidence`;
  }
  return 'WiFi sensing event';
}
