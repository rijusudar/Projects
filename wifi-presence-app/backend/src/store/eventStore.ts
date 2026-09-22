import path from 'node:path';
import { AppEvent } from '@wifi-presence/shared';
import { readJson, writeJson } from './jsonFile';

/** Local-first append-only event log with retention trimming and a delete-all action. */
export class EventStore {
  private events: AppEvent[];
  private readonly file: string;
  private readonly retentionMs: number;

  constructor(dataDir: string, retentionDays: number, seed?: AppEvent[]) {
    this.file = path.join(dataDir, 'events.json');
    this.retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    this.events = seed ?? readJson<AppEvent[]>(this.file, []);
  }

  append(events: AppEvent[]): void {
    if (events.length === 0) return;
    this.events.push(...events);
    this.trim();
    this.persist();
  }

  /** Newest first, with optional filters. */
  query(opts: { limit?: number; since?: number; roomId?: string; type?: string } = {}): AppEvent[] {
    let out = this.events;
    if (opts.since !== undefined) out = out.filter((e) => e.timestamp >= opts.since!);
    if (opts.roomId) out = out.filter((e) => e.roomId === opts.roomId);
    if (opts.type) out = out.filter((e) => e.type === opts.type);
    out = [...out].sort((a, b) => b.timestamp - a.timestamp);
    if (opts.limit) out = out.slice(0, opts.limit);
    return out;
  }

  clear(): number {
    const n = this.events.length;
    this.events = [];
    this.persist();
    return n;
  }

  size(): number {
    return this.events.length;
  }

  private trim(): void {
    const cutoff = Date.now() - this.retentionMs;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
  }

  private persist(): void {
    writeJson(this.file, this.events);
  }
}
