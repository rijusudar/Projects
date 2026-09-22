import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { GatewayConfig } from '../config';
import { RuViewHealth, RuViewSensingUpdate, isSensingUpdate } from './wire';

export type RuViewAdapterEvents = {
  update: (update: RuViewSensingUpdate) => void;
  connected: () => void;
  disconnected: (reason: string) => void;
  stale: () => void;
};

export interface RuViewAdapterStatus {
  connected: boolean;
  lastFrameAt?: number;
  source?: string;
  url: string;
  reconnectAttempts: number;
}

/**
 * Maintains a single resilient WebSocket connection to RuView's `…/ws/sensing`, with
 * exponential-backoff reconnection and staleness detection, plus REST helpers.
 *
 * The `WebSocket` implementation is injectable so tests can point at a mock RuView server
 * (or verify reconnection) without real hardware or the real RuView binary.
 */
export class RuViewAdapter extends EventEmitter {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private staleTimer?: NodeJS.Timeout;
  private lastFrameAt?: number;
  private source?: string;
  private closedByUser = false;
  private connected = false;

  constructor(
    private readonly cfg: GatewayConfig,
    private readonly WsCtor: typeof WebSocket = WebSocket,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super();
  }

  start(): void {
    this.closedByUser = false;
    this.open();
  }

  stop(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.reconnectTimer = undefined;
    this.staleTimer = undefined;
    this.ws?.removeAllListeners();
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = undefined;
    this.connected = false;
  }

  getStatus(): RuViewAdapterStatus {
    return {
      connected: this.connected,
      lastFrameAt: this.lastFrameAt,
      source: this.source,
      url: this.cfg.ruviewWsUrl,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /** GET /health — best effort; returns undefined if RuView is unreachable. */
  async getHealth(): Promise<RuViewHealth | undefined> {
    try {
      const res = await this.fetchImpl(`${this.cfg.ruviewHttpUrl}/health`);
      if (!res.ok) return undefined;
      const body = (await res.json()) as RuViewHealth;
      if (body?.source) this.source = body.source;
      return body;
    } catch {
      return undefined;
    }
  }

  /** GET an arbitrary RuView REST path (e.g. /api/v1/mesh). */
  async get<T>(path: string): Promise<T | undefined> {
    try {
      const res = await this.fetchImpl(`${this.cfg.ruviewHttpUrl}${path}`);
      if (!res.ok) return undefined;
      return (await res.json()) as T;
    } catch {
      return undefined;
    }
  }

  /** POST an arbitrary RuView REST path (used by calibration proxy). */
  async post<T>(path: string, body?: unknown): Promise<T | undefined> {
    try {
      const res = await this.fetchImpl(`${this.cfg.ruviewHttpUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return undefined;
      return (await res.json()) as T;
    } catch {
      return undefined;
    }
  }

  private open(): void {
    if (this.closedByUser) return;
    let ws: WebSocket;
    try {
      ws = new this.WsCtor(this.cfg.ruviewWsUrl);
    } catch (err) {
      this.scheduleReconnect(`ctor: ${(err as Error).message}`);
      return;
    }
    this.ws = ws;

    ws.on('open', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.lastFrameAt = Date.now();
      this.armStaleTimer();
      this.emit('connected');
    });

    ws.on('message', (data: WebSocket.RawData) => {
      this.lastFrameAt = Date.now();
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return; // ignore malformed frames rather than crash
      }
      if (isSensingUpdate(parsed)) {
        this.emit('update', parsed);
      }
    });

    ws.on('close', () => {
      this.connected = false;
      this.scheduleReconnect('close');
    });

    ws.on('error', (err: Error) => {
      // 'error' is followed by 'close'; record the reason, let close reconnect.
      this.emit('disconnected', err.message);
    });
  }

  private armStaleTimer(): void {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = setInterval(() => {
      if (this.lastFrameAt && Date.now() - this.lastFrameAt > this.cfg.staleFrameMs) {
        this.emit('stale');
      }
    }, Math.max(1000, Math.floor(this.cfg.staleFrameMs / 2)));
  }

  private scheduleReconnect(reason: string): void {
    if (this.connected) this.emit('disconnected', reason);
    this.connected = false;
    if (this.closedByUser) return;
    if (this.reconnectTimer) return; // already scheduled
    const delay = Math.min(
      this.cfg.reconnectMaxMs,
      this.cfg.reconnectBaseMs * 2 ** this.reconnectAttempts,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.open();
    }, delay);
  }

  // typed emit/on overrides
  emit<K extends keyof RuViewAdapterEvents>(
    event: K,
    ...args: Parameters<RuViewAdapterEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof RuViewAdapterEvents>(event: K, listener: RuViewAdapterEvents[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
}
