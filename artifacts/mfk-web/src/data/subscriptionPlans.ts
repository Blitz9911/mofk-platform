export type BillingCycle = "monthly" | "yearly";

export type SubscriptionPlanId = "free" | "plus" | "pro" | "fleet";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  subtitle: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  devicePrice: number;
  maxVehicles: number | "sales";
  saleType: "self-serve" | "sales-led";
  badge?: string;
  summary: string;
  included: string[];
};

export type ComparisonRow =
  | { type: "section"; label: string }
  | {
      type: "feature";
      label: string;
      free: string;
      plus: string;
      pro: string;
      fleet: string;
    };

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    subtitle: "إدارة مركبة واحدة بدون جهاز وبدون دفع",
    monthlyPrice: 0,
    yearlyPrice: 0,
    devicePrice: 0,
    maxVehicles: 1,
    saleType: "self-serve",
    summary: "لمن يريد تسجيل بيانات السيارة والصيانة والوقود فقط، بدون OBD وبدون دفع.",
    included: [
      "مركبة واحدة",
      "تسجيل بيانات المركبة",
      "سجل الصيانة والتكاليف",
      "متابعة مواعيد الصيانة",
      "بدون مساعد ذكي",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    subtitle: "اشتراك مدفوع لمركبة واحدة مع جهاز مفك OBD",
    monthlyPrice: 29,
    yearlyPrice: 290,
    devicePrice: 149,
    maxVehicles: 1,
    saleType: "self-serve",
    badge: "الأكثر اختيارًا",
    summary: "جهاز OBD برسوم مرة واحدة مع اشتراك شهري أو سنوي لمركبة واحدة.",
    included: [
      "مركبة واحدة",
      "جهاز مفك OBD برسوم مرة واحدة",
      "تشخيص مباشر وتنبيهات الأعطال",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير PDF",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "لعدة مركبات مع تقارير أعمق وتصدير Excel",
    monthlyPrice: 59,
    yearlyPrice: 590,
    devicePrice: 149,
    maxVehicles: 3,
    saleType: "self-serve",
    summary: "كل مزايا Plus مع مساحة أكبر للعائلة أو المستخدم المتقدم.",
    included: [
      "حتى 3 مركبات",
      "جهاز مفك OBD برسوم مرة واحدة",
      "تقارير صحة متقدمة",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير البيانات Excel",
    ],
  },
  {
    id: "fleet",
    name: "Fleet",
    subtitle: "للشركات: تسعير مخصص ومتابعة من المبيعات",
    monthlyPrice: null,
    yearlyPrice: null,
    devicePrice: 0,
    maxVehicles: "sales",
    saleType: "sales-led",
    summary: "حل للشركات يبدأ من 5 مركبات فأكثر، بدون Checkout ذاتي وبدون سعر معلن.",
    included: [
      "5 مركبات فأكثر",
      "لوحة تحكم الأسطول",
      "إدارة المستخدمين والصلاحيات",
      "تصدير البيانات Excel",
      "دعم خاص",
    ],
  },
];

export const comparisonRows: ComparisonRow[] = [
  { type: "feature", label: "عدد المركبات", free: "مركبة واحدة", plus: "مركبة واحدة", pro: "حتى 3 مركبات", fleet: "5 فأكثر" },
  { type: "section", label: "الأساسيات" },
  { type: "feature", label: "تسجيل بيانات المركبة", free: "نعم", plus: "نعم", pro: "نعم", fleet: "نعم" },
  { type: "feature", label: "سجل الصيانة والتكاليف", free: "نعم", plus: "نعم", pro: "نعم", fleet: "نعم" },
  { type: "feature", label: "تسجيل تعبئات البنزين", free: "نعم", plus: "نعم", pro: "نعم", fleet: "نعم" },
  { type: "section", label: "الجهاز والتشخيص" },
  { type: "feature", label: "جهاز مفك OBD", free: "لا", plus: "رسوم مرة واحدة", pro: "رسوم مرة واحدة", fleet: "حسب العقد" },
  { type: "feature", label: "البيانات الحية للمركبة", free: "لا", plus: "نعم", pro: "نعم", fleet: "نعم" },
  { type: "feature", label: "اكتشاف الأعطال تلقائيًا", free: "لا", plus: "نعم", pro: "نعم", fleet: "نعم" },
  { type: "section", label: "المساعد والتقارير" },
  { type: "feature", label: "رسائل المساعد الذكي", free: "لا", plus: "غير محدود", pro: "غير محدود", fleet: "حسب العقد" },
  { type: "feature", label: "تصدير PDF", free: "لا", plus: "نعم", pro: "نعم", fleet: "نعم" },
  { type: "feature", label: "تصدير البيانات Excel", free: "لا", plus: "لا", pro: "نعم", fleet: "نعم" },
  { type: "section", label: "الإدارة والدعم" },
  { type: "feature", label: "لوحة تحكم الأسطول", free: "لا", plus: "لا", pro: "لا", fleet: "نعم" },
  { type: "feature", label: "الدعم الفني", free: "أساسي", plus: "أولوية", pro: "أولوية موسعة", fleet: "دعم خاص" },
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
  if (plan.saleType === "sales-led") return null;
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
