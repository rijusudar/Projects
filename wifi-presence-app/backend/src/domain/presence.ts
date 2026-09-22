import { ConfidenceLabel, MovementState } from '@wifi-presence/shared';

/**
 * Application-level presence & confidence heuristics.
 *
 * IMPORTANT (see docs/RUVIEW-INTEGRATION.md §8): RuView's `…/ws/sensing` stream provides a
 * *global* `persons[]` list (per-mesh, no per-person confidence field) and per-node signal
 * data — it does NOT provide per-room occupancy or a presence confidence over WebSocket.
 * Rooms and per-detection confidence are therefore APP-LEVEL constructs derived here from
 * signals RuView does give us. None of these numbers are RuView accuracy figures; they are
 * a documented gateway metric. We never fabricate a CCTV-style precision.
 */

/** Signal quality 0..1 from RSSI (dBm). -30 ≈ excellent, -90 ≈ unusable. */
export function rssiQuality(rssiDbm: number | undefined): number {
  if (rssiDbm === undefined || Number.isNaN(rssiDbm)) return 0;
  return clamp01((rssiDbm + 90) / 60);
}

export function qualityLabel(q: number): ConfidenceLabel {
  if (q >= 0.7) return 'high';
  if (q >= 0.4) return 'medium';
  return 'low';
}

/**
 * Motion energy 0..1 from the L2 change between consecutive CSI amplitude vectors for a
 * node. Empty / mismatched vectors → 0. This is a coarse app-level motion proxy, not
 * RuView's internal motion classifier.
 */
export function amplitudeMotion(prev: number[] | undefined, next: number[] | undefined): number {
  if (!prev || !next || prev.length === 0 || prev.length !== next.length) return 0;
  let sumSq = 0;
  for (let i = 0; i < next.length; i += 1) {
    const d = next[i] - prev[i];
    sumSq += d * d;
  }
  const rms = Math.sqrt(sumSq / next.length);
  // amplitudes are ~0..1 in our normalization; scale so typical walking motion → ~0.5.
  return clamp01(rms * 3);
}

export function motionState(energy: number): MovementState {
  if (energy < 0.08) return 'still';
  if (energy < 0.3) return 'walking';
  return 'moving';
}

export interface RoomConfidenceInput {
  occupied: boolean;
  /** fraction of the room's sensors that are online (0..1). */
  liveness: number;
  /** mean RSSI quality of the room's online sensors (0..1). */
  signalScore: number;
  /** room motion energy (0..1). */
  motionScore: number;
  /** best keypoint confidence among the room's persons (0 when pose model is the stub). */
  poseScore: number;
}

/**
 * Room detection confidence 0..1.
 *
 * Occupied: weighted blend of signal, motion, and (if available) pose, scaled by how much
 * of the room is actually being sensed (liveness). Weights are documented, not tuned to a
 * benchmark:  motion is the strongest presence cue over WiFi, signal quality gates
 * reliability, pose contributes only when RuView returns real keypoints.
 *
 * Empty: confidence that the "no one here" assertion is trustworthy == how well the room is
 * currently sensed (liveness × signal). A dark/offline room yields low confidence, so the
 * UI can say "unknown" rather than a false "empty".
 */
export function roomConfidence(i: RoomConfidenceInput): number {
  if (!i.occupied) {
    return clamp01(i.liveness * i.signalScore);
  }
  const base = 0.45 * i.motionScore + 0.35 * i.signalScore + 0.2 * i.poseScore;
  return clamp01(i.liveness * base);
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
