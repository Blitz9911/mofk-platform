import { extractModeResponseBytes, parseElm327Response } from "../elm327/elm327-response-parser";
import type { DecodedPidValue } from "../types/obd.types";
import { STANDARD_MODE_01_PIDS } from "./standard-pids";

const definitions = new Map(STANDARD_MODE_01_PIDS.map((definition) => [definition.pid, definition]));

function unavailable(pid: string, raw: string, status: DecodedPidValue["status"], label = pid): DecodedPidValue {
  return { pid, label, value: null, unit: null, status, raw };
}

export function decodeMode01Pid(command: string, rawResponse: string): DecodedPidValue {
  const pid = command.toUpperCase();
  const definition = definitions.get(pid);
  if (!definition) return unavailable(pid, rawResponse, "unsupported");

  const parsed = parseElm327Response(rawResponse, pid);
  if (parsed.hasNoData) return unavailable(pid, rawResponse, "no_data", definition.label);

  const responsePid = pid.slice(2);
  const response = extractModeResponseBytes(parsed, "41", responsePid)[0];
  if (!response) return unavailable(pid, rawResponse, parsed.isMalformed ? "malformed" : "no_data", definition.label);

  const data = response.slice(2);
  if (data.length < definition.minBytes) return unavailable(pid, rawResponse, "missing_bytes", definition.label);

  const [a, b] = data;
  let value: number;
  switch (pid) {
    case "0104":
    case "0111":
    case "012F":
      value = (a * 100) / 255;
      break;
    case "0105":
    case "010F":
    case "0146":
      value = a - 40;
      break;
    case "0106":
    case "0107":
      value = (a * 100) / 128 - 100;
      break;
    case "010B":
    case "010D":
      value = a;
      break;
    case "010C":
      value = ((a * 256) + b) / 4;
      break;
    case "010E":
      value = a / 2 - 64;
      break;
    case "0110":
      value = ((a * 256) + b) / 100;
      break;
    case "0142":
      value = ((a * 256) + b) / 1000;
      break;
    case "015E":
      value = ((a * 256) + b) / 20;
      break;
    default:
      return unavailable(pid, rawResponse, "unsupported", definition.label);
  }

  return {
    pid,
    label: definition.label,
    value: Number(value.toFixed(2)),
    unit: definition.unit,
    status: "ok",
    raw: rawResponse,
  };
}

const dtcFamilies = ["P", "C", "B", "U"] as const;

export function decodeDtcResponse(rawResponse: string, mode: "03" | "07" | "0A"): string[] {
  const responseMode = mode === "03" ? "43" : mode === "07" ? "47" : "4A";
  const parsed = parseElm327Response(rawResponse, mode);
  const bytes = parsed.hexLines
    .flatMap((line) => {
      const index = line.indexOf(responseMode);
      return index >= 0 ? line.slice(index + 2).match(/.{1,2}/g) ?? [] : [];
    })
    .map((byte) => Number.parseInt(byte, 16))
    .filter((byte) => Number.isFinite(byte));

  const dtcs: string[] = [];
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const first = bytes[index];
    const second = bytes[index + 1];
    if (first === 0 && second === 0) continue;

    const family = dtcFamilies[(first & 0xc0) >> 6];
    const firstDigit = (first & 0x30) >> 4;
    const secondDigit = first & 0x0f;
    dtcs.push(`${family}${firstDigit}${secondDigit.toString(16).toUpperCase()}${second.toString(16).toUpperCase().padStart(2, "0")}`);
  }

  return Array.from(new Set(dtcs));
}
