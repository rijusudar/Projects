/**
 * Shared domain types for the WiFi presence monitoring app.
 *
 * These are the ONLY types the mobile UI depends on. They are intentionally free of any
 * RuView / CSI / MQTT / UDP wire-format detail — all of that lives in the gateway's
 * `ruview/` layer, which normalizes RuView output into the structures below.
 *
 * Adapted from the reference `PersonDetection` interface to match RuView's actual output
 * (see docs/RUVIEW-INTEGRATION.md).
 */

export type MovementState = 'still' | 'walking' | 'moving' | 'unknown';

export type ConfidenceLabel = 'high' | 'medium' | 'low';

/** COCO 17-keypoint names, in RuView's order. */
export const COCO_KEYPOINTS = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export type CocoKeypointName = (typeof COCO_KEYPOINTS)[number];

export interface Keypoint {
  name: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  confidence: number; // 0..1
}

export interface PersonDetection {
  id: string;
  roomId: string;
  /** Coarse, normalized position within the room (0..1). Absent when not resolvable. */
  position?: { x: number; y: number; z?: number };
  movement?: {
    state: MovementState;
    /** Heading in degrees, 0 = +x, if derivable. */
    direction?: number;
    /** Normalized velocity 0..1, if derivable. */
    velocity?: number;
  };
  /**
   * Present ONLY when RuView returns keypoints above the confidence threshold. On live
   * single-ESP32 setups RuView's on-device pose is a stub (confidence 0), so this is
   * usually absent and the UI falls back to a presence marker. Never fabricated.
   */
  pose?: { keypoints: Keypoint[] };
  confidence: number; // 0..1
  timestamp: number; // epoch ms
}

export interface RoomVitals {
  breathingBpm?: number;
  heartBpm?: number;
  confidence?: number;
}

export interface RoomState {
  roomId: string;
  name: string;
  occupied: boolean;
  personCount: number;
  people: PersonDetection[];
  movement: MovementState;
  /** Application-level room confidence 0..1 (see backend domain/presence.ts). */
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  sensorIds: string[];
  /** Only populated when the vitals feature is explicitly enabled (privacy default: off). */
  vitals?: RoomVitals;
  lastDetectedAt?: number;
  updatedAt: number;
}

export type SensorType = 'esp32-s3' | 'esp32-c6' | 'unknown';
export type SensorStatus = 'online' | 'offline' | 'degraded';

export interface SensorNode {
  id: string;
  name: string;
  type: SensorType;
  roomId?: string;
  status: SensorStatus;
  rssiDbm?: number;
  signalQuality?: ConfidenceLabel;
  csiAvailable: boolean;
  csiFps?: number;
  firmware?: string;
  ipAddress?: string;
  lastPacketAt?: number;
  calibrated: boolean;
}

export type AppEventType =
  | 'person_detected'
  | 'person_entered'
  | 'person_left'
  | 'room_empty'
  | 'movement_detected'
  | 'no_movement'
  | 'sensor_disconnected'
  | 'sensor_reconnected'
  | 'system_offline'
  | 'system_online';

export interface AppEvent {
  id: string;
  type: AppEventType;
  roomId?: string;
  sensorId?: string;
  timestamp: number;
  confidence?: number;
  meta?: Record<string, unknown>;
}

export interface HealthStatus {
  system: 'online' | 'offline';
  ruview: {
    connected: boolean;
    source?: string;
    lastFrameMs?: number; // ms since last frame
    url?: string;
  };
  sensors: { online: number; total: number };
  rooms: { occupied: number; total: number };
  peopleDetected: number;
  overallConfidence: number;
  updatedAt: number;
}

export interface RoomConfigInput {
  name: string;
  /** RuView node_ids assigned to this room. */
  nodeIds: number[];
  /** Optional furniture rectangles for the live view (normalized 0..1). */
  furniture?: Array<{ label: string; x: number; y: number; w: number; h: number }>;
}

export interface RoomConfig extends RoomConfigInput {
  roomId: string;
  createdAt: number;
  updatedAt: number;
}

export interface GatewaySettings {
  homeName: string;
  vitalsEnabled: boolean;
  eventRetentionDays: number;
  poseMinConfidence: number;
  quietHours?: { start: string; end: string }; // "HH:MM"
}

export type CalibrationStep =
  | 'select_room'
  | 'detect_nodes'
  | 'position_sensors'
  | 'baseline_empty'
  | 'collect_occupied'
  | 'validate'
  | 'save';

export interface CalibrationSession {
  sessionId: string;
  roomId: string;
  step: CalibrationStep;
  ruviewRecordingId?: string;
  baselineFrames?: number;
  occupiedFrames?: number;
  validated?: boolean;
  startedAt: number;
  updatedAt: number;
}

/** Server → client realtime messages. */
export type GatewayMessage =
  | { type: 'snapshot'; rooms: RoomState[]; sensors: SensorNode[]; health: HealthStatus }
  | { type: 'rooms'; rooms: RoomState[] }
  | { type: 'event'; event: AppEvent }
  | { type: 'health'; health: HealthStatus }
  | { type: 'pong'; t: number };

/** Client → server realtime messages. */
export type ClientMessage =
  | { type: 'subscribe'; rooms: string[] }
  | { type: 'ping' };

export function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
