import { classifyElm327Response } from "../elm327/elm327-response-parser";
import { decodeDtcResponse, decodeUdsDtcResponse } from "../pids/pid-decoder";
import type { DecodedDtc, DiagnosticLampNote, VehicleModuleReading } from "../types/diagnostics.types";
import { describeDtc } from "./dtc-catalog";

export const FUNCTIONAL_CAN_HEADER = "7DF";

/** Physical 11-bit headers that often hold chassis/TPMS DTCs. Mode 03 only. */
export const CHASSIS_SCAN_HEADERS = [
  { header: "7E0", module: "المحرك" },
  { header: "7E1", module: "ناقل الحركة" },
  { header: "7E2", module: "وحدة إضافية" },
  { header: "7B0", module: "الفرامل / الثبات" },
  { header: "7D1", module: "الفرامل" },
  { header: "752", module: "الوسائد الهوائية" },
  { header: "7A0", module: "الهيكل" },
  { header: "750", module: "الهيكل / الإطارات" },
  { header: "7C0", module: "الجسم" },
  { header: "7A5", module: "الإطارات" },
  { header: "7C4", module: "الإطارات" },
  { header: "724", module: "الإطارات" },
  { header: "720", module: "الإطارات" },
] as const;

export function requestHeaderFromResponseEcu(ecu: string) {
  const value = Number.parseInt(ecu, 16);
  if (!Number.isFinite(value)) return null;
  if (value >= 0x7e8 && value <= 0x7ef) return (value - 8).toString(16).toUpperCase().padStart(3, "0");
  return null;
}

const TPMS_CODE = /^(C07[0-9A-F]{2}|C12[0-4][0-9A-F]{2}|C21[0-9A-F]{2}|C216[0-9A-F]|U0127)$/;

export function isTpmsRelatedCode(code: string) {
  return TPMS_CODE.test(code.trim().toUpperCase());
}

export function isBusFatalResponse(raw: string) {
  const classification = classifyElm327Response(raw);
  return classification === "can_error" || classification === "bus_error" || classification === "bus_init_error";
}

export function buildDiagnosticLampNotes(input: {
  milOn: boolean | null;
  codes: DecodedDtc[];
  extraModulesQueried: string[];
}): DiagnosticLampNote[] {
  const tpmsCodes = input.codes.filter((item) => isTpmsRelatedCode(item.code));
  const notes: DiagnosticLampNote[] = [
    {
      id: "mil",
      titleAr: "لمبة المحرك (MIL)",
      bodyAr:
        input.milOn === true
          ? "لمبة المحرك مضاءة حسب PID 0101. الأكواد أدناه من أوضاع 03 / 07 / 0A."
          : input.milOn === false
            ? "لمبة المحرك مطفأة حسب وحدة المحرك. هذا لا يشمل لمبة الكفرات أو الوسائد أو الفرامل."
            : "تعذر تأكيد حالة لمبة المحرك من PID 0101.",
    },
    {
      id: "tpms",
      titleAr: "لمبة الكفرات (TPMS)",
      bodyAr: tpmsCodes.length
        ? `ظهرت رموز مرتبطة بالإطارات: ${tpmsCodes.map((item) => item.code).join("، ")}.`
        : "انخفاض ضغط الإطار يضيء اللمبة غالباً بدون تسجيل كود OBD. رمز العطل يظهر إذا تعطّل حسّاس أو انقطع الاتصال بوحدة الإطارات. الفحص الإضافي يسأل وحدات الهيكل قراءة فقط.",
    },
  ];

  if (input.extraModulesQueried.length) {
    notes.push({
      id: "modules",
      titleAr: "وحدات إضافية",
      bodyAr: `تم سؤال: ${input.extraModulesQueried.join("، ")}. إن لم ترد الوحدة تظهر «لا بيانات» وهذا طبيعي.`,
    });
  }

  return notes;
}

export async function collectChassisDtcs(
  send: (command: string, timeoutMs: number) => Promise<string>,
  extraHeaders: string[] = [],
) {
  const codes: DecodedDtc[] = [];
  const modulesQueried: string[] = [];
  const modules: VehicleModuleReading[] = [];
  let aborted = false;
  const seen = new Set<string>();
  const targets = [
    ...CHASSIS_SCAN_HEADERS,
    ...extraHeaders
      .map((header) => header.replace(/\s+/g, "").toUpperCase())
      .filter((header) => /^[0-9A-F]{3}$/.test(header) && !CHASSIS_SCAN_HEADERS.some((item) => item.header === header))
      .map((header) => ({ header, module: `وحدة ${header}` })),
  ].filter((target) => {
    if (seen.has(target.header)) return false;
    seen.add(target.header);
    return true;
  });

  const restore = async () => {
    try {
      await send(`ATSH${FUNCTIONAL_CAN_HEADER}`, 1_500);
    } catch {
      /* restore best-effort so live polling can resume */
    }
    try {
      await send("ATH0", 1_500);
    } catch {
      /* ignore */
    }
  };

  try {
    await send("ATH1", 1_500);

    for (const target of targets) {
      modulesQueried.push(`${target.module} (${target.header})`);
      let headerRaw = "";
      try {
        headerRaw = await send(`ATSH${target.header}`, 1_500);
      } catch {
        modules.push({ header: target.header, nameAr: target.module, status: "error", codes: [] });
        continue;
      }
      if (isBusFatalResponse(headerRaw)) {
        aborted = true;
        modules.push({ header: target.header, nameAr: target.module, status: "error", codes: [] });
        break;
      }

      const moduleCodes: DecodedDtc[] = [];
      let sawData = false;

      for (const command of ["03", "1902AF"] as const) {
        let raw = "";
        try {
          raw = await send(command, command === "03" ? 2_200 : 2_000);
        } catch {
          continue;
        }
        if (isBusFatalResponse(raw)) {
          aborted = true;
          break;
        }
        const parsed = command === "03" ? decodeDtcResponse(raw, "03") : decodeUdsDtcResponse(raw);
        if (parsed.length || /^(43|5902)/i.test(raw.replace(/\s+/g, ""))) sawData = true;
        for (const code of parsed) {
          const decoded = describeDtc(code, "stored", { module: target.module });
          moduleCodes.push(decoded);
          codes.push(decoded);
        }
      }

      modules.push({
        header: target.header,
        nameAr: target.module,
        status: aborted ? "error" : sawData || moduleCodes.length ? "responded" : "no_data",
        codes: moduleCodes,
      });
      if (aborted) break;
    }
  } finally {
    await restore();
  }

  const unique = new Map<string, DecodedDtc>();
  for (const item of codes) unique.set(`${item.status}:${item.code}:${item.module ?? ""}`, item);

  return {
    codes: [...unique.values()],
    modulesQueried,
    modules,
    aborted,
  };
}
