/** Product defaults for notification thresholds. Override per user via notification_rules. */

export const DEFAULT_NOTIFICATION_RULES = {
  timezone: "Asia/Riyadh",
  maintenanceKmThresholds: [1000, 500, 0],
  maintenanceDaysBefore: [7],
  documentDaysBefore: [30, 14, 7, 1, 0],
  subscriptionDaysBefore: [7, 1, 0],
  odometerDiscrepancyKm: 1000,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export const DOCUMENT_KINDS = {
  insurance: "insurance",
  registration: "registration",
  inspection: "inspection",
};

export const MOCK_PAYMENT_STATUSES = new Set(["mock", "simulated", "test", "sandbox"]);

export function mergeNotificationRules(overrides = {}) {
  const km = Array.isArray(overrides.maintenanceKmThresholds)
    ? overrides.maintenanceKmThresholds.map(Number).filter((n) => Number.isFinite(n))
    : DEFAULT_NOTIFICATION_RULES.maintenanceKmThresholds;
  return {
    ...DEFAULT_NOTIFICATION_RULES,
    ...overrides,
    maintenanceKmThresholds: km.length ? [...new Set(km)].sort((a, b) => b - a) : DEFAULT_NOTIFICATION_RULES.maintenanceKmThresholds,
    maintenanceDaysBefore: Array.isArray(overrides.maintenanceDaysBefore)
      ? overrides.maintenanceDaysBefore.map(Number).filter((n) => Number.isFinite(n))
      : DEFAULT_NOTIFICATION_RULES.maintenanceDaysBefore,
    documentDaysBefore: Array.isArray(overrides.documentDaysBefore)
      ? overrides.documentDaysBefore.map(Number).filter((n) => Number.isFinite(n))
      : DEFAULT_NOTIFICATION_RULES.documentDaysBefore,
    subscriptionDaysBefore: Array.isArray(overrides.subscriptionDaysBefore)
      ? overrides.subscriptionDaysBefore.map(Number).filter((n) => Number.isFinite(n))
      : DEFAULT_NOTIFICATION_RULES.subscriptionDaysBefore,
  };
}

export function riyadhHour(now = new Date(), timeZone = DEFAULT_NOTIFICATION_RULES.timezone) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  return Number.isFinite(hour) ? hour : now.getUTCHours() + 3;
}

export function isInQuietHours(prefs = {}, now = new Date(), rules = DEFAULT_NOTIFICATION_RULES) {
  const start = prefs.quietHoursStart ?? rules.quietHoursStart;
  const end = prefs.quietHoursEnd ?? rules.quietHoursEnd;
  if (start == null || end == null) return false;
  const hour = riyadhHour(now, rules.timezone);
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function tightestCrossedKmThreshold(remainingKm, thresholds = DEFAULT_NOTIFICATION_RULES.maintenanceKmThresholds) {
  if (remainingKm == null || !Number.isFinite(Number(remainingKm))) return null;
  const remaining = Number(remainingKm);
  const crossed = [...thresholds].filter((threshold) => remaining <= threshold).sort((a, b) => a - b);
  return crossed.length ? crossed[0] : null;
}

export function maintenanceThresholdAlert({ remainingKm, remainingDays, serviceType, nextDueKm, nextDueAt, status }) {
  if (!serviceType) return null;
  const closed = status && ["completed", "done", "resolved", "dismissed", "closed"].includes(String(status).toLowerCase());
  if (closed) return null;

  const kmBand = tightestCrossedKmThreshold(remainingKm);
  if (kmBand != null) {
    return {
      type: kmBand <= 0 ? "maintenance_overdue" : "maintenance_upcoming",
      severity: kmBand <= 0 ? "critical" : kmBand <= 500 ? "warning" : "info",
      sourceKey: `${serviceType}:km:${kmBand}:${nextDueKm ?? "na"}`,
      remainingKm,
      threshold: kmBand,
    };
  }

  if (remainingDays != null && Number.isFinite(Number(remainingDays))) {
    const days = Number(remainingDays);
    if (days < 0) {
      return {
        type: "maintenance_overdue",
        severity: "critical",
        sourceKey: `${serviceType}:day:overdue:${nextDueAt ?? "na"}`,
        remainingDays: days,
        threshold: 0,
      };
    }
    const dayBands = DEFAULT_NOTIFICATION_RULES.maintenanceDaysBefore.filter((d) => days <= d).sort((a, b) => a - b);
    const band = dayBands[0];
    if (band != null) {
      return {
        type: "maintenance_upcoming",
        severity: "warning",
        sourceKey: `${serviceType}:day:${band}:${nextDueAt ?? "na"}`,
        remainingDays: days,
        threshold: band,
      };
    }
  }

  return null;
}

export function documentReminderAlert({ kind, expiresAt, now = new Date(), daysBefore = DEFAULT_NOTIFICATION_RULES.documentDaysBefore }) {
  if (!kind || !expiresAt) return null;
  if (!DOCUMENT_KINDS[kind]) return null;
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return null;
  const ms = expires.getTime() - now.getTime();
  const remainingDays = Math.ceil(ms / 86400000);
  const crossed = [...daysBefore].filter((d) => remainingDays <= d).sort((a, b) => a - b);
  const band = crossed[0];
  if (band == null) return null;
  const expired = remainingDays <= 0;
  return {
    type: `document_${kind}`,
    severity: expired ? "critical" : remainingDays <= 7 ? "warning" : "info",
    sourceKey: `${kind}:${expires.toISOString().slice(0, 10)}:day:${band}`,
    remainingDays,
    threshold: band,
  };
}

export function subscriptionReminderAlert({ status, currentPeriodEnd, now = new Date(), daysBefore = DEFAULT_NOTIFICATION_RULES.subscriptionDaysBefore }) {
  if (!currentPeriodEnd) return null;
  const end = currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(currentPeriodEnd);
  if (Number.isNaN(end.getTime())) return null;
  const remainingDays = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (status === "expired" || remainingDays <= 0) {
    return {
      type: "subscription_expired",
      severity: "warning",
      sourceKey: `subscription:expired:${end.toISOString().slice(0, 10)}`,
      remainingDays,
    };
  }
  const crossed = [...daysBefore].filter((d) => d > 0 && remainingDays <= d).sort((a, b) => a - b);
  const band = crossed[0];
  if (band == null) return null;
  return {
    type: "subscription_renewal",
    severity: remainingDays <= 1 ? "warning" : "info",
    sourceKey: `subscription:renewal:${end.toISOString().slice(0, 10)}:day:${band}`,
    remainingDays,
    threshold: band,
  };
}

export function isVerifiedPaymentEvent({ status, providerStatus, source } = {}) {
  if (MOCK_PAYMENT_STATUSES.has(String(source || "").toLowerCase())) return false;
  if (MOCK_PAYMENT_STATUSES.has(String(providerStatus || "").toLowerCase())) return false;
  return String(status || "").toLowerCase() === "paid";
}

export function odometerDiscrepancyAlert({ previousKm, nextKm, estimated, thresholdKm = DEFAULT_NOTIFICATION_RULES.odometerDiscrepancyKm }) {
  if (estimated) return null;
  if (!Number.isFinite(Number(previousKm)) || !Number.isFinite(Number(nextKm))) return null;
  const delta = Number(nextKm) - Number(previousKm);
  if (delta <= thresholdKm) return null;
  return {
    type: "odometer_review",
    severity: "warning",
    sourceKey: `odometer:${previousKm}:${nextKm}`,
    delta,
  };
}

export function dtcLifecycleAlert({ code, status, previousStatus, detectedAt }) {
  if (!code) return null;
  const current = String(status || "").toLowerCase();
  const previous = String(previousStatus || "").toLowerCase();
  if (current === "cleared" || current === "resolved") return null;
  if (current !== "active") return null;
  if (!previous || previous === "unknown") {
    return { type: "dtc_new", sourceKey: `dtc:${code}:${detectedAt || "new"}` };
  }
  if (previous === "cleared" || previous === "resolved") {
    return { type: "dtc_reappeared", sourceKey: `dtc:${code}:reappeared:${detectedAt || "na"}` };
  }
  return null;
}

export function shouldLocalObdNotify(eventType) {
  return eventType === "pair_error" || eventType === "permission" || eventType === "incompatible";
}

export function shouldServerPushObd(eventType) {
  return eventType === "pair_success" || eventType === "binding_error";
}

export function ignoreRoutineBleDisconnect(eventType) {
  return eventType === "disconnect" || eventType === "reconnect" || eventType === "scan_timeout";
}
