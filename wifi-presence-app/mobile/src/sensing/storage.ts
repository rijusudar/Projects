/**
 * Per-viewer local storage abstraction. Uses @react-native-async-storage/async-storage when
 * present, otherwise an in-memory fallback (so the app runs in any environment). Only small,
 * non-sensitive prefs live here (selected client mode, gateway URL). Never raw sensor data.
 */
type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let impl: AsyncStorageLike;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  impl = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
} catch {
  const mem = new Map<string, string>();
  impl = {
    async getItem(k) {
      return mem.has(k) ? mem.get(k)! : null;
    },
    async setItem(k, v) {
      mem.set(k, v);
    },
    async removeItem(k) {
      mem.delete(k);
    },
  };
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await impl.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await impl.setItem(key, JSON.stringify(value));
  } catch {
    /* best effort */
  }
}
