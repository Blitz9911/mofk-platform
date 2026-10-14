import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  dtcCodesTable,
  maintenanceApprovalRequestsTable,
  maintenanceLogsTable,
  maintenanceRulesTable,
  maintenanceTable,
  odometerReadingsTable,
  telemetryTable,
  vehiclesTable,
} from "@workspace/db";
import {
  isApprovalLoggingEnabled,
  isHealthIntelligenceEnabled,
  isOdometerTrackingEnabled,
} from "../lib/health-intelligence-flags";
import { extractInvoiceFromImage } from "../services/ocr-adapter";
import { maybeLlmExplain } from "../services/ai-explanation-adapter";
import { enqueueNotification } from "../services/notification-orchestrator";
import { logCompletedMaintenance } from "../services/recommendation-store";
import {
  estimateDailyKm,
  evaluateVehicleHealth,
  validateOdometerReading,
} from "../services/vehicle-health-engine.mjs";

const router: IRouter = Router();

function featureDisabled(res: import("express").Response, flag: string) {
  res.status(404).json({ error: "Feature disabled", feature: flag, featureDisabled: true });
}

async function ownedVehicle(vehicleId: string, userId: string) {
  const [v] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)));
  return v ?? null;
}

router.get("/vehicles/:vehicleId/health-summary", async (req, res): Promise<void> => {
  if (!isHealthIntelligenceEnabled()) {
    featureDisabled(res, "MFK_HEALTH_INTELLIGENCE_ENABLED");
    return;
  }
  const vehicle = await ownedVehicle(req.params.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const [logs, schedule, dtcs, telemetry, rules, odo] = await Promise.all([
    db.select().from(maintenanceLogsTable).where(eq(maintenanceLogsTable.vehicleId, vehicle.id)),
    db.select().from(maintenanceTable).where(eq(maintenanceTable.vehicleId, vehicle.id)),
    db.select().from(dtcCodesTable).where(eq(dtcCodesTable.vehicleId, vehicle.id)),
    db
      .select()
      .from(telemetryTable)
      .where(eq(telemetryTable.vehicleId, vehicle.id))
      .orderBy(desc(telemetryTable.time))
      .limit(20),
    db.select().from(maintenanceRulesTable).where(eq(maintenanceRulesTable.vehicleId, vehicle.id)),
    db
      .select()
      .from(odometerReadingsTable)
      .where(eq(odometerReadingsTable.vehicleId, vehicle.id))
      .orderBy(desc(odometerReadingsTable.recordedAt))
      .limit(30),
  ]);

  const evaluation = evaluateVehicleHealth({
    vehicleId: vehicle.id,
    odometerKm: vehicle.odometerKm,
    logs,
    schedule,
    dtcs,
    telemetrySamples: telemetry.map((row) => ({
      time: row.time,
      coolantTemp: row.coolantTemp,
      batteryV: row.batteryV != null ? Number(row.batteryV) : null,
      synthetic: false,
    })),
    ruleOverrides: rules,
    anomalyEnabled: true,
  });
  const mileage = estimateDailyKm(
    odo.map((row) => ({ km: row.km, recordedAt: row.recordedAt })),
  );

  res.json({
    vehicleId: vehicle.id,
    healthScore: evaluation.healthScore,
    dataQuality: evaluation.dataQuality,
    lastReadingAt: evaluation.lastReadingAt,
    insufficientData: evaluation.insufficientData,
    odometerKm: vehicle.odometerKm,
    estimatedDailyKm: mileage.kmPerDay,
    estimatedDailyKmNote: mileage.estimated
      ? "تقديري من قراءات العداد المسجلة، وليس بديلاً عن العداد المؤكد."
      : null,
    openRecommendations: evaluation.candidates.length,
    connected: Boolean(vehicle.adapterMac),
  });
});

router.post("/vehicles/:vehicleId/odometer", async (req, res): Promise<void> => {
  if (!isOdometerTrackingEnabled()) {
    featureDisabled(res, "MFK_ODOMETER_TRACKING_ENABLED");
    return;
  }
  const vehicle = await ownedVehicle(req.params.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const body = req.body as { km?: number; source?: string; recordedAt?: string; estimated?: boolean };
  const source = String(body.source ?? "manual");
  const valid = validateOdometerReading({
    nextKm: body.km,
    previousKm: vehicle.odometerKm,
    source,
  });
  if (!valid.ok) {
    res.status(400).json({ error: valid.error });
    return;
  }
  const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();
  const [row] = await db
    .insert(odometerReadingsTable)
    .values({
      vehicleId: vehicle.id,
      userId: req.userId,
      km: valid.km,
      source,
      estimated: Boolean(body.estimated) || (source !== "manual" && source !== "obd_01a6"),
      recordedAt,
    })
    .returning();
  if (!row.estimated && valid.km > vehicle.odometerKm) {
    await db.update(vehiclesTable).set({ odometerKm: valid.km }).where(eq(vehiclesTable.id, vehicle.id));
  }
  res.status(201).json(row);
});

router.get("/vehicles/:vehicleId/odometer", async (req, res): Promise<void> => {
  if (!isOdometerTrackingEnabled()) {
    featureDisabled(res, "MFK_ODOMETER_TRACKING_ENABLED");
    return;
  }
  const vehicle = await ownedVehicle(req.params.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const rows = await db
    .select()
    .from(odometerReadingsTable)
    .where(eq(odometerReadingsTable.vehicleId, vehicle.id))
    .orderBy(desc(odometerReadingsTable.recordedAt))
    .limit(50);
  res.json({ vehicleId: vehicle.id, confirmedKm: vehicle.odometerKm, readings: rows });
});

router.get("/vehicles/:vehicleId/maintenance/approvals", async (req, res): Promise<void> => {
  if (!isApprovalLoggingEnabled()) {
    featureDisabled(res, "MFK_APPROVAL_LOGGING_ENABLED");
    return;
  }
  const vehicle = await ownedVehicle(req.params.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const rows = await db
    .select()
    .from(maintenanceApprovalRequestsTable)
    .where(
      and(
        eq(maintenanceApprovalRequestsTable.vehicleId, vehicle.id),
        eq(maintenanceApprovalRequestsTable.userId, req.userId),
      ),
    )
    .orderBy(desc(maintenanceApprovalRequestsTable.createdAt));
  res.json(rows);
});

router.post("/vehicles/:vehicleId/maintenance/approvals", async (req, res): Promise<void> => {
  if (!isApprovalLoggingEnabled()) {
    featureDisabled(res, "MFK_APPROVAL_LOGGING_ENABLED");
    return;
  }
  const vehicle = await ownedVehicle(req.params.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const body = req.body as { kind?: string; titleAr?: string; bodyAr?: string; dtcCode?: string };
  const [row] = await db
    .insert(maintenanceApprovalRequestsTable)
    .values({
      vehicleId: vehicle.id,
      userId: req.userId,
      kind: body.kind || "dtc_cleared",
      titleAr: body.titleAr || "هل أجريت صيانة للمركبة؟",
      bodyAr: body.bodyAr || "لا نحفظ صيانة مكتملة قبل تأكيدك.",
      dtcCode: body.dtcCode ?? null,
    })
    .returning();
  await enqueueNotification({
    userId: req.userId,
    vehicleId: vehicle.id,
    type: "maintenance_approval",
    severity: "info",
    titleAr: row.titleAr,
    bodyAr: row.bodyAr,
    actionUrl: "/maintenance",
    sourceKey: row.id,
  }).catch(() => null);
  res.status(201).json(row);
});

router.patch("/maintenance/approvals/:id", async (req, res): Promise<void> => {
  if (!isApprovalLoggingEnabled()) {
    featureDisabled(res, "MFK_APPROVAL_LOGGING_ENABLED");
    return;
  }
  const [row] = await db
    .select()
    .from(maintenanceApprovalRequestsTable)
    .where(
      and(
        eq(maintenanceApprovalRequestsTable.id, req.params.id),
        eq(maintenanceApprovalRequestsTable.userId, req.userId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const body = req.body as {
    decision?: "yes" | "no" | "later";
    serviceType?: string;
    doneAt?: string;
    doneAtKm?: number;
    cost?: number;
    notes?: string;
  };
  if (body.decision === "later") {
    const reminder = new Date();
    reminder.setDate(reminder.getDate() + 3);
    const [updated] = await db
      .update(maintenanceApprovalRequestsTable)
      .set({ status: "remind_later", reminderAt: reminder, updatedAt: new Date() })
      .where(eq(maintenanceApprovalRequestsTable.id, row.id))
      .returning();
    res.json(updated);
    return;
  }
  if (body.decision === "no") {
    const [updated] = await db
      .update(maintenanceApprovalRequestsTable)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(maintenanceApprovalRequestsTable.id, row.id))
      .returning();
    res.json(updated);
    return;
  }
  if (body.decision !== "yes") {
    res.status(400).json({ error: "decision required" });
    return;
  }
  if (!body.serviceType || !body.doneAt) {
    res.status(400).json({ error: "أكمل نموذج الصيانة بعد الموافقة." });
    return;
  }
  const logged = await logCompletedMaintenance({
    vehicleId: row.vehicleId,
    userId: req.userId,
    serviceType: body.serviceType,
    doneAt: body.doneAt,
    doneAtKm: body.doneAtKm,
    cost: body.cost,
    notes: body.notes,
  });
  if (!logged.ok) {
    res.status(logged.status).json({ error: logged.error });
    return;
  }
  const [updated] = await db
    .update(maintenanceApprovalRequestsTable)
    .set({
      status: "confirmed",
      resolvedLogId: logged.log.id,
      updatedAt: new Date(),
    })
    .where(eq(maintenanceApprovalRequestsTable.id, row.id))
    .returning();
  await enqueueNotification({
    userId: req.userId,
    vehicleId: row.vehicleId,
    type: "maintenance_logged",
    titleAr: "تم توثيق الصيانة",
    bodyAr: "حُفظ السجل بعد تأكيدك.",
    actionUrl: "/maintenance",
    sourceKey: logged.log.id,
  }).catch(() => null);
  res.json({ approval: updated, log: logged.log });
});

router.post("/ai/recommendations/:vehicleId/explain", async (req, res): Promise<void> => {
  if (!isHealthIntelligenceEnabled()) {
    featureDisabled(res, "MFK_HEALTH_INTELLIGENCE_ENABLED");
    return;
  }
  const vehicle = await ownedVehicle(req.params.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const rec = req.body as Record<string, unknown>;
  if (!rec || (rec.vehicleId && rec.vehicleId !== vehicle.id)) {
    res.status(400).json({ error: "Invalid recommendation" });
    return;
  }
  res.json(await maybeLlmExplain(rec));
});

router.post("/maintenance/invoice-ocr", async (req, res): Promise<void> => {
  res.json(await extractInvoiceFromImage());
});

export default router;
