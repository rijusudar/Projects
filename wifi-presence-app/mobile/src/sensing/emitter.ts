/** Minimal typed event emitter (no Node dependency; runs in React Native). */
export type Listener<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export class Emitter<Events> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, cb: Listener<Events[K]>): Unsubscribe {
    const set = (this.listeners[event] ??= new Set());
    set.add(cb);
    return () => set.delete(cb);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }

  clear(): void {
    this.listeners = {};
  }
}
