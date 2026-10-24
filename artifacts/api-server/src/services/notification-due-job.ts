import { desc, eq } from "drizzle-orm";
import {
  db,
  dtcCodesTable,
  maintenanceTable,
  odometerReadingsTable,
  recommendationsTable,
  subscriptionsTable,
  vehicleDocumentsTable,
  vehiclesTable,
} from "@workspace/db";
import { computeScheduleStatus } from "./maintenance-recommendations.mjs";
import { enqueueNotification } from "./notification-orchestrator";
import { actionUrlForType, isClosedStatus, notificationTypeForRecommendation } from "./notification-policy.mjs";
import {
  documentReminderAlert,
  dtcLifecycleAlert,
  maintenanceThresholdAlert,
  odometerDiscrepancyAlert,
  subscriptionReminderAlert,
} from "./notification-rules.mjs";
import { logger } from "../lib/logger";

export async function runDueNotificationScan() {
  const vehicles = await db
    .select({
      id: vehiclesTable.id,
      userId: vehiclesTable.userId,
      odometerKm: vehiclesTable.odometerKm,
    })
    .from(vehiclesTable);

  let created = 0;
  let skipped = 0;

  for (const vehicle of vehicles) {
    const [schedule, recs, dtcs] = await Promise.all([
      db.select().from(maintenanceTable).where(eq(maintenanceTable.vehicleId, vehicle.id)),
      db.select().from(recommendationsTable).where(eq(recommendationsTable.vehicleId, vehicle.id)),
      db.select().from(dtcCodesTable).where(eq(dtcCodesTable.vehicleId, vehicle.id)),
    ]);

    const closedServices = new Set(
      recs
        .filter((row) => isClosedStatus(row.status) && row.serviceType)
        .map((row) => row.serviceType as string),
    );

    for (const item of schedule) {
      if (closedServices.has(item.serviceType)) {
        skipped += 1;
        continue;
      }
      const status = computeScheduleStatus({
        nextDueAt: item.nextDueAt,
        nextDueKm: item.nextDueKm,
        odometerKm: vehicle.odometerKm,
      });
      const alert = maintenanceThresholdAlert({
        remainingKm: status.remainingKm,
        remainingDays: status.remainingDays,
        serviceType: item.serviceType,
        nextDueKm: item.nextDueKm,
        nextDueAt: item.nextDueAt,
        status: "active",
      });
      if (!alert) {
        skipped += 1;
        continue;
      }
      const remainingKm = Number(alert.remainingKm);
      const remainingLabel =
        Number.isFinite(remainingKm) && remainingKm > 0
          ? `باقي ${Math.round(remainingKm)} كم على موعد صيانة ${item.serviceType}.`
          : "راجع جدول الصيانة داخل التطبيق.";
      const result = await enqueueNotification({
        userId: vehicle.userId,
        vehicleId: vehicle.id,
        type: String(alert.type),
        severity: String(alert.severity),
        titleAr: alert.type === "maintenance_overdue" ? "موعد الصيانة متأخر" : "قرب موعد صيانة سيارتك 🔧",
        bodyAr:
          alert.type === "maintenance_overdue"
            ? "حسب البيانات المسجلة، تجاوزت سيارتك موعد الصيانة. راجع التفاصيل."
            : "سيارتك اقتربت من موعد الصيانة المسجل. افتح مفك لمعرفة التفاصيل.",
        actionUrl: actionUrlForType(String(alert.type)),
        sourceKey: String(alert.sourceKey),
      });
      if (result.created) created += 1;
      else skipped += 1;
    }

    for (const rec of recs) {
      if (isClosedStatus(rec.status)) {
        skipped += 1;
        continue;
      }
      const metadata = (rec.metadata ?? {}) as Record<string, unknown>;
      const type = notificationTypeForRecommendation({
        ...rec,
        scheduleStatus: metadata.scheduleStatus,
      });
      if (!type || type === "maintenance_upcoming" || type === "maintenance_overdue") {
        skipped += 1;
        continue;
      }
      const result = await enqueueNotification({
        userId: vehicle.userId,
        vehicleId: vehicle.id,
        type,
        severity: rec.severity ?? "info",
        titleAr: rec.titleAr,
        bodyAr: rec.descriptionAr,
        actionUrl: actionUrlForType(type),
        sourceKey: rec.sourceKey || rec.id,
      });
      if (result.created) created += 1;
      else skipped += 1;
    }

    for (const dtc of dtcs) {
      const lifecycle = dtcLifecycleAlert({
        code: dtc.code,
        status: dtc.status,
        previousStatus: dtc.clearedAt ? "cleared" : dtc.status === "active" ? "unknown" : dtc.status,
        detectedAt: dtc.detectedAt ? String(dtc.detectedAt) : undefined,
      });
      if (!lifecycle) {
        skipped += 1;
        continue;
      }
      const result = await enqueueNotification({
        userId: vehicle.userId,
        vehicleId: vehicle.id,
        type: String(lifecycle.type),
        severity: dtc.severity ?? "warning",
        titleAr: lifecycle.type === "dtc_reappeared" ? "رجع رمز عطل سابق" : "فيه ملاحظة في فحص سيارتك",
        bodyAr:
          lifecycle.type === "dtc_reappeared"
            ? "ظهر رمز عطل سبق رصده في سيارتك. راجع نتيجة الفحص."
            : "رصد مفك رمز عطل جديدًا يحتاج مراجعة. افتح نتيجة التشخيص.",
        actionUrl: actionUrlForType(String(lifecycle.type)),
        sourceKey: String(lifecycle.sourceKey),
      });
      if (result.created) created += 1;
      else skipped += 1;
    }

    try {
      const readings = await db
        .select()
        .from(odometerReadingsTable)
        .where(eq(odometerReadingsTable.vehicleId, vehicle.id))
        .orderBy(desc(odometerReadingsTable.recordedAt))
        .limit(2);
      if (readings.length === 2) {
        const discrepancy = odometerDiscrepancyAlert({
          previousKm: readings[1].km,
          nextKm: readings[0].km,
          estimated: readings[0].estimated,
        });
        if (discrepancy) {
          const result = await enqueueNotification({
            userId: vehicle.userId,
            vehicleId: vehicle.id,
            type: String(discrepancy.type),
            severity: String(discrepancy.severity),
            titleAr: "مراجعة قراءة العداد",
            bodyAr: "يوجد فرق كبير بين قراءتين للعداد. راجع السجل داخل التطبيق.",
            actionUrl: actionUrlForType(String(discrepancy.type)),
            sourceKey: String(discrepancy.sourceKey),
          });
          if (result.created) created += 1;
          else skipped += 1;
        }
      }
    } catch {
      skipped += 1;
    }

    try {
      const documents = await db
        .select()
        .from(vehicleDocumentsTable)
        .where(eq(vehicleDocumentsTable.vehicleId, vehicle.id));
      for (const document of documents) {
        const alert = documentReminderAlert({
          kind: document.kind,
          expiresAt: document.expiresAt,
        });
        if (!alert) {
          skipped += 1;
          continue;
        }
        const result = await enqueueNotification({
          userId: vehicle.userId,
          vehicleId: vehicle.id,
          type: String(alert.type),
          severity: String(alert.severity),
          titleAr:
            document.kind === "insurance"
              ? "قرب انتهاء تأمين سيارتك"
              : document.kind === "registration"
                ? "قرب انتهاء استمارة سيارتك"
                : "قرب موعد الفحص الدوري",
          bodyAr:
            Number(alert.remainingDays) > 0
              ? `باقي ${Number(alert.remainingDays)} يوم. التفاصيل داخل التطبيق.`
              : "انتهت صلاحية الوثيقة المسجّلة. التفاصيل داخل التطبيق.",
          actionUrl: actionUrlForType(String(alert.type)),
          sourceKey: String(alert.sourceKey),
        });
        if (result.created) created += 1;
        else skipped += 1;
      }
    } catch {
      /* vehicle_documents is an isolated proposal until SQL is approved */
    }
  }

  try {
    const subscriptions = await db.select().from(subscriptionsTable);
    for (const subscription of subscriptions) {
      const alert = subscriptionReminderAlert({
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
      if (!alert) {
        skipped += 1;
        continue;
      }
      const result = await enqueueNotification({
        userId: subscription.userId,
        type: String(alert.type),
        severity: String(alert.severity),
        titleAr: String(alert.type) === "subscription_expired" ? "انتهى الاشتراك" : "اقتراب تجديد الاشتراك",
        bodyAr: "راجع حالة الباقة داخل التطبيق.",
        actionUrl: actionUrlForType(String(alert.type)),
        sourceKey: `${String(alert.sourceKey)}:${subscription.id}`,
      });
      if (result.created) created += 1;
      else skipped += 1;
    }
  } catch (err) {
    logger.warn({ err }, "subscription reminder scan skipped");
  }

  logger.info({ created, skipped }, "due notification scan finished");
  return { created, skipped };
}

export { cronSecretFromRequest } from "./notification-policy.mjs";
