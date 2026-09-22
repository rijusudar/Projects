import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config';
import { RoomConfigStore } from '../src/store/roomConfig';
import { SensingNormalizer } from '../src/ruview/normalize';
import { RuViewSensingUpdate } from '../src/ruview/wire';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wpa-norm-'));
}

const cfg = { ...loadConfig(), dataDir: tmpDir() };

function frame(overrides: Partial<RuViewSensingUpdate> = {}): RuViewSensingUpdate {
  return {
    type: 'sensing_update',
    persons: [
      {
        id: 0,
        keypoints: [{ name: 'nose', x: 0.5, y: 0.5, confidence: 0 }], // stub confidence
      },
    ],
    nodes: [
      { node_id: 9, rssi_dbm: -38, amplitude: [0.5, 0.5, 0.5], sync: { is_valid: true, csi_fps_ema: 98 } },
      { node_id: 10, rssi_dbm: -55, amplitude: [0.4, 0.4, 0.4], sync: { is_valid: true, csi_fps_ema: 95 } },
    ],
    ...overrides,
  };
}

describe('SensingNormalizer', () => {
  it('maps nodes to sensors and folds persons into the primary room', () => {
    const rooms = new RoomConfigStore(cfg.dataDir, [
      { roomId: 'living_room', name: 'Living Room', nodeIds: [9], createdAt: 0, updatedAt: 0 },
      { roomId: 'bedroom', name: 'Bedroom', nodeIds: [10], createdAt: 0, updatedAt: 0 },
    ]);
    const norm = new SensingNormalizer(cfg, rooms);

    const snap = norm.ingest(frame());
    expect(snap.sensors).toHaveLength(2);
    const living = snap.rooms.find((r) => r.roomId === 'living_room')!;
    expect(living.occupied).toBe(true);
    expect(living.personCount).toBe(1);
    expect(living.confidence).toBeGreaterThan(0);
    expect(living.confidence).toBeLessThanOrEqual(1);

    // pose stub (confidence 0) must NOT produce a rendered skeleton
    expect(living.people[0].pose).toBeUndefined();

    // the other room has no persons and no motion yet → empty
    const bedroom = snap.rooms.find((r) => r.roomId === 'bedroom')!;
    expect(bedroom.occupied).toBe(false);
    expect(bedroom.personCount).toBe(0);
  });

  it('exposes pose only when keypoint confidence clears the threshold', () => {
    const rooms = new RoomConfigStore(cfg.dataDir, [
      { roomId: 'living_room', name: 'Living Room', nodeIds: [9], createdAt: 0, updatedAt: 0 },
    ]);
    const norm = new SensingNormalizer({ ...cfg, poseMinConfidence: 0.3 }, rooms);
    const f = frame({
      persons: [{ id: 0, keypoints: [{ name: 'nose', x: 0.5, y: 0.4, confidence: 0.9 }] }],
    });
    const snap = norm.ingest(f);
    const living = snap.rooms.find((r) => r.roomId === 'living_room')!;
    expect(living.people[0].pose).toBeDefined();
    expect(living.people[0].confidence).toBeCloseTo(0.9, 5);
  });

  it('routes unmapped nodes to a visible "unassigned" room', () => {
    const rooms = new RoomConfigStore(cfg.dataDir, []);
    const norm = new SensingNormalizer(cfg, rooms);
    const snap = norm.ingest(frame({ persons: [] }));
    const unassigned = snap.rooms.find((r) => r.roomId === 'unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned!.sensorIds.sort()).toEqual(['10', '9']);
  });

  it('marks a sensor offline once it stops reporting', () => {
    const rooms = new RoomConfigStore(cfg.dataDir, [
      { roomId: 'living_room', name: 'Living Room', nodeIds: [9], createdAt: 0, updatedAt: 0 },
    ]);
    const norm = new SensingNormalizer({ ...cfg, sensorStaleMs: 10 }, rooms);
    norm.ingest(frame());
    // simulate time passing beyond the stale window
    const changed = norm.evaluateStale(Date.now() + 1000);
    expect(changed.some((s) => s.status === 'offline')).toBe(true);
  });
});
