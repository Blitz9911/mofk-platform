export type DtcSeverity = "low" | "medium" | "high" | "critical" | "unknown";

type DtcCopy = {
  title: string;
  summary: string;
  drive: string;
  actions: string[];
  severity: DtcSeverity;
};

const FAMILY: Record<string, DtcCopy> = {
  P03: {
    title: "خلل في احتراق المحرك",
    summary: "تم اكتشاف احتراق غير منتظم وقد يؤثر على الأداء واستهلاك الوقود.",
    drive: "يفضّل القيادة لمسافة قصيرة فقط وفحص السيارة قريبًا.",
    actions: ["تجنب الضغط العالي على المحرك.", "احجز فحصًا إذا استمر التنبيه."],
    severity: "high",
  },
  P01: {
    title: "مشكلة في خليط الوقود",
    summary: "نظام الوقود أو الهواء لا يعمل ضمن النطاق المتوقع.",
    drive: "يمكن القيادة بحذر مع مراقبة أداء المحرك.",
    actions: ["تجنب التسارع العنيف.", "راجع الصيانة إذا تكرر الرمز."],
    severity: "medium",
  },
  P02: {
    title: "مشكلة في دائرة الوقود",
    summary: "حقن الوقود أو ضغطه خارج النطاق الطبيعي.",
    drive: "قد تمشي السيارة، لكن الأداء قد يضعف.",
    actions: ["لا تتجاهل لمبة المحرك إذا تكرر ظهورها.", "افحص أقرب ورشة معتمدة."],
    severity: "medium",
  },
  P04: {
    title: "نظام العادم أو الانبعاثات",
    summary: "حساس أو صمام في نظام العادم يحتاج مراجعة.",
    drive: "القيادة ممكنة غالبًا، مع احتمال زيادة الاستهلاك.",
    actions: ["راقب الرائحة أو الدخان غير المعتاد.", "حدد موعد فحص قريب."],
    severity: "medium",
  },
  P05: {
    title: "نظام التحكم في سرعة المحرك",
    summary: "السيارة تواجه صعوبة في ثبات دوران المحرك في وضع التوقف.",
    drive: "يمكن القيادة، مع احتمال تذبذب في الوقوف.",
    actions: ["لا تعتمد على الثبات الكامل عند التوقف.", "افحص النظام إذا استمر."],
    severity: "medium",
  },
  P06: {
    title: "وحدة التحكم في المحرك",
    summary: "إشارة من وحدة التحكم تحتاج تحققًا فنيًا.",
    drive: "غير محدد — راقب أداء السيارة ولا تتجاهل الأعراض.",
    actions: ["سجّل متى يظهر الرمز.", "اعرض التقرير على فني."],
    severity: "unknown",
  },
  P07: {
    title: "ناقل الحركة",
    summary: "ناقل الحركة يرسل تنبيهًا يستحق المراجعة.",
    drive: "تجنب القيادة الطويلة إذا لاحظت تعليقًا أو اهتزازًا.",
    actions: ["قلل الحمل على ناقل الحركة.", "افحص ناقل الحركة عند أقرب فرصة."],
    severity: "high",
  },
};

const EXACT: Record<string, DtcCopy> = {
  P0300: FAMILY.P03,
  P0171: {
    title: "خليط الوقود أصبح خفيفًا",
    summary: "الهواء أكثر من الوقود في الخليط، وقد يزيد الاستهلاك أو يهتز المحرك.",
    drive: "يمكن القيادة بحذر لمسافة قصيرة.",
    actions: ["تجنب التسارع العنيف.", "افحص تسريب الهواء أو حساس الهواء."],
    severity: "medium",
  },
  P0420: {
    title: "كفاءة المحول الحفاز منخفضة",
    summary: "نظام العادم لا ينظّف الانبعاثات بالكفاءة المتوقعة.",
    drive: "القيادة ممكنة عادة، والفحص غير عاجل جدًا ما لم تظهر أعراض.",
    actions: ["راقب ضعف العزم أو رائحة العادم.", "حدد فحصًا في أقرب صيانة."],
    severity: "medium",
  },
};

export function explainDtc(code: string, descriptionAr?: string | null, apiSeverity?: string | null): DtcCopy {
  const normalized = code.trim().toUpperCase();
  const exact = EXACT[normalized];
  if (exact) return exact;
  const family = FAMILY[normalized.slice(0, 3)];
  if (family) {
    return {
      ...family,
      title: descriptionAr?.trim() || family.title,
    };
  }

  const mapped = mapApiSeverity(apiSeverity);
  return {
    title: descriptionAr?.trim() || "تنبيه من نظام السيارة",
    summary: "ظهر رمز عطل من وحدة التحكم. التفاصيل الفنية أسفل البطاقة.",
    drive: mapped === "unknown" ? "غير محدد. راقب السيارة ولا تتجاهل الأعراض." : "راجع النصائح حسب مستوى الأهمية.",
    actions: ["لا تمسح الرمز قبل فهم السبب.", "اعرض التقرير على فني إذا استمر التنبيه."],
    severity: mapped,
  };
}

function mapApiSeverity(value?: string | null): DtcSeverity {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") return value;
  return "unknown";
}

export function severityLabel(severity: DtcSeverity) {
  switch (severity) {
    case "critical":
      return "حرجة";
    case "high":
      return "مرتفعة";
    case "medium":
      return "متوسطة";
    case "low":
      return "منخفضة";
    default:
      return "غير محدد";
  }
}
