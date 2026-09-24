import type { ObdSnapshot } from "../types/obd.types";

export type ObdStoreListener = (snapshot: ObdSnapshot) => void;

export class ObdStore {
  private listeners = new Set<ObdStoreListener>();

  constructor(private snapshot: ObdSnapshot) {}

  getSnapshot() {
    return this.snapshot;
  }

  setSnapshot(next: Partial<ObdSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  subscribe(listener: ObdStoreListener) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
}
