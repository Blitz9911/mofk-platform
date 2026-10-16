import {
  ELM327_DEFAULT_RETRIES,
  ELM327_DEFAULT_TIMEOUT_MS,
  ELM327_MAX_BUFFER_SIZE,
  ELM327_PROMPT_GUARD_MS,
} from "./elm327.constants";
import { hasElm327Prompt, normalizeElm327Response, takeCompletedElm327Frame } from "./elm327-response-parser";
import { obdLogger } from "../services/obd-logger";
import type { Elm327Command, Elm327CommandOptions, Elm327Transport } from "../types/obd.types";

type PendingCommand = {
  command: Elm327Command;
  resolve: (command: Elm327Command) => void;
  reject: (error: Error) => void;
  dedupeKey?: string;
};

export class Elm327CommandQueue {
  private queue: PendingCommand[] = [];
  private active: PendingCommand | null = null;
  private buffer = "";
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private disposed = false;
  private generation = 0;
  private activeGeneration = 0;
  private faulted = false;
  private guardUntil = 0;

  constructor(private readonly transport: Elm327Transport) {
    this.unsubscribe = transport.onChunk((chunk) => this.handleChunk(chunk));
  }

  send(commandText: string, options: Elm327CommandOptions = {}) {
    if (this.disposed || this.faulted || !this.transport.isReady()) {
      return Promise.reject(new Error("ELM327 transport is not ready"));
    }

    const command: Elm327Command = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      command: commandText.trim().toUpperCase(),
      timeoutMs: options.timeoutMs ?? ELM327_DEFAULT_TIMEOUT_MS,
      retries: options.retries ?? ELM327_DEFAULT_RETRIES,
      priority: options.priority ?? 0,
      createdAt: Date.now(),
      status: "queued",
    };

    if (options.dedupeKey && (this.active?.dedupeKey === options.dedupeKey || this.queue.some((item) => item.dedupeKey === options.dedupeKey))) {
      return Promise.reject(new Error(`Duplicate queued command: ${options.dedupeKey}`));
    }

    return new Promise<Elm327Command>((resolve, reject) => {
      this.queue.push({ command, resolve, reject, dedupeKey: options.dedupeKey });
      this.queue.sort((a, b) => b.command.priority - a.command.priority || a.command.createdAt - b.command.createdAt);
      void this.pump();
    });
  }

  cancelAll(reason = "Command queue cancelled") {
    // Cancellation of an in-flight untagged ELM stream requires a new session.
    if (this.active) this.faulted = true;
    this.clearTimer();
    this.generation += 1;
    if (this.active) {
      this.active.command.status = "cancelled";
      this.active.command.error = reason;
      this.active.reject(new Error(reason));
    }
    this.active = null;
    this.queue.splice(0).forEach((item) => {
      item.command.status = "cancelled";
      item.command.error = reason;
      item.reject(new Error(reason));
    });
    this.buffer = "";
  }

  dispose() {
    this.disposed = true;
    this.cancelAll("Command queue disposed");
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getMetrics() {
    return {
      queueDepth: this.queue.length + (this.active ? 1 : 0),
      active: Boolean(this.active),
    };
  }

  private async pump() {
    if (this.disposed || this.faulted || this.active || this.queue.length === 0) return;
    if (Date.now() < this.guardUntil) return;
    this.active = this.queue.shift() ?? null;
    if (!this.active) return;

    this.buffer = "";
    this.activeGeneration = this.generation;
    const { command } = this.active;
    command.status = "sent";
    command.sentAt = Date.now();

    try {
      obdLogger.log("debug", "command_sent", "إرسال أمر ELM327", {
        command: command.command,
        sentAt: command.sentAt,
      });
      this.timeout = setTimeout(() => this.handleTimeout(), command.timeoutMs);
      await this.transport.write(`${command.command}\r`);
    } catch (error) {
      if (this.active?.command.id === command.id) this.failActive(error instanceof Error ? error : new Error("Failed to write command"));
    }
  }

  private handleChunk(chunk: string) {
    if (!this.active || this.activeGeneration !== this.generation) {
      if (chunk.replace(/\s+/g, "")) {
        obdLogger.log("warn", "orphan_fragment", "جزء BLE بدون معاملة نشطة", {
          bytes: chunk.length,
          preview: chunk.slice(0, 48),
        });
      }
      return;
    }

    this.buffer += chunk;
    if (this.buffer.length > ELM327_MAX_BUFFER_SIZE) {
      this.failActive(new Error("BUFFER FULL"));
      return;
    }

    if (!hasElm327Prompt(this.buffer)) return;

    const { complete, remainder } = takeCompletedElm327Frame(this.buffer);
    if (!complete) return;

    const completed = this.active.command;
    completed.completedAt = Date.now();
    completed.rawResponse = complete;
    completed.normalizedResponse = normalizeElm327Response(complete, completed.command);
    completed.status = "completed";
    this.clearTimer();
    const active = this.active;
    this.active = null;
    this.buffer = "";

    if (remainder.replace(/\s+/g, "")) {
      obdLogger.log("warn", "quarantined_remainder", "تم عزل باقي الرد بعد محرف الإكمال", {
        bytes: remainder.length,
        preview: remainder.slice(0, 48),
      });
    }

    obdLogger.log("debug", "command_response", "اكتمل رد ELM327", {
      command: completed.command,
      completedAt: completed.completedAt,
      durationMs: completed.sentAt ? completed.completedAt - completed.sentAt : null,
      rawResponse: completed.rawResponse,
      normalizedResponse: completed.normalizedResponse,
    });
    this.guardUntil = Date.now() + ELM327_PROMPT_GUARD_MS;
    active.resolve(completed);
    setTimeout(() => void this.pump(), ELM327_PROMPT_GUARD_MS);
  }

  private handleTimeout() {
    if (!this.active) return;
    this.generation += 1;
    const active = this.active;
    const partial = this.buffer;
    this.buffer = "";

    // There is no request ID on the wire: a blind retry can consume a late reply.
    // Recovery rebuilds BLE, subscriptions and ELM before trying another command.
    active.command.status = "timeout";
    this.failActive(new Error(`Command timeout: ${active.command.command}`));
  }

  private failActive(error: Error) {
    if (!this.active) return;
    this.clearTimer();
    this.generation += 1;
    const active = this.active;
    active.command.completedAt = Date.now();
    active.command.status = active.command.status === "timeout" ? "timeout" : "failed";
    active.command.error = error.message;
    this.faulted = true;
    this.active = null;
    this.buffer = "";
    active.reject(error);
    this.queue.splice(0).forEach(item => item.reject(new Error(`Session requires reconnect: ${error.message}`)));
  }

  private clearTimer() {
    if (!this.timeout) return;
    clearTimeout(this.timeout);
    this.timeout = null;
  }
}
