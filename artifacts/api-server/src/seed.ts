import { sql } from "drizzle-orm";
import {
  db,
  usersTable,
  vehiclesTable,
  diagnosticSessionsTable,
  dtcCodesTable,
  telemetryTable,
  maintenanceTable,
  workshopsTable,
  bookingsTable,
  recommendationsTable,
  healthHistoryTable,
  subscriptionPlansTable,
  activityTable,
  revenueTable,
} from "@workspace/db";
import { DEMO_USER_ID, DEMO_ADMIN_ID } from "./lib/demo";

async function clearAll() {
  await db.execute(sql`TRUNCATE TABLE
    revenue_monthly,
    activity,
    subscription_plans,
    health_history,
    recommendations,
    bookings,
    workshops,
    maintenance_schedule,
    telemetry,
    dtc_codes,
    diagnostic_sessions,
    vehicles,
    users
  RESTART IDENTITY CASCADE`);
}

const cities = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر", "الطائف", "أبها"];
const districts: Record<string, string[]> = {
  "الرياض": ["العليا", "الملقا", "النخيل", "الياسمين", "حطين", "الورود"],
  "جدة": ["الروضة", "السلامة", "الشاطئ", "النعيم", "الزهراء"],
  "الدمام": ["الشاطئ", "الفيصلية", "الشاطئ الغربي", "الجلوية"],
  "مكة المكرمة": ["العزيزية", "الشوقية", "الزاهر"],
  "المدينة المنورة": ["العنبرية", "قباء", "العوالي"],
  "الخبر": ["الراكة", "الثقبة", "الكورنيش"],
  "الطائف": ["شهار", "الشفا", "السلامة"],
  "أبها": ["السد", "النصب", "الموظفين"],
};

function pick<T>(arr: T[], rnd = Math.random): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const dtcCatalog: {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  descriptionEn: string;
  descriptionAr: string;
  causes: string[];
  costMin: number;
  costMax: number;
  action: "drive_now" | "schedule_week" | "monitor";
  actionReasonAr: string;
}[] = [
  {
    code: "P0420",
    severity: "medium",
    descriptionEn: "Catalyst System Efficiency Below Threshold",
    descriptionAr: "كفاءة المحوّل الحفّاز أقل من الحد المسموح",
    causes: ["تلف المحول الحفاز", "مستشعر أكسجين تالف", "تسرب في عادم الإصدار"],
    costMin: 1200,
    costMax: 4500,
    action: "schedule_week",
    actionReasonAr: "ليس خطراً فورياً لكن يؤثر على استهلاك الوقود وفحص الانبعاثات",
  },
  {
    code: "P0133",
    severity: "medium",
    descriptionEn: "O2 Sensor Circuit Slow Response (Bank 1, Sensor 1)",
    descriptionAr: "بطء في استجابة مستشعر الأكسجين (البنك 1، المستشعر 1)",
    causes: ["مستشعر أكسجين تالف", "أسلاك تالفة", "تسرب في العادم"],
    costMin: 350,
    costMax: 900,
    action: "schedule_week",
    actionReasonAr: "غيّر المستشعر للحفاظ على كفاءة الوقود",
  },
  {
    code: "P0171",
    severity: "medium",
    descriptionEn: "System Too Lean (Bank 1)",
    descriptionAr: "نسبة الوقود إلى الهواء فقيرة (البنك 1)",
    causes: ["تسرب هواء", "بخّاخ متّسخ", "مستشعر MAF تالف", "مضخة وقود ضعيفة"],
    costMin: 250,
    costMax: 1500,
    action: "schedule_week",
    actionReasonAr: "قد يؤدي إلى ضعف في الأداء وارتفاع الاستهلاك",
  },
  {
    code: "P0301",
    severity: "high",
    descriptionEn: "Cylinder 1 Misfire Detected",
    descriptionAr: "خلل في احتراق الأسطوانة الأولى",
    causes: ["شمعة احتراق تالفة", "كويل احتراق", "بخّاخ معطل", "ضعف ضغط الأسطوانة"],
    costMin: 180,
    costMax: 1800,
    action: "drive_now",
    actionReasonAr: "قيادة طويلة قد تتلف المحوّل الحفّاز - افحص فوراً",
  },
  {
    code: "P0128",
    severity: "low",
    descriptionEn: "Coolant Thermostat",
    descriptionAr: "ترموستات سائل التبريد لا يعمل بشكل صحيح",
    causes: ["ترموستات عالق مفتوحاً", "مستشعر حرارة تالف"],
    costMin: 200,
    costMax: 700,
    action: "monitor",
    actionReasonAr: "راقب درجة حرارة المحرك في القيادة الطويلة",
  },
  {
    code: "P0507",
    severity: "low",
    descriptionEn: "Idle Air Control RPM Higher Than Expected",
    descriptionAr: "دوران المحرك في الراحة أعلى من المتوقع",
    causes: ["تسرب هواء في المشعّب", "صمام IAC متّسخ", "خلل في خانق الهواء"],
    costMin: 150,
    costMax: 800,
    action: "monitor",
    actionReasonAr: "ليس خطراً، لكن قد يؤثر على الاستهلاك",
  },
  {
    code: "P0455",
    severity: "low",
    descriptionEn: "EVAP System Large Leak Detected",
    descriptionAr: "تسرب كبير في نظام تبخر الوقود",
    causes: ["غطاء خزان وقود غير محكم", "أنبوب EVAP متشقق", "صمام تنفيس تالف"],
    costMin: 50,
    costMax: 600,
    action: "monitor",
    actionReasonAr: "تأكد من إحكام إغلاق غطاء الخزان أولاً",
  },
  {
    code: "P0700",
    severity: "high",
    descriptionEn: "Transmission Control System Malfunction",
    descriptionAr: "خلل في نظام التحكم بناقل الحركة",
    causes: ["زيت ناقل حركة منخفض", "حسّاس سرعة تالف", "مشاكل كهربائية"],
    costMin: 800,
    costMax: 5000,
    action: "drive_now",
    actionReasonAr: "قد يؤدي إلى تلف الجير - افحص بسرعة",
  },
  {
    code: "P0011",
    severity: "medium",
    descriptionEn: "Camshaft Position Timing Over-Advanced",
    descriptionAr: "توقيت عمود الكامات متقدم أكثر من اللازم",
    causes: ["زيت محرك متّسخ أو منخفض", "صمام VVT تالف", "سلسلة توقيت متمددة"],
    costMin: 400,
    costMax: 2500,
    action: "schedule_week",
    actionReasonAr: "غيّر زيت المحرك أولاً ثم افحص النظام",
  },
  {
    code: "P0741",
    severity: "high",
    descriptionEn: "Torque Converter Clutch Circuit Performance",
    descriptionAr: "مشكلة في كلتش محوّل عزم ناقل الحركة",
    causes: ["زيت ناقل حركة قديم", "ملف TCC تالف", "صمّام تحكم تالف"],
    costMin: 600,
    costMax: 4500,
    action: "drive_now",
    actionReasonAr: "قد يؤثر على ناقل الحركة بشكل خطير",
  },
  {
    code: "B1318",
    severity: "low",
    descriptionEn: "Battery Voltage Low",
    descriptionAr: "جهد البطارية منخفض",
    causes: ["بطارية ضعيفة", "دينامو متعب", "تيار طفيلي زائد"],
    costMin: 250,
    costMax: 1200,
    action: "schedule_week",
    actionReasonAr: "غيّر البطارية قبل أن تتركك في مكان غير مناسب",
  },
  {
    code: "P0102",
    severity: "medium",
    descriptionEn: "Mass Airflow Circuit Low Input",
    descriptionAr: "إشارة منخفضة من مستشعر تدفق الهواء",
    causes: ["مستشعر MAF متّسخ", "فلتر هواء مسدود", "أسلاك تالفة"],
    costMin: 180,
    costMax: 950,
    action: "schedule_week",
    actionReasonAr: "نظّف المستشعر ثم استبدله إن لم تتحسن الأعطال",
  },
];

const workshopSeeds: Array<{
  name: string;
  nameAr: string;
  city: string;
  rating: number;
  reviewsCount: number;
  services: string[];
  servicesAr: string[];
  isVerified: boolean;
  priceLevel: "budget" | "standard" | "premium";
  descriptionAr: string;
  openingHours: string;
  commissionPct: number;
}> = [
  {
    name: "Saudi Auto Care - Riyadh",
    nameAr: "العناية السعودية للسيارات - الرياض",
    city: "الرياض",
    rating: 4.8,
    reviewsCount: 1240,
    services: ["oil_change", "diagnostic_scan", "brake_service", "ac_service", "full_inspection"],
    servicesAr: ["تغيير زيت", "فحص أعطال", "صيانة مكابح", "صيانة مكيف", "فحص شامل"],
    isVerified: true,
    priceLevel: "premium",
    descriptionAr: "مركز خدمة متكامل ومعتمد، فنيون مدربون على أحدث الأنظمة الذكية. ضمان حقيقي على كل خدمة.",
    openingHours: "السبت-الخميس: 7ص-11م، الجمعة: 4م-11م",
    commissionPct: 12,
  },
  {
    name: "Premium Garage Riyadh",
    nameAr: "كراج بريميوم الرياض",
    city: "الرياض",
    rating: 4.9,
    reviewsCount: 856,
    services: ["full_inspection", "diagnostic_scan", "brake_service"],
    servicesAr: ["فحص شامل", "فحص أعطال", "صيانة مكابح"],
    isVerified: true,
    priceLevel: "premium",
    descriptionAr: "متخصصون في السيارات الحديثة. أجهزة فحص أصلية وقطع غيار معتمدة من الوكالة.",
    openingHours: "السبت-الخميس: 8ص-10م",
    commissionPct: 15,
  },
  {
    name: "Al-Mahmal Auto Service",
    nameAr: "خدمة المحمل للسيارات",
    city: "الرياض",
    rating: 4.5,
    reviewsCount: 420,
    services: ["oil_change", "tire_rotation", "battery_check", "general"],
    servicesAr: ["تغيير زيت", "تدوير إطارات", "فحص بطارية", "صيانة عامة"],
    isVerified: true,
    priceLevel: "standard",
    descriptionAr: "أسعار تنافسية وخدمة سريعة. تعامل مباشر بدون وسطاء.",
    openingHours: "يومياً: 7ص-12ص",
    commissionPct: 10,
  },
  {
    name: "Jeddah Premier Motors",
    nameAr: "موتورز جدة الأول",
    city: "جدة",
    rating: 4.7,
    reviewsCount: 980,
    services: ["full_inspection", "diagnostic_scan", "ac_service", "brake_service"],
    servicesAr: ["فحص شامل", "فحص أعطال", "صيانة مكيف", "صيانة مكابح"],
    isVerified: true,
    priceLevel: "premium",
    descriptionAr: "خبرة 20 عاماً في خدمة سيارات الفخامة. صالة انتظار مريحة وقهوة مجانية.",
    openingHours: "السبت-الخميس: 7:30ص-11م، الجمعة: مغلق",
    commissionPct: 13,
  },
  {
    name: "Red Sea Auto Workshop",
    nameAr: "ورشة البحر الأحمر للسيارات",
    city: "جدة",
    rating: 4.4,
    reviewsCount: 312,
    services: ["oil_change", "general", "tire_rotation"],
    servicesAr: ["تغيير زيت", "صيانة عامة", "تدوير إطارات"],
    isVerified: false,
    priceLevel: "budget",
    descriptionAr: "حلول اقتصادية لكل ميزانية. خدمة سريعة لتغيير الزيت في 30 دقيقة.",
    openingHours: "يومياً: 6ص-1ص",
    commissionPct: 8,
  },
  {
    name: "Dammam Auto Hub",
    nameAr: "مركز الدمام للسيارات",
    city: "الدمام",
    rating: 4.6,
    reviewsCount: 670,
    services: ["full_inspection", "diagnostic_scan", "ac_service"],
    servicesAr: ["فحص شامل", "فحص أعطال", "صيانة مكيف"],
    isVerified: true,
    priceLevel: "standard",
    descriptionAr: "أكبر مركز خدمة في المنطقة الشرقية، معتمد من شركات التأمين الكبرى.",
    openingHours: "السبت-الخميس: 7ص-11م",
    commissionPct: 11,
  },
  {
    name: "Eastern Province Motors",
    nameAr: "المنطقة الشرقية موتورز",
    city: "الخبر",
    rating: 4.5,
    reviewsCount: 380,
    services: ["oil_change", "diagnostic_scan", "battery_check", "brake_service"],
    servicesAr: ["تغيير زيت", "فحص أعطال", "فحص بطارية", "صيانة مكابح"],
    isVerified: true,
    priceLevel: "standard",
    descriptionAr: "موقع مركزي في الكورنيش، خدمة سيارات بدائل أثناء الصيانة.",
    openingHours: "يومياً: 8ص-12ص",
    commissionPct: 10,
  },
  {
    name: "Makkah Express Service",
    nameAr: "خدمة مكة السريعة",
    city: "مكة المكرمة",
    rating: 4.3,
    reviewsCount: 245,
    services: ["oil_change", "tire_rotation", "general"],
    servicesAr: ["تغيير زيت", "تدوير إطارات", "صيانة عامة"],
    isVerified: false,
    priceLevel: "budget",
    descriptionAr: "خدمة سريعة في قلب مكة. مفتوح 24 ساعة في موسم الحج والعمرة.",
    openingHours: "24 ساعة",
    commissionPct: 8,
  },
  {
    name: "Madinah Auto Plus",
    nameAr: "المدينة أوتو بلس",
    city: "المدينة المنورة",
    rating: 4.6,
    reviewsCount: 410,
    services: ["full_inspection", "ac_service", "brake_service"],
    servicesAr: ["فحص شامل", "صيانة مكيف", "صيانة مكابح"],
    isVerified: true,
    priceLevel: "standard",
    descriptionAr: "ورشة موثوقة في المدينة المنورة، تتعامل مع جميع موديلات السيارات.",
    openingHours: "السبت-الخميس: 8ص-10م",
    commissionPct: 11,
  },
  {
    name: "Taif Mountain Garage",
    nameAr: "كراج جبال الطائف",
    city: "الطائف",
    rating: 4.4,
    reviewsCount: 165,
    services: ["oil_change", "general", "diagnostic_scan"],
    servicesAr: ["تغيير زيت", "صيانة عامة", "فحص أعطال"],
    isVerified: true,
    priceLevel: "standard",
    descriptionAr: "متخصصون في تجهيز السيارات للقيادة في المرتفعات والطرق الجبلية.",
    openingHours: "السبت-الخميس: 8ص-9م",
    commissionPct: 10,
  },
];

const carCatalog = [
  { make: "Toyota", model: "Camry", year: 2022, fuelType: "petrol" as const, engineCc: 2500 },
  { make: "Toyota", model: "Land Cruiser", year: 2023, fuelType: "petrol" as const, engineCc: 4000 },
  { make: "Toyota", model: "Hilux", year: 2021, fuelType: "diesel" as const, engineCc: 2800 },
  { make: "Toyota", model: "Corolla", year: 2020, fuelType: "petrol" as const, engineCc: 1800 },
  { make: "Hyundai", model: "Sonata", year: 2022, fuelType: "petrol" as const, engineCc: 2400 },
  { make: "Hyundai", model: "Elantra", year: 2021, fuelType: "petrol" as const, engineCc: 1600 },
  { make: "Nissan", model: "Patrol", year: 2023, fuelType: "petrol" as const, engineCc: 5600 },
  { make: "Nissan", model: "Sunny", year: 2020, fuelType: "petrol" as const, engineCc: 1500 },
  { make: "Lexus", model: "ES350", year: 2023, fuelType: "petrol" as const, engineCc: 3500 },
  { make: "Mercedes", model: "C200", year: 2022, fuelType: "petrol" as const, engineCc: 2000 },
  { make: "BMW", model: "X5", year: 2023, fuelType: "petrol" as const, engineCc: 3000 },
  { make: "Ford", model: "F-150", year: 2021, fuelType: "petrol" as const, engineCc: 5000 },
  { make: "Chevrolet", model: "Tahoe", year: 2022, fuelType: "petrol" as const, engineCc: 5300 },
  { make: "Honda", model: "Accord", year: 2021, fuelType: "petrol" as const, engineCc: 2400 },
  { make: "Kia", model: "Sportage", year: 2022, fuelType: "petrol" as const, engineCc: 2400 },
];

const arabicNames = [
  "عبدالله السلمي",
  "محمد القحطاني",
  "خالد العتيبي",
  "فهد الشهري",
  "سعد الغامدي",
  "ناصر الدوسري",
  "أحمد الزهراني",
  "بدر الحربي",
  "تركي الشمري",
  "سلطان البقمي",
  "ياسر الرشيدي",
  "وليد المالكي",
  "مشاري السبيعي",
  "نواف العنزي",
  "عبدالعزيز المطيري",
  "صالح القرني",
  "مهند الخالدي",
  "هاني المطرفي",
  "زياد الجهني",
  "ريان السهلي",
  "نورة الفيصل",
  "هند العلي",
  "ريم الدوسري",
  "سارة العمري",
];

const maintenanceCatalog = [
  { type: "oil_change", typeAr: "تغيير زيت المحرك", intervalKm: 8000, intervalDays: 180, cost: 280 },
  { type: "oil_filter", typeAr: "فلتر الزيت", intervalKm: 8000, intervalDays: 180, cost: 60 },
  { type: "air_filter", typeAr: "فلتر الهواء", intervalKm: 20000, intervalDays: 365, cost: 90 },
  { type: "brake_pads", typeAr: "فحوصة وحبر الفرامل", intervalKm: 30000, intervalDays: 730, cost: 650 },
  { type: "tire_rotation", typeAr: "تدوير الإطارات", intervalKm: 10000, intervalDays: 180, cost: 50 },
  { type: "battery_check", typeAr: "فحص البطارية", intervalKm: 30000, intervalDays: 365, cost: 0 },
  { type: "ac_service", typeAr: "صيانة المكيف", intervalKm: 50000, intervalDays: 365, cost: 350 },
  { type: "spark_plugs", typeAr: "شمعات الاحتراق", intervalKm: 60000, intervalDays: 1095, cost: 420 },
];

async function seed() {
  console.log("[seed] clearing tables...");
  await clearAll();

  console.log("[seed] inserting subscription plans...");
  await db.insert(subscriptionPlansTable).values([
    {
      id: "free",
      name: "Free",
      nameAr: "المجانية",
      descriptionAr: "ابدأ مجاناً واكتشف صحة سيارتك",
      priceMonthlySar: 0,
      priceYearlySar: 0,
      tier: "free",
      features: ["1 vehicle", "Basic diagnostics", "DTC reading"],
      featuresAr: [
        "مركبة واحدة فقط",
        "تشخيص فوري للأعطال",
        "قراءة أكواد DTC الأساسية",
        "تاريخ آخر 7 أيام",
        "تنبيهات الصيانة الأساسية",
      ],
      isPopular: false,
      sortOrder: 1,
    },
    {
      id: "premium",
      name: "Premium",
      nameAr: "المميزة",
      descriptionAr: "تحكم كامل بصحة سيارتك مع توصيات ذكية",
      priceMonthlySar: 29,
      priceYearlySar: 290,
      tier: "premium",
      features: ["Unlimited vehicles", "AI assistant", "Workshop booking"],
      featuresAr: [
        "حتى 5 مركبات",
        "تشخيص متقدم وتفسير عربي مفصّل",
        "المساعد الذكي بالعربية",
        "توصيات صيانة استباقية",
        "تاريخ غير محدود",
        "حجز مباشر مع الورش",
        "تقارير PDF شهرية",
        "دعم أولوية",
      ],
      isPopular: true,
      sortOrder: 2,
    },
    {
      id: "fleet",
      name: "Fleet",
      nameAr: "الأساطيل",
      descriptionAr: "للشركات وأصحاب الأساطيل",
      priceMonthlySar: 199,
      priceYearlySar: 1990,
      tier: "fleet",
      features: ["20+ vehicles", "Manager dashboard", "API access"],
      featuresAr: [
        "20+ مركبة",
        "لوحة إدارة الأسطول",
        "تقارير مخصصة",
        "تكامل API",
        "مدير حساب مخصص",
        "أسعار خاصة على الورش",
        "دعم فني 24/7",
      ],
      isPopular: false,
      sortOrder: 3,
    },
  ]);

  console.log("[seed] inserting workshops...");
  const workshopInserts = workshopSeeds.map((w) => {
    const dist = pick(districts[w.city] ?? ["الوسط"]);
    return {
      ...w,
      district: dist,
      address: `${dist}, ${w.city}`,
      addressAr: `${dist}، ${w.city}`,
      phone: `+9665${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}${rand(0, 9)}`,
      rating: w.rating.toString(),
    };
  });
  const insertedWorkshops = await db
    .insert(workshopsTable)
    .values(workshopInserts)
    .returning();

  console.log("[seed] inserting users...");
  const adminUser = {
    id: DEMO_ADMIN_ID,
    phone: "+966500000000",
    name: "إدارة MFK",
    email: "admin@mfk.sa",
    city: "الرياض",
    role: "admin",
    subscriptionTier: "premium",
    isActive: true,
    lastActiveAt: new Date(),
  };
  const demoUser = {
    id: DEMO_USER_ID,
    phone: "+966501234567",
    name: "عبدالله السلمي",
    email: "abdullah@example.sa",
    city: "الرياض",
    role: "user",
    subscriptionTier: "premium",
    subscriptionStartedAt: new Date(Date.now() - 90 * 86400_000),
    subscriptionEndsAt: new Date(Date.now() + 275 * 86400_000),
    subscriptionAutoRenew: true,
    isActive: true,
    lastActiveAt: new Date(),
  };
  const otherUsers = arabicNames.map((name, i) => ({
    phone: `+9665${(11000000 + i * 137).toString()}`.slice(0, 13),
    name,
    email: `user${i}@example.sa`,
    city: pick(cities),
    role: "user",
    subscriptionTier: pick(["free", "free", "premium", "premium", "free", "fleet"]),
    subscriptionStartedAt:
      i % 3 === 0 ? new Date(Date.now() - rand(10, 200) * 86400_000) : null,
    subscriptionEndsAt:
      i % 3 === 0 ? new Date(Date.now() + rand(30, 365) * 86400_000) : null,
    isActive: i % 17 !== 0,
    lastActiveAt: new Date(Date.now() - rand(0, 30) * 86400_000),
    createdAt: new Date(Date.now() - rand(30, 540) * 86400_000),
  }));
  await db.insert(usersTable).values([adminUser, demoUser, ...otherUsers]);

  const insertedUsers = await db.select().from(usersTable);

  console.log("[seed] inserting vehicles...");
  // demo user gets 3 vehicles
  const demoVehicles = [
    {
      userId: DEMO_USER_ID,
      vin: "JTHBA1D24G5012345",
      make: "Lexus",
      model: "ES350",
      year: 2023,
      plateNumber: "أ ب ج 1234",
      nickname: "السيارة الفخمة",
      odometerKm: 28450,
      fuelType: "petrol",
      engineCc: 3500,
      adapterMac: "AA:BB:CC:DD:EE:01",
      healthScore: 87,
    },
    {
      userId: DEMO_USER_ID,
      vin: "5TFHY5F18LX012345",
      make: "Toyota",
      model: "Land Cruiser",
      year: 2021,
      plateNumber: "ر س ت 5678",
      nickname: "العائلية",
      odometerKm: 67200,
      fuelType: "petrol",
      engineCc: 4000,
      adapterMac: "AA:BB:CC:DD:EE:02",
      healthScore: 72,
    },
    {
      userId: DEMO_USER_ID,
      vin: "1HGCM82633A012345",
      make: "Honda",
      model: "Accord",
      year: 2020,
      plateNumber: "ح ك ل 9012",
      nickname: "اليومية",
      odometerKm: 92400,
      fuelType: "petrol",
      engineCc: 2400,
      adapterMac: null,
      healthScore: 58,
    },
  ];

  // each other user gets 1-3 vehicles
  const otherVehicles: Array<typeof vehiclesTable.$inferInsert> = [];
  for (const u of insertedUsers) {
    if (u.id === DEMO_USER_ID || u.id === DEMO_ADMIN_ID) continue;
    const count = rand(1, 3);
    for (let i = 0; i < count; i++) {
      const car = pick(carCatalog);
      otherVehicles.push({
        userId: u.id,
        vin: `${car.make.slice(0, 3).toUpperCase()}${rand(10000000, 99999999)}${rand(100000, 999999)}`.slice(0, 17),
        make: car.make,
        model: car.model,
        year: car.year - rand(0, 5),
        plateNumber: `${pick(["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط"])} ${pick(["ر", "س", "ت", "ك", "ل", "م", "ن"])} ${pick(["د", "هـ", "و", "ز", "ح", "ط", "ي"])} ${rand(1000, 9999)}`,
        nickname: null,
        odometerKm: rand(8000, 180000),
        fuelType: car.fuelType,
        engineCc: car.engineCc,
        adapterMac:
          Math.random() > 0.3
            ? `AA:BB:CC:${rand(10, 99)}:${rand(10, 99)}:${rand(10, 99)}`
            : null,
        healthScore: rand(35, 99),
      });
    }
  }
  await db.insert(vehiclesTable).values([...demoVehicles, ...otherVehicles]);

  const allVehicles = await db.select().from(vehiclesTable);
  const demoVeh = allVehicles.filter((v) => v.userId === DEMO_USER_ID);

  console.log("[seed] inserting maintenance schedules...");
  const maintInserts: Array<typeof maintenanceTable.$inferInsert> = [];
  for (const v of allVehicles) {
    for (const m of maintenanceCatalog) {
      const lastDoneKm = Math.max(
        0,
        v.odometerKm - rand(0, m.intervalKm + 4000),
      );
      const lastDoneAt = new Date(
        Date.now() - rand(20, m.intervalDays + 60) * 86400_000,
      );
      const nextDueKm = lastDoneKm + m.intervalKm;
      const nextDueAt = new Date(lastDoneAt.getTime() + m.intervalDays * 86400_000);
      let status: "scheduled" | "upcoming" | "overdue" | "done" = "scheduled";
      const kmDiff = nextDueKm - v.odometerKm;
      const daysDiff = (nextDueAt.getTime() - Date.now()) / 86400_000;
      if (kmDiff < 0 || daysDiff < 0) status = "overdue";
      else if (kmDiff < 1500 || daysDiff < 21) status = "upcoming";
      else status = "scheduled";

      maintInserts.push({
        vehicleId: v.id,
        serviceType: m.type,
        serviceTypeAr: m.typeAr,
        intervalKm: m.intervalKm,
        intervalDays: m.intervalDays,
        lastDoneKm,
        lastDoneAt,
        nextDueKm,
        nextDueAt,
        status,
        estimatedCost: m.cost,
      });
    }
  }
  await db.insert(maintenanceTable).values(maintInserts);

  console.log("[seed] inserting diagnostic sessions, dtcs, telemetry...");
  const sessionInserts: Array<typeof diagnosticSessionsTable.$inferInsert> = [];
  for (const v of allVehicles) {
    const sessions = rand(1, 8);
    for (let i = 0; i < sessions; i++) {
      const startedAt = new Date(
        Date.now() - rand(0, 90) * 86400_000 - rand(0, 86_400_000),
      );
      const duration = rand(60, 1800);
      const endedAt = new Date(startedAt.getTime() + duration * 1000);
      sessionInserts.push({
        vehicleId: v.id,
        userId: v.userId,
        startedAt,
        endedAt,
        durationSec: duration,
        odometerKm: v.odometerKm - rand(0, 5000),
        dtcCount: 0,
        healthBefore: clamp(v.healthScore + rand(-5, 5), 0, 100),
        healthAfter: v.healthScore,
        status: "completed",
      });
    }
  }
  const insertedSessions = await db
    .insert(diagnosticSessionsTable)
    .values(sessionInserts)
    .returning();

  // a single active session for demo's lexus
  const lexus = demoVeh.find((v) => v.make === "Lexus");
  if (lexus) {
    await db.insert(diagnosticSessionsTable).values({
      vehicleId: lexus.id,
      userId: DEMO_USER_ID,
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
      endedAt: null,
      durationSec: null,
      odometerKm: lexus.odometerKm,
      dtcCount: 0,
      healthBefore: lexus.healthScore,
      healthAfter: null,
      status: "active",
    });
  }

  // DTC codes — distribute realistically
  console.log("[seed] inserting DTCs...");
  const dtcInserts: Array<typeof dtcCodesTable.$inferInsert> = [];
  for (const s of insertedSessions) {
    if (Math.random() > 0.55) continue; // many sessions have 0 dtcs
    const count = rand(1, 3);
    for (let i = 0; i < count; i++) {
      const cat = pick(dtcCatalog);
      const isCleared = Math.random() > 0.6;
      dtcInserts.push({
        sessionId: s.id,
        vehicleId: s.vehicleId,
        code: cat.code,
        status: isCleared ? "cleared" : "active",
        severity: cat.severity,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        possibleCauses: cat.causes,
        estimatedCostMin: cat.costMin,
        estimatedCostMax: cat.costMax,
        recommendedAction: cat.action,
        actionReasonAr: cat.actionReasonAr,
        detectedAt: s.startedAt,
        clearedAt: isCleared
          ? new Date(s.startedAt.getTime() + rand(1, 7) * 86400_000)
          : null,
      });
    }
  }
  // ensure demo vehicles have a few active DTCs
  if (demoVeh[1]) {
    for (const cat of [dtcCatalog[1], dtcCatalog[3]]) {
      dtcInserts.push({
        sessionId: null,
        vehicleId: demoVeh[1].id,
        code: cat.code,
        status: "active",
        severity: cat.severity,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        possibleCauses: cat.causes,
        estimatedCostMin: cat.costMin,
        estimatedCostMax: cat.costMax,
        recommendedAction: cat.action,
        actionReasonAr: cat.actionReasonAr,
        detectedAt: new Date(Date.now() - rand(1, 5) * 86400_000),
      });
    }
  }
  if (demoVeh[2]) {
    for (const cat of [dtcCatalog[3], dtcCatalog[7], dtcCatalog[10]]) {
      dtcInserts.push({
        sessionId: null,
        vehicleId: demoVeh[2].id,
        code: cat.code,
        status: "active",
        severity: cat.severity,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        possibleCauses: cat.causes,
        estimatedCostMin: cat.costMin,
        estimatedCostMax: cat.costMax,
        recommendedAction: cat.action,
        actionReasonAr: cat.actionReasonAr,
        detectedAt: new Date(Date.now() - rand(1, 8) * 86400_000),
      });
    }
  }
  if (dtcInserts.length) await db.insert(dtcCodesTable).values(dtcInserts);

  // update session dtc counts
  await db.execute(sql`UPDATE diagnostic_sessions s SET dtc_count = (SELECT count(*)::int FROM dtc_codes WHERE session_id = s.id)`);

  console.log("[seed] inserting telemetry samples...");
  // Telemetry samples for sessions of demo user only (volume control)
  const telemetryInserts: Array<typeof telemetryTable.$inferInsert> = [];
  for (const s of insertedSessions.filter((s) => s.userId === DEMO_USER_ID)) {
    const samples = 30;
    for (let i = 0; i < samples; i++) {
      const t = new Date(s.startedAt.getTime() + i * 30 * 1000);
      const baseRpm = 1500 + Math.sin(i / 4) * 600;
      telemetryInserts.push({
        time: t,
        vehicleId: s.vehicleId,
        sessionId: s.id,
        rpm: Math.round(baseRpm + rand(-100, 100)),
        speedKmh: Math.max(0, Math.round(60 + Math.sin(i / 3) * 40 + rand(-5, 5))),
        coolantTemp: Math.round(88 + Math.sin(i / 5) * 6),
        intakeTemp: rand(32, 48),
        batteryV: (13.8 + (Math.random() - 0.5) * 0.6).toFixed(2),
        fuelLevelPct: Math.max(5, 80 - Math.floor(i / 4)),
        engineLoad: rand(20, 65),
        throttlePos: rand(8, 60),
      });
    }
  }
  if (telemetryInserts.length)
    await db.insert(telemetryTable).values(telemetryInserts);

  console.log("[seed] inserting recommendations...");
  const recInserts: Array<typeof recommendationsTable.$inferInsert> = [];
  for (const v of demoVeh) {
    recInserts.push(
      {
        vehicleId: v.id,
        kind: "predictive_failure",
        severity: "warning",
        titleAr: "احتمال خلل قادم في مستشعر الأكسجين",
        descriptionAr:
          "بناءً على نمط استجابة المستشعر في آخر 3 جلسات، نتوقع خللاً خلال 1500-2500 كم القادمة. ننصح بالاستبدال الوقائي.",
        confidencePct: 78,
        suggestedAction: "استبدال مستشعر الأكسجين",
        suggestedCostSar: 650,
      },
      {
        vehicleId: v.id,
        kind: "maintenance_due",
        severity: "info",
        titleAr: "موعد تغيير زيت المحرك يقترب",
        descriptionAr:
          "بقي حوالي 600 كم على الموعد الموصى به لتغيير زيت المحرك بناءً على نمط قيادتك.",
        confidencePct: 95,
        suggestedAction: "حجز تغيير زيت",
        suggestedCostSar: 280,
      },
    );
    if (v.healthScore < 70) {
      recInserts.push({
        vehicleId: v.id,
        kind: "telemetry_anomaly",
        severity: "critical",
        titleAr: "ارتفاع غير طبيعي في حرارة المحرك",
        descriptionAr:
          "لاحظنا ارتفاعاً متكرراً في درجة حرارة المحرك خلال الرحلات الأخيرة. ننصح بفحص نظام التبريد فوراً.",
        confidencePct: 89,
        suggestedAction: "فحص نظام التبريد",
        suggestedCostSar: 450,
      });
    }
    recInserts.push({
      vehicleId: v.id,
      kind: "behavioral",
      severity: "info",
      titleAr: "نمط قيادة هادئ",
      descriptionAr:
        "أسلوب قيادتك يحافظ على عمر المحرك ويوفّر الوقود. أحسنت!",
      confidencePct: 82,
      suggestedAction: null,
      suggestedCostSar: null,
    });
  }
  await db.insert(recommendationsTable).values(recInserts);

  console.log("[seed] inserting health history...");
  const healthInserts: Array<typeof healthHistoryTable.$inferInsert> = [];
  for (const v of allVehicles) {
    let score = clamp(v.healthScore + rand(-15, 15), 30, 100);
    for (let d = 60; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86400_000);
      score = clamp(score + rand(-3, 2), 30, 100);
      healthInserts.push({
        vehicleId: v.id,
        date: date.toISOString().slice(0, 10),
        score,
      });
    }
    // ensure last value matches current
    const last = healthInserts[healthInserts.length - 1];
    if (last) last.score = v.healthScore;
  }
  // insert in chunks
  for (let i = 0; i < healthInserts.length; i += 500) {
    await db.insert(healthHistoryTable).values(healthInserts.slice(i, i + 500));
  }

  console.log("[seed] inserting bookings...");
  const bookingInserts: Array<typeof bookingsTable.$inferInsert> = [];
  const services = ["oil_change", "diagnostic_scan", "brake_service", "ac_service", "full_inspection", "battery_check"];
  for (const u of insertedUsers) {
    if (u.id === DEMO_ADMIN_ID) continue;
    const userVehicles = allVehicles.filter((v) => v.userId === u.id);
    if (!userVehicles.length) continue;
    const count = u.id === DEMO_USER_ID ? 5 : rand(0, 3);
    for (let i = 0; i < count; i++) {
      const w = pick(insertedWorkshops);
      const v = pick(userVehicles);
      const isPast = Math.random() > 0.5;
      const scheduledAt = isPast
        ? new Date(Date.now() - rand(1, 90) * 86400_000)
        : new Date(Date.now() + rand(1, 30) * 86400_000);
      const status = isPast
        ? pick(["completed", "completed", "completed", "cancelled"] as const)
        : pick(["pending", "confirmed", "confirmed", "in_progress"] as const);
      const serviceType = pick(services);
      bookingInserts.push({
        userId: u.id,
        vehicleId: v.id,
        workshopId: w.id,
        serviceType,
        serviceTypeAr: arabicServiceType(serviceType),
        scheduledAt,
        status,
        estimatedCost: rand(150, 800),
        finalCost: status === "completed" ? rand(150, 850) : null,
      });
    }
  }
  if (bookingInserts.length) await db.insert(bookingsTable).values(bookingInserts);

  console.log("[seed] inserting activity feed...");
  const activityInserts: Array<typeof activityTable.$inferInsert> = [];
  // for demo user, make a rich feed
  const insertedDtcs = await db.select().from(dtcCodesTable);
  const demoDtcs = insertedDtcs.filter((d) =>
    demoVeh.some((v) => v.id === d.vehicleId),
  );
  for (const d of demoDtcs.slice(0, 6)) {
    activityInserts.push({
      userId: DEMO_USER_ID,
      vehicleId: d.vehicleId,
      kind: d.status === "cleared" ? "dtc_cleared" : "dtc_detected",
      titleAr: `${d.status === "cleared" ? "تم مسح" : "اكتُشف"} كود ${d.code}`,
      subtitleAr: d.descriptionAr,
      severity:
        d.severity === "critical" || d.severity === "high"
          ? "critical"
          : d.severity === "low"
            ? "info"
            : "warning",
      occurredAt: d.detectedAt ?? new Date(),
    });
  }
  const demoSessions = insertedSessions.filter((s) => s.userId === DEMO_USER_ID);
  for (const s of demoSessions.slice(0, 5)) {
    const v = demoVeh.find((dv) => dv.id === s.vehicleId);
    activityInserts.push({
      userId: DEMO_USER_ID,
      vehicleId: s.vehicleId,
      kind: "diagnostic_session",
      titleAr: "جلسة تشخيص مكتملة",
      subtitleAr: v ? `${v.make} ${v.model}` : null,
      severity: "info",
      occurredAt: s.startedAt,
    });
  }
  for (const m of (await db.select().from(maintenanceTable)).filter(
    (m) => m.status === "done" && demoVeh.some((v) => v.id === m.vehicleId),
  ).slice(0, 3)) {
    activityInserts.push({
      userId: DEMO_USER_ID,
      vehicleId: m.vehicleId,
      kind: "maintenance_done",
      titleAr: `تم تسجيل ${m.serviceTypeAr}`,
      subtitleAr: null,
      severity: "success",
      occurredAt: m.lastDoneAt ?? new Date(),
    });
  }
  // some recent bookings
  const demoBookings = await db.select().from(bookingsTable);
  for (const b of demoBookings.filter((b) => b.userId === DEMO_USER_ID).slice(0, 3)) {
    activityInserts.push({
      userId: DEMO_USER_ID,
      vehicleId: b.vehicleId,
      kind: b.status === "completed" ? "booking_completed" : "booking_created",
      titleAr: b.status === "completed" ? `اكتمل حجز ${b.serviceTypeAr}` : `حجز جديد لـ ${b.serviceTypeAr}`,
      subtitleAr: null,
      severity: b.status === "completed" ? "success" : "info",
      occurredAt: b.createdAt ?? new Date(),
    });
  }
  await db.insert(activityTable).values(activityInserts);

  console.log("[seed] inserting revenue history...");
  const revenueInserts: Array<typeof revenueTable.$inferInsert> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    const grow = 11 - i;
    revenueInserts.push({
      month,
      subscriptionRevenue: 8500 + grow * 1200 + rand(-400, 600),
      commissionRevenue: 2200 + grow * 350 + rand(-100, 250),
      newSubscribers: 24 + grow * 5 + rand(-3, 8),
    });
  }
  await db.insert(revenueTable).values(revenueInserts);

  console.log("[seed] done.");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function arabicServiceType(t: string): string {
  const map: Record<string, string> = {
    oil_change: "تغيير زيت",
    full_inspection: "فحص شامل",
    brake_service: "صيانة مكابح",
    tire_rotation: "تدوير إطارات",
    ac_service: "صيانة مكيف",
    battery_check: "فحص بطارية",
    diagnostic_scan: "فحص أعطال",
    general: "صيانة عامة",
  };
  return map[t] ?? t;
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
