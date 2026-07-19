export type PlanId = "free" | "plus" | "pro" | "fleet";

export type BillingCycle = "monthly" | "annual";

export type PlanConfig = {
  id: PlanId;
  name: string;
  nameAr: string;
  descriptionAr: string;
  tier: "free" | "paid" | "fleet";
  isFree: boolean;
  isFleet: boolean;
  includesDevice: boolean;
  devicePriceSar: number;
  requiresShipping: boolean;
  supportsMonthly: boolean;
  supportsAnnual: boolean;
  priceMonthlySar: number | null;
  priceAnnualSar: number | null;
  maxVehicles: number | null;
  featuresAr: string[];
  ctaLabelAr: string;
  supportLevelAr: string;
  popular?: boolean;
};

export const plans: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    nameAr: "Free",
    descriptionAr: "إدارة مركبة واحدة بدون جهاز وبدون دفع.",
    tier: "free",
    isFree: true,
    isFleet: false,
    includesDevice: false,
    devicePriceSar: 0,
    requiresShipping: false,
    supportsMonthly: false,
    supportsAnnual: false,
    priceMonthlySar: 0,
    priceAnnualSar: 0,
    maxVehicles: 1,
    featuresAr: ["مركبة واحدة", "سجل الصيانة والتكاليف", "تسجيل الوقود", "بدون مساعد ذكي"],
    ctaLabelAr: "ابدأ مجانًا",
    supportLevelAr: "دعم أساسي",
  },
  {
    id: "plus",
    name: "Plus",
    nameAr: "Plus",
    descriptionAr: "اشتراك لمركبة واحدة مع جهاز مفك OBD ورسائل ذكية غير محدودة.",
    tier: "paid",
    isFree: false,
    isFleet: false,
    includesDevice: true,
    devicePriceSar: 149,
    requiresShipping: true,
    supportsMonthly: true,
    supportsAnnual: true,
    priceMonthlySar: 29,
    priceAnnualSar: 290,
    maxVehicles: 1,
    featuresAr: ["جهاز مفك OBD برسوم مرة واحدة", "تشخيص مباشر", "رسائل المساعد الذكي غير محدودة", "تصدير PDF"],
    ctaLabelAr: "اشترك الآن",
    supportLevelAr: "دعم أولوية",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    nameAr: "Pro",
    descriptionAr: "اشتراك متقدم لعدة مركبات مع تقارير أعمق وتصدير Excel.",
    tier: "paid",
    isFree: false,
    isFleet: false,
    includesDevice: true,
    devicePriceSar: 149,
    requiresShipping: true,
    supportsMonthly: true,
    supportsAnnual: true,
    priceMonthlySar: 59,
    priceAnnualSar: 590,
    maxVehicles: 3,
    featuresAr: ["حتى 3 مركبات", "جهاز مفك OBD برسوم مرة واحدة", "تقارير صحة متقدمة", "تصدير البيانات Excel"],
    ctaLabelAr: "اشترك الآن",
    supportLevelAr: "دعم أولوية موسع",
  },
  {
    id: "fleet",
    name: "Fleet",
    nameAr: "Fleet",
    descriptionAr: "حل للشركات يبدأ بطلب مبيعات وتسعير مخصص.",
    tier: "fleet",
    isFree: false,
    isFleet: true,
    includesDevice: true,
    devicePriceSar: 0,
    requiresShipping: true,
    supportsMonthly: false,
    supportsAnnual: false,
    priceMonthlySar: null,
    priceAnnualSar: null,
    maxVehicles: null,
    featuresAr: ["5 مركبات فأكثر", "لوحة تشغيل الأسطول", "تصدير البيانات Excel", "دعم خاص"],
    ctaLabelAr: "تواصل مع المبيعات",
    supportLevelAr: "دعم خاص",
  },
];

export const planIds = plans.map((plan) => plan.id) as PlanId[];

export function getPlanById(id?: string | null) {
  const aliases: Record<string, PlanId> = {
    mofk: "plus",
    "individual-basic": "plus",
    family: "pro",
    "individual-advanced": "pro",
  };
  const normalized = id && aliases[id] ? aliases[id] : id;
  return plans.find((plan) => plan.id === normalized) ?? null;
}

export function getPlanPrice(plan: PlanConfig, cycle: BillingCycle) {
  return cycle === "annual" ? plan.priceAnnualSar : plan.priceMonthlySar;
}

export function formatSar(value: number | null | undefined) {
  if (value === null || value === undefined) return "حسب العرض";
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function formatPlanVehicles(plan: PlanConfig) {
  if (plan.maxVehicles === null) return "حسب العقد";
  return `${new Intl.NumberFormat("ar-SA").format(plan.maxVehicles)} مركبة`;
}
