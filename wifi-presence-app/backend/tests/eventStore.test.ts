import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { AppEvent } from '@wifi-presence/shared';
import { EventStore } from '../src/store/eventStore';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wpa-store-'));
}

function evt(partial: Partial<AppEvent> & { id: string; timestamp: number }): AppEvent {
  return { type: 'person_detected', ...partial };
}

describe('EventStore', () => {
  it('appends, queries newest-first, filters, and clears', () => {
    const store = new EventStore(tmpDir(), 30);
    const t = Date.now();
    store.append([
      evt({ id: 'a', timestamp: t - 300, roomId: 'lr', type: 'person_detected' }),
      evt({ id: 'b', timestamp: t - 100, roomId: 'kitchen', type: 'movement_detected' }),
      evt({ id: 'c', timestamp: t - 200, roomId: 'lr', type: 'room_empty' }),
    ]);

    const all = store.query();
    expect(all.map((e) => e.id)).toEqual(['b', 'c', 'a']); // newest first

    expect(store.query({ roomId: 'lr' }).map((e) => e.id)).toEqual(['c', 'a']);
    expect(store.query({ type: 'movement_detected' }).map((e) => e.id)).toEqual(['b']);
    expect(store.query({ since: t - 200 }).map((e) => e.id)).toEqual(['b', 'c']);
    expect(store.query({ limit: 1 }).map((e) => e.id)).toEqual(['b']);

    expect(store.clear()).toBe(3);
    expect(store.size()).toBe(0);
  });

  it('trims events past the retention window', () => {
    const store = new EventStore(tmpDir(), 1); // 1 day
    const old = Date.now() - 3 * 24 * 60 * 60 * 1000;
    store.append([evt({ id: 'old', timestamp: old }), evt({ id: 'fresh', timestamp: Date.now() })]);
    expect(store.query().map((e) => e.id)).toEqual(['fresh']);
  });

  it('persists to disk and reloads', () => {
    const dir = tmpDir();
    const s1 = new EventStore(dir, 30);
    s1.append([evt({ id: 'persisted', timestamp: Date.now() })]);
    const s2 = new EventStore(dir, 30);
    expect(s2.query().map((e) => e.id)).toContain('persisted');
  });
});
