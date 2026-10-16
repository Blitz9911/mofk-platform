import type { LiveReading } from "../types/diagnostics.types";
import { isMode01SupportQuery } from "./pid-support-parser";

export type PidFormulaKind =
  | "percent255"
  | "tempC"
  | "fuelTrim"
  | "rawA"
  | "rpm"
  | "timingAdvance"
  | "maf"
  | "moduleVoltage"
  | "fuelRate"
  | "fuelPressure"
  | "fuelRailRel"
  | "fuelRailAbs"
  | "runtime"
  | "o2Voltage"
  | "widebandO2"
  | "catalystTemp"
  | "absLoad"
  | "lambda"
  | "injectionTiming"
  | "obdStandard"
  | "fuelType"
  | "distanceKm"
  | "countA"
  | "torquePct"
  | "refTorqueNm"
  | "fuelSystem"
  | "airStatus"
  | "o2Present"
  | "evapPressure"
  | "minutes"
  | "monitorMil"
  | "monitorDriveCycle"
  | "auxIo"
  | "fuelRateGrams"
  | "fuelSystemUse"
  | "odometerKm";

export type StandardPidDefinition = {
  pid: string;
  command: string;
  label: string;
  unit: string | null;
  minBytes: number;
};

export type LivePidDefinition = StandardPidDefinition & {
  englishLabel: string;
  category: string;
  tier: "fast" | "medium" | "slow";
  formula: { kind: PidFormulaKind };
};

export const LIVE_CATEGORY_LABELS: Record<string, string> = {
  engine: "المحرك",
  speed: "الحركة",
  temperature: "الحرارة",
  fuel: "الوقود",
  voltage: "الكهرباء",
  oxygen: "الأكسجين",
  other: "أخرى",
};

export const LIVE_PID_REGISTRY: LivePidDefinition[] = [
  { pid: "0101", command: "0101", label: "لمبة العطل MIL", englishLabel: "MIL Status", unit: null, minBytes: 1, category: "engine", tier: "slow", formula: { kind: "monitorMil" } },
  { pid: "0103", command: "0103", label: "حالة نظام الوقود", englishLabel: "Fuel System Status", unit: null, minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelSystem" } },
  { pid: "0104", command: "0104", label: "حمل المحرك", englishLabel: "Engine Load", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "0105", command: "0105", label: "حرارة سائل التبريد", englishLabel: "Coolant Temp", unit: "°م", minBytes: 1, category: "temperature", tier: "slow", formula: { kind: "tempC" } },
  { pid: "0106", command: "0106", label: "تصحيح الوقود قصير المدى 1", englishLabel: "STFT Bank 1", unit: "%", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelTrim" } },
  { pid: "0107", command: "0107", label: "تصحيح الوقود طويل المدى 1", englishLabel: "LTFT Bank 1", unit: "%", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelTrim" } },
  { pid: "0108", command: "0108", label: "تصحيح الوقود قصير المدى 2", englishLabel: "STFT Bank 2", unit: "%", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelTrim" } },
  { pid: "0109", command: "0109", label: "تصحيح الوقود طويل المدى 2", englishLabel: "LTFT Bank 2", unit: "%", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelTrim" } },
  { pid: "010A", command: "010A", label: "ضغط الوقود", englishLabel: "Fuel Pressure", unit: "kPa", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelPressure" } },
  { pid: "010B", command: "010B", label: "ضغط مجمع السحب", englishLabel: "MAP", unit: "kPa", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "rawA" } },
  { pid: "010C", command: "010C", label: "دورات المحرك", englishLabel: "Engine RPM", unit: "RPM", minBytes: 2, category: "engine", tier: "fast", formula: { kind: "rpm" } },
  { pid: "010D", command: "010D", label: "السرعة", englishLabel: "Speed", unit: "كم/س", minBytes: 1, category: "speed", tier: "fast", formula: { kind: "rawA" } },
  { pid: "010E", command: "010E", label: "تقديم التوقيت", englishLabel: "Timing Advance", unit: "°", minBytes: 1, category: "engine", tier: "slow", formula: { kind: "timingAdvance" } },
  { pid: "010F", command: "010F", label: "حرارة هواء السحب", englishLabel: "Intake Temp", unit: "°م", minBytes: 1, category: "temperature", tier: "slow", formula: { kind: "tempC" } },
  { pid: "0110", command: "0110", label: "كتلة تدفق الهواء", englishLabel: "MAF", unit: "g/s", minBytes: 2, category: "engine", tier: "medium", formula: { kind: "maf" } },
  { pid: "0111", command: "0111", label: "موضع الخانق", englishLabel: "Throttle", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "0112", command: "0112", label: "الهواء الثانوي", englishLabel: "Commanded Secondary Air", unit: null, minBytes: 1, category: "engine", tier: "slow", formula: { kind: "airStatus" } },
  { pid: "0113", command: "0113", label: "حساسات الأكسجين", englishLabel: "O2 Sensors Present", unit: null, minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Present" } },
  { pid: "0114", command: "0114", label: "أكسجين 1", englishLabel: "O2 Bank1 Sensor1", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "0115", command: "0115", label: "أكسجين 2", englishLabel: "O2 Bank1 Sensor2", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "0116", command: "0116", label: "أكسجين 3", englishLabel: "O2 Bank1 Sensor3", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "0117", command: "0117", label: "أكسجين 4", englishLabel: "O2 Bank1 Sensor4", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "0118", command: "0118", label: "أكسجين 5", englishLabel: "O2 Bank2 Sensor1", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "0119", command: "0119", label: "أكسجين 6", englishLabel: "O2 Bank2 Sensor2", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "011A", command: "011A", label: "أكسجين 7", englishLabel: "O2 Bank2 Sensor3", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "011B", command: "011B", label: "أكسجين 8", englishLabel: "O2 Bank2 Sensor4", unit: "V", minBytes: 1, category: "oxygen", tier: "slow", formula: { kind: "o2Voltage" } },
  { pid: "011C", command: "011C", label: "معيار OBD", englishLabel: "OBD Standard", unit: null, minBytes: 1, category: "other", tier: "slow", formula: { kind: "obdStandard" } },
  { pid: "011F", command: "011F", label: "زمن التشغيل", englishLabel: "Run Time", unit: "ث", minBytes: 2, category: "engine", tier: "slow", formula: { kind: "runtime" } },
  { pid: "0121", command: "0121", label: "المسافة بعد مسح الأعطال", englishLabel: "Distance Since DTC Clear", unit: "كم", minBytes: 2, category: "engine", tier: "slow", formula: { kind: "distanceKm" } },
  { pid: "0122", command: "0122", label: "ضغط السكة النسبي", englishLabel: "Fuel Rail Rel Pressure", unit: "kPa", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "fuelRailRel" } },
  { pid: "0123", command: "0123", label: "ضغط السكة", englishLabel: "Fuel Rail Gauge", unit: "kPa", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "fuelRailAbs" } },
  { pid: "0124", command: "0124", label: "لامدا بنك 1 حساس 1", englishLabel: "O2 Lambda B1S1", unit: "λ", minBytes: 2, category: "oxygen", tier: "slow", formula: { kind: "lambda" } },
  { pid: "0128", command: "0128", label: "لامدا بنك 2 حساس 1", englishLabel: "O2 Lambda B2S1", unit: "λ", minBytes: 2, category: "oxygen", tier: "slow", formula: { kind: "lambda" } },
  { pid: "012F", command: "012F", label: "مستوى الوقود", englishLabel: "Fuel Level", unit: "%", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "percent255" } },
  { pid: "0130", command: "0130", label: "دورات الإحماء بعد المسح", englishLabel: "Warm-ups Since Clear", unit: null, minBytes: 1, category: "engine", tier: "slow", formula: { kind: "countA" } },
  { pid: "0131", command: "0131", label: "المسافة مع MIL", englishLabel: "Distance With MIL", unit: "كم", minBytes: 2, category: "engine", tier: "slow", formula: { kind: "distanceKm" } },
  { pid: "0132", command: "0132", label: "ضغط بخار التبخير", englishLabel: "Evap Vapor Pressure", unit: "Pa", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "evapPressure" } },
  { pid: "0133", command: "0133", label: "الضغط الجوي", englishLabel: "Barometric Pressure", unit: "kPa", minBytes: 1, category: "engine", tier: "slow", formula: { kind: "rawA" } },
  { pid: "0134", command: "0134", label: "نسبة لامدا", englishLabel: "O2 Lambda", unit: "λ", minBytes: 2, category: "oxygen", tier: "slow", formula: { kind: "lambda" } },
  { pid: "0138", command: "0138", label: "لامدا تيار بنك 2 حساس 1", englishLabel: "O2 Lambda Current B2S1", unit: "λ", minBytes: 2, category: "oxygen", tier: "slow", formula: { kind: "lambda" } },
  { pid: "0141", command: "0141", label: "جاهزية هذه الدورة", englishLabel: "Monitor Status This Drive Cycle", unit: null, minBytes: 4, category: "engine", tier: "slow", formula: { kind: "monitorDriveCycle" } },
  { pid: "0142", command: "0142", label: "فولتية وحدة التحكم", englishLabel: "Control Module Voltage", unit: "V", minBytes: 2, category: "voltage", tier: "slow", formula: { kind: "moduleVoltage" } },
  { pid: "0143", command: "0143", label: "الحمل المطلق", englishLabel: "Absolute Load", unit: "%", minBytes: 2, category: "engine", tier: "slow", formula: { kind: "absLoad" } },
  { pid: "0144", command: "0144", label: "لامدا المطلوبة", englishLabel: "Commanded Equivalence", unit: "λ", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "lambda" } },
  { pid: "0145", command: "0145", label: "الخانق النسبي", englishLabel: "Relative Throttle", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "0146", command: "0146", label: "حرارة الهواء الخارجي", englishLabel: "Ambient Air Temp", unit: "°م", minBytes: 1, category: "temperature", tier: "slow", formula: { kind: "tempC" } },
  { pid: "0147", command: "0147", label: "دواسة التسارع D", englishLabel: "Accelerator D", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "0148", command: "0148", label: "دواسة التسارع E", englishLabel: "Accelerator E", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "0149", command: "0149", label: "دواسة التسارع F", englishLabel: "Accelerator F", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "014A", command: "014A", label: "الخانق المطلوب", englishLabel: "Commanded Throttle", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "014C", command: "014C", label: "مشغل الخانق", englishLabel: "Throttle Actuator", unit: "%", minBytes: 1, category: "engine", tier: "medium", formula: { kind: "percent255" } },
  { pid: "014D", command: "014D", label: "وقت تشغيل MIL", englishLabel: "Time With MIL", unit: "د", minBytes: 2, category: "engine", tier: "slow", formula: { kind: "minutes" } },
  { pid: "014E", command: "014E", label: "الوقت بعد مسح الأعطال", englishLabel: "Time Since Codes Cleared", unit: "د", minBytes: 2, category: "engine", tier: "slow", formula: { kind: "minutes" } },
  { pid: "0151", command: "0151", label: "نوع الوقود", englishLabel: "Fuel Type", unit: null, minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "fuelType" } },
  { pid: "0152", command: "0152", label: "نسبة الإيثانول", englishLabel: "Ethanol Fuel", unit: "%", minBytes: 1, category: "fuel", tier: "slow", formula: { kind: "percent255" } },
  { pid: "0159", command: "0159", label: "ضغط السكة المطلق", englishLabel: "Fuel Rail Absolute", unit: "kPa", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "fuelRailAbs" } },
  { pid: "015C", command: "015C", label: "حرارة الزيت", englishLabel: "Oil Temp", unit: "°م", minBytes: 1, category: "temperature", tier: "slow", formula: { kind: "tempC" } },
  { pid: "015D", command: "015D", label: "توقيت الحقن", englishLabel: "Fuel Injection Timing", unit: "°", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "injectionTiming" } },
  { pid: "015E", command: "015E", label: "معدل استهلاك الوقود", englishLabel: "Fuel Rate", unit: "L/h", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "fuelRate" } },
  { pid: "0165", command: "0165", label: "مداخل مساعدة", englishLabel: "Auxiliary Input Status", unit: null, minBytes: 2, category: "other", tier: "slow", formula: { kind: "auxIo" } },
  { pid: "019D", command: "019D", label: "معدل الوقود (غرام)", englishLabel: "Engine Fuel Rate", unit: "g/s", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "fuelRateGrams" } },
  { pid: "019F", command: "019F", label: "نسبة استخدام نظام الوقود", englishLabel: "Fuel System Percentage Use", unit: "%", minBytes: 2, category: "fuel", tier: "slow", formula: { kind: "fuelSystemUse" } },
  { pid: "01A6", command: "01A6", label: "عداد المسافة", englishLabel: "Odometer", unit: "كم", minBytes: 4, category: "speed", tier: "slow", formula: { kind: "odometerKm" } },
];

export const LIVE_PID_BY_COMMAND = new Map(LIVE_PID_REGISTRY.map((item) => [item.pid, item]));

export function buildLiveReadingCatalog(supportedPids: string[]): Record<string, LiveReading> {
  const supported = new Set(supportedPids.map((pid) => pid.toUpperCase()));
  const catalog: Record<string, LiveReading> = {};
  for (const item of LIVE_PID_REGISTRY) {
    catalog[item.pid] = {
      pid: item.pid,
      arabicLabel: item.label,
      englishLabel: item.englishLabel,
      category: item.category,
      value: null,
      unit: item.unit,
      status: "no_data",
      raw: "",
      updatedAt: null,
    };
  }
  for (const pid of supported) {
    if (catalog[pid] || isMode01SupportQuery(pid)) continue;
    catalog[pid] = {
      pid,
      arabicLabel: `حساس ${pid.slice(2)}`,
      englishLabel: pid,
      category: "other",
      value: null,
      unit: null,
      status: "no_data",
      raw: "",
      updatedAt: null,
    };
  }
  return catalog;
}

function readingRank(status: string) {
  if (status === "ok") return 0;
  if (status === "no_data" || status === "missing_bytes") return 1;
  return 2;
}

export function listV011Readings(
  liveReadings: Record<string, LiveReading>,
  supportedPids: string[] = [],
): LiveReading[] {
  const merged: Record<string, LiveReading> = {
    ...buildLiveReadingCatalog(supportedPids),
    ...liveReadings,
  };
  return Object.values(merged).sort((left, right) => {
    const delta = readingRank(left.status) - readingRank(right.status);
    if (delta !== 0) return delta;
    return left.arabicLabel.localeCompare(right.arabicLabel, "ar");
  });
}
