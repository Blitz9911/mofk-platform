import type { DecodedDtc, DtcSystem } from "../types/diagnostics.types";

const CATALOG: Record<string, { en: string; ar: string; severity: DecodedDtc["severity"] }> = {
  P0300: { en: "Random/Multiple Cylinder Misfire Detected", ar: "احتراق غير منتظم في أكثر من أسطوانة", severity: "high" },
  P0133: { en: "O2 Sensor Circuit Slow Response (Bank 1 Sensor 1)", ar: "استجابة بطيئة لحساس الأكسجين", severity: "medium" },
  P0171: { en: "System Too Lean (Bank 1)", ar: "خليط الوقود فقير", severity: "medium" },
  P0420: { en: "Catalyst System Efficiency Below Threshold", ar: "كفاءة المحول الحفاز منخفضة", severity: "medium" },
  C0750: { en: "Tire Pressure Sensor 1 Malfunction", ar: "خلل في حساس ضغط الإطار 1", severity: "medium" },
  C0755: { en: "Tire Pressure Sensor 2 Malfunction", ar: "خلل في حساس ضغط الإطار 2", severity: "medium" },
  C0760: { en: "Tire Pressure Sensor 3 Malfunction", ar: "خلل في حساس ضغط الإطار 3", severity: "medium" },
  C0765: { en: "Tire Pressure Sensor 4 Malfunction", ar: "خلل في حساس ضغط الإطار 4", severity: "medium" },
  C2121: { en: "No Signal from Transmitter ID1 in Main Mode", ar: "لا إشارة من مرسل ضغط الإطار 1", severity: "medium" },
  C2122: { en: "No Signal from Transmitter ID2 in Main Mode", ar: "لا إشارة من مرسل ضغط الإطار 2", severity: "medium" },
  C2123: { en: "No Signal from Transmitter ID3 in Main Mode", ar: "لا إشارة من مرسل ضغط الإطار 3", severity: "medium" },
  C2124: { en: "No Signal from Transmitter ID4 in Main Mode", ar: "لا إشارة من مرسل ضغط الإطار 4", severity: "medium" },
  C2177: { en: "Transmitter ID not received", ar: "لم تُستلم هوية مرسل ضغط الإطار", severity: "medium" },
  U0127: { en: "Lost Communication With Tire Pressure Monitor Module", ar: "انقطع الاتصال بوحدة مراقبة ضغط الإطارات", severity: "high" },
};

export function dtcSystemForCode(code: string): DtcSystem {
  switch (code.trim().toUpperCase()[0]) {
    case "C":
      return "chassis";
    case "B":
      return "body";
    case "U":
      return "network";
    default:
      return "powertrain";
  }
}

export function isGenericDtc(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[PCBU][0-9A-F]{4}$/.test(normalized)) return false;
  const family = normalized[0];
  const second = normalized[1];
  if (family === "P") return second === "0" || second === "2";
  return second === "0";
}

export function describeDtc(
  code: string,
  status: DecodedDtc["status"],
  extra?: { module?: string },
): DecodedDtc {
  const normalized = code.toUpperCase();
  const item = CATALOG[normalized];
  const generic = isGenericDtc(normalized);
  const system = dtcSystemForCode(normalized);
  const fallbackAr =
    system === "chassis"
      ? "رمز هيكل (فرامل / إطارات / ثبات). قد يرتبط بلمبة الكفرات إذا كان من وحدة TPMS."
      : generic
        ? `كود قياسي ${normalized}`
        : "رمز خاص بالشركة المصنعة";
  return {
    code: normalized,
    status,
    descriptionEn: item?.en ?? (generic ? `SAE generic ${normalized}` : "Manufacturer-specific diagnostic trouble code"),
    descriptionAr: item?.ar ?? fallbackAr,
    severity: item?.severity ?? "medium",
    system,
    module: extra?.module,
  };
}
