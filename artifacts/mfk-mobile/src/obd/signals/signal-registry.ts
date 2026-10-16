// Metadata adaptations licensed CC BY-SA 4.0; see ATTRIBUTION.md.
import vendor from "./vendor/saej1979.json";
import { decodeSignal, extractBits, type SignalFormat, type SignalState } from "./signal-decoder";
import { parseObdResponses } from "../elm327/obd-response-parser";

const vendorModule = vendor as unknown as { commands?: unknown[]; default?: { commands: unknown[] } };
const source = {
  commands: (vendorModule.commands ?? vendorModule.default?.commands ?? []) as { cmd: Record<string, string>; signals: unknown[] }[],
};

export type SignalDefinition = {
  id: string; command: string; sourceId: string; nameAr: string; nameEn: string;
  category: string; format: SignalFormat; unit: string; intervalMs: number;
  supportBit?: number; verified: boolean;
};
export type SignalReading = {
  id: string; definitionId: string; command: string; sourceEcu?: string;
  value: number | string | null; status: SignalState; timestamp: number | null;
};

const names: Record<string, string> = {
  RPM: 'دورات المحرك', VSS: 'سرعة المركبة', ECT: 'حرارة سائل التبريد', EOT: 'حرارة الزيت',
  LOAD_PCT: 'حمل المحرك', LOAD_ABS: 'الحمل المطلق', MAF: 'تدفق الهواء', MAP: 'ضغط مجمع السحب',
  IAT: 'حرارة هواء السحب', AAT: 'حرارة الجو', TP: 'موضع الخانق', TP_R: 'الخانق النسبي',
  TP_B: 'موضع الخانق B', TP_C: 'موضع الخانق C', TP_G: 'موضع الخانق G',
  APP_D: 'دواسة التسارع D', APP_E: 'دواسة التسارع E', APP_F: 'دواسة التسارع F', APP_R: 'الدواسة النسبية',
  TAC_PCT: 'مشغل الخانق المطلوب', FLI: 'مستوى الوقود', VPWR: 'فولتية وحدة التحكم',
  FP: 'ضغط الوقود', FRP: 'ضغط سكة الوقود', FRP_REL: 'ضغط السكة النسبي', FRP_ABS: 'ضغط السكة المطلق',
  RUNTM: 'زمن تشغيل المحرك', MIL_DIST: 'المسافة مع لمبة العطل', CLR_DIST: 'المسافة منذ مسح الأعطال',
  MIL_TIME: 'مدة إضاءة لمبة العطل', CLR_TIME: 'المدة منذ مسح الأعطال', WARM_UPS: 'مرات الإحماء منذ المسح',
  BARO: 'الضغط الجوي', FUEL_RATE: 'معدل استهلاك الوقود', FUEL_TIMING: 'توقيت حقن الوقود',
  SPARKADV: 'تقديم الإشعال', EGR_PCT: 'تدوير العادم المطلوب', EGR_ERR: 'خطأ تدوير العادم',
  EVAP_PCT: 'تطهير التبخير المطلوب', EVAP_VP: 'ضغط بخار التبخير', EVAP_VPA: 'ضغط التبخير المطلق',
  EVAP_VP_WIDE: 'ضغط التبخير واسع النطاق', ALCH_PCT: 'نسبة الإيثانول', EQ_RAT: 'نسبة التكافؤ المطلوبة',
  BAT_SOC: 'شحن البطارية الهجينة', BAT_SOH: 'صحة بطارية الدفع', ODO: 'عداد المسافة',
  TQ_DD: 'عزم السائق المطلوب', TQ_ACT: 'عزم المحرك الفعلي', TQ_REF: 'العزم المرجعي', TQ_FR: 'عزم الاحتكاك',
  HEV_BATT_V: 'فولتية البطارية الهجينة', HEV_BATT_A: 'تيار البطارية الهجينة',
  FUEL_TYP: 'نوع الوقود', OBDSUP: 'معيار OBD', FUELSYS1: 'نظام الوقود 1', FUELSYS2: 'نظام الوقود 2',
  AIR_STAT: 'حالة الهواء الثانوي', PTO_STAT: 'حالة مأخذ القدرة', CYL_RATE: 'معدل وقود الأسطوانة',
  EXH_RATE: 'تدفق العادم', MST: 'حرارة سطح مجمع السحب', SOCE: 'الطاقة المعتمدة المتبقية', SOCR: 'المدى المعتمد المتبقي',
};
function arabicName(id: string): string {
  if (names[id]) return names[id];
  const patterns: [RegExp, string][] = [
    [/^SHRTFT/, 'تصحيح الوقود قصير المدى'], [/^LONGFT/, 'تصحيح الوقود طويل المدى'],
    [/^STSO2FT/, 'تصحيح الأكسجين قصير المدى'], [/^LGSO2FT/, 'تصحيح الأكسجين طويل المدى'],
    [/^CATEMP/, 'حرارة المحول الحفاز'], [/^LAMBDA/, 'نسبة التكافؤ'], [/^O2S/, 'حساس الأكسجين'],
    [/^ECT_/, 'حرارة سائل التبريد'], [/^IAT_/, 'حرارة هواء السحب'], [/^MAF/, 'تدفق الهواء'],
    [/^EGR_/, 'تدوير غازات العادم'], [/^BP_/, 'ضغط الشحن'], [/^WG_/, 'صمام التوربو'],
    [/^TAC_/, 'مشغل الخانق'], [/^TP_/, 'موضع الخانق'], [/^FRP_/, 'ضغط السكة'], [/^FRT_/, 'حرارة الوقود'],
  ];
  for (const [pattern, label] of patterns) if (pattern.test(id)) return `${label} ${id.replace(pattern, '')}`;
  return `قراءة ${id}`;
}
export const SIGNAL_CATEGORIES: Record<string, string> = {
  engine: "المحرك",
  fuel: "الوقود",
  air: "الهواء والسحب",
  throttle: "الخانق والدواسة",
  temperature: "الحرارة",
  oxygen: "الأكسجين",
  exhaust: "العادم",
  turbo: "التوربو",
  diesel: "الديزل",
  hybrid: "البطارية والهجين",
  vehicle: "المركبة",
  diagnostics: "التشخيص",
};
function category(id: string, unit?: string): string {
  if (/BAT|HEV|SOC/.test(id)) return "hybrid";
  if (/DPF|NOX|SCR|PM_|DEF|REAGENT/.test(id)) return "diesel";
  if (/^BP_|^WG_/.test(id)) return "turbo";
  if (unit === "celsius") return "temperature";
  if (/O2|LAMBDA/.test(id)) return "oxygen";
  if (/^TP|^APP|^TAC/.test(id)) return "throttle";
  if (/MAF|MAP|BARO|IAT/.test(id)) return "air";
  if (/EGR|EVAP|EXH|CAT/.test(id)) return "exhaust";
  if (/FUEL|FT|^FP|^FRP|^FLI|ALCH/.test(id)) return "fuel";
  if (/ODO|DIST|VSS|TIME|WARM/.test(id)) return "vehicle";
  if (/MIL|DTC/.test(id)) return "diagnostics";
  return "engine";
}
const units: Record<string, string> = { percent: '%', celsius: '°C', volts: 'V', amps: 'A', rpm: 'RPM', kilometersPerHour: 'km/h', kilometers: 'km', kilopascal: 'kPa', gramsPerSecond: 'g/s', litersPerHour: 'L/h', seconds: 's', minutes: 'min', newtonMeters: 'N·m', scalar: '', offon: '', noyes: '', yesno: '', hex: '' };

// Readiness uses ignition-specific decoding. Dynamic scaling and uncertain layouts
// remain excluded until independently verified; importing data is not verification.
const excluded = new Set(['01', '02', '08', '09', '13', '1D', '4F', '50', '64', '6B', '7F', '9A', 'AA', 'D3']);
export const SIGNAL_REGISTRY: SignalDefinition[] = source.commands.flatMap((record) => {
  const command = record.cmd as Record<string, string>;
  const pid = command['01'];
  if (!pid || excluded.has(pid)) return [];
  const signals = record.signals as unknown as { id: string; name: string; hidden?: boolean; fmt: SignalFormat }[];
  return signals.filter(s => !s.hidden && !s.id.endsWith('_SUP')).map((signal) => {
    const format: SignalFormat = { ...signal.fmt };
    // J1979 short/long fuel-trim offset is -100 after scaling, not -128.
    if (/^(SHRTFT|LONGFT|STSO2FT|LGSO2FT)/.test(signal.id)) format.add = -100;
    const support = signals.find(s => s.id === `${signal.id}_SUP`);
    const group = category(signal.id, format.unit);
    return {
      id: `01${pid}:${signal.id}`, command: `01${pid}`, sourceId: signal.id,
      nameAr: arabicName(signal.id), nameEn: signal.name, category: group, format,
      unit: units[format.unit ?? ''] ?? format.unit ?? '', supportBit: support?.fmt.bix,
      intervalMs: ['RPM', 'VSS'].includes(signal.id) ? 200 : group === 'throttle' || signal.id === 'MAF' ? 500 : ['OBDSUP', 'FUEL_TYP'].includes(signal.id) ? 60_000 : 2_000,
      verified: true,
    };
  });
});
export const SIGNAL_BY_ID = new Map(SIGNAL_REGISTRY.map(s => [s.id, s]));
export const SIGNALS_BY_COMMAND = new Map<string, SignalDefinition[]>();
for (const signal of SIGNAL_REGISTRY) SIGNALS_BY_COMMAND.set(signal.command, [...(SIGNALS_BY_COMMAND.get(signal.command) ?? []), signal]);

export function decodePidSignals(command: string, raw: string, now = Date.now()): SignalReading[] {
  const definitions = SIGNALS_BY_COMMAND.get(command) ?? [];
  const responses = parseObdResponses(raw).filter(r => r.service === 0x41 && r.pid === parseInt(command.slice(2), 16));
  if (!responses.length) return definitions.map(d => ({ id: d.id, definitionId: d.id, command, value: null, status: /NO DATA/i.test(raw) ? 'temporarilyUnavailable' : 'error', timestamp: null }));
  return responses.flatMap(response => definitions.map(definition => {
    let result = decodeSignal(definition.format, response.payload);
    if (definition.supportBit != null) {
      try { if (!extractBits(response.payload, definition.supportBit, 1)) result = { status: 'unsupported', value: null }; }
      catch { result = { status: 'error', value: null }; }
    }
    return { id: `${definition.id}@${response.sourceEcu ?? 'default'}`, definitionId: definition.id, command, sourceEcu: response.sourceEcu, ...result, timestamp: result.status === 'available' ? now : null };
  }));
}
