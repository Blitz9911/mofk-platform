import type { ObdLogEntry, ObdLogLevel } from "../types/obd.types";

export class ObdLogger {
  private entries: ObdLogEntry[] = [];
  private listeners = new Set<(entries: ObdLogEntry[]) => void>();

  log(level: ObdLogLevel, event: string, message: string, details?: ObdLogEntry["details"]) {
    const entry: ObdLogEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      level,
      event,
      message,
      details,
      createdAt: Date.now(),
    };
    this.entries = [entry, ...this.entries].slice(0, 160);
    this.listeners.forEach((listener) => listener(this.entries));

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
      console[method](`[OBD:${event}] ${message}`, details ?? "");
    }
  }

  getEntries() {
    return this.entries;
  }

  subscribe(listener: (entries: ObdLogEntry[]) => void) {
    this.listeners.add(listener);
    listener(this.entries);
    return () => this.listeners.delete(listener);
  }

  clear() {
    this.entries = [];
    this.listeners.forEach((listener) => listener(this.entries));
  }
}

export const obdLogger = new ObdLogger();
