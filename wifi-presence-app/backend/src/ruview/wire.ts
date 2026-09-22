/**
 * RuView wire types — the exact shapes RuView emits, per docs/RUVIEW-INTEGRATION.md.
 * This is the ONLY place that knows RuView's format. Nothing outside `ruview/` imports it.
 */

export interface RuViewKeypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  confidence: number;
}

export interface RuViewPerson {
  id: number;
  keypoints?: RuViewKeypoint[];
}

export interface RuViewVitalSigns {
  breathing_bpm?: number;
  heart_bpm?: number;
  confidence?: number;
}

export interface RuViewNodeSync {
  offset_us?: number;
  is_leader?: boolean;
  is_valid?: boolean;
  smoothed?: boolean;
  sequence?: number;
  csi_fps_ema?: number;
  csi_fps_samples?: number;
}

export interface RuViewNode {
  node_id: number;
  rssi_dbm?: number;
  amplitude?: number[];
  sync?: RuViewNodeSync;
}

/** `{ "type": "sensing_update", ... }` frame from ws://…/ws/sensing */
export interface RuViewSensingUpdate {
  type: 'sensing_update';
  persons?: RuViewPerson[];
  vital_signs?: RuViewVitalSigns;
  nodes?: RuViewNode[];
}

/** GET /health */
export interface RuViewHealth {
  status: string;
  source?: string;
  clients?: number;
}

export function isSensingUpdate(msg: unknown): msg is RuViewSensingUpdate {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === 'sensing_update'
  );
}
