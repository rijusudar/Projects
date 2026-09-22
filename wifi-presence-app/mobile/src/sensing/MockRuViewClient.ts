import {
  AppEvent,
  CalibrationSession,
  CalibrationStep,
  COCO_KEYPOINTS,
  GatewaySettings,
  HealthStatus,
  PersonDetection,
  RoomConfig,
  RoomState,
  SensorNode,
  confidenceLabel,
} from './types';
import { Emitter, Unsubscribe } from './emitter';
import { RuViewClient, SensingEvents } from './RuViewClient';

const CAL_STEPS: CalibrationStep[] = [
  'select_room',
  'detect_nodes',
  'position_sensors',
  'baseline_empty',
  'collect_occupied',
  'validate',
  'save',
];

/**
 * Fully local mock. Produces the same normalized shapes the gateway emits, so every screen
 * works with no backend and no hardware. It simulates one person walking a loop in the
 * living room. Pose keypoints are emitted with confidence 0 by default (faithful to RuView's
 * on-device stub) so the UI exercises the marker fallback; flip `withPose` to test skeletons.
 */
export class MockRuViewClient implements RuViewClient {
  private emitter = new Emitter<SensingEvents>();
  private timer?: ReturnType<typeof setInterval>;
  private t = 0;
  private connected = false;
  private events: AppEvent[] = [];
  private wasOccupied = false;
  private settings: GatewaySettings = {
    homeName: 'My Home',
    vitalsEnabled: false,
    eventRetentionDays: 30,
    poseMinConfidence: 0.3,
  };
  private rooms: RoomConfig[] = [
    { roomId: 'living_room', name: 'Living Room', nodeIds: [9], createdAt: 0, updatedAt: 0 },
    { roomId: 'bedroom', name: 'Bedroom', nodeIds: [10], createdAt: 0, updatedAt: 0 },
    { roomId: 'kitchen', name: 'Kitchen', nodeIds: [11], createdAt: 0, updatedAt: 0 },
  ];

  constructor(private readonly withPose = false, private readonly tickMs = 250) {}

  async connect(): Promise<void> {
    this.connected = true;
    this.emitter.emit('connection', 'connected');
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.tick();
  }

  disconnect(): void {
    if (this.timer) clearInterval(this.timer);
    this.connected = false;
    this.emitter.emit('connection', 'disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribePresence(cb: (rooms: RoomState[]) => void): Unsubscribe {
    return this.emitter.on('rooms', cb);
  }
  subscribeMotion(cb: (rooms: RoomState[]) => void): Unsubscribe {
    return this.emitter.on('rooms', cb);
  }
  subscribePose(cb: (people: PersonDetection[]) => void): Unsubscribe {
    return this.emitter.on('rooms', (rooms) => {
      const withPose = rooms.flatMap((r) => r.people.filter((p) => p.pose));
      if (withPose.length) cb(withPose);
    });
  }
  subscribeEvents(cb: (e: AppEvent) => void): Unsubscribe {
    return this.emitter.on('event', cb);
  }
  subscribeHealth(cb: (h: HealthStatus) => void): Unsubscribe {
    return this.emitter.on('health', cb);
  }
  subscribeSensors(cb: (sensors: SensorNode[]) => void): Unsubscribe {
    return this.emitter.on('sensors', cb);
  }
  subscribeConnection(cb: (s: SensingEvents['connection']) => void): Unsubscribe {
    return this.emitter.on('connection', cb);
  }

  async getHealth(): Promise<HealthStatus> {
    return this.buildHealth(this.buildRooms());
  }
  async getSensors(): Promise<SensorNode[]> {
    return this.buildSensors();
  }
  async getRooms(): Promise<RoomState[]> {
    return this.buildRooms();
  }
  async getEvents(opts: { limit?: number; roomId?: string; type?: string } = {}): Promise<AppEvent[]> {
    let out = [...this.events].sort((a, b) => b.timestamp - a.timestamp);
    if (opts.roomId) out = out.filter((e) => e.roomId === opts.roomId);
    if (opts.type) out = out.filter((e) => e.type === opts.type);
    if (opts.limit) out = out.slice(0, opts.limit);
    return out;
  }
  async clearEvents(): Promise<number> {
    const n = this.events.length;
    this.events = [];
    return n;
  }

  async getSettings(): Promise<GatewaySettings> {
    return { ...this.settings };
  }
  async updateSettings(patch: Partial<GatewaySettings>): Promise<GatewaySettings> {
    this.settings = { ...this.settings, ...patch };
    return { ...this.settings };
  }
  async createRoom(input: { name: string; nodeIds: number[] }): Promise<RoomConfig> {
    const room: RoomConfig = {
      ...input,
      roomId: `room_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.rooms.push(room);
    return room;
  }
  async updateRoom(roomId: string, patch: Partial<{ name: string; nodeIds: number[] }>): Promise<RoomConfig> {
    const room = this.rooms.find((r) => r.roomId === roomId);
    if (!room) throw new Error('room not found');
    Object.assign(room, patch, { updatedAt: Date.now() });
    return room;
  }
  async deleteRoom(roomId: string): Promise<void> {
    this.rooms = this.rooms.filter((r) => r.roomId !== roomId);
  }

  async testSensor(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: 'Mock sensor responding' };
  }
  async reconnectSensor(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async startCalibration(roomId: string): Promise<CalibrationSession> {
    return {
      sessionId: `cal_${Date.now()}`,
      roomId,
      step: 'select_room',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  async advanceCalibration(sessionId: string, step: CalibrationStep): Promise<CalibrationSession> {
    return {
      sessionId,
      roomId: 'living_room',
      step,
      baselineFrames: step === 'baseline_empty' ? 120 : undefined,
      occupiedFrames: step === 'collect_occupied' ? 240 : undefined,
      validated: step === 'validate',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  async finishCalibration(): Promise<{ ok: boolean; profileSaved: boolean }> {
    return { ok: true, profileSaved: true };
  }

  // --- simulation ---

  private tick(): void {
    this.t += 1;
    const rooms = this.buildRooms();
    this.emitter.emit('rooms', rooms);
    this.emitter.emit('sensors', this.buildSensors());
    this.emitter.emit('health', this.buildHealth(rooms));

    const living = rooms.find((r) => r.roomId === 'living_room');
    const occupied = Boolean(living?.occupied);
    if (occupied && !this.wasOccupied) this.pushEvent('person_detected', 'living_room', living?.confidence);
    if (!occupied && this.wasOccupied) this.pushEvent('room_empty', 'living_room');
    this.wasOccupied = occupied;
  }

  private pushEvent(type: AppEvent['type'], roomId?: string, confidence?: number): void {
    const e: AppEvent = { id: `evt_${Date.now()}_${this.t}`, type, roomId, confidence, timestamp: Date.now() };
    this.events.push(e);
    this.emitter.emit('event', e);
  }

  private buildRooms(): RoomState[] {
    const phase = (this.t * this.tickMs) / 1000;
    // person present ~85% of the time, absent in short windows to exercise transitions
    const present = Math.sin(phase / 12) > -0.6;
    const cx = 0.5 + 0.25 * Math.cos(phase * 0.5);
    const cy = 0.5 + 0.25 * Math.sin(phase * 0.5);
    const velocity = 0.35 + 0.2 * Math.abs(Math.sin(phase));
    const movement = velocity > 0.4 ? 'moving' : 'walking';

    const people: PersonDetection[] = present
      ? [
          {
            id: 'living_room-p0',
            roomId: 'living_room',
            position: { x: cx, y: cy },
            movement: { state: movement, direction: (phase * 30) % 360, velocity },
            pose: this.withPose
              ? {
                  keypoints: COCO_KEYPOINTS.map((name, i) => ({
                    name,
                    x: cx + (i - 8) * 0.01,
                    y: cy + (i - 8) * 0.012,
                    confidence: 0.7,
                  })),
                }
              : undefined,
            confidence: this.withPose ? 0.7 : 0.68,
            timestamp: Date.now(),
          },
        ]
      : [];

    const now = Date.now();
    const living: RoomState = {
      roomId: 'living_room',
      name: 'Living Room',
      occupied: present,
      personCount: people.length,
      people,
      movement: present ? movement : 'still',
      confidence: present ? 0.68 : 0.72,
      confidenceLabel: confidenceLabel(present ? 0.68 : 0.72),
      sensorIds: ['9'],
      lastDetectedAt: present ? now : now - 60000,
      updatedAt: now,
      vitals: this.settings.vitalsEnabled && present ? { breathingBpm: 16, heartBpm: 71, confidence: 0.82 } : undefined,
    };
    const empty = (roomId: string, name: string, sensorId: string): RoomState => ({
      roomId,
      name,
      occupied: false,
      personCount: 0,
      people: [],
      movement: 'still',
      confidence: 0.7,
      confidenceLabel: 'medium',
      sensorIds: [sensorId],
      updatedAt: now,
    });
    return [living, empty('bedroom', 'Bedroom', '10'), empty('kitchen', 'Kitchen', '11')];
  }

  private buildSensors(): SensorNode[] {
    const online = (id: string, name: string, roomId: string, rssi: number): SensorNode => ({
      id,
      name,
      type: 'esp32-s3',
      roomId,
      status: 'online',
      rssiDbm: rssi,
      signalQuality: rssi > -50 ? 'high' : rssi > -70 ? 'medium' : 'low',
      csiAvailable: true,
      csiFps: 98,
      firmware: 'ruview-fw 2.3.1',
      ipAddress: `192.168.1.${20 + Number(id)}`,
      lastPacketAt: Date.now(),
      calibrated: true,
    });
    return [
      online('9', 'Living Room Node', 'living_room', -38),
      online('10', 'Bedroom Node', 'bedroom', -52),
      online('11', 'Kitchen Node', 'kitchen', -61),
    ];
  }

  private buildHealth(rooms: RoomState[]): HealthStatus {
    const occupied = rooms.filter((r) => r.occupied).length;
    const people = rooms.reduce((a, r) => a + r.personCount, 0);
    const conf = rooms.reduce((a, r) => a + r.confidence, 0) / rooms.length;
    return {
      system: 'online',
      ruview: { connected: true, source: 'mock', lastFrameMs: 50, url: 'mock://local' },
      sensors: { online: 3, total: 3 },
      rooms: { occupied, total: rooms.length },
      peopleDetected: people,
      overallConfidence: Math.round(conf * 100) / 100,
      updatedAt: Date.now(),
    };
  }
}
