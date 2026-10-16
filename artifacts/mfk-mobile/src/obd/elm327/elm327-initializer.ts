import { discoverSupportedMode01Pids } from "../protocol/j1979-capability-discovery";
import { ELM327_INITIALIZATION_SEQUENCE, ELM327_PROTOCOL_FALLBACK, ELM327_PROTOCOL_SEARCH_TIMEOUT_MS } from "./elm327.constants";
import { Elm327Client } from "./elm327-client";
import { classifyElm327Response, parseElm327Response } from "./elm327-response-parser";
import type { Elm327InitializationResult, Elm327ResponseClass } from "../types/obd.types";

export type Elm327InitProgress = "adapter" | "vehicle_searching" | "protocol";

async function readSupportedPidChain(client: Elm327Client, warnings: string[], firstPageRaw?: string) {
  try {
    return await discoverSupportedMode01Pids(
      (command, timeoutMs) => client.sendCommand(command, { timeoutMs, retries: 0, priority: 2 }),
      firstPageRaw,
    );
  } catch (error) {
    warnings.push(`pid-discovery: ${error instanceof Error ? error.message : "unknown error"}`);
    return { pids: [] as string[], ecuIds: [] as string[], pagesRead: ["0100"] };
  }
}

function isVehicleReady(classification: Elm327ResponseClass, supportResponse: ReturnType<typeof parseElm327Response>) {
  if (classification === "unable_to_connect" || classification === "bus_init_error" || classification === "can_error" || classification === "bus_error") {
    return false;
  }
  return supportResponse.hexLines.some((line) => line.includes("4100"));
}

export async function initializeElm327(
  client: Elm327Client,
  onProgress?: (phase: Elm327InitProgress, command: string) => void,
): Promise<Elm327InitializationResult> {
  const rawResponses: Record<string, string> = {};
  const warnings: string[] = [];

  for (const step of ELM327_INITIALIZATION_SEQUENCE) {
    if (step.command === "0100") onProgress?.("vehicle_searching", step.command);
    else if (step.command === "ATDP" || step.command === "ATDPN") onProgress?.("protocol", step.command);
    else onProgress?.("adapter", step.command);

    try {
      rawResponses[step.command] = await client.sendCommand(step.command, {
        timeoutMs: step.timeoutMs,
        retries: step.command === "ATZ" || step.command === "0100" ? 0 : 1,
        priority: step.optional ? 0 : 2,
      });
      if (step.optional && classifyElm327Response(rawResponses[step.command], step.command) === "question") {
        warnings.push(`${step.command}:unsupported`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      if (!step.optional) throw new Error(`ELM327 initialization failed at ${step.command}: ${message}`);
      warnings.push(`${step.command}: ${message}`);
    }
  }

  const pid100Raw = rawResponses["0100"] ?? "";
  let supportResponse = parseElm327Response(pid100Raw, "0100");
  let vehicleResponseClass = classifyElm327Response(pid100Raw, "0100");
  let vehicleConnected = isVehicleReady(vehicleResponseClass, supportResponse);

  if (!vehicleConnected) {
    for (const protocolCommand of ELM327_PROTOCOL_FALLBACK) {
      try {
        rawResponses[protocolCommand] = await client.sendCommand(protocolCommand, { timeoutMs: 2_000, retries: 0, priority: 2 });
        const retryRaw = await client.sendCommand("0100", { timeoutMs: ELM327_PROTOCOL_SEARCH_TIMEOUT_MS, retries: 0, priority: 2 });
        rawResponses["0100"] = retryRaw;
        supportResponse = parseElm327Response(retryRaw, "0100");
        vehicleResponseClass = classifyElm327Response(retryRaw, "0100");
        vehicleConnected = isVehicleReady(vehicleResponseClass, supportResponse);
        if (vehicleConnected) {
          warnings.push(`protocol_fallback:${protocolCommand}`);
          try {
            rawResponses.ATDP = await client.sendCommand("ATDP", { timeoutMs: 3_000, retries: 0 });
            rawResponses.ATDPN = await client.sendCommand("ATDPN", { timeoutMs: 3_000, retries: 0 });
          } catch {
            /* protocol labels remain optional */
          }
          break;
        }
      } catch (error) {
        warnings.push(`${protocolCommand}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  }

  const discovery = vehicleConnected
    ? await readSupportedPidChain(client, warnings, rawResponses["0100"])
    : { pids: [] as string[], ecuIds: [] as string[], pagesRead: [] as string[] };

  return {
    adapterConnected: Boolean(rawResponses.ATZ || rawResponses.ATI),
    elmVersion: rawResponses.ATI ?? rawResponses.ATZ ?? null,
    adapterDevice: rawResponses["AT@1"] ?? null,
    adapterVoltage: rawResponses.ATRV ?? null,
    detectedProtocol: rawResponses.ATDP ?? null,
    protocolNumber: rawResponses.ATDPN ?? null,
    vehicleConnected,
    vehicleResponseClass,
    supportedPids: discovery.pids,
    detectedEcus: discovery.ecuIds,
    pagesRead: discovery.pagesRead,
    warnings,
    rawResponses,
  };
}
