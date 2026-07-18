export type BillingCycle = "monthly" | "yearly";

export type SubscriptionPlanId = "free" | "mofk" | "fleet";

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
  locked: string[];
  quotas: string[];
};

export type ComparisonRow =
  | { type: "section"; label: string }
  | { type: "feature"; label: string; free: string; mofk: string; fleet: string };

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "مجاني",
    subtitle: "أساسيات إدارة السيارة بدون بطاقة بنكية",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxVehicles: 1,
    saleType: "self-serve",
    summary: "مناسب لمن يريد تسجيل بيانات السيارة والصيانة والوقود مع تجربة محدودة للذكاء الاصطناعي.",
    included: [
      "مركبة واحدة",
      "سجل الصيانة والتكاليف",
      "تذكيرات التأمين والاستمارة",
      "١٥ رسالة مساعد ذكي شهريًا",
      "تشخيص AI كامل مرة شهريًا",
    ],
    locked: [
      "ربط جهاز مفك OBD-II",
      "البيانات الحية وتنبيهات الأعطال",
      "تقدير تكلفة الإصلاح",
      "تصدير PDF والرسوم البيانية",
    ],
    quotas: ["سجل الصيانة اليدوي دائم", "سجلات الوقود دائمة", "١٥ رسالة ذكاء اصطناعي شهريًا", "تشخيص كامل واحد شهريًا"],
  },
  {
    id: "mofk",
    name: "مفك",
    subtitle: "الباقة الكاملة للأفراد وحتى ٣ مركبات",
    monthlyPrice: 29,
    yearlyPrice: 199,
    maxVehicles: 3,
    saleType: "self-serve",
    badge: "الأكثر اختيارًا",
    summary: "تجمع مزايا Plus وPro والعائلة في خطة واحدة: OBD، تشخيص ذكي، تقارير، وحتى ٣ مركبات.",
    included: [
      "حتى ٣ مركبات",
      "ربط جهاز مفك OBD-II",
      "تشخيص AI غير محدود",
      "رسائل مساعد ذكي غير محدودة",
      "تقدير تكلفة الإصلاح وتصدير PDF",
    ],
    locked: [
      "لوحة تحكم الأسطول",
      "مقارنة المركبات وترتيب التدخل",
      "تصدير API/CSV",
      "مدير حساب مخصص",
    ],
    quotas: ["حفظ OBD الخام ٢٤ شهرًا", "تاريخ الأعطال ٢٤ شهرًا", "مؤشر صحة المركبة ٣٦٥ يومًا", "+١٥ ر.س شهريًا لكل مركبة إضافية حتى ٣"],
  },
  {
    id: "fleet",
    name: "أسطول",
    subtitle: "للشركات: تواصل مع المبيعات بدون سعر معلن",
    monthlyPrice: null,
    yearlyPrice: null,
    maxVehicles: "sales",
    saleType: "sales-led",
    summary: "خطة مبيعات للشركات تبدأ من ٥ مركبات فأكثر، بدون تسعير ظاهر أو حاسبة في الواجهة.",
    included: [
      "٥ مركبات فأكثر",
      "لوحة تحكم الأسطول",
      "مقارنة المركبات وترتيب أولوية التدخل",
      "تصدير البيانات API/CSV",
      "مدير حساب مخصص",
    ],
    locked: [],
    quotas: ["حفظ OBD الخام ٣٦ شهرًا", "تاريخ الأعطال ٣٦ شهرًا", "٥٠٠ رسالة مساعد ذكي لكل مستخدم", "حتى ١٠ مستخدمين"],
  },
];

export const comparisonRows: ComparisonRow[] = [
  { type: "feature", label: "السعر الشهري", free: "مجانًا", mofk: "٢٩ ر.س", fleet: "تواصل معنا" },
  { type: "feature", label: "السعر السنوي", free: "مجانًا", mofk: "١٩٩ ر.س", fleet: "تواصل معنا" },
  { type: "feature", label: "عدد المركبات", free: "مركبة واحدة", mofk: "حتى ٣ مركبات", fleet: "٥ فأكثر" },
  { type: "section", label: "الأساسيات" },
  { type: "feature", label: "تسجيل بيانات المركبة", free: "نعم", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "سجل الصيانة والتكاليف", free: "نعم", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "متابعة مواعيد الصيانة", free: "نعم", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "تذكيرات التأمين والاستمارة", free: "نعم", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "تسجيل تعبئات البنزين", free: "نعم", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "حساب استهلاك الوقود", free: "أساسي", mofk: "متقدم", fleet: "متقدم" },
  { type: "feature", label: "تكلفة الكيلومتر", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "section", label: "OBD والبيانات الحية" },
  { type: "feature", label: "ربط جهاز مفك OBD-II", free: "لا", mofk: "نعم", fleet: "لكل مركبة" },
  { type: "feature", label: "البيانات الحية للمركبة", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "اكتشاف الأعطال تلقائيًا", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "تنبيهات الأعطال الحرجة", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "تنبيهات الحرارة والبطارية", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "section", label: "التشخيص والذكاء الاصطناعي" },
  { type: "feature", label: "شرح الأعطال بالعربي", free: "إدخال يدوي", mofk: "تلقائي ومفصل", fleet: "تلقائي ومفصل" },
  { type: "feature", label: "تشخيص AI كامل", free: "مرة شهريًا", mofk: "غير محدود", fleet: "غير محدود" },
  { type: "feature", label: "رسائل المساعد الذكي", free: "١٥/شهر", mofk: "غير محدود", fleet: "٥٠٠/مستخدم" },
  { type: "feature", label: "تصنيف خطورة الأعطال", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "هل أقدر أكمل قيادة؟", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "تقدير تكلفة الإصلاح", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "section", label: "صحة المركبة والتقارير" },
  { type: "feature", label: "مؤشر صحة المركبة", free: "لا", mofk: "تفصيلي كامل", fleet: "تفصيلي لكل مركبة" },
  { type: "feature", label: "متابعة تغير الصحة", free: "لا", mofk: "١٢ شهرًا", fleet: "على مستوى الأسطول" },
  { type: "feature", label: "توصيات الصيانة الذكية", free: "أساسية", mofk: "متقدمة", fleet: "متقدمة" },
  { type: "feature", label: "الرسوم البيانية", free: "لا", mofk: "أسبوعي وشهري وسنوي", fleet: "تقارير موحدة" },
  { type: "feature", label: "تصدير PDF", free: "لا", mofk: "نعم", fleet: "نعم" },
  { type: "feature", label: "تقرير فحص ما قبل الشراء", free: "لا", mofk: "نعم", fleet: "لا" },
  { type: "section", label: "مزايا الأسطول" },
  { type: "feature", label: "لوحة تحكم الأسطول", free: "لا", mofk: "لا", fleet: "نعم" },
  { type: "feature", label: "مقارنة المركبات", free: "لا", mofk: "لا", fleet: "نعم" },
  { type: "feature", label: "ترتيب حسب أولوية التدخل", free: "لا", mofk: "لا", fleet: "نعم" },
  { type: "feature", label: "إجمالي تكاليف الأسطول", free: "لا", mofk: "لا", fleet: "نعم" },
  { type: "feature", label: "المستخدمون والصلاحيات", free: "مستخدم واحد", mofk: "مستخدم واحد", fleet: "حتى ١٠ مستخدمين" },
  { type: "feature", label: "تصدير البيانات API/CSV", free: "لا", mofk: "لا", fleet: "نعم" },
  { type: "feature", label: "مدير حساب مخصص", free: "لا", mofk: "لا", fleet: "نعم" },
  { type: "section", label: "الحفظ والدعم" },
  { type: "feature", label: "سجل الصيانة اليدوي", free: "دائم", mofk: "دائم", fleet: "دائم" },
  { type: "feature", label: "حفظ بيانات OBD الخام", free: "لا ينطبق", mofk: "٢٤ شهرًا", fleet: "٣٦ شهرًا" },
  { type: "feature", label: "الدعم الفني", free: "أساسي", mofk: "أولوية", fleet: "أولوية قصوى" },
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
