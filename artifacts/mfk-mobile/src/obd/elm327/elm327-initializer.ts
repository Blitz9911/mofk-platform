import { ELM327_INITIALIZATION_SEQUENCE } from "./elm327.constants";
import { Elm327Client } from "./elm327-client";
import { parseElm327Response } from "./elm327-response-parser";
import type { Elm327InitializationResult } from "../types/obd.types";

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
  const supportedPids = await client.readSupportedPids("0100").catch(() => []);

  return {
    adapterConnected: Boolean(rawResponses.ATI || rawResponses.ATZ),
    elmVersion: rawResponses.ATI ?? null,
    adapterVoltage: rawResponses.ATRV ?? null,
    detectedProtocol: rawResponses.ATDP ?? null,
    vehicleConnected,
    supportedPids,
    warnings,
    rawResponses,
  };
}
