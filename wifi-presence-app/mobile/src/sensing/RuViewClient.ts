import {
  AppEvent,
  CalibrationSession,
  CalibrationStep,
  GatewayMessage,
  GatewaySettings,
  HealthStatus,
  PersonDetection,
  RoomConfig,
  RoomState,
  SensorNode,
} from './types';
import { Emitter, Unsubscribe } from './emitter';

export interface SensingEvents {
  rooms: RoomState[];
  event: AppEvent;
  health: HealthStatus;
  sensors: SensorNode[];
  connection: 'connecting' | 'connected' | 'disconnected';
}

/**
 * The app-facing sensing abstraction. The UI depends ONLY on this interface — it knows
 * nothing about RuView, MQTT, UDP, CSI, or the gateway wire format. Two implementations
 * exist: `GatewayRuViewClient` (real gateway) and `MockRuViewClient` (hardware-free).
 */
export interface RuViewClient {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;

  // realtime subscriptions
  subscribePresence(cb: (rooms: RoomState[]) => void): Unsubscribe;
  subscribeMotion(cb: (rooms: RoomState[]) => void): Unsubscribe;
  subscribePose(cb: (people: PersonDetection[]) => void): Unsubscribe;
  subscribeEvents(cb: (event: AppEvent) => void): Unsubscribe;
  subscribeHealth(cb: (health: HealthStatus) => void): Unsubscribe;
  subscribeSensors(cb: (sensors: SensorNode[]) => void): Unsubscribe;
  subscribeConnection(cb: (s: SensingEvents['connection']) => void): Unsubscribe;

  // snapshots
  getHealth(): Promise<HealthStatus>;
  getSensors(): Promise<SensorNode[]>;
  getRooms(): Promise<RoomState[]>;
  getEvents(opts?: { limit?: number; roomId?: string; type?: string }): Promise<AppEvent[]>;
  clearEvents(): Promise<number>;

  // configuration
  getSettings(): Promise<GatewaySettings>;
  updateSettings(patch: Partial<GatewaySettings>): Promise<GatewaySettings>;
  createRoom(input: { name: string; nodeIds: number[] }): Promise<RoomConfig>;
  updateRoom(roomId: string, patch: Partial<{ name: string; nodeIds: number[] }>): Promise<RoomConfig>;
  deleteRoom(roomId: string): Promise<void>;

  // sensors
  testSensor(id: string): Promise<{ ok: boolean; message: string }>;
  reconnectSensor(id: string): Promise<{ ok: boolean }>;

  // calibration (proxies RuView's own mechanisms via the gateway)
  startCalibration(roomId: string): Promise<CalibrationSession>;
  advanceCalibration(sessionId: string, step: CalibrationStep): Promise<CalibrationSession>;
  finishCalibration(sessionId: string): Promise<{ ok: boolean; profileSaved: boolean }>;
}

export interface GatewayClientConfig {
  /** e.g. http://192.168.1.50:8090 */
  baseUrl: string;
  clientId: string;
  sharedSecret: string;
}

/** Real client: authenticates to the gateway, streams over WSS, reads/writes over REST. */
export class GatewayRuViewClient implements RuViewClient {
  private emitter = new Emitter<SensingEvents>();
  private ws?: WebSocket;
  private token?: string;
  private connected = false;
  private manualClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly cfg: GatewayClientConfig) {}

  async connect(): Promise<void> {
    this.manualClose = false;
    this.emitter.emit('connection', 'connecting');
    await this.authenticate();
    this.openSocket();
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = undefined;
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
    // motion is carried on room state; consumers filter on `movement`.
    return this.emitter.on('rooms', cb);
  }
  subscribePose(cb: (people: PersonDetection[]) => void): Unsubscribe {
    return this.emitter.on('rooms', (rooms) => {
      const withPose = rooms.flatMap((r) => r.people.filter((p) => p.pose));
      if (withPose.length) cb(withPose);
    });
  }
  subscribeEvents(cb: (event: AppEvent) => void): Unsubscribe {
    return this.emitter.on('event', cb);
  }
  subscribeHealth(cb: (health: HealthStatus) => void): Unsubscribe {
    return this.emitter.on('health', cb);
  }
  subscribeSensors(cb: (sensors: SensorNode[]) => void): Unsubscribe {
    return this.emitter.on('sensors', cb);
  }
  subscribeConnection(cb: (s: SensingEvents['connection']) => void): Unsubscribe {
    return this.emitter.on('connection', cb);
  }

  getHealth(): Promise<HealthStatus> {
    return this.rest<HealthStatus>('GET', '/health', undefined, false);
  }
  getSensors(): Promise<SensorNode[]> {
    return this.rest<SensorNode[]>('GET', '/sensors');
  }
  getRooms(): Promise<RoomState[]> {
    return this.rest<RoomState[]>('GET', '/rooms');
  }
  getEvents(opts: { limit?: number; roomId?: string; type?: string } = {}): Promise<AppEvent[]> {
    const q = new URLSearchParams();
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.roomId) q.set('roomId', opts.roomId);
    if (opts.type) q.set('type', opts.type);
    const qs = q.toString();
    return this.rest<AppEvent[]>('GET', `/events${qs ? `?${qs}` : ''}`);
  }
  async clearEvents(): Promise<number> {
    const r = await this.rest<{ deleted: number }>('DELETE', '/events');
    return r.deleted;
  }

  getSettings(): Promise<GatewaySettings> {
    return this.rest<GatewaySettings>('GET', '/settings');
  }
  updateSettings(patch: Partial<GatewaySettings>): Promise<GatewaySettings> {
    return this.rest<GatewaySettings>('PUT', '/settings', patch);
  }
  createRoom(input: { name: string; nodeIds: number[] }): Promise<RoomConfig> {
    return this.rest<RoomConfig>('POST', '/rooms', input);
  }
  updateRoom(roomId: string, patch: Partial<{ name: string; nodeIds: number[] }>): Promise<RoomConfig> {
    return this.rest<RoomConfig>('PUT', `/rooms/${roomId}`, patch);
  }
  async deleteRoom(roomId: string): Promise<void> {
    await this.rest('DELETE', `/rooms/${roomId}`);
  }

  testSensor(id: string): Promise<{ ok: boolean; message: string }> {
    return this.rest('POST', `/sensors/${id}/test`);
  }
  reconnectSensor(id: string): Promise<{ ok: boolean }> {
    return this.rest('POST', `/sensors/${id}/reconnect`);
  }

  startCalibration(roomId: string): Promise<CalibrationSession> {
    return this.rest('POST', '/calibration/start', { roomId });
  }
  advanceCalibration(sessionId: string, step: CalibrationStep): Promise<CalibrationSession> {
    return this.rest('POST', `/calibration/${sessionId}/step`, { step });
  }
  finishCalibration(sessionId: string): Promise<{ ok: boolean; profileSaved: boolean }> {
    return this.rest('POST', `/calibration/${sessionId}/finish`);
  }

  // --- internals ---

  private async authenticate(): Promise<void> {
    const res = await fetch(`${this.cfg.baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: this.cfg.clientId, secret: this.cfg.sharedSecret }),
    });
    if (!res.ok) throw new Error(`auth failed: ${res.status}`);
    const body = (await res.json()) as { token: string };
    this.token = body.token;
  }

  private openSocket(): void {
    const wsUrl = `${this.cfg.baseUrl.replace(/^http/, 'ws')}/ws?token=${this.token}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emitter.emit('connection', 'connected');
    };
    ws.onmessage = (ev: WebSocketMessageEvent) => {
      let msg: GatewayMessage;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      this.handleMessage(msg);
    };
    ws.onclose = () => {
      this.connected = false;
      this.emitter.emit('connection', 'disconnected');
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  private handleMessage(msg: GatewayMessage): void {
    switch (msg.type) {
      case 'snapshot':
        this.emitter.emit('rooms', msg.rooms);
        this.emitter.emit('sensors', msg.sensors);
        this.emitter.emit('health', msg.health);
        break;
      case 'rooms':
        this.emitter.emit('rooms', msg.rooms);
        break;
      case 'event':
        this.emitter.emit('event', msg.event);
        break;
      case 'health':
        this.emitter.emit('health', msg.health);
        break;
      default:
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;
    const delay = Math.min(30000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.authenticate();
        this.openSocket();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  private async rest<T>(
    method: string,
    path: string,
    body?: unknown,
    auth = true,
  ): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (auth && this.token) headers.authorization = `Bearer ${this.token}`;
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`${method} ${path} → ${res.status}`);
    }
    return (await res.json()) as T;
  }
}
