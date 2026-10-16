import { extractModeResponseBytes, parseElm327Response } from "../elm327/elm327-response-parser";
import { LIVE_PID_BY_COMMAND } from "./pid-registry";
import { STANDARD_MODE_01_PIDS } from "./standard-pids";
import type { DecodedPidValue } from "../types/obd.types";

const definitions = new Map(STANDARD_MODE_01_PIDS.map((definition) => [definition.pid, definition]));

const OBD_STANDARDS: Record<number, string> = {
  1: "OBD-II (CARB)",
  2: "OBD (EPA)",
  3: "OBD and OBD-II",
  4: "OBD-I",
  5: "Not OBD compliant",
  6: "EOBD",
  7: "EOBD and OBD-II",
  8: "EOBD and OBD",
  9: "EOBD, OBD and OBD-II",
  10: "JOBD",
  11: "JOBD and OBD-II",
  12: "JOBD and EOBD",
  13: "JOBD, EOBD and OBD-II",
};

const FUEL_TYPES: Record<number, string> = {
  0: "Not available",
  1: "Gasoline",
  2: "Methanol",
  3: "Ethanol",
  4: "Diesel",
  5: "LPG",
  6: "CNG",
  7: "Propane",
  8: "Electric",
  9: "Bifuel running Gasoline",
  10: "Bifuel running Methanol",
  11: "Bifuel running Ethanol",
  12: "Bifuel running LPG",
  13: "Bifuel running CNG",
  14: "Bifuel running Propane",
  15: "Bifuel running Electricity",
  16: "Bifuel running electric and combustion",
  17: "Hybrid gasoline",
  18: "Hybrid ethanol",
  19: "Hybrid diesel",
  20: "Hybrid electric",
  21: "Hybrid mixed",
  22: "Hybrid regenerative",
};

function unavailable(pid: string, raw: string, status: DecodedPidValue["status"], label = pid): DecodedPidValue {
  return { pid, label, value: null, unit: null, status, raw };
}

function roundValue(value: number) {
  return Number(value.toFixed(2));
}

function word(a: number, b = 0) {
  return a * 256 + b;
}

export function applyPidFormula(pid: string, data: number[]): { value: number | string; unit: string | null } | null {
  const live = LIVE_PID_BY_COMMAND.get(pid);
  const a = data[0] ?? 0;
  const b = data[1] ?? 0;
  const formula = live?.formula ?? (pid === "011C" ? { kind: "obdStandard" as const } : pid === "0151" ? { kind: "fuelType" as const } : null);
  if (!formula) return null;

  switch (formula.kind) {
    case "percent255":
      return { value: roundValue((a * 100) / 255), unit: live?.unit ?? "%" };
    case "tempC":
      return { value: a - 40, unit: live?.unit ?? "°م" };
    case "fuelTrim":
      return { value: roundValue((a * 100) / 128 - 100), unit: "%" };
    case "rawA":
      return { value: a, unit: live?.unit ?? null };
    case "rpm":
      return { value: roundValue(word(a, b) / 4), unit: "RPM" };
    case "timingAdvance":
      return { value: roundValue(a / 2 - 64), unit: "°" };
    case "maf":
      return { value: roundValue(word(a, b) / 100), unit: "g/s" };
    case "moduleVoltage":
      return { value: roundValue(word(a, b) / 1000), unit: "V" };
    case "fuelRate":
      return { value: roundValue(word(a, b) / 20), unit: "L/h" };
    case "fuelPressure":
      return { value: a * 3, unit: "kPa" };
    case "fuelRailRel":
      return { value: roundValue(word(a, b) * 0.079), unit: "kPa" };
    case "fuelRailAbs":
      return { value: word(a, b) * 10, unit: "kPa" };
    case "runtime":
      return { value: word(a, b), unit: "ث" };
    case "o2Voltage":
      return { value: roundValue(a / 200), unit: "V" };
    case "widebandO2":
      return { value: roundValue(word(a, b) / 32768), unit: "λ" };
    case "catalystTemp":
      return { value: roundValue(word(a, b) / 10 - 40), unit: "°م" };
    case "absLoad":
      return { value: roundValue((word(a, b) * 100) / 255), unit: "%" };
    case "lambda":
      return { value: roundValue(word(a, b) / 32768), unit: "λ" };
    case "injectionTiming":
      return { value: roundValue(word(a, b) / 128 - 210), unit: "°" };
    case "obdStandard":
      return { value: OBD_STANDARDS[a] ?? `Standard ${a}`, unit: null };
    case "fuelType":
      return { value: FUEL_TYPES[a] ?? `Fuel type ${a}`, unit: null };
    case "distanceKm":
      return { value: word(a, b), unit: live?.unit ?? "كم" };
    case "countA":
      return { value: a, unit: live?.unit ?? null };
    case "torquePct":
      return { value: a - 125, unit: "%" };
    case "refTorqueNm":
      return { value: word(a, b), unit: "N·m" };
    case "fuelSystem": {
      const flags: string[] = [];
      if (a & 0x01) flags.push("حلقة مفتوحة");
      if (a & 0x02) flags.push("حلقة مغلقة");
      if (a & 0x04) flags.push("مفتوحة للقيادة");
      if (a & 0x08) flags.push("مفتوحة لعطل");
      if (a & 0x10) flags.push("مغلقة مع عطل");
      return { value: flags.join(" · ") || `0x${a.toString(16).toUpperCase()}`, unit: null };
    }
    case "airStatus": {
      const labels: Record<number, string> = { 1: "متوقف", 2: "أعلى", 4: "أسفل", 8: "مضخة" };
      return { value: labels[a] ?? String(a), unit: null };
    }
    case "o2Present":
      return { value: `0x${a.toString(16).toUpperCase().padStart(2, "0")}`, unit: null };
    case "evapPressure":
      return { value: roundValue(word(a, b) / 4 - 8192), unit: live?.unit ?? "Pa" };
    case "minutes":
      return { value: word(a, b), unit: live?.unit ?? "د" };
    case "monitorMil":
      return { value: a & 0x80 ? "مضاءة" : "طافية", unit: null };
    case "monitorDriveCycle": {
      const enabled = (b & 0x07) + ((data[2] ?? 0) > 0 ? 1 : 0);
      const complete = ((data[3] ?? 0) >> 4) & 0x0f;
      return { value: enabled ? `مراقبات هذه الدورة (${complete} مكتمل)` : "لا مراقبات نشطة", unit: null };
    }
    case "auxIo": {
      const status = b;
      const parts: string[] = [];
      if ((a & 0x80) && (status & 0x80)) parts.push("مأخذ القدرة");
      if ((a & 0x10) && (status & 0x10)) parts.push("شمعة التوهج");
      if ((a & 0x08) && (status & 0x08)) parts.push("تعشيق موصى");
      return { value: parts.length ? parts.join(" · ") : "غير نشط", unit: null };
    }
    case "fuelRateGrams":
      return { value: roundValue(word(a, b) / 50), unit: "g/s" };
    case "fuelSystemUse": {
      const bankA = roundValue(((data[1] ?? 0) * 100) / 255);
      const bankB = data.length > 2 ? roundValue(((data[2] ?? 0) * 100) / 255) : null;
      return {
        value: bankB == null ? bankA : `A ${bankA}% · B ${bankB}%`,
        unit: bankB == null ? "%" : null,
      };
    }
    case "odometerKm":
      return { value: roundValue((a * 16777216 + b * 65536 + (data[2] ?? 0) * 256 + (data[3] ?? 0)) / 10), unit: "كم" };
    default:
      return null;
  }
}

export function decodeMode01Pid(command: string, rawResponse: string): DecodedPidValue {
  const pid = command.toUpperCase();
  const definition = definitions.get(pid);
  const parsed = parseElm327Response(rawResponse, pid);
  if (parsed.hasNoData) return unavailable(pid, rawResponse, "no_data", definition?.label ?? pid);
  if (parsed.classification === "negative_obd") return unavailable(pid, rawResponse, "unsupported", definition?.label ?? pid);

  const responsePid = pid.slice(2);
  const response = extractModeResponseBytes(parsed, "41", responsePid)[0];
  if (!response) return unavailable(pid, rawResponse, parsed.isMalformed ? "malformed" : "no_data", definition?.label ?? pid);

  const data = response.slice(2);
  if (definition && data.length < definition.minBytes) return unavailable(pid, rawResponse, "missing_bytes", definition.label);

  const decoded = applyPidFormula(pid, data);
  if (decoded) {
    return {
      pid,
      label: definition?.label ?? pid,
      value: decoded.value,
      unit: decoded.unit,
      status: "ok",
      raw: rawResponse,
    };
  }

  if (!data.length) return unavailable(pid, rawResponse, "missing_bytes", definition?.label ?? pid);
  const generic =
    data.length === 1
      ? data[0]
      : data.length === 2
        ? word(data[0], data[1])
        : data.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  return {
    pid,
    label: definition?.label ?? pid,
    value: generic,
    unit: definition?.unit ?? null,
    status: "ok",
    raw: rawResponse,
  };
}

const dtcFamilies = ["P", "C", "B", "U"] as const;

export function decodeDtcPair(first: number, second: number): string | null {
  if (first === 0 && second === 0) return null;
  const family = dtcFamilies[(first & 0xc0) >> 6];
  const firstDigit = (first & 0x30) >> 4;
  const secondDigit = first & 0x0f;
  return `${family}${firstDigit}${secondDigit.toString(16).toUpperCase()}${second.toString(16).toUpperCase().padStart(2, "0")}`;
}

export function decodeDtcResponse(rawResponse: string, mode: "03" | "07" | "0A"): string[] {
  const responseMode = mode === "03" ? "43" : mode === "07" ? "47" : "4A";
  const parsed = parseElm327Response(rawResponse, mode);
  let bytes = parsed.hexLines
    .flatMap((line) => {
      const index = line.indexOf(responseMode);
      return index >= 0 ? line.slice(index + 2).match(/.{1,2}/g) ?? [] : [];
    })
    .map((byte) => Number.parseInt(byte, 16))
    .filter((byte) => Number.isFinite(byte));

  if (bytes.length >= 3 && bytes[0] <= 16 && (bytes.length - 1) % 2 === 0 && bytes[0] === (bytes.length - 1) / 2) {
    bytes = bytes.slice(1);
  }

  const dtcs: string[] = [];
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = decodeDtcPair(bytes[index], bytes[index + 1]);
    if (code) dtcs.push(code);
  }

  return Array.from(new Set(dtcs));
}

export function decodeUdsDtcResponse(rawResponse: string): string[] {
  const parsed = parseElm327Response(rawResponse, "1902AF");
  const dtcs: string[] = [];
  for (const line of parsed.hexLines) {
    const index = line.indexOf("5902");
    if (index < 0) continue;
    let bytes = (line.slice(index + 4).match(/.{1,2}/g) ?? [])
      .map((byte) => Number.parseInt(byte, 16))
      .filter((byte) => Number.isFinite(byte));
    if (!bytes.length) continue;
    if (bytes[0] === 0xaf || bytes[0] === 0x02 || bytes[0] <= 16) {
      const rest = bytes.slice(1);
      if (rest.length && (rest.length % 4 === 0 || rest.length % 3 === 0)) bytes = rest;
    }
    const stride = bytes.length % 4 === 0 ? 4 : 3;
    for (let offset = 0; offset + 1 < bytes.length; offset += stride) {
      const code = decodeDtcPair(bytes[offset], bytes[offset + 1]);
      if (code) dtcs.push(code);
    }
  }
  return Array.from(new Set(dtcs));
}

export function bytesToAscii(bytes: number[]) {
  return bytes
    .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ""))
    .join("")
    .trim();
}

export { OBD_STANDARDS, FUEL_TYPES };
