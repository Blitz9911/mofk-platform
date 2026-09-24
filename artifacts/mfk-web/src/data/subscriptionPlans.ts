export type BillingCycle = "monthly" | "yearly";

export type SubscriptionPlanId = "free" | "mofk" | "family" | "fleet";

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
      mofk: string;
      family: string;
      fleet: string;
    };

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "باقة مجانية",
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
    id: "mofk",
    name: "باقة مفك",
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
    id: "family",
    name: "باقة العائلة",
    subtitle: "لعدة مركبات مع تقارير أعمق وتصدير Excel",
    monthlyPrice: 59,
    yearlyPrice: 590,
    devicePrice: 149,
    maxVehicles: 3,
    saleType: "self-serve",
    summary: "كل مزايا مفك مع مساحة أكبر للعائلة وتصدير بيانات Excel.",
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
    name: "باقة الاسطول",
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

const formatVehicleLimitCell = (planId: SubscriptionPlanId) => {
  const plan = subscriptionPlans.find((item) => item.id === planId);
  if (!plan || plan.maxVehicles === "sales") return "5 فأكثر";
  if (plan.maxVehicles === 1) return "مركبة واحدة";
  return `حتى ${new Intl.NumberFormat("ar-SA").format(plan.maxVehicles)} مركبات`;
};

export const comparisonRows: ComparisonRow[] = [
  {
    type: "feature",
    label: "عدد المركبات",
    free: formatVehicleLimitCell("free"),
    mofk: formatVehicleLimitCell("mofk"),
    family: formatVehicleLimitCell("family"),
    fleet: formatVehicleLimitCell("fleet"),
  },
  { type: "section", label: "الأساسيات" },
  { type: "feature", label: "تسجيل بيانات المركبة", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "سجل الصيانة والتكاليف", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "تسجيل تعبئات البنزين", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "section", label: "الجهاز والتشخيص" },
  { type: "feature", label: "جهاز مفك OBD", free: "لا", mofk: "رسوم مرة واحدة", family: "رسوم مرة واحدة", fleet: "حسب العقد" },
  { type: "feature", label: "البيانات الحية للمركبة", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "اكتشاف الأعطال تلقائيًا", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "section", label: "المساعد والتقارير" },
  { type: "feature", label: "رسائل المساعد الذكي", free: "لا", mofk: "غير محدود", family: "غير محدود", fleet: "حسب العقد" },
  { type: "feature", label: "تصدير PDF", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "تصدير البيانات Excel", free: "لا", mofk: "لا", family: "نعم", fleet: "نعم" },
  { type: "section", label: "الإدارة والدعم" },
  { type: "feature", label: "لوحة تحكم الأسطول", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "feature", label: "الدعم الفني", free: "أساسي", mofk: "أولوية", family: "أولوية", fleet: "دعم خاص" },
];

export const normalizeSubscriptionPlanId = (id?: string | null): SubscriptionPlanId => {
  if (id === "plus" || id === "mofk" || id === "individual-basic") return "mofk";
  if (id === "pro" || id === "premium" || id === "family" || id === "individual-advanced") return "family";
  if (id === "fleet") return "fleet";
  return "free";
};

export const getPlanById = (id: SubscriptionPlanId | string) =>
  subscriptionPlans.find((plan) => plan.id === normalizeSubscriptionPlanId(id)) ?? subscriptionPlans[1];

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
