// Mode 01 PID requests and decoders for the gauges shown on the diagnostics
// screen, plus supported-PID bitmap discovery (§5.1, "follow the returned
// support bitmap; send 0120, 0140 ... only when the preceding bitmap
// indicates that another range exists").

export interface LiveTelemetry {
  rpm?: number;
  speedKmh?: number;
  coolantTemp?: number;
  engineLoad?: number;
  fuelLevelPct?: number;
  batteryV?: number;
}

interface PidDefinition {
  pid: string; // 2-hex-digit PID, e.g. "0C"
  minDataBytes: number;
  apply: (telemetry: LiveTelemetry, dataBytes: number[]) => void;
}

export const PID_DEFINITIONS: PidDefinition[] = [
  {
    pid: "0C",
    minDataBytes: 2,
    apply: (t, d) => {
      t.rpm = Math.round((d[0] * 256 + d[1]) / 4);
    },
  },
  {
    pid: "0D",
    minDataBytes: 1,
    apply: (t, d) => {
      t.speedKmh = d[0];
    },
  },
  {
    pid: "05",
    minDataBytes: 1,
    apply: (t, d) => {
      t.coolantTemp = d[0] - 40;
    },
  },
  {
    pid: "04",
    minDataBytes: 1,
    apply: (t, d) => {
      t.engineLoad = Math.round((d[0] * 100) / 255);
    },
  },
  {
    pid: "2F",
    minDataBytes: 1,
    apply: (t, d) => {
      t.fuelLevelPct = Math.round((d[0] * 100) / 255);
    },
  },
  {
    pid: "42",
    minDataBytes: 2,
    apply: (t, d) => {
      t.batteryV = Math.round(((d[0] * 256 + d[1]) / 1000) * 10) / 10;
    },
  },
];

/** Parses "41 0C 1A F8", "410C1AF8" or any mix into a flat byte array. */
export function parseHexBytes(payload: string): number[] {
  const compact = payload.replace(/[^0-9A-Fa-f]/g, "");
  const bytes: number[] = [];
  for (let i = 0; i + 1 < compact.length; i += 2) {
    bytes.push(parseInt(compact.slice(i, i + 2), 16));
  }
  return bytes;
}

export interface DecodedPidResponse {
  mode: number;
  pid: string;
  dataBytes: number[];
}

/** Decodes a Mode 01 positive response (headers off, per the polling phase). */
export function decodePidResponse(raw: string): DecodedPidResponse | null {
  const bytes = parseHexBytes(raw);
  if (bytes.length < 2) return null;
  const [mode, pid, ...data] = bytes;
  if (mode !== 0x41) return null;
  return { mode, pid: pid.toString(16).toUpperCase().padStart(2, "0"), dataBytes: data };
}

export function applyPidResponse(
  telemetry: LiveTelemetry,
  decoded: DecodedPidResponse,
): boolean {
  const def = PID_DEFINITIONS.find((d) => d.pid === decoded.pid);
  if (!def || decoded.dataBytes.length < def.minDataBytes) return false;
  def.apply(telemetry, decoded.dataBytes);
  return true;
}

/** Decodes a 0100/0120/0140 supported-PID bitmap response into PID hex strings. */
export function decodeSupportedPidsBitmap(
  raw: string,
  rangeStart: number,
): { supported: Set<string>; hasNextRange: boolean } {
  const bytes = parseHexBytes(raw);
  const supported = new Set<string>();
  // Expect mode(41) + request-pid(00/20/40) + 4 bitmap bytes.
  const bitmapBytes = bytes.slice(2, 6);
  let bitIndex = 0;
  for (const byte of bitmapBytes) {
    for (let b = 7; b >= 0; b--) {
      const pidNum = rangeStart + bitIndex + 1;
      if ((byte >> b) & 1) {
        supported.add(pidNum.toString(16).toUpperCase().padStart(2, "0"));
      }
      bitIndex++;
    }
  }
  const lastPidHex = (rangeStart + 0x20)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
  return { supported, hasNextRange: supported.has(lastPidHex) };
}

export function pidRequestCommand(pid: string): string {
  return `01${pid}`;
}
