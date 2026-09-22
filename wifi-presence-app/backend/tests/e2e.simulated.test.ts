import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import { loadConfig } from '../src/config';
import { createGateway, Gateway } from '../src/gateway';
import { MockRuViewServer } from '../src/ruview/mockRuViewServer';
import { GatewayMessage } from '@wifi-presence/shared';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('end-to-end with simulated RuView', () => {
  let mock: MockRuViewServer;
  let gw: Gateway;
  let port: number;

  const base = () => `http://127.0.0.1:${port}`;
  const SECRET = 'test-secret';

  async function token(clientId: string): Promise<string> {
    const res = await fetch(`${base()}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId, secret: SECRET }),
    });
    return ((await res.json()) as { token: string }).token;
  }

  beforeAll(async () => {
    mock = new MockRuViewServer({ httpPort: 3399, wsPort: 3398, tickMs: 50 });
    const { wsUrl, httpUrl } = await mock.start();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wpa-e2e-'));
    const cfg = {
      ...loadConfig(),
      httpPort: 0,
      ruviewWsUrl: wsUrl,
      ruviewHttpUrl: httpUrl,
      dataDir: dir,
      sharedSecret: SECRET,
      staleFrameMs: 3000,
      sensorStaleMs: 5000,
      reconnectBaseMs: 50,
    };
    gw = createGateway(cfg);
    port = await gw.listen();
    await sleep(400); // let sensing frames flow through the pipeline
  });

  afterAll(async () => {
    await gw.close();
    await mock.stop();
  });

  it('rejects unauthenticated REST access', async () => {
    const res = await fetch(`${base()}/rooms`);
    expect(res.status).toBe(401);
  });

  it('rejects a bad shared secret', async () => {
    const res = await fetch(`${base()}/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: 'x', secret: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('serves live room state showing the simulated occupant', async () => {
    const t = await token('rest');
    const rooms = (await (
      await fetch(`${base()}/rooms`, { headers: { authorization: `Bearer ${t}` } })
    ).json()) as any[];
    expect(Array.isArray(rooms)).toBe(true);
    const living = rooms.find((r: { roomId: string }) => r.roomId === 'living_room');
    expect(living).toBeDefined();
    expect(living.occupied).toBe(true);
    expect(living.personCount).toBeGreaterThanOrEqual(1);
    // pose stub → no fabricated skeleton
    expect(living.people[0].pose).toBeUndefined();
  });

  it('reports healthy system status', async () => {
    const health = (await (await fetch(`${base()}/health`)).json()) as any;
    expect(health.ruview.connected).toBe(true);
    expect(health.system).toBe('online');
    expect(health.peopleDetected).toBeGreaterThanOrEqual(1);
    expect(health.sensors.total).toBeGreaterThanOrEqual(3);
  });

  it('records events into local history', async () => {
    const t = await token('events');
    const events = (await (
      await fetch(`${base()}/events`, { headers: { authorization: `Bearer ${t}` } })
    ).json()) as any[];
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e: { type: string }) => e.type === 'person_detected')).toBe(true);
  });

  it('streams a snapshot then room updates over the authenticated WS', async () => {
    const t = await token('ws');
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${t}`);
    const messages: GatewayMessage[] = [];
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no ws messages received')), 4000);
      ws.on('message', (d) => {
        messages.push(JSON.parse(d.toString()));
        if (messages.some((m) => m.type === 'snapshot') && messages.some((m) => m.type === 'rooms')) {
          clearTimeout(timer);
          resolve();
        }
      });
      ws.on('error', reject);
    });
    ws.close();
    expect(messages[0].type).toBe('snapshot');
    expect(messages.some((m) => m.type === 'rooms')).toBe(true);
  });

  it('rejects a WS connection without a valid token', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=bad`);
    const rejected = await new Promise<boolean>((resolve) => {
      ws.on('error', () => resolve(true));
      ws.on('close', () => resolve(true));
      ws.on('open', () => resolve(false));
    });
    expect(rejected).toBe(true);
  });

  it('accepts room configuration changes', async () => {
    const t = await token('rooms');
    const created = (await (
      await fetch(`${base()}/rooms`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
        body: JSON.stringify({ name: 'Office', nodeIds: [12] }),
      })
    ).json()) as any;
    expect(created.roomId).toBeTruthy();
    expect(created.name).toBe('Office');
  });
});
