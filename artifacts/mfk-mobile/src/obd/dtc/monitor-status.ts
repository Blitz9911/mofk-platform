import { extractModeResponseBytes, parseElm327Response } from "../elm327/elm327-response-parser";
import type { ReadinessItem } from "../types/diagnostics.types";

const SPARK_MONITORS = [
  { bit: 0, name: "محول حفاز", nameEn: "Catalyst" },
  { bit: 1, name: "محول حفاز ساخن", nameEn: "Heated Catalyst" },
  { bit: 2, name: "نظام التبخير", nameEn: "Evaporative System" },
  { bit: 3, name: "هواء ثانوي", nameEn: "Secondary Air" },
  { bit: 4, name: "مبرد التكييف", nameEn: "A/C Refrigerant" },
  { bit: 5, name: "حساس أكسجين", nameEn: "Oxygen Sensor" },
  { bit: 6, name: "تسخين حساس الأكسجين", nameEn: "Oxygen Sensor Heater" },
  { bit: 7, name: "EGR/VVT", nameEn: "EGR/VVT System" },
] as const;

const COMPRESSION_MONITORS = [
  { bit: 0, name: "NMHC Catalyst", nameEn: "NMHC Catalyst" },
  { bit: 1, name: "NOx/SCR", nameEn: "NOx/SCR Aftertreatment" },
  { bit: 2, name: "Boost Pressure", nameEn: "Boost Pressure" },
  { bit: 3, name: "Exhaust Gas Sensor", nameEn: "Exhaust Gas Sensor" },
  { bit: 4, name: "PM Filter", nameEn: "PM Filter" },
  { bit: 5, name: "EGS/EGT", nameEn: "Exhaust Gas Sensor" },
  { bit: 6, name: "EGR/VVT", nameEn: "EGR/VVT System" },
  { bit: 7, name: "Boost Pressure", nameEn: "Boost Pressure" },
] as const;

function monitorItem(name: string, nameEn: string, available: boolean, incomplete: boolean): ReadinessItem {
  return {
    name,
    nameEn,
    available,
    ready: available ? !incomplete : null,
  };
}

export function decodeMonitorStatus(raw: string): { milOn: boolean; dtcCount: number; ignition: "spark" | "compression"; readiness: ReadinessItem[] } {
  const parsed = parseElm327Response(raw, "0101");
  const response = extractModeResponseBytes(parsed, "41", "01")[0];
  const a = response?.[2] ?? 0;
  const b = response?.[3] ?? 0;
  const c = response?.[4] ?? 0;
  const d = response?.[5] ?? 0;
  const milOn = (a & 0x80) !== 0;
  const dtcCount = a & 0x7f;
  const compression = (b & 0x08) !== 0;
  const monitors = compression ? COMPRESSION_MONITORS : SPARK_MONITORS;

  const readiness: ReadinessItem[] = [
    monitorItem("احتراق غير منتظم", "Misfire", (b & 0x01) !== 0, (b & 0x10) !== 0),
    monitorItem("نظام الوقود", "Fuel System", (b & 0x02) !== 0, (b & 0x20) !== 0),
    monitorItem("مكونات شاملة", "Comprehensive Components", (b & 0x04) !== 0, (b & 0x40) !== 0),
    ...monitors.map((item) => monitorItem(item.name, item.nameEn, (c & (1 << item.bit)) !== 0, (d & (1 << item.bit)) !== 0)),
  ];

  return {
    milOn,
    dtcCount,
    ignition: compression ? "compression" : "spark",
    readiness,
  };
}
