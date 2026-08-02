import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  recommendationsTable,
  dtcCodesTable,
} from "@workspace/db";
import {
  AiChatBody,
  AiChatResponse,
  GetAiRecommendationsParams,
  GetAiRecommendationsResponse,
} from "@workspace/api-zod";
import { DEMO_USER_ID } from "../lib/demo";

const router: IRouter = Router();

router.post("/ai/chat", async (req, res): Promise<void> => {
  const body = AiChatBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const msg = body.data.message.trim();
  let vehicleContext = "";
  if (body.data.vehicleId) {
    const [v] = await db
      .select()
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.id, body.data.vehicleId),
          eq(vehiclesTable.userId, DEMO_USER_ID),
        ),
      );
    if (v) {
      vehicleContext = ` بناءً على بيانات ${v.nickname ?? `${v.make} ${v.model}`} (${v.year})`;
    }
  }

  const reply = generateReply(msg, vehicleContext);
  const suggestedActions = suggestActions(msg);

  res.json(AiChatResponse.parse({ reply, suggestedActions }));
});

router.get(
  "/ai/recommendations/:vehicleId",
  async (req, res): Promise<void> => {
    const params = GetAiRecommendationsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [v] = await db
      .select()
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.id, params.data.vehicleId),
          eq(vehiclesTable.userId, DEMO_USER_ID),
        ),
      );
    if (!v) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    const rows = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.vehicleId, params.data.vehicleId))
      .orderBy(desc(recommendationsTable.createdAt));
    res.json(GetAiRecommendationsResponse.parse(rows));
  },
);

function generateReply(message: string, ctx: string): string {
  const m = message.toLowerCase();
  if (m.includes("حرارة") || m.includes("سخن")) {
    return `ارتفاع حرارة المحرك${ctx} له عدة أسباب محتملة: نقص في سائل التبريد، خلل في المروحة أو الترموستات، أو انسداد في الرديتر. أنصحك بإيقاف السيارة فوراً إن كان المؤشر في الأحمر، وفحص مستوى السائل بعد أن يبرد المحرك. إذا تكررت المشكلة، احجز فحصاً عاجلاً في ورشة معتمدة.`;
  }
  if (m.includes("زيت")) {
    return `تغيير الزيت يعتمد على نوع الزيت ونمط القيادة. عموماً، الزيت الاصطناعي يتحمّل بين 8,000 و10,000 كم، والزيت العادي بين 5,000 و7,000 كم${ctx}. أوصي بالالتزام بدورة التغيير الموصى بها من الشركة المصنّعة، خاصة في المناخ الحار.`;
  }
  if (m.includes("اشتراك") || m.includes("باقة")) {
    return `MFK يقدّم ثلاث باقات: المجانية للتشخيص الأساسي، المميزة بـ 29 ر.س شهرياً تشمل التوصيات الذكية وتاريخ غير محدود، وباقة الأساطيل للشركات. يمكنك الترقية في أي وقت من صفحة الاشتراك.`;
  }
  if (m.includes("dtc") || m.includes("كود") || m.includes("p0")) {
    return `أكواد DTC هي إشارات يرسلها كمبيوتر السيارة عند اكتشاف مشكلة. كل كود يبدأ بحرف (P للمحرك، B للجسم، C للهيكل، U للشبكة). MFK يفسّرها لك بلغة بسيطة ويوصي بالخطوة المناسبة. شارك الكود معي وسأشرحه لك.`;
  }
  if (m.includes("حجز") || m.includes("ورشة")) {
    return `لحجز موعد، اذهب إلى صفحة الورش، اختر مدينتك ونوع الخدمة، ثم اختر الورشة المناسبة. اضغط "احجز" واختر الوقت المناسب لك. ستصلك رسالة تأكيد فور موافقة الورشة.`;
  }
  return `شكراً لسؤالك${ctx}. أنا مساعد MFK الذكي، أستطيع مساعدتك في فهم أعطال سيارتك، اقتراح صيانة، تفسير أكواد DTC، أو حجز ورشة. اطرح سؤالاً محدداً لأتمكن من مساعدتك بشكل أفضل.`;
}

function suggestActions(
  message: string,
): { labelAr: string; kind: "book_workshop" | "view_dtc" | "schedule_maintenance" | "view_vehicle"; targetId?: string }[] {
  const m = message.toLowerCase();
  const out: { labelAr: string; kind: "book_workshop" | "view_dtc" | "schedule_maintenance" | "view_vehicle" }[] = [];
  if (m.includes("حرارة") || m.includes("سخن")) {
    out.push({ labelAr: "احجز فحصاً عاجلاً", kind: "book_workshop" });
    out.push({ labelAr: "اعرض أكواد الأعطال", kind: "view_dtc" });
  } else if (m.includes("زيت")) {
    out.push({ labelAr: "جدولة تغيير الزيت", kind: "schedule_maintenance" });
  } else if (m.includes("dtc") || m.includes("كود")) {
    out.push({ labelAr: "اعرض جميع الأكواد", kind: "view_dtc" });
  } else if (m.includes("ورشة") || m.includes("حجز")) {
    out.push({ labelAr: "تصفّح الورش المعتمدة", kind: "book_workshop" });
  }
  return out;
}

export default router;
