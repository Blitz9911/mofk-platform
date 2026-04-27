import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  dtcCodesTable,
} from "@workspace/db";
import {
  ListDtcCodesQueryParams,
  ListDtcCodesResponse,
  GetDtcCodeParams,
  GetDtcCodeResponse,
  ClearDtcCodeParams,
  ClearDtcCodeResponse,
  GetTrendingDtcCodesResponse,
  InterpretDtcBody,
  InterpretDtcResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dtc", async (req, res): Promise<void> => {
  const params = ListDtcCodesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conditions = [eq(vehiclesTable.userId, req.userId)];
  if (params.data.vehicleId) {
    conditions.push(eq(dtcCodesTable.vehicleId, params.data.vehicleId));
  }
  if (params.data.status) {
    conditions.push(eq(dtcCodesTable.status, params.data.status));
  }
  const rows = await db
    .select({
      id: dtcCodesTable.id,
      sessionId: dtcCodesTable.sessionId,
      vehicleId: dtcCodesTable.vehicleId,
      vehicleMake: vehiclesTable.make,
      vehicleModel: vehiclesTable.model,
      code: dtcCodesTable.code,
      status: dtcCodesTable.status,
      severity: dtcCodesTable.severity,
      descriptionEn: dtcCodesTable.descriptionEn,
      descriptionAr: dtcCodesTable.descriptionAr,
      possibleCauses: dtcCodesTable.possibleCauses,
      estimatedCostMin: dtcCodesTable.estimatedCostMin,
      estimatedCostMax: dtcCodesTable.estimatedCostMax,
      recommendedAction: dtcCodesTable.recommendedAction,
      actionReasonAr: dtcCodesTable.actionReasonAr,
      detectedAt: dtcCodesTable.detectedAt,
      clearedAt: dtcCodesTable.clearedAt,
    })
    .from(dtcCodesTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, dtcCodesTable.vehicleId))
    .where(and(...conditions))
    .orderBy(desc(dtcCodesTable.detectedAt));
  res.json(ListDtcCodesResponse.parse(rows));
});

router.get("/dtc/trending", async (req, res): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await db
    .select({
      code: dtcCodesTable.code,
      descriptionAr: sql<string>`max(${dtcCodesTable.descriptionAr})`,
      severity: sql<"low" | "medium" | "high" | "critical">`max(${dtcCodesTable.severity})`,
      count: sql<number>`count(*)::int`,
    })
    .from(dtcCodesTable)
    .where(gte(dtcCodesTable.detectedAt, since))
    .groupBy(dtcCodesTable.code)
    .orderBy(desc(sql`count(*)`))
    .limit(8);
  res.json(
    GetTrendingDtcCodesResponse.parse(
      rows.map((r, i) => ({
        ...r,
        trendPct: [12, -5, 28, 4, -8, 17, 2, -11][i] ?? 0,
      })),
    ),
  );
});

router.get("/dtc/:dtcId", async (req, res): Promise<void> => {
  const params = GetDtcCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [d] = await db
    .select({
      id: dtcCodesTable.id,
      sessionId: dtcCodesTable.sessionId,
      vehicleId: dtcCodesTable.vehicleId,
      vehicleMake: vehiclesTable.make,
      vehicleModel: vehiclesTable.model,
      code: dtcCodesTable.code,
      status: dtcCodesTable.status,
      severity: dtcCodesTable.severity,
      descriptionEn: dtcCodesTable.descriptionEn,
      descriptionAr: dtcCodesTable.descriptionAr,
      possibleCauses: dtcCodesTable.possibleCauses,
      estimatedCostMin: dtcCodesTable.estimatedCostMin,
      estimatedCostMax: dtcCodesTable.estimatedCostMax,
      recommendedAction: dtcCodesTable.recommendedAction,
      actionReasonAr: dtcCodesTable.actionReasonAr,
      detectedAt: dtcCodesTable.detectedAt,
      clearedAt: dtcCodesTable.clearedAt,
    })
    .from(dtcCodesTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, dtcCodesTable.vehicleId))
    .where(
      and(
        eq(dtcCodesTable.id, params.data.dtcId),
        eq(vehiclesTable.userId, req.userId),
      ),
    );
  if (!d) {
    res.status(404).json({ error: "DTC not found" });
    return;
  }
  res.json(GetDtcCodeResponse.parse(d));
});

router.post("/dtc/:dtcId/clear", async (req, res): Promise<void> => {
  const params = ClearDtcCodeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(dtcCodesTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, dtcCodesTable.vehicleId))
    .where(
      and(
        eq(dtcCodesTable.id, params.data.dtcId),
        eq(vehiclesTable.userId, req.userId),
      ),
    );
  if (!existing) {
    res.status(404).json({ error: "DTC not found" });
    return;
  }
  const [d] = await db
    .update(dtcCodesTable)
    .set({ status: "cleared", clearedAt: new Date() })
    .where(eq(dtcCodesTable.id, params.data.dtcId))
    .returning();
  res.json(
    ClearDtcCodeResponse.parse({
      ...d,
      vehicleMake: existing.vehicles.make,
      vehicleModel: existing.vehicles.model,
    }),
  );
});

router.post("/ai/interpret-dtc", async (req, res): Promise<void> => {
  const body = InterpretDtcBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  // Mock interpretation — find a sample with this code or fall back
  const [sample] = await db
    .select()
    .from(dtcCodesTable)
    .where(eq(dtcCodesTable.code, body.data.code))
    .limit(1);

  if (sample) {
    res.json(
      InterpretDtcResponse.parse({
        code: sample.code,
        descriptionAr: sample.descriptionAr ?? "كود تشخيصي",
        severity: sample.severity,
        causes: sample.possibleCauses ?? [],
        estimatedCostMin: sample.estimatedCostMin ?? undefined,
        estimatedCostMax: sample.estimatedCostMax ?? undefined,
        action: (sample.recommendedAction as
          | "drive_now"
          | "schedule_week"
          | "monitor") ?? "monitor",
        actionReasonAr: sample.actionReasonAr ?? "راقب الأداء",
      }),
    );
    return;
  }
  res.json(
    InterpretDtcResponse.parse({
      code: body.data.code,
      descriptionAr: "كود تشخيصي غير معروف، يُنصح بزيارة ورشة معتمدة للفحص.",
      severity: "medium",
      causes: ["قد يحتاج إلى فحص إضافي بأداة احترافية"],
      action: "schedule_week",
      actionReasonAr: "زر ورشة معتمدة خلال الأسبوع للفحص الكامل",
    }),
  );
});

export default router;
