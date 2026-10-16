import { extractModeResponseBytes, parseElm327Response } from "../elm327/elm327-response-parser";
import { parseObdResponses } from "../elm327/obd-response-parser";

function hexToAscii(bytes: number[]) {
  return bytes
    .map((value) => (value >= 32 && value <= 126 ? String.fromCharCode(value) : ""))
    .join("")
    .replace(/\u0000/g, "")
    .trim();
}

function cleanVin(value: string) {
  return value.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
}

function vinFromBytes(bytes: number[]) {
  if (bytes.length && bytes.every((value) => value === 0xff || value === 0x00)) return "";
  const direct = cleanVin(hexToAscii(bytes));
  const skipCount = cleanVin(hexToAscii(bytes.slice(1)));
  if (direct.length === 17) return direct;
  if (skipCount.length === 17) return skipCount;
  if (direct.length > 17) return direct.slice(0, 17);
  return skipCount.length >= direct.length ? skipCount : direct;
}

export function decodeMode09Vin(raw: string): { vin: string | null; availability: "ok" | "unavailable" | "malformed" } {
  const parsed = parseElm327Response(raw, "0902");
  if (parsed.hasNoData) return { vin: null, availability: "unavailable" };

  const candidates: string[] = [];
  const frames = extractModeResponseBytes(parsed, "49", "02");
  if (frames.length) {
    candidates.push(vinFromBytes(frames.flatMap((frame) => (frame[0] === 0x49 ? frame.slice(3) : frame.slice(2)))));
    candidates.push(vinFromBytes(frames.flatMap((frame) => frame.slice(frame[0] === 0x49 ? 2 : 1))));
  }

  for (const response of parseObdResponses(raw)) {
    if (response.service !== 0x49 || response.pid !== 0x02) continue;
    candidates.push(vinFromBytes([...response.payload]));
  }

  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
  const marker = hex.indexOf("4902");
  if (marker >= 0) {
    const rest = hex.slice(marker + 4).match(/../g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
    candidates.push(vinFromBytes(rest));
  }

  const vin = candidates.find((item) => item.length === 17) ?? null;
  if (vin) return { vin, availability: "ok" };
  if (!candidates.some(Boolean)) return { vin: null, availability: "unavailable" };
  return { vin: null, availability: "malformed" };
}

export function decodeMode09Text(raw: string, pid: string): string | null {
  const parsed = parseElm327Response(raw, pid);
  if (parsed.hasNoData) return null;
  const responsePid = pid.slice(2);
  const frames = extractModeResponseBytes(parsed, "49", responsePid);
  const payload = frames.flatMap((frame) => frame.slice(2));
  const fromFrames = hexToAscii(payload);
  if (fromFrames) return fromFrames;

  for (const response of parseObdResponses(raw)) {
    if (response.service !== 0x49 || response.pid !== Number.parseInt(responsePid, 16)) continue;
    const text = hexToAscii([...response.payload].slice(1)) || hexToAscii([...response.payload]);
    if (text) return text;
  }
  return null;
}
