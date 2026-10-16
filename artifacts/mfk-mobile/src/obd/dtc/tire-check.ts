import { parseElm327Response } from "../elm327/elm327-response-parser";
import { decodeVinIdentity, vinMakerFamily } from "../vehicle-info/vin-identity";
import type { DecodedDtc, TireCheckReport, TireWheelReading, VehicleModuleReading } from "../types/diagnostics.types";
import { collectChassisDtcs, isBusFatalResponse, isTpmsRelatedCode } from "./chassis-dtc-scan";

const WHEELS: Array<Pick<TireWheelReading, "id" | "labelAr">> = [
  { id: "fl", labelAr: "أمامي يسار" },
  { id: "fr", labelAr: "أمامي يمين" },
  { id: "rl", labelAr: "خلفي يسار" },
  { id: "rr", labelAr: "خلفي يمين" },
];

const LOW_PSI = 28;

type PressureProbe = {
  family: "toyota" | "hyundai" | "generic";
  header: string;
  setup?: string[];
  command: string;
  prefix: string;
  teardown?: string[];
};

const PRESSURE_PROBES: PressureProbe[] = [
  { family: "toyota", header: "750", setup: ["ATFCSH750", "ATFCSD300000", "ATFCSM1"], command: "21A1", prefix: "61A1", teardown: ["ATFCSM0"] },
  { family: "toyota", header: "7C0", command: "21A1", prefix: "61A1" },
  { family: "toyota", header: "750", command: "21C1", prefix: "61C1" },
  { family: "hyundai", header: "7A5", command: "22C001", prefix: "62C001" },
  { family: "hyundai", header: "7C4", command: "222001", prefix: "622001" },
  { family: "generic", header: "724", command: "21A1", prefix: "61A1" },
];

export function extractPayloadAfterPrefix(raw: string, prefix: string): number[] {
  const needle = prefix.replace(/\s+/g, "").toUpperCase();
  const parsed = parseElm327Response(raw);
  for (const line of parsed.hexLines) {
    const index = line.indexOf(needle);
    if (index < 0) continue;
    const rest = line.slice(index + needle.length);
    const bytes = rest.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)).filter((byte) => Number.isFinite(byte)) ?? [];
    if (bytes.length) return bytes;
  }
  return [];
}

function plausiblePsi(value: number) {
  return value >= 18 && value <= 55;
}

function plausibleKpa(value: number) {
  return value >= 120 && value <= 380;
}

function wheelsFromValues(values: number[], unit: "psi" | "kPa"): TireWheelReading[] | null {
  if (values.length < 4) return null;
  return WHEELS.map((wheel, index) => {
    const raw = values[index];
    const psi = unit === "psi" ? raw : Number((raw / 6.89476).toFixed(1));
    const kPa = unit === "kPa" ? raw : Number((raw * 6.89476).toFixed(0));
    return {
      ...wheel,
      psi: Number(psi.toFixed(1)),
      kPa: Math.round(kPa),
      status: psi < LOW_PSI ? "low" : "ok",
    };
  });
}

export function decodeFourWheelPressures(bytes: number[]): TireWheelReading[] | null {
  const psiBytes = bytes.slice(0, 4);
  if (psiBytes.length === 4 && psiBytes.every(plausiblePsi)) {
    return wheelsFromValues(psiBytes, "psi");
  }

  if (bytes.length >= 8) {
    const words = [0, 2, 4, 6].map((index) => (bytes[index] << 8) | bytes[index + 1]);
    if (words.every(plausibleKpa)) return wheelsFromValues(words, "kPa");
    const scaled = words.map((value) => value / 10);
    if (scaled.every(plausibleKpa)) return wheelsFromValues(scaled, "kPa");
  }

  const kpaBytes = bytes.slice(0, 4);
  if (kpaBytes.length === 4 && kpaBytes.every((value) => plausibleKpa(value * 2))) {
    return wheelsFromValues(kpaBytes.map((value) => value * 2), "kPa");
  }

  return null;
}

function emptyWheels(): TireWheelReading[] {
  return WHEELS.map((wheel) => ({ ...wheel, psi: null, kPa: null, status: "unavailable" as const }));
}

function summarize(wheels: TireWheelReading[], codes: DecodedDtc[]): Pick<TireCheckReport, "availability" | "summaryAr"> {
  const tpmsCodes = codes.filter((item) => isTpmsRelatedCode(item.code));
  const measured = wheels.filter((wheel) => wheel.status !== "unavailable");
  const low = measured.filter((wheel) => wheel.status === "low");

  if (measured.length) {
    return {
      availability: "ok",
      summaryAr: low.length
        ? `ضغط منخفض في: ${low.map((wheel) => wheel.labelAr).join("، ")}.`
        : "تم قراءة ضغط الإطارات من وحدة TPMS.",
    };
  }
  if (tpmsCodes.length) {
    return {
      availability: "codes_only",
      summaryAr: `رموز حساسات الإطارات: ${tpmsCodes.map((item) => item.code).join("، ")}. الضغط نفسه قد لا يُرسل عبر OBD.`,
    };
  }
  return {
    availability: "unsupported",
    summaryAr: "هالقطعة ما قرأت ضغط الكفرات من هالسيارة. لمبة الكفرات غالباً انخفاض ضغط بدون كود — افحص بمقياس.",
  };
}

export async function collectTireCheck(
  send: (command: string, timeoutMs: number) => Promise<string>,
  vin?: string | null,
  extraHeaders: string[] = [],
): Promise<TireCheckReport & { moduleCodes: DecodedDtc[]; modules: VehicleModuleReading[]; aborted: boolean }> {
  const family = vinMakerFamily(decodeVinIdentity(vin).make);
  const probes = PRESSURE_PROBES.filter((probe) => family === "generic" || probe.family === family || probe.family === "generic");
  const probesTried: string[] = [];
  let wheels = emptyWheels();
  let aborted = false;

  const chassis = await collectChassisDtcs(send, extraHeaders);
  if (chassis.aborted) aborted = true;

  const restore = async () => {
    try {
      await send("ATFCSM0", 1_200);
    } catch {
      /* optional */
    }
    try {
      await send("ATSH7DF", 1_500);
    } catch {
      /* ignore */
    }
    try {
      await send("ATH0", 1_500);
    } catch {
      /* ignore */
    }
  };

  try {
    if (!aborted) {
      await send("ATH1", 1_500);
      for (const probe of probes) {
        probesTried.push(`${probe.header}:${probe.command}`);
        try {
          const headerRaw = await send(`ATSH${probe.header}`, 1_500);
          if (isBusFatalResponse(headerRaw)) {
            aborted = true;
            break;
          }
          for (const step of probe.setup ?? []) {
            await send(step, 1_200);
          }
          const raw = await send(probe.command, 2_400);
          for (const step of probe.teardown ?? []) {
            await send(step, 1_200);
          }
          if (isBusFatalResponse(raw)) {
            aborted = true;
            break;
          }
          const decoded = decodeFourWheelPressures(extractPayloadAfterPrefix(raw, probe.prefix));
          if (decoded) {
            wheels = decoded;
            break;
          }
        } catch {
          for (const step of probe.teardown ?? []) {
            try {
              await send(step, 1_200);
            } catch {
              /* ignore */
            }
          }
        }
      }
    }
  } finally {
    await restore();
  }

  const { availability, summaryAr } = summarize(wheels, chassis.codes);
  return {
    availability: aborted && availability === "unsupported" ? "unsupported" : availability,
    summaryAr: aborted && availability === "unsupported"
      ? "توقف سؤال وحدة الإطارات بعد خطأ ناقل. أُعيد العنوان الافتراضي."
      : summaryAr,
    wheels,
    codes: chassis.codes.filter((item) => isTpmsRelatedCode(item.code) || item.system === "chassis"),
    probesTried: [...chassis.modulesQueried, ...probesTried],
    moduleCodes: chassis.codes,
    modules: chassis.modules,
    aborted,
  };
}
