import fs from 'node:fs';
import path from 'node:path';

/** Tiny synchronous JSON persistence helper. Safe if the file is missing/corrupt. */
export function readJson<T>(file: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, value: unknown): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file); // atomic-ish replace
  } catch {
    /* best-effort persistence; never crash the gateway on disk errors */
  }
}
