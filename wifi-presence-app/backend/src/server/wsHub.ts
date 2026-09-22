import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { AppEvent, ClientMessage, GatewayMessage, RoomState } from '@wifi-presence/shared';
import { AuthService } from '../auth';
import { SensingService } from '../sensingService';

interface Client {
  ws: WebSocket;
  rooms?: Set<string>; // optional room filter
}

/**
 * Bearer-authenticated WSS hub. Broadcasts snapshots + throttled room updates + new events to
 * all subscribed mobile clients. Supports many concurrent clients.
 */
export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<Client>();
  private lastRoomsBroadcast = 0;
  private readonly throttleMs = 200; // ~5 Hz

  constructor(
    server: http.Server,
    private readonly auth: AuthService,
    private readonly sensing: SensingService,
  ) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      if (!req.url) return socket.destroy();
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/ws') return socket.destroy();
      const token = url.searchParams.get('token') ?? undefined;
      if (!this.auth.verify(token)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return socket.destroy();
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnect(ws));
    });

    this.sensing.on('rooms', (rooms) => this.broadcastRooms(rooms));
    this.sensing.on('event', (event) => this.broadcastEvent(event));
    this.sensing.on('health', (health) => this.send({ type: 'health', health }));
  }

  private onConnect(ws: WebSocket): void {
    const client: Client = { ws };
    this.clients.add(client);

    const snapshot: GatewayMessage = {
      type: 'snapshot',
      rooms: this.sensing.getRooms(),
      sensors: this.sensing.getSensors(),
      health: this.sensing.getHealth(),
    };
    ws.send(JSON.stringify(snapshot));

    ws.on('message', (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg.type === 'subscribe') client.rooms = new Set(msg.rooms);
      if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', t: Date.now() }));
    });

    ws.on('close', () => this.clients.delete(client));
    ws.on('error', () => this.clients.delete(client));
  }

  private broadcastRooms(rooms: RoomState[]): void {
    const now = Date.now();
    if (now - this.lastRoomsBroadcast < this.throttleMs) return;
    this.lastRoomsBroadcast = now;
    for (const c of this.clients) {
      const filtered = c.rooms ? rooms.filter((r) => c.rooms!.has(r.roomId)) : rooms;
      this.sendTo(c, { type: 'rooms', rooms: filtered });
    }
  }

  private broadcastEvent(event: AppEvent): void {
    for (const c of this.clients) {
      if (c.rooms && event.roomId && !c.rooms.has(event.roomId)) continue;
      this.sendTo(c, { type: 'event', event });
    }
  }

  private send(msg: GatewayMessage): void {
    for (const c of this.clients) this.sendTo(c, msg);
  }

  private sendTo(c: Client, msg: GatewayMessage): void {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
  }

  clientCount(): number {
    return this.clients.size;
  }

  close(): void {
    for (const c of this.clients) c.ws.close();
    this.clients.clear();
    this.wss.close();
  }
}
