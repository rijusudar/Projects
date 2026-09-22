import {
  ConfidenceLabel,
  PersonDetection,
  RoomState,
  SensorNode,
  confidenceLabel,
} from '@wifi-presence/shared';
import { GatewayConfig } from '../config';
import { RoomConfigStore } from '../store/roomConfig';
import {
  amplitudeMotion,
  motionState,
  qualityLabel,
  roomConfidence,
  rssiQuality,
} from '../domain/presence';
import { RuViewSensingUpdate } from './wire';

const UNASSIGNED_ROOM = 'unassigned';
/** A room with no assigned person but this much motion energy is treated as occupied. */
const PRESENCE_MOTION_THRESHOLD = 0.12;

export interface NormalizedSnapshot {
  rooms: RoomState[];
  sensors: SensorNode[];
}

/**
 * Stateful normalizer: folds RuView `sensing_update` frames (global persons + per-node data)
 * into per-room `RoomState`s and per-node `SensorNode`s. Holds minimal temporal state
 * (previous amplitudes for motion, previous person positions for direction, last-seen for
 * staleness). See docs/DATA-FLOW.md for the mapping rules and their documented limits.
 */
export class SensingNormalizer {
  private prevAmplitude = new Map<string, number[]>();
  private prevPersonPos = new Map<string, { x: number; y: number }>();
  private sensors = new Map<string, SensorNode>();
  private lastDetectedAt = new Map<string, number>();

  constructor(
    private readonly cfg: GatewayConfig,
    private readonly rooms: RoomConfigStore,
  ) {}

  getSensors(): SensorNode[] {
    return [...this.sensors.values()];
  }

  /** Mark sensors that have not sent a packet within the stale window as offline. */
  evaluateStale(now = Date.now()): SensorNode[] {
    const changed: SensorNode[] = [];
    for (const s of this.sensors.values()) {
      const stale = s.lastPacketAt !== undefined && now - s.lastPacketAt > this.cfg.sensorStaleMs;
      if (stale && s.status !== 'offline') {
        s.status = 'offline';
        s.csiAvailable = false;
        changed.push(s);
      }
    }
    return changed;
  }

  ingest(update: RuViewSensingUpdate, now = Date.now()): NormalizedSnapshot {
    const nodeMotion = new Map<number, number>();

    // 1. Nodes → sensors
    for (const node of update.nodes ?? []) {
      const id = String(node.node_id);
      const quality = rssiQuality(node.rssi_dbm);
      const motion = amplitudeMotion(this.prevAmplitude.get(id), node.amplitude);
      if (node.amplitude) this.prevAmplitude.set(id, node.amplitude);
      nodeMotion.set(node.node_id, motion);

      const csiAvailable = node.sync?.is_valid ?? (node.amplitude?.length ?? 0) > 0;
      const existing = this.sensors.get(id);
      const sensor: SensorNode = {
        id,
        name: existing?.name ?? `Node ${node.node_id}`,
        type: existing?.type ?? 'esp32-s3',
        roomId: this.rooms.roomForNode(node.node_id) ?? UNASSIGNED_ROOM,
        status: csiAvailable ? 'online' : 'degraded',
        rssiDbm: node.rssi_dbm,
        signalQuality: qualityLabel(quality),
        csiAvailable,
        csiFps: node.sync?.csi_fps_ema,
        firmware: existing?.firmware,
        ipAddress: existing?.ipAddress,
        lastPacketAt: now,
        calibrated: existing?.calibrated ?? false,
      };
      this.sensors.set(id, sensor);
    }

    // 2. Group sensors by room (config rooms + any node that maps to none)
    const roomIds = new Set<string>(this.rooms.list().map((r) => r.roomId));
    for (const s of this.sensors.values()) if (s.roomId) roomIds.add(s.roomId);

    const sensorsByRoom = new Map<string, SensorNode[]>();
    for (const s of this.sensors.values()) {
      const rid = s.roomId ?? UNASSIGNED_ROOM;
      (sensorsByRoom.get(rid) ?? sensorsByRoom.set(rid, []).get(rid)!).push(s);
    }

    // 3. Per-room signal/motion aggregates
    interface Agg {
      liveness: number;
      signalScore: number;
      motionScore: number;
      sensorIds: string[];
    }
    const agg = new Map<string, Agg>();
    for (const rid of roomIds) {
      const list = sensorsByRoom.get(rid) ?? [];
      const online = list.filter((s) => s.status === 'online');
      const liveness = list.length ? online.length / list.length : 0;
      const signalScore = online.length
        ? online.reduce((a, s) => a + rssiQuality(s.rssiDbm), 0) / online.length
        : 0;
      const nodeIds = this.rooms.get(rid)?.nodeIds ?? list.map((s) => Number(s.id));
      const motionScore = nodeIds.reduce((m, nid) => Math.max(m, nodeMotion.get(nid) ?? 0), 0);
      agg.set(rid, { liveness, signalScore, motionScore, sensorIds: list.map((s) => s.id) });
    }

    // 4. Assign the global person list to the most-active sensed room (documented heuristic)
    const persons = update.persons ?? [];
    let primaryRoom: string | undefined;
    let bestMotion = -1;
    for (const [rid, a] of agg) {
      if (a.liveness > 0 && a.motionScore > bestMotion) {
        bestMotion = a.motionScore;
        primaryRoom = rid;
      }
    }

    // 5. Build RoomState per room
    const roomStates: RoomState[] = [];
    for (const rid of roomIds) {
      const a = agg.get(rid)!;
      const cfg = this.rooms.get(rid);
      const assignedPersons = rid === primaryRoom ? persons : [];
      const motionOnlyOccupied = a.motionScore > PRESENCE_MOTION_THRESHOLD;

      const people: PersonDetection[] = assignedPersons.map((p) =>
        this.toPerson(p, rid, a.motionScore, a.signalScore, a.liveness, now),
      );

      let personCount = people.length;
      if (personCount === 0 && motionOnlyOccupied && a.liveness > 0) {
        // motion without a resolved person: report a low-confidence single occupant
        personCount = 1;
        people.push(
          this.motionOnlyPerson(rid, a.motionScore, a.signalScore, a.liveness, now),
        );
      }

      const occupied = personCount > 0;
      const poseScore = people.reduce(
        (m, p) => Math.max(m, p.pose ? maxKp(p.pose.keypoints) : 0),
        0,
      );
      const confidence = roomConfidence({
        occupied,
        liveness: a.liveness,
        signalScore: a.signalScore,
        motionScore: a.motionScore,
        poseScore,
      });
      const label: ConfidenceLabel = confidenceLabel(confidence);
      if (occupied) this.lastDetectedAt.set(rid, now);

      const state: RoomState = {
        roomId: rid,
        name: cfg?.name ?? (rid === UNASSIGNED_ROOM ? 'Unassigned' : rid),
        occupied,
        personCount,
        people,
        movement: occupied ? motionState(a.motionScore) : 'still',
        confidence,
        confidenceLabel: label,
        sensorIds: a.sensorIds,
        lastDetectedAt: this.lastDetectedAt.get(rid),
        updatedAt: now,
      };

      if (this.cfg.vitalsEnabled && rid === primaryRoom && update.vital_signs) {
        state.vitals = {
          breathingBpm: update.vital_signs.breathing_bpm,
          heartBpm: update.vital_signs.heart_bpm,
          confidence: update.vital_signs.confidence,
        };
      }
      roomStates.push(state);
    }

    return { rooms: roomStates, sensors: this.getSensors() };
  }

  private toPerson(
    p: { id: number; keypoints?: { name: string; x: number; y: number; confidence: number }[] },
    roomId: string,
    motionScore: number,
    signalScore: number,
    liveness: number,
    now: number,
  ): PersonDetection {
    const kps = p.keypoints ?? [];
    const poseScore = maxKp(kps);
    const pos = kps.length
      ? { x: mean(kps.map((k) => k.x)), y: mean(kps.map((k) => k.y)) }
      : { x: 0.5, y: 0.5 };

    const key = `${roomId}:${p.id}`;
    const prev = this.prevPersonPos.get(key);
    let direction: number | undefined;
    if (prev) {
      const dx = pos.x - prev.x;
      const dy = pos.y - prev.y;
      if (Math.hypot(dx, dy) > 0.005) direction = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    this.prevPersonPos.set(key, pos);

    // Person confidence is APP-LEVEL: use real pose confidence when the model provides it,
    // otherwise fall back to the room detection confidence. Never a fabricated CCTV number.
    const detectionConf = roomConfidence({
      occupied: true,
      liveness,
      signalScore,
      motionScore,
      poseScore,
    });

    const detection: PersonDetection = {
      id: `${roomId}-p${p.id}`,
      roomId,
      position: pos,
      movement: { state: motionState(motionScore), direction, velocity: motionScore },
      confidence: poseScore > 0 ? poseScore : detectionConf,
      timestamp: now,
    };
    if (poseScore >= this.cfg.poseMinConfidence && kps.length > 0) {
      detection.pose = { keypoints: kps };
    }
    return detection;
  }

  private motionOnlyPerson(
    roomId: string,
    motionScore: number,
    signalScore: number,
    liveness: number,
    now: number,
  ): PersonDetection {
    return {
      id: `${roomId}-motion`,
      roomId,
      movement: { state: motionState(motionScore), velocity: motionScore },
      confidence: roomConfidence({
        occupied: true,
        liveness,
        signalScore,
        motionScore,
        poseScore: 0,
      }),
      timestamp: now,
    };
  }
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function maxKp(kps: { confidence: number }[]): number {
  return kps.reduce((m, k) => Math.max(m, k.confidence), 0);
}
