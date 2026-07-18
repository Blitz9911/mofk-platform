export type BillingCycle = "monthly" | "yearly";

export type SubscriptionPlanId = "free" | "plus" | "pro" | "family" | "fleet";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  subtitle: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  maxVehicles: number | "fleet";
  badge?: string;
  summary: string;
  included: string[];
  locked: string[];
  quotas: string[];
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "مجاني",
    subtitle: "ابدأ بفحص سيارتك بدون التزام",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxVehicles: 1,
    summary: "قراءة أساسية للأعطال وتجربة المنتج على مركبة واحدة.",
    included: [
      "قراءة أكواد الأعطال الأساسية",
      "مركبة واحدة",
      "سجل صيانة يدوي محفوظ دائمًا",
      "تنبيهات محدودة داخل التطبيق",
    ],
    locked: [
      "تفسير ذكي للأعطال",
      "تنبؤات الصيانة",
      "تقارير تكلفة الإصلاح",
      "مشاركة العائلة أو الأسطول",
    ],
    quotas: ["احتفاظ محدود ببيانات الفحص", "سجل الصيانة اليدوي لا يحذف"],
  },
  {
    id: "plus",
    name: "بلس",
    subtitle: "الخيار اليومي لمعظم السائقين",
    monthlyPrice: 19,
    yearlyPrice: 139,
    maxVehicles: 1,
    badge: "الأكثر اختيارًا",
    summary: "تشخيص أوضح وتفسير عربي مبسط لمركبتك الأساسية.",
    included: [
      "كل مزايا المجاني",
      "تفسير الأعطال بلغة بسيطة",
      "تنبيهات صيانة ذكية",
      "احتفاظ أطول بسجل الفحوصات",
    ],
    locked: [
      "مساعد ذكي متقدم",
      "تقدير تكاليف الإصلاح",
      "إدارة أكثر من مركبة",
    ],
    quotas: ["مركبة واحدة", "دعم مناسب للاستخدام الشخصي"],
  },
  {
    id: "pro",
    name: "برو",
    subtitle: "لمن يريد رؤية أعمق قبل الورشة",
    monthlyPrice: 39,
    yearlyPrice: 279,
    maxVehicles: 1,
    summary: "تحليلات أعمق، مساعد ذكي، وتقديرات تساعدك على اتخاذ قرار أسرع.",
    included: [
      "كل مزايا بلس",
      "مساعد ذكي لتحليل الأعطال",
      "تقديرات تكلفة الإصلاح",
      "تقارير قابلة للمشاركة",
      "أولوية في التنبيهات المهمة",
    ],
    locked: ["مشاركة عائلية", "لوحة أسطول للشركات"],
    quotas: ["مركبة واحدة", "احتفاظ موسع بالبيانات التشخيصية"],
  },
  {
    id: "family",
    name: "العائلة",
    subtitle: "حساب واحد لأكثر من سيارة في البيت",
    monthlyPrice: 59,
    yearlyPrice: 419,
    maxVehicles: 4,
    summary: "كل مزايا برو مع إدارة حتى أربع مركبات لأفراد العائلة.",
    included: [
      "كل مزايا برو",
      "حتى ٤ مركبات",
      "مشاركة مركبات مع أفراد العائلة",
      "تنبيهات صيانة لكل مركبة",
      "ملخصات واضحة حسب السيارة",
    ],
    locked: ["لوحة أسطول متقدمة", "تسعير شركات حسب عدد المركبات"],
    quotas: ["حتى ٤ مركبات", "مناسب للعوائل متعددة السيارات"],
  },
  {
    id: "fleet",
    name: "الأسطول",
    subtitle: "تسعير مرن للشركات والمشغلين",
    monthlyPrice: null,
    yearlyPrice: null,
    maxVehicles: "fleet",
    summary: "إدارة مركبات متعددة بسعر ينخفض مع عدد المركبات.",
    included: [
      "كل مزايا العائلة",
      "لوحة إدارة للأسطول",
      "تسعير لكل مركبة حسب الشريحة",
      "تقارير تشغيلية ومخاطر",
      "دعم مخصص للفريق",
    ],
    locked: [],
    quotas: ["٥-٢٠ مركبة: ٣٥ ر.س لكل مركبة", "٢١-٥٠ مركبة: ٢٧ ر.س لكل مركبة", "٥١-١٠٠ مركبة: ٢١ ر.س لكل مركبة", "أكثر من ١٠٠ مركبة: عرض خاص"],
  },
];

export const getPlanById = (id: SubscriptionPlanId) =>
  subscriptionPlans.find((plan) => plan.id === id) ?? subscriptionPlans[1];

export const formatSar = (value: number) =>
  new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
  }).format(value);

export const formatVehicles = (value: number) =>
  new Intl.NumberFormat("ar-SA", {
    maximumFractionDigits: 0,
  }).format(value);

export const getDisplayPrice = (plan: SubscriptionPlan, cycle: BillingCycle) => {
  if (plan.id === "fleet") return null;
  return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
};

export const getMonthlyEquivalent = (plan: SubscriptionPlan) => {
  if (plan.yearlyPrice === null) return null;
  return Math.round(plan.yearlyPrice / 12);
};

export const getYearlySavings = (plan: SubscriptionPlan) => {
  if (!plan.monthlyPrice || !plan.yearlyPrice) return 0;
  return Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);
};

export const getFleetMonthlyPricePerVehicle = (vehicles: number) => {
  if (vehicles <= 20) return 35;
  if (vehicles <= 50) return 27;
  if (vehicles <= 100) return 21;
  return null;
};

export const getFleetPreview = (vehicles: number) => {
  const pricePerVehicle = getFleetMonthlyPricePerVehicle(vehicles);
  if (pricePerVehicle === null) {
    return {
      pricePerVehicle,
      total: null,
      label: "عرض خاص",
    };
  }

  return {
    pricePerVehicle,
    total: pricePerVehicle * vehicles,
    label: `${formatSar(pricePerVehicle)} ر.س لكل مركبة`,
  };
};
