import { and, desc, eq } from "drizzle-orm";
import {
  db,
  dtcCodesTable,
  maintenanceLogsTable,
  maintenanceTable,
  recommendationEventsTable,
  recommendationsTable,
  telemetryTable,
  vehiclesTable,
} from "@workspace/db";
import { isAnomalyDetectionEnabled, isHealthIntelligenceEnabled } from "../lib/health-intelligence-flags";
import {
  applyMaintenanceToRecommendations,
  buildDtcRecommendation,
  buildMaintenanceRecommendation,
  buildTelemetryRecommendations,
  computeNextDue,
  computeScheduleStatus,
  MAINTENANCE_RULES,
  mergeEvaluatedRecommendations,
  serviceLabelAr,
  sourceKeyForMaintenance,
  validateMaintenanceInput,
  visibleRecommendations,
} from "./maintenance-recommendations.mjs";
import { evaluateVehicleHealth, isFreshTimestamp } from "./vehicle-health-engine.mjs";

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function serializeRecommendation(row: typeof recommendationsTable.$inferSelect, extras: Record<string, unknown> = {}) {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    kind: row.kind,
    severity: row.severity,
    titleAr: row.titleAr,
    descriptionAr: row.descriptionAr,
    confidencePct: metadata.confidenceSource === "measured" ? row.confidencePct : undefined,
    suggestedAction: row.suggestedAction,
    suggestedCostSar: row.suggestedCostSar,
    createdAt: row.createdAt,
    status: row.status ?? "active",
    source: row.source ?? null,
    sourceKey: row.sourceKey ?? null,
    category: row.category ?? (row.kind === "maintenance_due" ? "preventive" : "diagnostic"),
    serviceType: row.serviceType ?? null,
    linkedMaintenanceItemId: row.linkedMaintenanceItemId ?? null,
    linkedMaintenanceLogId: row.linkedMaintenanceLogId ?? null,
    deferredUntil: row.deferredUntil ?? null,
    resolvedAt: row.resolvedAt ?? null,
    updatedAt: row.updatedAt ?? row.createdAt,
    metadata,
    ...extras,
  };
}

export async function persistEvaluation(vehicleId: string, userId: string) {
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)));
  if (!vehicle) return [];

  const [schedule, existing, dtcs, telemetryRows, logs] = await Promise.all([
    db.select().from(maintenanceTable).where(eq(maintenanceTable.vehicleId, vehicleId)),
    db.select().from(recommendationsTable).where(eq(recommendationsTable.vehicleId, vehicleId)),
    db
      .select()
      .from(dtcCodesTable)
      .where(
        isHealthIntelligenceEnabled()
          ? eq(dtcCodesTable.vehicleId, vehicleId)
          : and(eq(dtcCodesTable.vehicleId, vehicleId), eq(dtcCodesTable.status, "active")),
      ),
    db
      .select()
      .from(telemetryTable)
      .where(eq(telemetryTable.vehicleId, vehicleId))
      .orderBy(desc(telemetryTable.time))
      .limit(20),
    db
      .select()
      .from(maintenanceLogsTable)
      .where(eq(maintenanceLogsTable.vehicleId, vehicleId))
      .orderBy(desc(maintenanceLogsTable.doneAt)),
  ]);

  const latestByService = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    if (!latestByService.has(log.serviceType)) latestByService.set(log.serviceType, log);
  }

  const candidates = [];
  if (isHealthIntelligenceEnabled()) {
    const evaluation = evaluateVehicleHealth({
      vehicleId,
      odometerKm: vehicle.odometerKm,
      logs,
      schedule,
      dtcs,
      telemetrySamples: telemetryRows.map((row) => ({
        time: row.time,
        coolantTemp: row.coolantTemp,
        batteryV: row.batteryV != null ? Number(row.batteryV) : null,
        synthetic: false,
      })),
      anomalyEnabled: isAnomalyDetectionEnabled(),
    });
    candidates.push(...evaluation.candidates);
  } else {
    const seenServices = new Set<string>();
    for (const item of schedule) {
      seenServices.add(item.serviceType);
      const rec = buildMaintenanceRecommendation({
        vehicleId,
        serviceType: item.serviceType,
        lastDoneKm: item.lastDoneKm,
        lastDoneAt: item.lastDoneAt,
        odometerKm: vehicle.odometerKm,
        estimatedCost: item.estimatedCost,
      });
      if (rec) candidates.push(rec);
    }
    for (const [serviceType, log] of latestByService) {
      if (seenServices.has(serviceType)) continue;
      const rec = buildMaintenanceRecommendation({
        vehicleId,
        serviceType,
        lastDoneKm: log.doneAtKm,
        lastDoneAt: log.doneAt,
        odometerKm: vehicle.odometerKm,
      });
      if (rec) candidates.push(rec);
    }

    for (const dtc of dtcs) {
      const rec = buildDtcRecommendation({
        vehicleId,
        code: dtc.code,
        descriptionAr: dtc.descriptionAr ?? undefined,
        severity: dtc.severity,
      });
      if (rec) candidates.push(rec);
    }

    const latestFresh = telemetryRows.find((row) => isFreshTimestamp(row.time));
    const latestTelemetry = latestFresh
      ? {
          coolantTemp: latestFresh.coolantTemp,
          batteryV: latestFresh.batteryV != null ? Number(latestFresh.batteryV) : null,
        }
      : null;
    candidates.push(...buildTelemetryRecommendations(vehicleId, latestTelemetry));
  }

  const existingMapped = existing.map((row) => ({
    ...row,
    sourceKey: row.sourceKey || `legacy:${row.titleAr}`,
    status: row.status || "active",
  }));
  const { inserts, updates } = mergeEvaluatedRecommendations(existingMapped, candidates);

  if (inserts.length > 0) {
    await db.insert(recommendationsTable).values(
      inserts.map((item) => ({
        vehicleId: item.vehicleId,
        kind: item.kind,
        severity: item.severity,
        titleAr: item.titleAr,
        descriptionAr: item.descriptionAr,
        suggestedAction: item.suggestedAction ?? null,
        suggestedCostSar: item.suggestedCostSar ?? null,
        status: item.status ?? "active",
        source: item.source ?? null,
        sourceKey: item.sourceKey ?? null,
        category: item.category ?? null,
        serviceType: item.serviceType ?? null,
        metadata: item.metadata ?? {},
      })),
    );
  }
  for (const update of updates) {
    if (!update.id) continue;
    const patch = update.patch as Record<string, unknown>;
    await db
      .update(recommendationsTable)
      .set({
        severity: String(patch.severity ?? "info"),
        titleAr: String(patch.titleAr),
        descriptionAr: String(patch.descriptionAr),
        suggestedCostSar:
          patch.suggestedCostSar === undefined || patch.suggestedCostSar === null
            ? null
            : Number(patch.suggestedCostSar),
        status: String(patch.status ?? "active"),
        updatedAt: new Date(),
      })
      .where(eq(recommendationsTable.id, update.id));
  }

  const rows = await db
    .select()
    .from(recommendationsTable)
    .where(eq(recommendationsTable.vehicleId, vehicleId))
    .orderBy(desc(recommendationsTable.createdAt));

  const extrasByService = new Map(
    schedule.map((item) => [
      item.serviceType,
      {
        lastDoneKm: item.lastDoneKm,
        lastDoneAt: toIso(item.lastDoneAt),
        intervalKm: item.intervalKm,
        intervalDays: item.intervalDays,
        nextDueKm: item.nextDueKm,
        nextDueAt: toIso(item.nextDueAt),
        remainingKm:
          item.nextDueKm != null ? item.nextDueKm - vehicle.odometerKm : null,
        daysUntilDue: item.nextDueAt
          ? computeScheduleStatus({
              nextDueAt: item.nextDueAt,
              odometerKm: vehicle.odometerKm,
            }).remainingDays
          : null,
      },
    ]),
  );

  return visibleRecommendations(rows).map((row) =>
    serializeRecommendation(row, extrasByService.get(row.serviceType || "") ?? {}),
  );
}

export async function logCompletedMaintenance(input: {
  vehicleId: string;
  userId: string;
  serviceType: string;
  doneAt: Date | string;
  doneAtKm?: number | null;
  cost?: number | null;
  notes?: string | null;
  recommendationId?: string | null;
  customServiceName?: string | null;
}) {
  const valid = validateMaintenanceInput({
    serviceType: input.serviceType,
    doneAt: input.doneAt,
    doneAtKm: input.doneAtKm,
    cost: input.cost,
  });
  if (!valid.ok) {
    return { ok: false as const, status: 400 as const, error: valid.errors[0] };
  }

  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, input.vehicleId), eq(vehiclesTable.userId, input.userId)));
  if (!vehicle) {
    return { ok: false as const, status: 404 as const, error: "Vehicle not found" };
  }

  const doneAtPreview = new Date(input.doneAt);
  const doneAtKmPreview = input.doneAtKm == null ? vehicle.odometerKm : Number(input.doneAtKm);
  const [duplicate] = await db
    .select()
    .from(maintenanceLogsTable)
    .where(
      and(
        eq(maintenanceLogsTable.vehicleId, input.vehicleId),
        eq(maintenanceLogsTable.userId, input.userId),
        eq(maintenanceLogsTable.serviceType, input.serviceType),
      ),
    )
    .orderBy(desc(maintenanceLogsTable.createdAt))
    .limit(1);
  if (
    duplicate &&
    duplicate.doneAtKm === doneAtKmPreview &&
    Math.abs(new Date(duplicate.doneAt).getTime() - doneAtPreview.getTime()) < 120_000 &&
    Date.now() - new Date(duplicate.createdAt).getTime() < 120_000
  ) {
    return { ok: true as const, log: duplicate, schedule: null, duplicate: true };
  }

  const rule = MAINTENANCE_RULES[input.serviceType];
  const doneAt = new Date(input.doneAt);
  const doneAtKm = input.doneAtKm == null ? vehicle.odometerKm : Number(input.doneAtKm);
  const due = computeNextDue({
    lastDoneKm: doneAtKm,
    lastDoneAt: doneAt,
    intervalKm: rule?.intervalKm,
    intervalDays: rule?.intervalDays,
  });
  const statusInfo = computeScheduleStatus({
    ...due,
    odometerKm: Math.max(vehicle.odometerKm, doneAtKm || 0),
    soonKm: rule?.soonKm,
    soonDays: rule?.soonDays,
  });

  try {
    const result = await db.transaction(async (tx) => {
      const [log] = await tx
        .insert(maintenanceLogsTable)
        .values({
          vehicleId: input.vehicleId,
          userId: input.userId,
          serviceType: input.serviceType,
          serviceTypeAr: input.customServiceName || serviceLabelAr(input.serviceType),
          customServiceName: input.customServiceName ?? null,
          doneAt,
          doneAtKm,
          costSar: input.cost ?? null,
          notes: input.notes ?? null,
          source: "manual",
          recommendationId: input.recommendationId ?? null,
        })
        .returning();

      const [existingItem] = await tx
        .select()
        .from(maintenanceTable)
        .where(
          and(
            eq(maintenanceTable.vehicleId, input.vehicleId),
            eq(maintenanceTable.serviceType, input.serviceType),
          ),
        );

      let schedule;
      if (existingItem) {
        [schedule] = await tx
          .update(maintenanceTable)
          .set({
            lastDoneAt: doneAt,
            lastDoneKm: doneAtKm,
            nextDueKm: due.nextDueKm,
            nextDueAt: due.nextDueAt ? new Date(due.nextDueAt) : null,
            status: statusInfo.status,
            estimatedCost: input.cost ?? existingItem.estimatedCost,
          })
          .where(eq(maintenanceTable.id, existingItem.id))
          .returning();
      } else {
        [schedule] = await tx
          .insert(maintenanceTable)
          .values({
            vehicleId: input.vehicleId,
            serviceType: input.serviceType,
            serviceTypeAr: serviceLabelAr(input.serviceType),
            intervalKm: rule?.intervalKm ?? null,
            intervalDays: rule?.intervalDays ?? null,
            lastDoneKm: doneAtKm,
            lastDoneAt: doneAt,
            nextDueKm: due.nextDueKm,
            nextDueAt: due.nextDueAt ? new Date(due.nextDueAt) : null,
            status: statusInfo.status,
            estimatedCost: input.cost ?? rule?.estimatedCost ?? null,
          })
          .returning();
      }

      if (doneAtKm != null && doneAtKm > vehicle.odometerKm) {
        await tx
          .update(vehiclesTable)
          .set({ odometerKm: doneAtKm })
          .where(eq(vehiclesTable.id, vehicle.id));
      }

      const recs = await tx
        .select()
        .from(recommendationsTable)
        .where(eq(recommendationsTable.vehicleId, input.vehicleId));
      const next = applyMaintenanceToRecommendations(
        recs.map((row) => ({
          ...row,
          sourceKey: row.sourceKey || sourceKeyForMaintenance(row.serviceType || ""),
        })),
        {
          id: log.id,
          vehicleId: input.vehicleId,
          serviceType: input.serviceType,
          scheduleId: schedule?.id,
          doneAt,
        },
      );

      for (const rec of next) {
        const prev = recs.find((row) => row.id === rec.id);
        if (!prev || prev.status === rec.status) continue;
        await tx
          .update(recommendationsTable)
          .set({
            status: rec.status,
            linkedMaintenanceLogId: rec.linkedMaintenanceLogId,
            linkedMaintenanceItemId: rec.linkedMaintenanceItemId,
            resolvedAt: rec.resolvedAt ? new Date(rec.resolvedAt) : null,
            updatedAt: new Date(),
          })
          .where(eq(recommendationsTable.id, rec.id));
        await tx.insert(recommendationEventsTable).values({
          recommendationId: rec.id,
          vehicleId: input.vehicleId,
          action: "resolved_by_maintenance",
          fromStatus: prev.status,
          toStatus: rec.status,
          maintenanceLogId: log.id,
        });
      }

      if (input.recommendationId) {
        const linked = recs.find((row) => row.id === input.recommendationId);
        if (linked && (linked.source === "dtc" || String(linked.sourceKey || "").startsWith("dtc:"))) {
          await tx.insert(recommendationEventsTable).values({
            recommendationId: linked.id,
            vehicleId: input.vehicleId,
            action: "maintenance_logged_dtc_kept_open",
            fromStatus: linked.status,
            toStatus: linked.status,
            maintenanceLogId: log.id,
            note: "DTC recommendations stay open until a new diagnostic scan.",
          });
        }
      }

      return { log, schedule };
    });

    return { ok: true as const, ...result };
  } catch (error) {
    return {
      ok: false as const,
      status: 500 as const,
      error: "تعذر حفظ الصيانة بالكامل، لم يُعتمد أي جزء من العملية.",
      cause: error,
    };
  }
}

export async function listRecommendationEvents(recommendationId: string, userId: string) {
  const [row] = await db
    .select({ rec: recommendationsTable, vehicleUserId: vehiclesTable.userId })
    .from(recommendationsTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, recommendationsTable.vehicleId))
    .where(eq(recommendationsTable.id, recommendationId));
  if (!row || row.vehicleUserId !== userId) return null;
  const events = await db
    .select()
    .from(recommendationEventsTable)
    .where(eq(recommendationEventsTable.recommendationId, recommendationId))
    .orderBy(desc(recommendationEventsTable.createdAt));
  return events;
}

export async function updateRecommendationLifecycle(input: {
  recommendationId: string;
  userId: string;
  action: "defer" | "dismiss" | "in_progress" | "link";
  deferredUntil?: string | null;
  maintenanceLogId?: string | null;
  note?: string | null;
}) {
  const [row] = await db
    .select({ rec: recommendationsTable, vehicleUserId: vehiclesTable.userId })
    .from(recommendationsTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, recommendationsTable.vehicleId))
    .where(eq(recommendationsTable.id, input.recommendationId));
  if (!row || row.vehicleUserId !== input.userId) {
    return { ok: false as const, status: 404 as const, error: "Recommendation not found" };
  }

  const nextStatus =
    input.action === "defer"
      ? "deferred"
      : input.action === "dismiss"
        ? "dismissed"
        : input.action === "in_progress" || input.action === "link"
          ? "in_progress"
          : row.rec.status;

  const [updated] = await db
    .update(recommendationsTable)
    .set({
      status: nextStatus,
      deferredUntil: input.action === "defer" && input.deferredUntil ? new Date(input.deferredUntil) : (row.rec as { deferredUntil?: Date | null }).deferredUntil,
      linkedMaintenanceLogId: input.maintenanceLogId ?? (row.rec as { linkedMaintenanceLogId?: string | null }).linkedMaintenanceLogId,
      updatedAt: new Date(),
    } as Partial<typeof recommendationsTable.$inferInsert>)
    .where(eq(recommendationsTable.id, input.recommendationId))
    .returning();

  await db.insert(recommendationEventsTable).values({
    recommendationId: input.recommendationId,
    vehicleId: row.rec.vehicleId,
    action: input.action,
    fromStatus: row.rec.status,
    toStatus: nextStatus,
    note: input.note ?? null,
    maintenanceLogId: input.maintenanceLogId ?? null,
  });

  return { ok: true as const, recommendation: serializeRecommendation(updated) };
}
