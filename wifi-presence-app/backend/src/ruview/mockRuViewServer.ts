import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { COCO_KEYPOINTS } from '@wifi-presence/shared';
import { RuViewNode, RuViewPerson, RuViewSensingUpdate } from './wire';

export interface MockRuViewOptions {
  httpPort?: number;
  wsPort?: number;
  tickMs?: number;
  /** node_ids the mock emits. */
  nodeIds?: number[];
  /** Emit keypoints with real confidence (simulate a working pose model). Default false
   *  to faithfully mimic the on-device stub (confidence 0). */
  poseConfidence?: number;
}

/**
 * A faithful mock of RuView's sensing-server WS + REST contract for hardware-free dev/test.
 * It emits `sensing_update` frames with a person walking a loop in the room of node 9, and
 * serves `/health`. Not a simulation of CSI physics — just the wire contract.
 */
export class MockRuViewServer {
  private httpServer?: http.Server;
  private wss?: WebSocketServer;
  private timer?: NodeJS.Timeout;
  private t = 0;
  private readonly nodeIds: number[];
  private readonly tickMs: number;
  private readonly poseConfidence: number;
  private clients = new Set<WebSocket>();
  /** When set, no person is present (used to test room-empty transitions). */
  public emptyRoom = false;

  readonly httpPort: number;
  readonly wsPort: number;

  constructor(opts: MockRuViewOptions = {}) {
    this.httpPort = opts.httpPort ?? 3000;
    this.wsPort = opts.wsPort ?? 3001;
    this.tickMs = opts.tickMs ?? 200;
    this.nodeIds = opts.nodeIds ?? [9, 10, 11];
    this.poseConfidence = opts.poseConfidence ?? 0; // faithful stub default
  }

  async start(): Promise<{ wsUrl: string; httpUrl: string }> {
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({ status: 'ok', source: 'simulated', clients: this.clients.size }),
        );
        return;
      }
      if (req.url === '/api/v1/mesh') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ nodes: this.nodeIds, leader: this.nodeIds[0] }));
        return;
      }
      res.writeHead(404);
      res.end('{}');
    });

    this.wss = new WebSocketServer({ port: this.wsPort });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    await new Promise<void>((resolve) => this.httpServer!.listen(this.httpPort, resolve));
    this.timer = setInterval(() => this.tick(), this.tickMs);

    return {
      wsUrl: `ws://127.0.0.1:${this.wsPort}/ws/sensing`,
      httpUrl: `http://127.0.0.1:${this.httpPort}`,
    };
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    for (const c of this.clients) c.close();
    this.clients.clear();
    await new Promise<void>((resolve) => {
      if (!this.wss) return resolve();
      this.wss.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      if (!this.httpServer) return resolve();
      this.httpServer.close(() => resolve());
    });
  }

  /** Build one frame; exposed for deterministic unit tests. */
  buildFrame(): RuViewSensingUpdate {
    const phase = (this.t * this.tickMs) / 1000; // seconds
    const nodes: RuViewNode[] = this.nodeIds.map((id, idx) => ({
      node_id: id,
      rssi_dbm: -38 - idx * 6 + Math.sin(phase + idx) * 2,
      // Only the occupied room's node (index 0) shows strong CSI variation; the others
      // stay near-static (ambient noise below the motion threshold), so the demo reads as
      // one person in one room rather than motion everywhere.
      amplitude:
        idx === 0 && !this.emptyRoom
          ? Array.from({ length: 8 }, (_, k) => 0.5 + 0.4 * Math.sin(phase * 2 + k))
          : Array.from({ length: 8 }, (_, k) => 0.5 + 0.003 * Math.sin(phase + k)),
      sync: {
        offset_us: 1_000_000 + idx * 500,
        is_leader: idx === 0,
        is_valid: true,
        smoothed: true,
        sequence: this.t,
        csi_fps_ema: 98 + Math.sin(phase) * 2,
      },
    }));

    const persons: RuViewPerson[] = [];
    if (!this.emptyRoom) {
      // one person walking a circle in the room of node 9
      const cx = 0.5 + 0.25 * Math.cos(phase * 0.6);
      const cy = 0.5 + 0.25 * Math.sin(phase * 0.6);
      persons.push({
        id: 0,
        keypoints: COCO_KEYPOINTS.map((name, i) => ({
          name,
          x: cx + (i - 8) * 0.005,
          y: cy + (i - 8) * 0.004,
          z: 0,
          confidence: this.poseConfidence, // faithful to on-device stub (0) unless overridden
        })),
      });
    }

    return {
      type: 'sensing_update',
      persons,
      vital_signs: { breathing_bpm: 15.8, heart_bpm: 71.4, confidence: 0.85 },
      nodes,
    };
  }

  private tick(): void {
    this.t += 1;
    const frame = JSON.stringify(this.buildFrame());
    for (const c of this.clients) {
      if (c.readyState === WebSocket.OPEN) c.send(frame);
    }
  }
}
