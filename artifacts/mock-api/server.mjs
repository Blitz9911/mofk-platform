/**
 * Mock API Server for MFK — local dev without PostgreSQL
 * Mirrors the real API routes with hardcoded demo data.
 * Run: node server.mjs
 */

import http from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load DTC Flat Lookup (10,061 codes) ─────────────────────────────────────
let DTC_FLAT = {};
try {
  DTC_FLAT = JSON.parse(readFileSync(join(__dirname, "dtc_lookup.json"), "utf8"));
  console.log(`[mock-api] Loaded ${Object.keys(DTC_FLAT).length} DTC codes`);
} catch (e) {
  console.warn("[mock-api] dtc_lookup.json not found, DTC flat lookup disabled");
}

const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

// ─── DTC Knowledge Base ───────────────────────────────────────────────────────

const DTC_DB = [
  {
    category: "DTC Code",
    code: "P0300",
    title: "P0300 - Random/Multiple Cylinder Misfire Detected",
    simple_arabic_explanation: "هذا الكود يعني وجود مشكلة (تفتفة) أو عدم احتراق كامل للبنزين في أكثر من سلندر (إسطوانة) داخل المكينة بشكل عشوائي. بتلاحظ رجفة في السيارة وهي واقفة أو ضعف في العزم وأنت تمشي، ولمبة المكينة ممكن ترمز أو تومض.",
    severity: "High",
    can_drive: "Limited Driving",
    possible_causes: [
      "تلف أو انتهاء العمر الافتراضي للبواجي (شمعات الإشعال)",
      "خلل في الكويلات (ملفات الإشعال) أو أسلاكها",
      "انسداد أو ضعف أداء بخاخات الوقود",
      "تهريب هواء في نظام السحب (Vacuum Leak)",
      "ضعف ضغط طرمبة البنزين أو انسداد فلتر الوقود",
    ],
    symptoms: [
      "رجفة واهتزاز واضح في المحرك (تفتفة) خاصة عند الوقوف",
      "ظهور لمبة فحص المحرك (Check Engine) بشكل وميض مستمر",
      "صعوبة أو تأخر في تشغيل السيارة وهي باردة",
      "ضعف ملحوظ في تسارع وعزم السيارة",
    ],
    inspection_steps: [
      "ربط جهاز الفحص وقراءة البيانات الحية (Live Data) لتحديد السلندرات التي تسجل الميسفاير",
      "فحص حالة البواجي والتأكد من خلوها من الزيوت أو الكربون الكثيف",
      "عمل اختبار تبديلي (Swap Test) للكويلات لمعرفة ما إذا كان العطل ينتقل مع الكويل",
      "قياس ضغط مسطرة البخاخات للتأكد من سلامة ضغط طرمبة البنزين",
    ],
    repair_actions: [
      "استبدال طقم البواجي (شمعات الإشعال) بالكامل",
      "استبدال الكويل التالف (ملف الإشعال) أو إصلاح ضفيرته المتضررة",
      "تنظيف البخاخات أو استبدال البخاخ المتعطل",
      "إصلاح خراطيش الهواء المقطوعة",
    ],
    risk_if_ignored: "استمرار القيادة يؤدي إلى وصول وقود غير محترق إلى الشكمان، مما يتسبب في ذوبان وتلف دبة التلوث (Catalytic Converter) ورفع تكلفة الإصلاح بشكل كبير.",
    related_codes: ["P0301", "P0302", "P0303", "P0304", "P0171"],
    keywords: ["p0300", "تفتفة", "ميسفاير", "misfire", "اهتزاز مكينة", "رجفة", "سلندر"],
  },
  {
    category: "DTC Code",
    code: "P0171",
    title: "P0171 - System Too Lean (Bank 1)",
    simple_arabic_explanation: "الكمبيوتر يقول إن المكينة يدخلها هواء زيادة أو إن البنزين اللي يوصلها قليل (الخلطة خفيفة). بتلاحظ كتمة في العزم، وتفتفة، وممكن تطفي السيارة وأنت واقف عند الإشارة، وتولع عندك لمبة المكينة.",
    severity: "Medium",
    can_drive: "Limited Driving",
    possible_causes: [
      "تهريب هواء من خراطيش نظام السحب (Vacuum Leak)",
      "اتساخ أو تلف حساس الهواء (MAF Sensor)",
      "ضعف في ضغط طرمبة البنزين أو انسداد الفلتر",
      "انسداد أو تلف في بخاخات الوقود لـ Bank 1",
      "تلف وجه ثلاجة المكينة (Intake Manifold Gasket)",
    ],
    symptoms: [
      "تفتفة واهتزاز في المحرك عند الوقوف (Rough Idle)",
      "كتمة وضعف تسارع السيارة عند الضغط على دواسة الوقود",
      "تأخر في تشغيل المحرك",
      "ظهور لمبة فحص المحرك (Check Engine Light)",
    ],
    inspection_steps: [
      "فحص قراءات قيم تعديل الوقود (Long Term & Short Term Fuel Trims) بجهاز الفحص",
      "تنظيف حساس الهواء (MAF) ببخاخ خاص والتحقق من قراءته",
      "رش بخاخ كاشف التهريب على خراطيش الهواء",
      "قياس ضغط طرمبة البنزين باستخدام ساعة القياس",
    ],
    repair_actions: [
      "تنظيف أو استبدال حساس الهواء (MAF)",
      "استبدال خراطيش الهواء المكسورة أو المقطوعة",
      "استبدال طرمبة البنزين أو صفاية البنزين",
      "استبدال وجه ثلاجة المكينة إذا ثبت وجود تهريب منه",
    ],
    risk_if_ignored: "إهمال المشكلة يسبب ارتفاع حرارة الاحتراق داخل السلندرات بسبب نقص الوقود، مما قد يؤدي إلى تلف البواجي، أو احتراق الصمامات (البلوف)، وتلف دبة التلوث.",
    related_codes: ["P0174", "P0101", "P0172", "P0175"],
    keywords: ["p0171", "lean", "خلطة خفيفة", "maf", "تهريب هواء", "vacuum leak", "بخاخات", "طرمبة بنزين"],
  },
  {
    category: "DTC Code",
    code: "P0420",
    title: "P0420 - Catalyst System Efficiency Below Threshold (Bank 1)",
    simple_arabic_explanation: "هذا الكود يعني إن دبة التلوث (فلتر الشكمان) ما عاد تصفي الغازات الضارة بالشكل المطلوب، إما لأنها انسدت، أو انتهى عمرها الافتراضي، أو تضررت بسبب تفتفة قديمة بالسيارة نزل بسببها بنزين غير محترق للشكمان وعدمها.",
    severity: "Medium",
    can_drive: "Yes",
    possible_causes: [
      "تلف أو انتهاء العمر الافتراضي لدبة التلوث (Catalytic Converter)",
      "خلل في قراءة حساس الأكسجين الخلفي (Downstream O2 Sensor)",
      "تهريب في شكمان السيارة قبل دبة التلوث أو حولها",
      "وصول بنزين غير محترق للدبة بسبب مشاكل ميسفاير سابقة",
    ],
    symptoms: [
      "ظهور لمبة تشيك إنجن بشكل مستمر",
      "خروج رائحة كربون قوية تشبه البيض الفاسد من العادم",
      "ضعف خفيف في عزم السيارة في السرعات العالية",
      "صوت حشرجة أو قعقعة من أسفل السيارة",
    ],
    inspection_steps: [
      "مقارنة قراءات الفولتية لحساس الأكسجين الأمامي والخلفي عبر جهاز الفحص (Live Data)",
      "استخدام جهاز قياس الحرارة بالليزر للتأكد من أن مخرج الدبة أعلى حرارة من مدخلها",
      "الفحص البصري للشكمان للتأكد من عدم وجود شروخ أو تهريب غازات",
    ],
    repair_actions: [
      "استبدال دبة التلوث (Catalytic Converter) بأخرى جديدة أو مجددة معتمدة",
      "استبدال حساس الأكسجين الخلفي التالف",
      "لحام وإصلاح أي تهريب في مواسير الشكمان",
      "إصلاح المسبب الرئيسي (البواجي أو تهريب الزيت) قبل تركيب دبة جديدة",
    ],
    risk_if_ignored: "إذا تطورت المشكلة إلى انسداد كامل في الدبة، ستحبس غازات العادم داخل المكينة مما يسبب كتمة شديدة وارتفاع حاد في حرارة المحرك قد يؤدي لتلفه.",
    related_codes: ["P0430", "P0135", "P0141"],
    keywords: ["p0420", "كتاليست", "دبة", "دبة التلوث", "catalytic", "شكمان", "catalyst", "أكسجين", "رائحة عادم"],
  },
  {
    category: "DTC Code",
    code: "P0700",
    title: "P0700 - Transmission Control System Malfunction",
    simple_arabic_explanation: "هذا الكود هو إشارة من كمبيوتر القير (علبة التروس) يقول فيها لكمبيوتر المكينة: 'عندي مشكلة'. بتلاحظ القير يمشع (نتعة قوية)، أو يعلق على تعشيقة معينة وما يغير (يدخل في وضع الحماية)، وتولع لمبة المكينة أو لمبة على شكل ترس.",
    severity: "High",
    can_drive: "Limited Driving",
    possible_causes: [
      "وجود عطل ميكانيكي أو كهربائي داخل القير",
      "نقص شديد في زيت القير أو اتساخه واحتراقه بالكامل",
      "تلف في صمامات التحكم (Shift Solenoids)",
      "مشكلة في ضفيرة القير (قطع أو تمليح في الفيش الرئيسي)",
      "خلل في كمبيوتر القير نفسه (TCM)",
    ],
    symptoms: [
      "تعليق القير على النمرة الثالثة وعدم التبديل (Limp Mode)",
      "نتعة أو ضربة قوية عند تغيير النمر",
      "تأخر كبير في استجابة القير عند الضغط على دواسة الوقود",
      "ارتفاع حرارة القير وظهور تنبيه بالطبلون",
    ],
    inspection_steps: [
      "الدخول بجهاز الفحص مباشرة على كمبيوتر القير (TCM) لقراءة الأكواد الفرعية",
      "فحص مستوى وعيار زيت القير ورائحته (للتأكد من عدم وجود رائحة حرق)",
      "فحص الفيش الرئيسي للقير والتحقق من التوصيلات الكهربائية",
    ],
    repair_actions: [
      "إصلاح العطل الفرعي المحدد (استبدال حساس سرعة القير أو بلف التغيير)",
      "تغيير زيت القير مع الفلتر والوجه",
      "إصلاح ضفيرة القير وتأمين التوصيلات الكهربائية",
      "توضيب القير أو استبداله بالكامل في حال تلف ميكانيكي",
    ],
    risk_if_ignored: "استمرار القيادة والقير في وضع الحماية (Limp Mode) يحول مشكلة كهربائية بسيطة إلى انهيار ميكانيكي كامل للقير يستدعي استبداله بالكامل بتكلفة باهظة.",
    related_codes: ["P0730", "P0750", "P0715", "P0218"],
    keywords: ["p0700", "قير", "transmission", "limp mode", "تعليق قير", "نتعة قير", "تروس", "تعشيقة"],
  },
  {
    category: "Symptom",
    code: "OVERHEAT",
    title: "ارتفاع حرارة المحرك فوق المعدل الطبيعي",
    simple_arabic_explanation: "حرارة السيارة ارتفعت ووصلت للخط الأحمر. هذا خطر حقيقي ومباشر على المكينة؛ استمرار القيادة وهي حارة بيخلي رأس المكينة يطعج أو تخلط السيارة زيت وماء وتخبط تماماً. لازم توقف فوراً بمكان آمن وتطفيها.",
    severity: "Critical",
    can_drive: "No",
    possible_causes: [
      "نقص شديد في سائل التبريد بسبب تهريب (في الرديتر، الخراطيش، أو طبة المكينة)",
      "تلف أو تعليق بلف الحرارة (Thermostat) وهو مغلق",
      "عطل في مراوح التبريد (توقف كامل أو ضعف السرعات)",
      "تلف طرمبة الماء (Water Pump)",
      "انسداد مجاري الرديتر بالأوساخ أو الصدأ",
    ],
    symptoms: [
      "ارتفاع مؤشر الحرارة إلى الخط الأحمر أو وميض لمبة الحرارة الحمراء",
      "خروج بخار ماء كثيف من تحت غطاء المحرك",
      "سماع صوت غليان ماء من جهة الرديتر",
      "ضعف مفاجئ في عزم السيارة وصوت طقطقة صمامات",
    ],
    inspection_steps: [
      "الانتظار حتى يبرد المحرك تماماً قبل فتح الغطاء لتجنب حروق البخار",
      "الفحص البصري للخراطيش والرديتر وقربة الماء للبحث عن آثار تهريب",
      "التحقق من عمل مراوح التبريد عند تشغيل المكيف",
      "فحص مستوى الزيت للتأكد من عدم تحوله للون الحليبي (دليل خلط الماء بالزيت)",
    ],
    repair_actions: [
      "إصلاح التهريب وتعبئة النظام بماء رديتر أصلي",
      "استبدال بلف الحرارة (Thermostat) وغطاء الرديتر",
      "استبدال مراوح التبريد أو الفيوز المحترق",
      "استبدال طرمبة الماء إذا كانت تسرب أو بها فضاوة",
    ],
    risk_if_ignored: "تلف ميكانيكي كامل للمحرك يتطلب توضيب كامل أو استبدال المكينة نتيجة انحناء رأس المحرك (Cylinder Head Warpage).",
    related_codes: ["P0128", "P0217", "P0480"],
    keywords: ["حرارة", "سخن", "overheat", "حار", "رديتر", "thermostat", "ترموستات", "طرمبة ماء", "water pump", "بخار"],
  },
  {
    category: "Warning Light",
    code: "OIL_PRESSURE",
    title: "إشارة انخفاض ضغط زيت المحرك",
    simple_arabic_explanation: "لمبة الزيت الحمراء (اللي تشبه إبريق الشاي) ولعت عندك بالطبلون. هذا أخطر تنبيه ممكن تشوفه في سيارتك؛ معناه الزيت ما قاعد يوصل بضغط كافي لأجزاء المكينة. لو تمشي عليها دقيقة واحدة زيادة، المكينة بتخبط تماماً. وقف فوراً ولا تشغلها!",
    severity: "Critical",
    can_drive: "No",
    possible_causes: [
      "نقص حاد وكبير في مستوى زيت المكينة",
      "تلف طرمبة الزيت (Oil Pump) وعجزها عن ضخ الزيت",
      "انسداد شخاط الزيت بسبب تراكم الأوساخ والتكلسات",
      "استخدام لزوجة زيت خاطئة أو خفيفة جداً",
      "عطل في حساس ضغط الزيت نفسه يعطي قراءة خاطئة",
    ],
    symptoms: [
      "ظهور اللمبة الحمراء للزيت بشكل مستمر أو وميض عند الوقوف",
      "سماع صوت طقطقة وخشونة واضح وقوي من أعلى المكينة",
      "رسالة تحذيرية: 'Engine Oil Pressure Low - Stop Engine'",
    ],
    inspection_steps: [
      "إيقاف السيارة فوراً بمكان آمن وإطفاء المحرك بدون أي تأخير",
      "سحب عيار الزيت والتحقق من مستوى الزيت وجودته",
      "البحث عن آثار تهريب زيت حاد تحت السيارة وفوق المكينة",
      "في الورشة: ربط ساعة قياس ضغط ميكانيكية مكان الحساس",
    ],
    repair_actions: [
      "إضافة زيت مكينة فوراً إذا كان النقص هو السبب",
      "استبدال حساس ضغط الزيت في حال كان العطل منه",
      "فك كارتير الزيت وتنظيف الشخاط من التكلسات",
      "استبدال طرمبة الزيت (Oil Pump) في حال ضعف ضغطها",
    ],
    risk_if_ignored: "تلف واحتكاك مباشر للأجزاء المعدنية داخل المحرك وصهر السبايك الميكانيكية وتخبيط المكينة بالكامل (Engine Seizure) خلال مسافة قصيرة جداً.",
    related_codes: ["P0520", "P0521", "P0522"],
    keywords: ["زيت", "ضغط زيت", "oil pressure", "لمبة زيت", "oil lamp", "طرمبة زيت", "تخبيط", "oil pump"],
  },
];

// ─── DTC Search Helper ────────────────────────────────────────────────────────

// Extract DTC code pattern from text (e.g. "P0300", "B1234", "C0040")
function extractCode(query) {
  const m = query.toUpperCase().match(/\b([PBCU][0-9A-F]{4})\b/);
  return m ? m[1] : null;
}

function searchDTC(query) {
  const q = query.toLowerCase();
  // 1. Exact code match in rich DB
  const byCode = DTC_DB.find(d => d.code && q.includes(d.code.toLowerCase()));
  if (byCode) return byCode;
  // 2. Keyword match in rich DB
  const byKeyword = DTC_DB.find(d => d.keywords && d.keywords.some(k => q.includes(k.toLowerCase())));
  if (byKeyword) return byKeyword;
  // 3. Any code pattern → flat lookup
  const code = extractCode(query);
  if (code && DTC_FLAT[code]) return { _flat: true, code, desc: DTC_FLAT[code] };
  return null;
}

function codeCategory(code) {
  const prefix = code[0].toUpperCase();
  return { P: "Powertrain — نظام المحرك والقير", B: "Body — هيكل السيارة", C: "Chassis — الهيكل والتعليق", U: "Network — شبكة الاتصال" }[prefix] || "Unknown";
}

function codeSeverityGuess(code) {
  const n = parseInt(code.slice(1), 16);
  if (code.startsWith("P0")) return n < 200 ? "🟠 عالية" : n < 400 ? "🟡 متوسطة" : "🟡 متوسطة";
  if (code.startsWith("P1")) return "🟡 متوسطة (خاص بالمصنّع)";
  return "⚪ غير محددة";
}

function formatFlatDTCReply(code, desc) {
  return `## ${code} — ${desc}

> لم أجد وصفاً عربياً تفصيلياً لهذا الكود في قاعدة بياناتي حالياً، لكن هذه المعلومات الأساسية:

---

### معلومات الكود
| | |
|---|---|
| **الكود** | \`${code}\` |
| **الوصف** | ${desc} |
| **الفئة** | ${codeCategory(code)} |
| **الخطورة المقدّرة** | ${codeSeverityGuess(code)} |

### ماذا أفعل؟
1. **لا تتجاهل الكود** — حتى لو السيارة تمشي بشكل طبيعي
2. **سجّل الكود** وراقب إذا ظهرت أعراض إضافية
3. **افحص السيارة في ورشة معتمدة** لتشخيص دقيق
4. **امسح الكود** بعد الإصلاح للتأكد من حل المشكلة

> 💡 **نصيحة MFK:** أرسل لي وصفاً لأعراض سيارتك (أصوات، ضعف في العزم، اهتزاز، إلخ) وسأساعدك أكثر في التشخيص.`;
}

function formatDTCReply(d) {
  const severityEmoji = { Critical: "🔴", High: "🟠", Medium: "🟡", Low: "🟢" }[d.severity] || "⚪";
  const driveEmoji = { No: "🚫", "Limited Driving": "⚠️", Yes: "✅" }[d.can_drive] || "⚠️";

  return `## ${d.title}

> ${d.simple_arabic_explanation}

---

### المعلومات الأساسية
| | |
|---|---|
| **الخطورة** | ${severityEmoji} ${d.severity === "Critical" ? "حرجة — توقف فوراً" : d.severity === "High" ? "عالية" : d.severity === "Medium" ? "متوسطة" : "منخفضة"} |
| **القيادة** | ${driveEmoji} ${d.can_drive === "No" ? "لا تقد السيارة إطلاقاً" : d.can_drive === "Limited Driving" ? "قيادة محدودة فقط — أصلح قريباً" : "يمكن القيادة بحذر"} |

---

### الأسباب المحتملة
${d.possible_causes.map(c => `- ${c}`).join("\n")}

### الأعراض
${d.symptoms.map(s => `- ${s}`).join("\n")}

### خطوات الفحص
${d.inspection_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

### الإصلاح المطلوب
${d.repair_actions.map(r => `- ${r}`).join("\n")}

---

> ⚠️ **خطر التجاهل:** ${d.risk_if_ignored}

${d.related_codes?.length ? `> **أكواد مرتبطة:** ${d.related_codes.join(" · ")}` : ""}`;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USER = {
  userId: DEMO_USER_ID,
  name: "محمد العمري",
  email: "demo@mfk.sa",
  phone: "+966501234567",
  role: "user",
};

const MOCK_VEHICLES = [
  {
    id: "v1",
    userId: DEMO_USER_ID,
    make: "تويوتا",
    model: "كامري",
    year: 2021,
    vin: "1HGBH41JXMN109186",
    plateNumber: "أ ب ج 1234",
    color: "أبيض",
    nickname: "الكامري",
    healthScore: 87,
    odometerKm: 52400,
    fuelType: "petrol",
    engineDisplacement: "2.5",
    transmissionType: "automatic",
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(2),
  },
  {
    id: "v2",
    userId: DEMO_USER_ID,
    make: "هيونداي",
    model: "سوناتا",
    year: 2020,
    vin: "5NPEH4J3XDH123456",
    plateNumber: "د هـ و 5678",
    color: "أسود",
    nickname: "السوناتا",
    healthScore: 72,
    odometerKm: 81200,
    fuelType: "petrol",
    engineDisplacement: "2.0",
    transmissionType: "automatic",
    isActive: true,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(5),
  },
];

const MOCK_DTC_CODES = [
  {
    id: "dtc1",
    vehicleId: "v1",
    code: "P0420",
    descriptionAr: "كفاءة محفز العادم أقل من الحد المطلوب — بنك 1",
    severity: "medium",
    status: "active",
    systemAr: "نظام العادم",
    estimatedRepairCostSar: 850,
    detectedAt: daysAgo(3),
  },
  {
    id: "dtc2",
    vehicleId: "v2",
    code: "P0301",
    descriptionAr: "إشكالية في اشتعال سلندر رقم 1",
    severity: "high",
    status: "active",
    systemAr: "نظام الإشتعال",
    estimatedRepairCostSar: 1200,
    detectedAt: daysAgo(7),
  },
];

const MOCK_MAINTENANCE = [
  {
    id: "m1",
    vehicleId: "v1",
    taskAr: "تغيير زيت المحرك",
    status: "upcoming",
    dueDateEstimate: daysAgo(-14),
    intervalKm: 5000,
    lastDoneKm: 47400,
    estimatedCostSar: 180,
  },
  {
    id: "m2",
    vehicleId: "v1",
    taskAr: "فحص الفرامل الأمامية",
    status: "overdue",
    dueDateEstimate: daysAgo(10),
    intervalKm: null,
    lastDoneKm: null,
    estimatedCostSar: 250,
  },
  {
    id: "m3",
    vehicleId: "v2",
    taskAr: "تبديل مرشح الهواء",
    status: "upcoming",
    dueDateEstimate: daysAgo(-7),
    intervalKm: 15000,
    lastDoneKm: 66200,
    estimatedCostSar: 120,
  },
];

const MOCK_WORKSHOPS = [
  {
    id: "w1",
    nameAr: "ورشة النجمة للصيانة",
    cityAr: "الرياض",
    districtAr: "العليا",
    phone: "+966114567890",
    rating: 4.8,
    reviewCount: 142,
    specialtiesAr: ["ميكانيكا", "كهرباء", "تكييف"],
    isVerified: true,
    lat: 24.774265,
    lng: 46.738586,
    imageUrl: null,
    openingHour: 8,
    closingHour: 21,
    priceLevel: 2,
  },
  {
    id: "w2",
    nameAr: "مركز الأمين للسيارات",
    cityAr: "الرياض",
    districtAr: "الملقا",
    phone: "+966114112233",
    rating: 4.5,
    reviewCount: 98,
    specialtiesAr: ["ميكانيكا", "فحص دوري", "تغيير زيت"],
    isVerified: true,
    lat: 24.807370,
    lng: 46.670441,
    imageUrl: null,
    openingHour: 9,
    closingHour: 22,
    priceLevel: 1,
  },
  {
    id: "w3",
    nameAr: "ورشة الخليج المتخصصة",
    cityAr: "جدة",
    districtAr: "السلامة",
    phone: "+966126789012",
    rating: 4.7,
    reviewCount: 203,
    specialtiesAr: ["سمكرة", "دهانات", "ميكانيكا"],
    isVerified: true,
    lat: 21.485811,
    lng: 39.192505,
    imageUrl: null,
    openingHour: 8,
    closingHour: 20,
    priceLevel: 2,
  },
];

const MOCK_BOOKINGS = [
  {
    id: "b1",
    userId: DEMO_USER_ID,
    vehicleId: "v1",
    workshopId: "w1",
    status: "confirmed",
    scheduledAt: daysAgo(-3),
    serviceAr: "تغيير زيت المحرك",
    notesAr: null,
    estimatedCostSar: 180,
    workshop: MOCK_WORKSHOPS[0],
    vehicle: MOCK_VEHICLES[0],
    createdAt: daysAgo(2),
  },
];

const MOCK_ACTIVITY = [
  {
    id: "a1",
    kind: "dtc_detected",
    titleAr: "عطل جديد: P0420",
    subtitleAr: "كفاءة محفز العادم — تويوتا كامري",
    vehicleId: "v1",
    severity: "medium",
    occurredAt: daysAgo(3),
  },
  {
    id: "a2",
    kind: "maintenance_reminder",
    titleAr: "تذكير: تغيير الزيت",
    subtitleAr: "موعد تغيير زيت تويوتا كامري اقترب",
    vehicleId: "v1",
    severity: null,
    occurredAt: daysAgo(2),
  },
  {
    id: "a3",
    kind: "booking_confirmed",
    titleAr: "تأكيد الحجز في ورشة النجمة",
    subtitleAr: "تغيير زيت المحرك — بعد 3 أيام",
    vehicleId: "v1",
    severity: null,
    occurredAt: daysAgo(2),
  },
  {
    id: "a4",
    kind: "dtc_detected",
    titleAr: "عطل: P0301 — مهم",
    subtitleAr: "إشكالية اشتعال سلندر 1 — هيونداي سوناتا",
    vehicleId: "v2",
    severity: "high",
    occurredAt: daysAgo(7),
  },
];

const MOCK_HEALTH_TREND = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10),
  score: Math.min(100, Math.max(60, 80 + Math.round(Math.sin(i * 0.4) * 8) + Math.round(Math.random() * 4))),
}));

const MOCK_PLANS = [
  {
    id: "plan-basic",
    nameAr: "الأساسية",
    nameEn: "Basic",
    tier: "basic",
    priceMonthlySar: 0,
    priceYearlySar: null,
    isPopular: false,
    featuresAr: [
      "قراءة أكواد الأعطال (OBD2)",
      "مسح لمبة المحرك",
      "البيانات الحية الأساسية",
      "تفسير الأعطال باللغة العربية",
    ],
    featuresEn: ["Read fault codes", "Clear engine light", "Basic live data", "Arabic fault explanation"],
    maxVehicles: 1,
  },
  {
    id: "plan-pro",
    nameAr: "برو",
    nameEn: "Pro",
    tier: "pro",
    priceMonthlySar: 49,
    priceYearlySar: 470,
    isPopular: true,
    featuresAr: [
      "كل مميزات الأساسية",
      "تنبيهات الصيانة الذكية",
      "المساعد الذكي (AI)",
      "توصيات مخصصة",
      "تقارير شهرية",
    ],
    featuresEn: ["All Basic features", "Smart maintenance alerts", "AI Assistant", "Custom recommendations", "Monthly reports"],
    maxVehicles: 3,
  },
  {
    id: "plan-pro-plus",
    nameAr: "الأسطول",
    nameEn: "Fleet",
    tier: "pro_plus",
    priceMonthlySar: 129,
    priceYearlySar: 1190,
    isPopular: false,
    featuresAr: [
      "كل مميزات برو",
      "حتى 10 مركبات",
      "لوحة تحكم الأسطول",
      "تقارير متقدمة",
      "دعم أولوية",
    ],
    featuresEn: ["All Pro features", "Up to 10 vehicles", "Fleet dashboard", "Advanced reports", "Priority support"],
    maxVehicles: 10,
  },
];

const MOCK_SUBSCRIPTION = {
  id: "sub1",
  userId: DEMO_USER_ID,
  tier: "pro",
  status: "active",
  billingCycle: "monthly",
  currentPeriodEnd: daysAgo(-25),
  plan: MOCK_PLANS[1],
};

const MOCK_DASHBOARD_OVERVIEW = {
  vehicleCount: 2,
  activeDtcCount: 2,
  criticalDtcCount: 1,
  upcomingMaintenanceCount: 3,
  overdueMaintenanceCount: 1,
  avgHealthScore: 79,
  upcomingBookingCount: 1,
  totalSessionsLast30d: 8,
  kmDrivenLast30d: 1240,
  estimatedSavingsSar: 1240,
};

const MOCK_DIAGNOSTIC_SESSIONS = [
  {
    id: "ds1",
    userId: DEMO_USER_ID,
    vehicleId: "v1",
    status: "completed",
    odometerKm: 52400,
    healthScore: 87,
    startedAt: daysAgo(3),
    endedAt: daysAgo(3),
    dtcCount: 1,
  },
  {
    id: "ds2",
    userId: DEMO_USER_ID,
    vehicleId: "v2",
    status: "completed",
    odometerKm: 81200,
    healthScore: 72,
    startedAt: daysAgo(7),
    endedAt: daysAgo(7),
    dtcCount: 1,
  },
];

// ─── Fuel Mock Data ───────────────────────────────────────────────────────────

let fuelLogIdCounter = 20;
const generateFuelLogs = () => {
  const logs = [];
  // Camry (v1) — 12 fill-ups over 3 months
  const camryFills = [
    { daysAgo: 2,  km: 52400, liters: 45.0, ppl: 2.18, grade: "91", station: "محطة الوطنية — العليا" },
    { daysAgo: 16, km: 51200, liters: 43.5, ppl: 2.18, grade: "91", station: "محطة أرامكو — الملقا" },
    { daysAgo: 29, km: 50100, liters: 42.0, ppl: 2.18, grade: "91", station: null },
    { daysAgo: 43, km: 49000, liters: 44.0, ppl: 2.18, grade: "91", station: "محطة الوطنية — العليا" },
    { daysAgo: 57, km: 47850, liters: 41.5, ppl: 2.18, grade: "91", station: null },
    { daysAgo: 72, km: 46700, liters: 46.0, ppl: 2.18, grade: "91", station: "محطة أرامكو — النخيل" },
    { daysAgo: 86, km: 45500, liters: 43.0, ppl: 2.06, grade: "91", station: null },
    { daysAgo: 100,km: 44300, liters: 42.5, ppl: 2.06, grade: "91", station: "محطة الوطنية — العليا" },
  ];
  // Sonata (v2) — fills with slightly worse consumption
  const sonataFills = [
    { daysAgo: 5,  km: 81200, liters: 52.0, ppl: 2.18, grade: "91", station: "محطة أرامكو — الورود" },
    { daysAgo: 21, km: 79900, liters: 50.5, ppl: 2.18, grade: "91", station: null },
    { daysAgo: 38, km: 78600, liters: 51.0, ppl: 2.18, grade: "95", station: "محطة الوطنية — السلامة" },
    { daysAgo: 55, km: 77200, liters: 49.5, ppl: 2.43, grade: "95", station: null },
    { daysAgo: 72, km: 75900, liters: 53.0, ppl: 2.43, grade: "95", station: "محطة أرامكو — الياسمين" },
    { daysAgo: 90, km: 74500, liters: 50.0, ppl: 2.43, grade: "95", station: null },
  ];

  camryFills.forEach((f, i) => {
    const totalSar = parseFloat((f.liters * f.ppl).toFixed(2));
    const prevLog = camryFills[i + 1];
    const dist = prevLog ? f.km - prevLog.km : null;
    logs.push({
      id: `fl${fuelLogIdCounter++}`,
      vehicleId: "v1",
      filledAt: daysAgo(f.daysAgo),
      odometerKm: f.km,
      liters: f.liters,
      pricePerLiterSar: f.ppl,
      totalCostSar: totalSar,
      fuelGrade: f.grade,
      stationNameAr: f.station,
      isFull: true,
      notes: null,
      consumption: dist ? {
        distanceKm: dist,
        consumptionL100km: parseFloat(((f.liters / dist) * 100).toFixed(2)),
        kmPerLiter: parseFloat((dist / f.liters).toFixed(2)),
      } : null,
      createdAt: daysAgo(f.daysAgo),
    });
  });

  sonataFills.forEach((f, i) => {
    const totalSar = parseFloat((f.liters * f.ppl).toFixed(2));
    const prevLog = sonataFills[i + 1];
    const dist = prevLog ? f.km - prevLog.km : null;
    logs.push({
      id: `fl${fuelLogIdCounter++}`,
      vehicleId: "v2",
      filledAt: daysAgo(f.daysAgo),
      odometerKm: f.km,
      liters: f.liters,
      pricePerLiterSar: f.ppl,
      totalCostSar: totalSar,
      fuelGrade: f.grade,
      stationNameAr: f.station,
      isFull: true,
      notes: null,
      consumption: dist ? {
        distanceKm: dist,
        consumptionL100km: parseFloat(((f.liters / dist) * 100).toFixed(2)),
        kmPerLiter: parseFloat((dist / f.liters).toFixed(2)),
      } : null,
      createdAt: daysAgo(f.daysAgo),
    });
  });

  // Sort desc by filledAt
  return logs.sort((a, b) => new Date(b.filledAt) - new Date(a.filledAt));
};

let MOCK_FUEL_LOGS = generateFuelLogs();

const computeFuelStats = (logs, period) => {
  const now = new Date();
  let since;
  switch (period) {
    case "week": since = new Date(now - 7 * 86400000); break;
    case "year": since = new Date(now.getFullYear(), 0, 1); break;
    case "all":  since = new Date(0); break;
    default:     since = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const filtered = logs.filter(l => new Date(l.filledAt) >= since);
  const totalLiters = parseFloat(filtered.reduce((s, l) => s + l.liters, 0).toFixed(2));
  const totalCostSar = parseFloat(filtered.reduce((s, l) => s + l.totalCostSar, 0).toFixed(2));
  const withConsumption = filtered.filter(l => l.consumption);
  const avgL100 = withConsumption.length
    ? parseFloat((withConsumption.reduce((s, l) => s + l.consumption.consumptionL100km, 0) / withConsumption.length).toFixed(2))
    : null;
  // Daily trend
  const dayMap = {};
  filtered.forEach(l => {
    const day = l.filledAt.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { liters: 0, costSar: 0, fills: 0 };
    dayMap[day].liters += l.liters;
    dayMap[day].costSar += l.totalCostSar;
    dayMap[day].fills++;
  });
  const trendByDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, liters: parseFloat(v.liters.toFixed(2)), costSar: parseFloat(v.costSar.toFixed(2)), fills: v.fills }));

  return {
    totalLiters,
    totalCostSar,
    avgConsumptionL100km: avgL100,
    avgKmPerLiter: avgL100 ? parseFloat((100 / avgL100).toFixed(2)) : null,
    fillCount: filtered.length,
    trendByDay,
  };
};

const MOCK_RECOMMENDATIONS = [
  {
    id: "r1",
    vehicleId: "v1",
    titleAr: "استبدال محفز العادم",
    descriptionAr: "كفاءة محفز العادم منخفضة (P0420). يُنصح بالفحص والاستبدال إذا لزم.",
    urgency: "medium",
    estimatedCostSar: 850,
    relatedDtcCode: "P0420",
    createdAt: daysAgo(3),
  },
  {
    id: "r2",
    vehicleId: "v1",
    titleAr: "تغيير زيت المحرك",
    descriptionAr: "موعد تغيير الزيت اقترب. الزيت الحالي بدأ يفقد خصائصه.",
    urgency: "low",
    estimatedCostSar: 180,
    relatedDtcCode: null,
    createdAt: daysAgo(2),
  },
  {
    id: "r3",
    vehicleId: "v2",
    titleAr: "فحص نظام الإشتعال",
    descriptionAr: "كود P0301 يشير لمشكلة في سلندر 1. يُنصح بفحص الشمعة والكابل فوراً.",
    urgency: "high",
    estimatedCostSar: 1200,
    relatedDtcCode: "P0301",
    createdAt: daysAgo(7),
  },
];

// ─── Router ───────────────────────────────────────────────────────────────────

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function handleRoute(url, method, body) {
  const path = url.split("?")[0];

  // Auth
  if (path === "/api/auth/me" && method === "GET") return [200, MOCK_USER];
  if (path === "/api/auth/login" && method === "POST") return [200, MOCK_USER];
  if (path === "/api/auth/register" && method === "POST") return [201, MOCK_USER];

  // Dashboard
  if (path === "/api/dashboard/overview") return [200, MOCK_DASHBOARD_OVERVIEW];
  if (path === "/api/dashboard/recent-activity") return [200, MOCK_ACTIVITY];
  if (path === "/api/dashboard/health-trend") return [200, MOCK_HEALTH_TREND];

  // Vehicles
  if (path === "/api/vehicles" && method === "GET") return [200, MOCK_VEHICLES];
  if (path.startsWith("/api/vehicles/")) {
    const id = path.split("/")[3];
    const v = MOCK_VEHICLES.find(v => v.id === id);
    if (v) return [200, v];
    return [404, { error: "المركبة غير موجودة" }];
  }

  // DTC codes
  if (path === "/api/dtc") return [200, MOCK_DTC_CODES];
  if (path.startsWith("/api/dtc/")) return [200, MOCK_DTC_CODES[0]];
  if (path === "/api/dtc/interpret" && method === "POST") {
    return [200, { code: body?.code || "P0420", explanationAr: "مشكلة في كفاءة المحفز. يحتاج فحص نظام العادم والأكسجين.", severity: "medium" }];
  }

  // Diagnostics
  if (path === "/api/diagnostics") return [200, MOCK_DIAGNOSTIC_SESSIONS];
  if (path.startsWith("/api/diagnostics/")) return [200, MOCK_DIAGNOSTIC_SESSIONS[0]];

  // Maintenance
  if (path === "/api/maintenance") return [200, MOCK_MAINTENANCE];

  // Workshops
  if (path === "/api/workshops") return [200, MOCK_WORKSHOPS];
  if (path.startsWith("/api/workshops/")) {
    const id = path.split("/")[3];
    const w = MOCK_WORKSHOPS.find(w => w.id === id);
    if (w) return [200, w];
    return [404, { error: "الورشة غير موجودة" }];
  }

  // Bookings
  if (path === "/api/bookings") return [200, MOCK_BOOKINGS];

  // Recommendations
  if (path === "/api/recommendations") return [200, MOCK_RECOMMENDATIONS];

  // Subscriptions
  if (path === "/api/subscriptions/plans") return [200, MOCK_PLANS];
  if (path === "/api/subscriptions/my") return [200, MOCK_SUBSCRIPTION];

  // ─── Fuel ───────────────────────────────────────────────────────────────────
  if (path === "/api/fuel" && method === "GET") {
    const vehicleId = new URL("http://x" + url).searchParams.get("vehicleId");
    const filtered = vehicleId ? MOCK_FUEL_LOGS.filter(l => l.vehicleId === vehicleId) : MOCK_FUEL_LOGS;
    return [200, { logs: filtered, total: filtered.length }];
  }
  if (path === "/api/fuel/stats" && method === "GET") {
    const params = new URL("http://x" + url).searchParams;
    const vehicleId = params.get("vehicleId");
    const period = params.get("period") || "month";
    const filtered = vehicleId ? MOCK_FUEL_LOGS.filter(l => l.vehicleId === vehicleId) : MOCK_FUEL_LOGS;
    return [200, computeFuelStats(filtered, period)];
  }
  if (path === "/api/fuel" && method === "POST") {
    const { vehicleId, odometerKm, liters, pricePerLiterSar, fuelGrade, stationNameAr, isFull, notes, filledAt } = body;
    const totalCostSar = parseFloat((liters * pricePerLiterSar).toFixed(2));
    const prevLog = MOCK_FUEL_LOGS.find(l => l.vehicleId === vehicleId);
    const dist = prevLog ? odometerKm - prevLog.odometerKm : null;
    const newLog = {
      id: `fl${fuelLogIdCounter++}`,
      vehicleId,
      filledAt: filledAt || new Date().toISOString(),
      odometerKm,
      liters,
      pricePerLiterSar,
      totalCostSar,
      fuelGrade: fuelGrade || "91",
      stationNameAr: stationNameAr || null,
      isFull: isFull !== false,
      notes: notes || null,
      consumption: dist && dist > 0 ? {
        distanceKm: dist,
        consumptionL100km: parseFloat(((liters / dist) * 100).toFixed(2)),
        kmPerLiter: parseFloat((dist / liters).toFixed(2)),
      } : null,
      createdAt: new Date().toISOString(),
    };
    MOCK_FUEL_LOGS.unshift(newLog);
    return [201, newLog];
  }
  if (path.startsWith("/api/fuel/") && method === "DELETE") {
    const id = path.split("/")[3];
    const before = MOCK_FUEL_LOGS.length;
    MOCK_FUEL_LOGS = MOCK_FUEL_LOGS.filter(l => l.id !== id);
    if (MOCK_FUEL_LOGS.length === before) return [404, { error: "غير موجود" }];
    return [200, { success: true }];
  }

  // ─── AI Chat ─────────────────────────────────────────────────────────────────
  if (path === "/api/ai/chat" && method === "POST") {
    const msg = (body?.message || "").toLowerCase();
    const vehicleId = body?.vehicleId;
    const vehicle = vehicleId ? MOCK_VEHICLES.find(v => v.id === vehicleId) : null;
    const vName = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : null;

    let reply = "";
    let suggestedActions = [];

    // ── Search DTC Knowledge Base first ──────────────────────────────────────
    const dtcMatch = searchDTC(body?.message || "");
    if (dtcMatch) {
      if (dtcMatch._flat) {
        reply = formatFlatDTCReply(dtcMatch.code, dtcMatch.desc);
      } else {
        reply = formatDTCReply(dtcMatch);
        if (vName) reply = reply.replace("## ", `## 🚗 ${vName} — `);
      }
      suggestedActions = [
        { labelAr: "احجز ورشة لإصلاحها", kind: "book_workshop" },
        { labelAr: "عرض سجل الأعطال", kind: "view_dtc" },
      ];
      return [200, { reply, suggestedActions }];
    }

    if (msg.includes("زيت") || msg.includes("oil change") || msg.includes("غير زيت")) {
      reply = `## تغيير زيت المحرك ${vName ? `— ${vName}` : ""}\n\n### متى تغير الزيت؟\n| نوع الزيت | كل كم |\n|---|---|\n| معدني | 5,000 كم |\n| نصف اصطناعي | 7,500 كم |\n| اصطناعي كامل | 10,000–15,000 كم |\n\n${vehicle ? `سيارتك الحالية عند **${vehicle.odometerKm.toLocaleString()} كم** — ` : ""}الزيت الاصطناعي موصى به لمعظم السيارات الحديثة.\n\n### علامات الزيت المحتاج تغيير:\n- لون الزيت أسود داكن وكثيف\n- صوت طقطقة خفيف عند التشغيل\n- رائحة محروق داخل الكابينة\n\n> **التكلفة التقريبية:** 150–350 ريال شامل الزيت والفلتر`;
      suggestedActions = [
        { labelAr: "جدول صيانة دورية", kind: "schedule_maintenance" },
        { labelAr: "احجز ورشة", kind: "book_workshop" },
      ];
    } else if (msg.includes("لمبة") || msg.includes("مكينة") || msg.includes("check engine") || msg.includes("p0") || msg.includes("كود")) {
      reply = `## فهم لمبة المحرك (Check Engine) ⚠️\n\nلمبة المحرك تضيء عند وجود كود عطل (DTC) في نظام الإدارة الإلكترونية.\n\n### مستويات الخطورة:\n- 🟢 **منخفض** — يمكن الاستمرار والفحص قريباً (مثل: P0420 كفاءة المحفز)\n- 🟡 **متوسط** — فحص خلال أسبوع (مثل: P0171 خلط الوقود)\n- 🔴 **عالي** — توقف فوري (مثل: P0301 إشعال اسطوانة)\n\n### كيف تفهم الكود؟\nيمكنك استخدام جهاز **MFK** لقراءة الكود مباشرة والحصول على شرح بالعربية!\n\n> 💡 أرسل لي رقم الكود (مثل P0420) وسأشرح لك وش يعني وكم تكلفة إصلاحه`;
      suggestedActions = [
        { labelAr: "عرض أكواد الأعطال", kind: "view_dtc" },
        { labelAr: "فتح جلسة تشخيص", kind: "view_vehicle" },
      ];
    } else if (msg.includes("برك") || msg.includes("فرامل") || msg.includes("brake")) {
      reply = `## نظام الفرامل 🛑\n\n### علامات الفرامل المحتاجة صيانة:\n- **صوت صرير أو خرخرة** عند الضغط — تآكل في الـ pads\n- **اهتزاز عجلة القيادة** عند الفرملة — تشوه في الدسكات\n- **السيارة تشد لجهة** عند الفرملة — مشكلة في كاليبر\n- **مسافة توقف طويلة** — تآكل شديد أو هواء في السائل\n\n### تكاليف تقريبية:\n| القطعة | التكلفة |\n|---|---|\n| تبديل فراميل أمامية | 300–600 ريال |\n| تبديل دسكات | 400–900 ريال |\n| سائل فرامل | 80–150 ريال |\n\n> ⚠️ **الفرامل مسألة سلامة** — لا تتأجل إصلاحها`;
      suggestedActions = [
        { labelAr: "احجز ورشة فوراً", kind: "book_workshop" },
      ];
    } else if (msg.includes("حجز") || msg.includes("ورشة") || msg.includes("موعد")) {
      reply = `## حجز موعد في ورشة 🔧\n\nيمكنني مساعدتك في إيجاد ورشة معتمدة قريبة منك.\n\n### الورش المتاحة الآن:\n1. **مركز النخيل للسيارات** — الرياض، حي العليا ⭐ 4.8\n2. **ورشة الدقة** — الرياض، حي الملز ⭐ 4.6\n3. **مركز الخبراء التقني** — الرياض، حي الروضة ⭐ 4.7\n\n### مزايا الحجز عبر MFK:\n- ✅ أسعار شفافة قبل الحجز\n- ✅ تقرير صيانة كامل بعد الانتهاء\n- ✅ ضمان على الخدمة`;
      suggestedActions = [
        { labelAr: "عرض جميع الورش", kind: "book_workshop" },
        { labelAr: "احجز الآن", kind: "book_workshop" },
      ];
    } else if (msg.includes("صيانة") || msg.includes("maintenance")) {
      reply = `## جدول الصيانة الدورية 📅\n\n${vName ? `لسيارتك **${vName}** ` : ""}هذه الصيانات الأساسية:\n\n### كل 5,000–10,000 كم:\n- 🛢️ تغيير الزيت وفلتره\n- 🔍 فحص مستوى السوائل\n\n### كل 20,000 كم:\n- 🌬️ فلتر الهواء\n- ⚡ فحص البطارية والشحن\n\n### كل 40,000 كم:\n- 🔩 فلتر الوقود\n- 🕯️ شمعات الإشعال (حسب النوع)\n\n### كل 60,000 كم:\n- ⚙️ سير التوقيت (حسب الموديل)\n- 🚗 سيور الإكسسوار\n\n> استخدم تطبيق MFK لتفعيل تنبيهات الصيانة الذكية`;
      suggestedActions = [
        { labelAr: "جدول صيانتي", kind: "schedule_maintenance" },
        { labelAr: "احجز صيانة دورية", kind: "book_workshop" },
      ];
    } else if (msg.includes("بطاري") || msg.includes("battery") || msg.includes("شحن") || msg.includes("كهرب")) {
      reply = `## نظام الكهرباء والبطارية 🔋\n\n### علامات البطارية الضعيفة:\n- بطء في تشغيل المحرك صباحاً\n- الأضواء تبدو خافتة\n- تنبيه البطارية على لوحة العدادات\n\n### عمر البطارية الطبيعي:\nمن **3 إلى 5 سنوات** حسب الاستخدام ودرجة الحرارة.\n\n### فحص البطارية مجاناً:\nيمكن لجهاز MFK قياس **جهد البطارية في الوقت الفعلي** — الجهد الطبيعي بين 12.4–12.8V وقت الإيقاف، و 13.7–14.7V وقت التشغيل.\n\n> **التكلفة التقريبية للاستبدال:** 250–600 ريال`;
      suggestedActions = [
        { labelAr: "فحص بيانات السيارة", kind: "view_vehicle" },
      ];
    } else if (msg.includes("وقود") || msg.includes("بنزين") || msg.includes("fuel") || msg.includes("استهلاك")) {
      reply = `## استهلاك الوقود ⛽\n\n${vName ? `لسيارتك **${vName}**:\n` : ""}### معدلات استهلاك طبيعية:\n- **المدينة:** 10–14 لتر/100كم\n- **الطريق السريع:** 7–10 لتر/100كم\n- **مختلط:** 9–12 لتر/100كم\n\n### كيف توفر الوقود؟\n1. 🚗 حافظ على ضغط الإطارات الصحيح\n2. 💨 تجنب التسريع المفاجئ\n3. 🌡️ استخدم الكروز كنترول في الطرق السريعة\n4. 🔧 صيانة دورية منتظمة\n\n> جهاز MFK يحسب استهلاكك الفعلي ويعطيك نصائح مخصصة`;
      suggestedActions = [
        { labelAr: "سجل تعبئة وقود", kind: "view_vehicle" },
        { labelAr: "إحصائيات الوقود", kind: "view_vehicle" },
      ];
    } else if (msg.includes("إطار") || msg.includes("طار") || msg.includes("ضغط") || msg.includes("tyre") || msg.includes("tire")) {
      reply = `## الإطارات وضغط الهواء 🔄\n\n### الضغط الصحيح:\nعادة بين **32–36 PSI** — راجع الملصق على باب السيارة أو دليل المالك.\n\n### متى تغير الإطارات؟\n- عمق الخرم أقل من **1.6 مم** (اختبار العملة)\n- عمر الإطار تجاوز **5 سنوات**\n- ظهور تشققات أو بروزات جانبية\n\n### نصائح مهمة:\n- ✅ فحص الضغط كل **أسبوعين**\n- ✅ توازن وزوايا كل **10,000 كم**\n- ✅ تبديل الإطارات الأمامية والخلفية كل 10,000 كم\n\n> **تكلفة الإطارات:** 200–600 ريال للإطار الواحد حسب المقاس والماركة`;
    } else {
      reply = `## مرحباً! أنا مساعدك الذكي من MFK 🚗\n\n${vName ? `رأيت أنك تسأل عن **${vName}**.\n\n` : ""}يمكنني مساعدتك في:\n\n- 🔍 **تشخيص الأعطال** وشرح أكواد OBD\n- 🛢️ **جدول الصيانة** المناسب لسيارتك\n- 💰 **تقدير تكاليف** الإصلاح والصيانة\n- 🔧 **حجز ورش** معتمدة قريبة منك\n- ⛽ **تحليل استهلاك** الوقود\n\nما الذي تريد معرفته عن سيارتك؟`;
      suggestedActions = [
        { labelAr: "حالة سيارتي", kind: "view_vehicle" },
        { labelAr: "مواعيد الصيانة", kind: "schedule_maintenance" },
      ];
    }

    return [200, { reply, suggestedActions }];
  }

  // Health
  if (path === "/api/health") return [200, { status: "ok" }];

  // Admin
  if (path === "/api/admin/stats") return [200, {
    totalUsers: 20483,
    totalVehicles: 31204,
    activeSessions: 847,
    monthlyRevenueSar: 284500,
    newUsersToday: 124,
    dtcResolutionRate: 0.82,
  }];
  if (path === "/api/admin/users") return [200, []];
  if (path === "/api/admin/vehicles") return [200, []];
  if (path === "/api/admin/diagnostics") return [200, []];
  if (path === "/api/admin/issues") return [200, []];
  if (path === "/api/admin/workshops") return [200, MOCK_WORKSHOPS];
  if (path === "/api/admin/revenue") return [200, []];

  return [404, { error: "Route not found" }];
}

// ─── Server ───────────────────────────────────────────────────────────────────

const PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    });
    res.end();
    return;
  }

  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    const [status, data] = handleRoute(req.url, req.method, parsed);
    jsonResponse(res, status, data);
  });
});

server.listen(PORT, () => {
  console.log(`[mock-api] Running on http://localhost:${PORT}`);
});
