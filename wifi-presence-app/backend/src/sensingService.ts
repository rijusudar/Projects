import { EventEmitter } from 'node:events';
import {
  AppEvent,
  HealthStatus,
  RoomState,
  SensorNode,
} from '@wifi-presence/shared';
import { GatewayConfig } from './config';
import { RuViewAdapter } from './ruview/RuViewAdapter';
import { SensingNormalizer } from './ruview/normalize';
import { diffRoomEvents, diffSensorEvents } from './domain/events';
import { RoomConfigStore } from './store/roomConfig';
import { EventStore } from './store/eventStore';

export type SensingServiceEvents = {
  rooms: (rooms: RoomState[]) => void;
  event: (event: AppEvent) => void;
  health: (health: HealthStatus) => void;
};

/**
 * Central pipeline: RuViewAdapter → normalize → event diff → store, and a live snapshot the
 * HTTP/WS layers read. This is the single source of truth for current state.
 */
export class SensingService extends EventEmitter {
  private prevRooms = new Map<string, RoomState>();
  private prevSensors = new Map<string, SensorNode>();
  private currentRooms: RoomState[] = [];
  private currentSensors: SensorNode[] = [];
  private staleTimer?: NodeJS.Timeout;

  constructor(
    private readonly cfg: GatewayConfig,
    private readonly adapter: RuViewAdapter,
    private readonly normalizer: SensingNormalizer,
    private readonly roomStore: RoomConfigStore,
    private readonly eventStore: EventStore,
  ) {
    super();
  }

  start(): void {
    this.adapter.on('update', (u) => {
      const { rooms, sensors } = this.normalizer.ingest(u);
      this.applySnapshot(rooms, sensors);
    });
    this.adapter.on('connected', () => this.emit('health', this.getHealth()));
    this.adapter.on('disconnected', () => this.emit('health', this.getHealth()));
    this.adapter.on('stale', () => this.handleStale());
    this.adapter.start();

    // Periodic staleness sweep for sensors that simply stop sending.
    this.staleTimer = setInterval(() => this.handleStale(), Math.max(1000, this.cfg.sensorStaleMs / 2));
  }

  stop(): void {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.adapter.stop();
  }

  getRooms(): RoomState[] {
    return this.currentRooms;
  }

  getSensors(): SensorNode[] {
    return this.currentSensors.length ? this.currentSensors : this.normalizer.getSensors();
  }

  getHealth(): HealthStatus {
    const st = this.adapter.getStatus();
    const sensors = this.getSensors();
    const online = sensors.filter((s) => s.status === 'online').length;
    const occupied = this.currentRooms.filter((r) => r.occupied).length;
    const people = this.currentRooms.reduce((a, r) => a + r.personCount, 0);
    const confs = this.currentRooms.map((r) => r.confidence);
    const overall = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
    const lastFrameMs = st.lastFrameAt ? Date.now() - st.lastFrameAt : undefined;
    const fresh = lastFrameMs !== undefined && lastFrameMs < this.cfg.staleFrameMs;
    return {
      system: st.connected && fresh ? 'online' : 'offline',
      ruview: { connected: st.connected, source: st.source, lastFrameMs, url: st.url },
      sensors: { online, total: sensors.length },
      rooms: { occupied, total: this.roomStore.list().length },
      peopleDetected: people,
      overallConfidence: round2(overall),
      updatedAt: Date.now(),
    };
  }

  private applySnapshot(rooms: RoomState[], sensors: SensorNode[]): void {
    const now = Date.now();
    const roomEvents = diffRoomEvents(this.prevRooms, rooms, now);
    const sensorEvents = diffSensorEvents(this.prevSensors, sensors, now);
    const all = [...roomEvents, ...sensorEvents];
    if (all.length) {
      this.eventStore.append(all);
      for (const e of all) this.emit('event', e);
    }
    this.currentRooms = rooms;
    this.currentSensors = sensors;
    this.prevRooms = new Map(rooms.map((r) => [r.roomId, r]));
    this.prevSensors = new Map(sensors.map((s) => [s.id, s]));
    this.emit('rooms', rooms);
  }

  private handleStale(): void {
    const changed = this.normalizer.evaluateStale();
    if (changed.length) {
      const sensors = this.normalizer.getSensors();
      const sensorEvents = diffSensorEvents(this.prevSensors, sensors, Date.now());
      if (sensorEvents.length) {
        this.eventStore.append(sensorEvents);
        for (const e of sensorEvents) this.emit('event', e);
      }
      this.currentSensors = sensors;
      this.prevSensors = new Map(sensors.map((s) => [s.id, s]));
    }
    this.emit('health', this.getHealth());
  }

  emit<K extends keyof SensingServiceEvents>(
    event: K,
    ...args: Parameters<SensingServiceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof SensingServiceEvents>(event: K, listener: SensingServiceEvents[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
