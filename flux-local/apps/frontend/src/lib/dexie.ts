import Dexie, { type Table } from "dexie";
import type { ImageMeta } from "../api/types";

// Client-side cache of generation history for offline browsing. The server
// (SQLite) remains the source of truth; this is a convenience mirror.
export interface CachedImage extends ImageMeta {
  cachedAt: number;
}

export interface SavedPreset {
  id?: number;
  name: string;
  body: string; // JSON-serialized GenerateBody
}

class FluxDB extends Dexie {
  images!: Table<CachedImage, string>;
  presets!: Table<SavedPreset, number>;

  constructor() {
    super("flux-local");
    this.version(1).stores({
      images: "id, job_id, created_at",
      presets: "++id, name",
    });
  }
}

export const db = new FluxDB();

export async function cacheImages(items: ImageMeta[]): Promise<void> {
  const now = Date.now();
  await db.images.bulkPut(items.map((i) => ({ ...i, cachedAt: now })));
}

export async function getCachedImages(limit = 60): Promise<CachedImage[]> {
  return db.images.orderBy("created_at").reverse().limit(limit).toArray();
}
