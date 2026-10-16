import type { SignalReading } from "../signals/signal-registry";

export type ObdRecordedFrame = {
  timestamp: number;
  values: Record<string, number | string | boolean | null>;
};

export class LiveDataRecorder {
  private ring: ObdRecordedFrame[] = [];
  private session: ObdRecordedFrame[] = [];
  recording = false;
  private readonly ringSize = 240;

  capture(signals: Record<string, SignalReading>, now = Date.now()) {
    const values: ObdRecordedFrame["values"] = {};
    for (const reading of Object.values(signals)) {
      if (reading.status === "available" && reading.value != null) {
        values[reading.definitionId ?? reading.id] = reading.value;
      }
    }
    const frame = { timestamp: now, values };
    this.ring.push(frame);
    if (this.ring.length > this.ringSize) this.ring.shift();
    if (this.recording) this.session.push(frame);
    return frame;
  }

  start() {
    this.recording = true;
    this.session = [];
  }

  stop() {
    this.recording = false;
    return this.session.slice();
  }

  sparkline(signalId: string, limit = 60) {
    return this.ring.slice(-limit).map((frame) => {
      const value = frame.values[signalId];
      return typeof value === "number" ? value : null;
    });
  }

  getRing() {
    return this.ring.slice();
  }

  getSession() {
    return this.session.slice();
  }

  reset() {
    this.ring = [];
    this.session = [];
    this.recording = false;
  }
}
