import { enqueueNotification, supersedeNotifications } from "./notification-orchestrator";
import { isVerifiedPaymentEvent } from "./notification-rules.mjs";
import {
  actionUrlForType,
  isClosedStatus,
  notificationTypeForRecommendation,
  severityRank,
} from "./notification-policy.mjs";

type RecLike = {
  id?: string;
  kind?: string | null;
  source?: string | null;
  sourceKey?: string | null;
  status?: string | null;
  severity?: string | null;
  titleAr?: string | null;
  descriptionAr?: string | null;
  scheduleStatus?: string | null;
  serviceType?: string | null;
  category?: string | null;
};

export async function notifyEvaluationAlerts(input: {
  userId: string;
  vehicleId: string;
  inserts: RecLike[];
  updates: Array<{ id?: string; patch?: RecLike }>;
  previousById: Map<string, RecLike>;
}) {
  for (const rec of input.inserts) {
    if (isClosedStatus(rec.status)) continue;
    const type = notificationTypeForRecommendation(rec);
    if (!type) continue;
    await enqueueNotification({
      userId: input.userId,
      vehicleId: input.vehicleId,
      type,
      severity: rec.severity ?? "info",
      titleAr: rec.titleAr || "تنبيه",
      bodyAr: rec.descriptionAr ?? null,
      actionUrl: actionUrlForType(type),
      sourceKey: rec.sourceKey || rec.id || null,
    }).catch(() => null);
  }

  for (const update of input.updates) {
    const patch = update.patch ?? {};
    const previous = update.id ? input.previousById.get(update.id) : undefined;
    if (isClosedStatus(patch.status ?? previous?.status)) continue;
    const merged = { ...previous, ...patch };
    if (
      previous &&
      severityRank(merged.severity) > severityRank(previous.severity) &&
      merged.kind !== "maintenance_due" &&
      merged.kind !== "dtc" &&
      merged.source !== "dtc"
    ) {
      await enqueueNotification({
        userId: input.userId,
        vehicleId: input.vehicleId,
        type: "recommendation_priority",
        severity: merged.severity ?? "warning",
        titleAr: merged.titleAr || "تغيّر أولوية توصية",
        bodyAr: merged.descriptionAr ?? null,
        actionUrl: actionUrlForType("recommendation_priority"),
        sourceKey: `${merged.sourceKey || update.id}:priority:${merged.severity}`,
      }).catch(() => null);
      continue;
    }
    const type = notificationTypeForRecommendation(merged, {
      previousSeverity: previous?.severity ?? undefined,
    });
    if (type !== "maintenance_upcoming" && type !== "maintenance_overdue") continue;
    await enqueueNotification({
      userId: input.userId,
      vehicleId: input.vehicleId,
      type,
      severity: merged.severity ?? "info",
      titleAr: merged.titleAr || "تنبيه صيانة",
      bodyAr: merged.descriptionAr ?? null,
      actionUrl: actionUrlForType(type),
      sourceKey: merged.sourceKey || update.id || null,
    }).catch(() => null);
  }
}

export async function notifyMaintenanceCompleted(input: {
  userId: string;
  vehicleId: string;
  serviceType: string;
  nextDueKm?: string | number | null;
}) {
  await supersedeNotifications(input.userId, ["maintenance_upcoming", "maintenance_overdue"], input.serviceType);
  return enqueueNotification({
    userId: input.userId,
    vehicleId: input.vehicleId,
    type: "maintenance_completed",
    severity: "success",
    titleAr: "تم تسجيل الصيانة",
    bodyAr: "تم إغلاق التذكيرات السابقة لهذه الخدمة. الدورة الجديدة تُحسب من السجل.",
    actionUrl: actionUrlForType("maintenance_completed"),
    sourceKey: `${input.serviceType}:completed:${input.nextDueKm ?? "na"}`,
  }).catch(() => null);
}

export async function notifyVerifiedSubscription(input: {
  userId: string;
  type: "subscription_activated" | "subscription_payment_failed";
  payment: { status?: string; providerStatus?: string; source?: string; id?: string };
}) {
  if (input.type === "subscription_activated" && !isVerifiedPaymentEvent(input.payment)) {
    return { created: false, reason: "mock_or_unverified_payment" };
  }
  return enqueueNotification({
    userId: input.userId,
    type: input.type,
    severity: input.type === "subscription_payment_failed" ? "warning" : "success",
    titleAr: input.type === "subscription_activated" ? "تم تفعيل الاشتراك" : "تعذر إتمام الدفع",
    bodyAr: "راجع تفاصيل الباقة داخل التطبيق.",
    actionUrl: actionUrlForType(input.type),
    sourceKey: `${input.type}:${input.payment.id ?? "na"}`,
  });
}

export async function notifyObdBinding(input: {
  userId: string;
  type: "obd_pair_success" | "obd_pair_error";
  serial?: string;
}) {
  return enqueueNotification({
    userId: input.userId,
    type: input.type,
    severity: input.type === "obd_pair_error" ? "warning" : "info",
    titleAr: input.type === "obd_pair_success" ? "تم ربط جهاز مفك" : "تعذر ربط جهاز مفك",
    bodyAr: "افتح صفحة الجهاز للمتابعة.",
    actionUrl: actionUrlForType(input.type),
    sourceKey: `${input.type}:${input.serial ?? "na"}`,
  }).catch(() => null);
}
