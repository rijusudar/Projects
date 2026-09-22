import { EventEmitter } from 'node:events';
import type WebSocket from 'ws';
import { RuViewAdapter } from '../src/ruview/RuViewAdapter';
import { loadConfig } from '../src/config';
import { RuViewSensingUpdate } from '../src/ruview/wire';

/** Minimal fake WebSocket that records instances and lets tests drive its events. */
class FakeWS extends EventEmitter {
  static instances: FakeWS[] = [];
  readyState = 1;
  closed = false;
  constructor(public url: string) {
    super();
    FakeWS.instances.push(this);
  }
  close(): void {
    this.closed = true;
    this.emit('close');
  }
  send(): void {
    /* noop */
  }
}

const fakeFetch = (async () => ({
  ok: true,
  json: async () => ({ status: 'ok', source: 'simulated' }),
})) as unknown as typeof fetch;

describe('RuViewAdapter reconnection', () => {
  beforeEach(() => {
    FakeWS.instances = [];
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reconnects with backoff after a close and parses sensing_update frames', () => {
    const cfg = { ...loadConfig(), reconnectBaseMs: 100, reconnectMaxMs: 1000, staleFrameMs: 100000 };
    const adapter = new RuViewAdapter(cfg, FakeWS as unknown as typeof WebSocket, fakeFetch);

    const updates: RuViewSensingUpdate[] = [];
    let connectedCount = 0;
    adapter.on('update', (u) => updates.push(u));
    adapter.on('connected', () => (connectedCount += 1));

    adapter.start();
    expect(FakeWS.instances).toHaveLength(1);

    FakeWS.instances[0].emit('open');
    expect(connectedCount).toBe(1);
    expect(adapter.getStatus().connected).toBe(true);

    FakeWS.instances[0].emit('message', JSON.stringify({ type: 'sensing_update', persons: [], nodes: [] }));
    expect(updates).toHaveLength(1);

    // malformed frames are ignored, not fatal
    FakeWS.instances[0].emit('message', 'definitely not json');
    expect(updates).toHaveLength(1);

    // close schedules a backoff reconnect
    FakeWS.instances[0].emit('close');
    expect(adapter.getStatus().connected).toBe(false);
    expect(FakeWS.instances).toHaveLength(1);

    jest.advanceTimersByTime(150); // > base delay
    expect(FakeWS.instances).toHaveLength(2);

    FakeWS.instances[1].emit('open');
    expect(connectedCount).toBe(2);
    expect(adapter.getStatus().reconnectAttempts).toBe(0); // reset on successful open

    adapter.stop();
  });

  it('stops reconnecting after stop()', () => {
    const cfg = { ...loadConfig(), reconnectBaseMs: 50 };
    const adapter = new RuViewAdapter(cfg, FakeWS as unknown as typeof WebSocket, fakeFetch);
    adapter.start();
    FakeWS.instances[0].emit('open');
    adapter.stop();
    FakeWS.instances[0].emit('close');
    jest.advanceTimersByTime(1000);
    expect(FakeWS.instances).toHaveLength(1); // no reconnect after stop
  });
});
