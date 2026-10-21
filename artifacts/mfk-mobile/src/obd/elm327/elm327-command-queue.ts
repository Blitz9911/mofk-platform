import {
  ELM327_DEFAULT_RETRIES,
  ELM327_DEFAULT_TIMEOUT_MS,
  ELM327_INTER_COMMAND_DELAY_MS,
  ELM327_MAX_BUFFER_SIZE,
} from "./elm327.constants";
import { hasElm327Prompt, normalizeElm327Response } from "./elm327-response-parser";
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

  constructor(private readonly transport: Elm327Transport) {
    this.unsubscribe = transport.onChunk((chunk) => this.handleChunk(chunk));
  }

  send(commandText: string, options: Elm327CommandOptions = {}) {
    if (!this.transport.isReady()) {
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

    if (options.dedupeKey && this.queue.some((item) => item.dedupeKey === options.dedupeKey)) {
      return Promise.reject(new Error(`Duplicate queued command: ${options.dedupeKey}`));
    }

    return new Promise<Elm327Command>((resolve, reject) => {
      this.queue.push({ command, resolve, reject, dedupeKey: options.dedupeKey });
      this.queue.sort((a, b) => b.command.priority - a.command.priority || a.command.createdAt - b.command.createdAt);
      void this.pump();
    });
  }

  cancelAll(reason = "Command queue cancelled") {
    this.clearTimer();
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

  private async pump() {
    if (this.disposed || this.active || this.queue.length === 0) return;
    this.active = this.queue.shift() ?? null;
    if (!this.active) return;

    this.buffer = "";
    const { command } = this.active;
    command.status = "sent";
    command.sentAt = Date.now();

    try {
      obdLogger.log("debug", "command_sent", "إرسال أمر ELM327", { command: command.command });
      await this.transport.write(`${command.command}\r`);
      this.timeout = setTimeout(() => this.handleTimeout(), command.timeoutMs);
    } catch (error) {
      this.failActive(error instanceof Error ? error : new Error("Failed to write command"));
    }
  }

  private handleChunk(chunk: string) {
    if (!this.active) return;
    this.buffer += chunk;

    if (this.buffer.length > ELM327_MAX_BUFFER_SIZE) {
      this.failActive(new Error("ELM327 response buffer exceeded maximum size"));
      return;
    }

    if (!hasElm327Prompt(this.buffer)) return;

    const completed = this.active.command;
    completed.completedAt = Date.now();
    completed.rawResponse = this.buffer;
    completed.normalizedResponse = normalizeElm327Response(this.buffer, completed.command);
    completed.status = "completed";
    this.clearTimer();
    const active = this.active;
    this.active = null;
    this.buffer = "";
    obdLogger.log("debug", "command_response", "اكتمل رد ELM327", { command: completed.command });
    active.resolve(completed);
    setTimeout(() => void this.pump(), ELM327_INTER_COMMAND_DELAY_MS);
  }

  private handleTimeout() {
    if (!this.active) return;
    const active = this.active;
    if (active.command.retries > 0) {
      active.command.retries -= 1;
      active.command.status = "queued";
      this.active = null;
      this.buffer = "";
      this.queue.unshift(active);
      obdLogger.log("warn", "command_retry", "انتهت مهلة الأمر، إعادة محاولة", { command: active.command.command });
      void this.pump();
      return;
    }

    active.command.status = "timeout";
    this.failActive(new Error(`Command timeout: ${active.command.command}`));
  }

  private failActive(error: Error) {
    if (!this.active) return;
    this.clearTimer();
    const active = this.active;
    active.command.completedAt = Date.now();
    active.command.status = active.command.status === "timeout" ? "timeout" : "failed";
    active.command.error = error.message;
    this.active = null;
    this.buffer = "";
    active.reject(error);
    setTimeout(() => void this.pump(), ELM327_INTER_COMMAND_DELAY_MS);
  }

  private clearTimer() {
    if (!this.timeout) return;
    clearTimeout(this.timeout);
    this.timeout = null;
  }
}
