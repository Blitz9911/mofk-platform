import { parseObdResponses } from "../elm327/obd-response-parser";

export type Mode06Test = {
  mid: string;
  tid: string;
  value: number | null;
  minimum: number | null;
  maximum: number | null;
  passed: boolean | null;
};

/** Parses ISO 15031-5 Mode 06 headers only. No undocumented MID/TID names. */
export function parseMode06Response(raw: string): Mode06Test[] {
  const tests: Mode06Test[] = [];
  for (const response of parseObdResponses(raw)) {
    if (response.service !== 0x46 || response.payload.length < 5) continue;
    const mid = response.payload[0]?.toString(16).toUpperCase().padStart(2, "0");
    const tid = response.payload[1]?.toString(16).toUpperCase().padStart(2, "0");
    const value = (response.payload[2] << 8) | response.payload[3];
    const minimum = (response.payload[4] << 8) | (response.payload[5] ?? 0);
    const maximum = response.payload.length >= 8 ? (response.payload[6] << 8) | response.payload[7] : null;
    tests.push({
      mid: mid ?? "00",
      tid: tid ?? "00",
      value,
      minimum,
      maximum,
      passed: maximum == null ? null : value >= minimum && value <= maximum,
    });
  }
  return tests;
}
