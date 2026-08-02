import { ELM327_INITIALIZATION_SEQUENCE } from "./elm327.constants";
import { Elm327Client } from "./elm327-client";
import { parseElm327Response } from "./elm327-response-parser";
import type { Elm327InitializationResult } from "../types/obd.types";

const PID_SUPPORT_CHAIN = [
  { request: "0100", nextPid: "0120" },
  { request: "0120", nextPid: "0140" },
  { request: "0140", nextPid: "0160" },
  { request: "0160", nextPid: null },
] as const;

async function readSupportedPidChain(client: Elm327Client, warnings: string[]) {
  const supported = new Set<string>();

  for (const step of PID_SUPPORT_CHAIN) {
    try {
      const pids = await client.readSupportedPids(step.request);
      pids.forEach((pid) => supported.add(pid));
      if (!step.nextPid || !pids.includes(step.nextPid)) break;
    } catch (error) {
      warnings.push(`${step.request}: ${error instanceof Error ? error.message : "unknown error"}`);
      break;
    }
  }

  return [...supported];
}

export async function initializeElm327(client: Elm327Client): Promise<Elm327InitializationResult> {
  const rawResponses: Record<string, string> = {};
  const warnings: string[] = [];

  for (const step of ELM327_INITIALIZATION_SEQUENCE) {
    try {
      rawResponses[step.command] = await client.sendCommand(step.command, {
        timeoutMs: step.timeoutMs,
        retries: step.command === "ATZ" ? 0 : 1,
        priority: step.optional ? 0 : 2,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      if (!step.optional) throw new Error(`ELM327 initialization failed at ${step.command}: ${message}`);
      warnings.push(`${step.command}: ${message}`);
    }
  }

  const supportResponse = parseElm327Response(rawResponses["0100"] ?? "", "0100");
  const vehicleConnected = supportResponse.hexLines.some((line) => line.includes("4100"));
  const supportedPids = await readSupportedPidChain(client, warnings);

  return {
    adapterConnected: Boolean(rawResponses.ATZ),
    elmVersion: null,
    adapterVoltage: null,
    detectedProtocol: rawResponses.ATDP ?? null,
    vehicleConnected,
    supportedPids,
    warnings,
    rawResponses,
  };
}
