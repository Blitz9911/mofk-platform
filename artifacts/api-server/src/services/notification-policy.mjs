import { timingSafeEqual } from "node:crypto";
import { actionUrlForType as mappedActionUrl } from "./notification-destinations.mjs";
import { isInQuietHours } from "./notification-rules.mjs";

export const CLOSED_STATUSES = new Set([
  "dismissed",
  "resolved",
  "completed",
  "done",
  "closed",
]);

export const PUSH_TYPES = new Set([
  "maintenance_upcoming",
  "maintenance_overdue",
  "odometer_review",
  "recommendation_new",
  "recommendation_priority",
  "dtc_new",
  "dtc_reappeared",
  "document_insurance",
  "document_registration",
  "document_inspection",
  "obd_pair_error",
  "subscription_activated",
  "subscription_renewal",
  "subscription_expired",
  "subscription_payment_failed",
  "push_probe",
]);

const SEVERITY_RANK = {
  info: 0,
  low: 0,
  warning: 1,
  medium: 1,
  high: 2,
  critical: 3,
};

export function isClosedStatus(status) {
  return CLOSED_STATUSES.has(String(status || "").toLowerCase());
}

export function severityRank(severity) {
  return SEVERITY_RANK[String(severity || "info").toLowerCase()] ?? 0;
}

export function isImportantSeverity(severity) {
  return severityRank(severity) >= 1;
}

export function lockScreenCopy(type) {
  if (type === "push_probe") {
    return { title: "مفك 🔧", body: "تم تفعيل إشعارات مفك بنجاح!" };
  }
  if (type === "dtc_new" || type === "dtc_reappeared") {
    return { title: "تنبيه من مفك", body: "يوجد تنبيه فني في حسابك." };
  }
  if (String(type).startsWith("maintenance") || type === "odometer_review") {
    return { title: "موعد صيانة سيارتك اقترب", body: "مفك يذكّرك بموعد تغيير زيت المحرك." };
  }
  if (String(type).startsWith("document")) {
    return { title: "تنبيه من مفك", body: "لديك تحديث متعلق بوثائق المركبة." };
  }
  if (String(type).startsWith("subscription")) {
    return { title: "تنبيه من مفك", body: "لديك تحديث متعلق بالاشتراك." };
  }
  if (String(type).startsWith("obd")) {
    return { title: "تنبيه من مفك", body: "لديك تحديث متعلق بجهاز مفك." };
  }
  return { title: "تنبيه من مفك", body: "لديك تحديث متعلق بمركبتك." };
}

export function preferenceAllowsType(prefs, type) {
  if (!prefs || prefs.pushEnabled === false) return false;
  if (type === "push_probe") return true;
  if (String(type).startsWith("maintenance") || type === "odometer_review") {
    return prefs.maintenanceEnabled !== false;
  }
  if (String(type).startsWith("dtc")) return prefs.diagnosticsEnabled !== false;
  if (type === "recommendation_new" || type === "recommendation_priority") {
    return prefs.recommendationsEnabled !== false;
  }
  if (String(type).startsWith("document")) return prefs.documentsEnabled !== false;
  if (String(type).startsWith("obd")) return prefs.deviceEnabled !== false;
  if (String(type).startsWith("subscription")) return prefs.subscriptionsEnabled !== false;
  return false;
}

export function isUatPushProbeEnabled(env = process.env) {
  const flag = env.MFK_UAT_PUSH_PROBE === "true" || env.MFK_UAT_PUSH_PROBE === "1";
  if (!flag) return false;
  if (env.MFK_ENV === "production") return false;
  return true;
}

export function maskSecretTail(value) {
  const text = String(value || "");
  if (!text || text.length < 8) return "[redacted]";
  return `…${text.slice(-4)}`;
}

export function ticketIdPrefix(ticketId) {
  if (!ticketId) return null;
  return `${String(ticketId).slice(0, 8)}…`;
}

export function shouldAlertRecommendation(rec) {
  if (!rec) return false;
  if (isClosedStatus(rec.status)) return false;
  if (rec.kind === "dtc" || rec.source === "dtc") {
    return true;
  }
  if (rec.kind === "maintenance_due") return rec.scheduleStatus === "upcoming" || rec.scheduleStatus === "overdue";
  return isImportantSeverity(rec.severity);
}

export function notificationTypeForRecommendation(rec, { previousSeverity } = {}) {
  if (!shouldAlertRecommendation(rec)) return null;
  if (rec.kind === "dtc" || rec.source === "dtc") return "dtc_new";
  if (rec.kind === "maintenance_due") {
    return rec.scheduleStatus === "overdue" ? "maintenance_overdue" : "maintenance_upcoming";
  }
  if (previousSeverity && severityRank(rec.severity) > severityRank(previousSeverity)) {
    return "recommendation_priority";
  }
  return "recommendation_new";
}

export function actionUrlForType(type) {
  return mappedActionUrl(type);
}

export function shouldSkipOptionalPushForQuietHours(prefs, type, now = new Date()) {
  if (type === "push_probe") return false;
  return isInQuietHours(prefs, now);
}

export function dueAlertFromSchedule(item) {
  if (!item || isClosedStatus(item.status)) return null;
  const scheduleStatus = item.scheduleStatus || item.status;
  if (scheduleStatus === "overdue") {
    return {
      type: "maintenance_overdue",
      severity: "critical",
      sourceKey: [item.serviceType, "overdue", item.nextDueAt || item.nextDueKm || "na"].join(":"),
    };
  }
  if (scheduleStatus === "upcoming") {
    return {
      type: "maintenance_upcoming",
      severity: "warning",
      sourceKey: [item.serviceType, "upcoming", item.nextDueAt || item.nextDueKm || "na"].join(":"),
    };
  }
  return null;
}

export function cronSecretFromRequest(named) {
  if (typeof named === "string" && named) return named;
  if (Array.isArray(named) && named[0]) return named[0];
  return "";
}

export function verifyCronSecret(provided, expected) {
  if (!expected) return { ok: false, reason: "cron_secret_unconfigured" };
  if (!provided) return { ok: false, reason: "unauthorized" };
  if (String(provided).split(".").length === 3) return { ok: false, reason: "unauthorized" };
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "unauthorized" };
  return { ok: true };
}

export function parseExpoReceipts(receipts = {}) {
  return Object.entries(receipts).map(([id, receipt]) => {
    const status = receipt?.status === "ok" ? "ok" : "error";
    const errorCode = receipt?.details?.error || receipt?.message || null;
    const invalid = errorCode === "DeviceNotRegistered";
    return {
      ticketId: id,
      status: invalid ? "invalid" : status,
      errorMessage: receipt?.message || errorCode,
      invalid,
    };
  });
}

export function parseExpoTickets(tickets = []) {
  return tickets.map((ticket, index) => {
    const status = ticket?.status === "ok" ? "accepted" : "error";
    const errorCode = ticket?.details?.error || ticket?.message || null;
    const invalid =
      errorCode === "DeviceNotRegistered" ||
      errorCode === "InvalidCredentials" ||
      /DeviceNotRegistered/i.test(String(errorCode || ""));
    return {
      index,
      status: invalid ? "invalid" : status,
      ticketId: ticket?.id ?? null,
      errorMessage: ticket?.message || errorCode,
      invalid,
    };
  });
}
