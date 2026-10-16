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
    const result = await this.queue.send(command, options);
    return result.normalizedResponse ?? "";
  }

  async readVoltage() {
    return this.sendCommand("ATRV", { timeoutMs: ELM327_DEFAULT_TIMEOUT_MS });
  }

  async detectVehicleProtocol() {
    return this.sendCommand("ATDP", { timeoutMs: ELM327_DEFAULT_TIMEOUT_MS });
  }

  async readSupportedPids(command: "0100" | "0120" | "0140" | "0160" = "0100") {
    const response = await this.sendCommand(command, { timeoutMs: 6_000 });
    const parsed = parseElm327Response(response, command);
    const expectedPid = command.slice(2);
    const match = parsed.hexLines
      .map((line) => {
        const index = line.indexOf(`41${expectedPid}`);
        return index >= 0 ? line.slice(index).match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [] : [];
      })
      .find((bytes) => bytes.length >= 6);

    return match ? parseSupportedPidBitmap(command, match.slice(2, 6)) : [];
  }

  async readPid(pidCommand: string): Promise<DecodedPidValue> {
    const response = await this.sendCommand(pidCommand, { timeoutMs: 5_000, dedupeKey: `pid:${pidCommand}` });
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
}
