import { Elm327CommandQueue } from "./elm327-command-queue";
import { ELM327_DEFAULT_TIMEOUT_MS } from "./elm327.constants";
import { parseElm327Response } from "./elm327-response-parser";
import { decodeDtcResponse, decodeMode01Pid } from "../pids/pid-decoder";
import { parseSupportedPidBitmap } from "../pids/pid-support-parser";
import type { DecodedPidValue, Elm327CommandOptions, Elm327Transport } from "../types/obd.types";

export class Elm327Client {
  private readonly queue: Elm327CommandQueue;

  constructor(private readonly transport: Elm327Transport) {
    this.queue = new Elm327CommandQueue(transport);
  }

  async sendCommand(command: string, options?: Elm327CommandOptions) {
    const result = await this.sendDetailed(command, options);
    return result.normalizedResponse ?? "";
  }

  sendDetailed(command: string, options?: Elm327CommandOptions) {
    return this.queue.send(command, options);
  }

  async readVoltage() {
    return this.sendCommand("ATRV", { timeoutMs: ELM327_DEFAULT_TIMEOUT_MS });
  }

  async detectVehicleProtocol() {
    return this.sendCommand("ATDP", { timeoutMs: ELM327_DEFAULT_TIMEOUT_MS });
  }

  async readSupportedPids(command = "0100", options?: { timeoutMs?: number }) {
    const normalized = command.replace(/\s+/g, "").toUpperCase();
    const response = await this.sendCommand(normalized, {
      timeoutMs: options?.timeoutMs ?? (normalized === "0100" ? 15_000 : 6_000),
    });
    const parsed = parseElm327Response(response, normalized);
    const mode = Number.parseInt(normalized.slice(0, 2), 16);
    const echo = (mode + 0x40).toString(16).toUpperCase();
    const expectedPid = normalized.slice(2);
    const matches = parsed.hexLines
      .map((line) => {
        const index = line.indexOf(`${echo}${expectedPid}`);
        return index >= 0 ? line.slice(index).match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [] : [];
      })
      .filter((bytes) => bytes.length >= 6);

    const supported = new Set<string>();
    for (const match of matches) {
      parseSupportedPidBitmap(normalized, match.slice(2, 6)).forEach((pid) => supported.add(pid));
    }
    return [...supported];
  }

  async readPid(pidCommand: string): Promise<DecodedPidValue> {
    const response = await this.sendCommand(pidCommand, { timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, dedupeKey: `pid:${pidCommand}` });
    return decodeMode01Pid(pidCommand, response);
  }

  async readTroubleCodes(mode: "03" | "07" | "0A" = "03") {
    const response = await this.sendCommand(mode, { timeoutMs: 7_000 });
    return decodeDtcResponse(response, mode);
  }

  async clearTroubleCodes() {
    return this.sendCommand("04", { timeoutMs: 8_000, retries: 0, priority: 10 });
  }

  cancelAll(reason?: string) {
    this.queue.cancelAll(reason);
  }

  dispose() {
    this.queue.dispose();
  }

  getQueueMetrics() {
    return this.queue.getMetrics();
  }
}
