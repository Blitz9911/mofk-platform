export type BillingCycle = "monthly" | "yearly";

export type SubscriptionPlanId = "free" | "mofk" | "family" | "fleet";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  subtitle: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
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
    name: "مجاني",
    subtitle: "أساسيات إدارة المركبة بدون الذكاء الاصطناعي",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxVehicles: 1,
    saleType: "self-serve",
    summary: "لمن يريد تسجيل بيانات السيارة والصيانة والوقود فقط، بدون خدمات AI أو OBD.",
    included: [
      "مركبة واحدة",
      "تسجيل بيانات المركبة",
      "سجل الصيانة والتكاليف",
      "متابعة مواعيد الصيانة",
      "تسجيل تعبئات البنزين",
    ],
  },
  {
    id: "mofk",
    name: "مفك",
    subtitle: "الخطة الكاملة لمركبة واحدة",
    monthlyPrice: 29,
    yearlyPrice: 199,
    maxVehicles: 1,
    saleType: "self-serve",
    badge: "الأكثر اختيارًا",
    summary: "تشخيص ذكي، ربط OBD، بيانات حية، وتقارير لمركبة واحدة.",
    included: [
      "مركبة واحدة",
      "ربط جهاز مفك OBD-II",
      "البيانات الحية وتنبيهات الأعطال",
      "تشخيص AI غير محدود",
      "رسائل المساعد الذكي غير محدودة",
    ],
  },
  {
    id: "family",
    name: "العائلة",
    subtitle: "عدة مركبات في حساب واحد",
    monthlyPrice: 59,
    yearlyPrice: 419,
    maxVehicles: 4,
    saleType: "self-serve",
    summary: "كل مزايا مفك مع إدارة حتى ٤ مركبات للعائلة.",
    included: [
      "حتى ٤ مركبات",
      "كل مزايا مفك",
      "تقارير لكل مركبة",
      "رسائل المساعد الذكي غير محدودة",
      "تصدير PDF",
    ],
  },
  {
    id: "fleet",
    name: "أسطول",
    subtitle: "للشركات: تواصل مع المبيعات",
    monthlyPrice: null,
    yearlyPrice: null,
    maxVehicles: "sales",
    saleType: "sales-led",
    summary: "حل للشركات يبدأ من ٥ مركبات فأكثر، بدون سعر معلن في الواجهة.",
    included: [
      "٥ مركبات فأكثر",
      "لوحة تحكم الأسطول",
      "مقارنة المركبات وترتيب أولوية التدخل",
      "تصدير البيانات Excel",
      "دعم خاص",
    ],
  },
];

export const comparisonRows: ComparisonRow[] = [
  {
    type: "feature",
    label: "عدد المركبات",
    free: "مركبة واحدة",
    mofk: "مركبة واحدة",
    family: "حتى ٤ مركبات",
    fleet: "٥ فأكثر",
  },
  { type: "section", label: "الأساسيات" },
  { type: "feature", label: "تسجيل بيانات المركبة", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "سجل الصيانة والتكاليف", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "متابعة مواعيد الصيانة", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "تسجيل تعبئات البنزين", free: "نعم", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "حساب استهلاك الوقود", free: "أساسي", mofk: "متقدم", family: "متقدم", fleet: "متقدم" },
  { type: "section", label: "OBD والبيانات الحية" },
  { type: "feature", label: "ربط جهاز مفك OBD-II", free: "لا", mofk: "نعم", family: "نعم", fleet: "لكل مركبة" },
  { type: "feature", label: "البيانات الحية للمركبة", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "اكتشاف الأعطال تلقائيًا", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "تنبيهات الأعطال الحرجة", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "تنبيهات الحرارة والبطارية", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "section", label: "التشخيص والذكاء الاصطناعي" },
  { type: "feature", label: "شرح الأعطال بالعربي", free: "لا", mofk: "تلقائي ومفصل", family: "تلقائي ومفصل", fleet: "تلقائي ومفصل" },
  { type: "feature", label: "تشخيص AI كامل", free: "لا", mofk: "غير محدود", family: "غير محدود", fleet: "غير محدود" },
  { type: "feature", label: "رسائل المساعد الذكي", free: "لا", mofk: "غير محدود", family: "غير محدود", fleet: "غير محدود" },
  { type: "feature", label: "تصنيف خطورة الأعطال", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "هل أقدر أكمل قيادة؟", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "feature", label: "تقدير تكلفة الإصلاح", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "section", label: "صحة المركبة والتقارير" },
  { type: "feature", label: "مؤشر صحة المركبة", free: "لا", mofk: "تفصيلي", family: "تفصيلي لكل مركبة", fleet: "تفصيلي لكل مركبة" },
  { type: "feature", label: "توصيات الصيانة الذكية", free: "أساسية", mofk: "متقدمة", family: "متقدمة", fleet: "متقدمة" },
  { type: "feature", label: "الرسوم البيانية", free: "لا", mofk: "أسبوعي وشهري وسنوي", family: "أسبوعي وشهري وسنوي", fleet: "تقارير موحدة" },
  { type: "feature", label: "تصدير PDF", free: "لا", mofk: "نعم", family: "نعم", fleet: "نعم" },
  { type: "section", label: "مزايا الأسطول" },
  { type: "feature", label: "لوحة تحكم الأسطول", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "feature", label: "مقارنة المركبات", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "feature", label: "ترتيب حسب أولوية التدخل", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "feature", label: "إجمالي تكاليف الأسطول", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "feature", label: "المستخدمون والصلاحيات", free: "مستخدم واحد", mofk: "مستخدم واحد", family: "مستخدم واحد", fleet: "حسب العقد" },
  { type: "feature", label: "تصدير البيانات Excel", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "feature", label: "مدير حساب مخصص", free: "لا", mofk: "لا", family: "لا", fleet: "نعم" },
  { type: "section", label: "الدعم" },
  { type: "feature", label: "الدعم الفني", free: "أساسي", mofk: "أولوية", family: "أولوية", fleet: "دعم خاص" },
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
