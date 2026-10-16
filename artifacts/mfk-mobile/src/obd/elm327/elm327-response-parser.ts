import { ELM327_STATUS_MESSAGES } from "./elm327.constants";
import { parseObdResponses } from "./obd-response-parser";
import type { Elm327ResponseClass } from "../types/obd.types";

export type ParsedElm327Response = {
  raw: string;
  normalized: string;
  lines: string[];
  hexLines: string[];
  statusMessages: string[];
  classification: Elm327ResponseClass;
  hasNoData: boolean;
  isMalformed: boolean;
};

export function hasElm327Prompt(buffer: string): boolean {
  return buffer.includes(">");
}

export function takeCompletedElm327Frame(buffer: string) {
  const promptIndex = buffer.indexOf(">");
  if (promptIndex < 0) {
    return { complete: null, remainder: buffer };
  }

  return {
    complete: buffer.slice(0, promptIndex + 1),
    remainder: buffer.slice(promptIndex + 1),
  };
}

export function normalizeElm327Response(raw: string, command?: string): string {
  const commandUpper = command?.replace(/\s+/g, "").toUpperCase();
  const normalizedLines = raw
    .replace(/\0/g, "")
    .replace(/>/g, "")
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (!commandUpper) return true;
      return line.replace(/\s+/g, "").toUpperCase() !== commandUpper;
    })
    .map((line) => line.replace(/\s+/g, " "))
    .join("\n");

  return normalizedLines.trim();
}

export function classifyElm327Response(raw: string, command?: string): Elm327ResponseClass {
  const upper = raw.toUpperCase();
  if (upper.includes("UNABLE TO CONNECT")) return "unable_to_connect";
  if (/BUS INIT.*ERROR/.test(upper)) return "bus_init_error";
  if (upper.includes("BUFFER FULL")) return "buffer_full";
  if (upper.includes("CAN ERROR")) return "can_error";
  if (upper.includes("BUS ERROR")) return "bus_error";
  if (upper.includes("STOPPED")) return "stopped";
  if (upper.includes("NO DATA")) return "no_data";
  if (upper.includes("DATA ERROR") || upper.includes("RX ERROR")) return "bus_error";
  if (/\?/.test(upper.replace(/SEARCHING\.\.\./g, ""))) return "question";

  const frames = parseObdResponses(normalizeElm327Response(raw, command));
  if (frames.some(frame => frame.service === 0x7f)) return "negative_obd";
  if (frames.some(frame => [0x41, 0x42, 0x43, 0x44, 0x46, 0x47, 0x49, 0x4a].includes(frame.service))) return "positive_obd";
  if (upper.includes("OK")) return "ok";
  if (command?.startsWith("AT") && normalizeElm327Response(raw, command)) return "identity";
  return "unknown";
}

export function parseElm327Response(raw: string, command?: string): ParsedElm327Response {
  const normalized = normalizeElm327Response(raw, command);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const upperLines = lines.map((line) => line.toUpperCase());
  const statusMessages = ELM327_STATUS_MESSAGES.filter((message) =>
    upperLines.some((line) => line.includes(message)),
  );
  const hexLines = lines
    .map((line) => line.replace(/SEARCHING\.\.\./gi, "").replace(/\s+/g, "").toUpperCase())
    .filter((line) => /^[0-9A-F]+$/.test(line));
  const classification = classifyElm327Response(raw, command);

  return {
    raw,
    normalized,
    lines,
    hexLines,
    statusMessages,
    classification,
    hasNoData: classification === "no_data" || statusMessages.includes("NO DATA"),
    isMalformed: lines.length > 0 && hexLines.length === 0 && statusMessages.length === 0 && classification === "unknown",
  };
}

export function extractModeResponseBytes(parsed: ParsedElm327Response, expectedMode: string, expectedPid?: string): number[][] {
  return parseObdResponses(parsed.normalized)
    .filter(frame => frame.service === parseInt(expectedMode, 16) && (expectedPid == null || frame.pid === parseInt(expectedPid, 16)))
    .map(frame => frame.bytes);
}
