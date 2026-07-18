export type PlanId =
  | "free"
  | "individual-basic"
  | "individual-advanced"
  | "fleet";

export type BillingCycle = "monthly" | "yearly";

export type PlanConfig = {
  id: PlanId;
  name: string;
  nameAr: string;
  descriptionAr: string;
  tier: "free" | "individual" | "fleet";
  isFree: boolean;
  isFleet: boolean;
  includesDevice: boolean;
  includedDeviceQuantity: number;
  requiresShipping: boolean;
  supportsMonthly: boolean;
  supportsYearly: boolean;
  priceMonthlySar: number | null;
  priceYearlySar: number | null;
  maxVehicles: number | null;
  featuresAr: string[];
  ctaLabelAr: string;
  supportLevelAr: string;
  aiUsageAr: string;
  historyRetentionAr: string;
  popular?: boolean;
};

export const plans: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    nameAr: "المجانية",
    descriptionAr: "ابدأ بإدارة مركبة واحدة بدون دفع وبدون جهاز.",
    tier: "free",
    isFree: true,
    isFleet: false,
    includesDevice: false,
    includedDeviceQuantity: 0,
    requiresShipping: false,
    supportsMonthly: false,
    supportsYearly: false,
    priceMonthlySar: 0,
    priceYearlySar: 0,
    maxVehicles: 1,
    featuresAr: [
      "مركبة واحدة",
      "سجل صيانة وتكاليف",
      "تسجيل تعبئات البنزين",
      "متابعة مواعيد الصيانة",
      "بدون مساعد ذكي",
    ],
    ctaLabelAr: "ابدأ مجانًا",
    supportLevelAr: "دعم أساسي",
    aiUsageAr: "غير متاح",
    historyRetentionAr: "سجل أساسي",
  },
  {
    id: "individual-basic",
    name: "Individual Basic",
    nameAr: "الأفراد الأساسية",
    descriptionAr: "اشتراك فردي يتضمن جهاز مفك لمركبة واحدة.",
    tier: "individual",
    isFree: false,
    isFleet: false,
    includesDevice: true,
    includedDeviceQuantity: 1,
    requiresShipping: true,
    supportsMonthly: true,
    supportsYearly: true,
    priceMonthlySar: 29,
    priceYearlySar: 299,
    maxVehicles: 1,
    featuresAr: [
      "جهاز مفك OBD مشمول",
      "تشخيص مباشر لمركبة واحدة",
      "تنبيهات الأعطال الحرجة",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير تقارير PDF",
    ],
    ctaLabelAr: "اشترك الآن",
    supportLevelAr: "دعم أولوية",
    aiUsageAr: "غير محدود",
    historyRetentionAr: "سجل تفصيلي",
    popular: true,
  },
  {
    id: "individual-advanced",
    name: "Individual Advanced",
    nameAr: "الأفراد المتقدمة",
    descriptionAr: "كل مزايا الأساسية مع سعة مركبات أعلى وتحليلات أعمق.",
    tier: "individual",
    isFree: false,
    isFleet: false,
    includesDevice: true,
    includedDeviceQuantity: 2,
    requiresShipping: true,
    supportsMonthly: true,
    supportsYearly: true,
    priceMonthlySar: 59,
    priceYearlySar: 599,
    maxVehicles: 3,
    featuresAr: [
      "جهازان مفك OBD مشمولان",
      "حتى 3 مركبات",
      "تقارير صحية متقدمة",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير البيانات Excel",
    ],
    ctaLabelAr: "اشترك الآن",
    supportLevelAr: "دعم أولوية موسع",
    aiUsageAr: "غير محدود",
    historyRetentionAr: "سجل تفصيلي ممتد",
  },
  {
    id: "fleet",
    name: "Fleet",
    nameAr: "الأسطول",
    descriptionAr: "حل للشركات يبدأ بطلب مبيعات ثم إعداد تشغيلي.",
    tier: "fleet",
    isFree: false,
    isFleet: true,
    includesDevice: true,
    includedDeviceQuantity: 0,
    requiresShipping: true,
    supportsMonthly: false,
    supportsYearly: false,
    priceMonthlySar: null,
    priceYearlySar: null,
    maxVehicles: null,
    featuresAr: [
      "5 مركبات فأكثر",
      "لوحة تشغيل الأسطول",
      "إدارة المستخدمين والصلاحيات",
      "تصدير البيانات Excel",
      "دعم خاص",
    ],
    ctaLabelAr: "تواصل مع المبيعات",
    supportLevelAr: "دعم خاص",
    aiUsageAr: "حسب العقد",
    historyRetentionAr: "حسب العقد",
  },
];

export const planIds = plans.map((plan) => plan.id) as PlanId[];

export function getPlanById(id?: string | null) {
  return plans.find((plan) => plan.id === id) ?? null;
}

export function getPlanPrice(plan: PlanConfig, cycle: BillingCycle) {
  return cycle === "yearly" ? plan.priceYearlySar : plan.priceMonthlySar;
}

export function formatSar(value: number | null | undefined) {
  if (value === null || value === undefined) return "حسب العرض";
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function formatPlanVehicles(plan: PlanConfig) {
  if (plan.maxVehicles === null) return "حسب العقد";
  return `${new Intl.NumberFormat("ar-SA").format(plan.maxVehicles)} مركبة`;
}
