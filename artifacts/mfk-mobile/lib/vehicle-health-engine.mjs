/**
 * Mofk Vehicle Health Intelligence Engine.
 * Rule-based only. No BLE/ELM327 imports. No synthetic OBD values.
 */
import {
  MAINTENANCE_RULES,
  buildDtcRecommendation,
  buildMaintenanceRecommendation,
  computeNextDue,
  computeScheduleStatus,
  serviceLabelAr,
  sourceKeyForDtc,
  sourceKeyForTelemetry,
} from "./maintenance-engine.mjs";

export const TELEMETRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const COOLANT_REPEAT_THRESHOLD_C = 105;
export const BATTERY_LOW_VOLTS = 12.2;
export const MIN_ANOMALY_SAMPLES = 3;

export const DEFAULT_RULE_SOURCE = "platform_default";
export const LIVE_WINDOW_MS = 2 * 60 * 1000;

function usableRule(row) {
  return Boolean(row && (row.intervalKm || row.intervalDays));
}

function normalizeRule(row, fallbackSource) {
  return {
    intervalKm: row.intervalKm ?? null,
    intervalDays: row.intervalDays ?? null,
    soonKm: row.soonKm ?? 1500,
    soonDays: row.soonDays ?? 30,
    estimatedCost: row.estimatedCost ?? null,
    ruleSource: row.ruleSource || fallbackSource,
  };
}

export function resolveMaintenanceRule(serviceType, overrides = [], vehicle = {}) {
  const rows = overrides || [];
  const vehicleRule = rows.find(
    (row) => row.serviceType === serviceType && row.vehicleId && row.vehicleId === vehicle.id,
  );
  if (usableRule(vehicleRule)) return normalizeRule(vehicleRule, "vehicle_rule");

  const catalogRule = rows.find(
    (row) =>
      row.serviceType === serviceType &&
      !row.vehicleId &&
      row.make &&
      String(row.make).toLowerCase() === String(vehicle.make || "").toLowerCase() &&
      (!row.model || String(row.model).toLowerCase() === String(vehicle.model || "").toLowerCase()) &&
      (!row.year || Number(row.year) === Number(vehicle.year)),
  );
  if (usableRule(catalogRule)) return normalizeRule(catalogRule, "catalog_rule");

  const generic = rows.find(
    (row) => row.serviceType === serviceType && !row.vehicleId && !row.make && usableRule(row),
  );
  if (usableRule(generic)) return normalizeRule(generic, "user_configured");

  const fallback = MAINTENANCE_RULES[serviceType];
  if (!fallback) return null;
  return { ...fallback, ruleSource: DEFAULT_RULE_SOURCE };
}

export function isRecommendationId(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function maintenanceIdempotencyKey({ userId, vehicleId, serviceType, doneAt, doneAtKm } = {}) {
  return [
    userId || "na",
    vehicleId || "na",
    serviceType || "na",
    doneAt ? new Date(doneAt).toISOString() : "na",
    doneAtKm == null || doneAtKm === "" ? "na" : String(doneAtKm),
  ].join("|");
}

export function describeVehicleLink({ adapterMac, lastTelemetryAt, now = new Date() } = {}) {
  const paired = Boolean(adapterMac);
  const lastSeenAt = lastTelemetryAt
    ? lastTelemetryAt instanceof Date
      ? lastTelemetryAt
      : new Date(lastTelemetryAt)
    : null;
  const lastSeenMs = lastSeenAt && !Number.isNaN(lastSeenAt.getTime()) ? lastSeenAt.getTime() : null;
  const connected = Boolean(paired && lastSeenMs && now.getTime() - lastSeenMs <= LIVE_WINDOW_MS);
  return {
    paired,
    connected,
    lastSeenAt: lastSeenMs ? new Date(lastSeenMs).toISOString() : null,
    live: connected,
  };
}

export function isSupportedPidValue(value) {
  if (value === null || value === undefined || value === "") return false;
  const num = Number(value);
  return Number.isFinite(num);
}

export function isFreshTimestamp(time, now = new Date(), maxAgeMs = TELEMETRY_MAX_AGE_MS) {
  if (!time) return false;
  const at = time instanceof Date ? time : new Date(time);
  if (Number.isNaN(at.getTime())) return false;
  return now.getTime() - at.getTime() <= maxAgeMs;
}

export function assessTelemetryQuality(samples, now = new Date()) {
  const rows = (samples || []).filter((row) => row && !row.synthetic);
  if (!rows.length) {
    return {
      status: "insufficient_data",
      reason: "no_reliable_telemetry",
      freshCount: 0,
      lastReadingAt: null,
    };
  }
  const fresh = rows.filter((row) => isFreshTimestamp(row.time, now));
  const last = rows[0];
  if (!fresh.length) {
    return {
      status: "stale",
      reason: "telemetry_older_than_window",
      freshCount: 0,
      lastReadingAt: last.time ?? null,
    };
  }
  return {
    status: "ok",
    reason: "measured",
    freshCount: fresh.length,
    lastReadingAt: last.time ?? null,
  };
}

export function validateOdometerReading({
  nextKm,
  previousKm = 0,
  source,
  allowDecrease = false,
} = {}) {
  const km = Number(nextKm);
  if (!Number.isFinite(km) || km < 0 || km > 2_000_000) {
    return { ok: false, error: "قراءة العداد غير صحيحة." };
  }
  if (source === "rpm_estimate" || source === "speed_estimate") {
    return { ok: false, error: "لا يُعتمد تقدير السرعة أو الدوران كعداد حقيقي." };
  }
  if (!allowDecrease && previousKm != null && km + 50 < Number(previousKm)) {
    return { ok: false, error: "القراءة أقل من العداد المسجل بشكل غير منطقي." };
  }
  return { ok: true, km };
}

export function estimateDailyKm(readings = []) {
  const rows = [...readings]
    .filter((row) => row && Number.isFinite(Number(row.km)) && row.recordedAt)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  if (rows.length < 2) {
    return { status: "insufficient_data", kmPerDay: null, estimated: true };
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  const days =
    (new Date(last.recordedAt).getTime() - new Date(first.recordedAt).getTime()) / 86400000;
  const delta = Number(last.km) - Number(first.km);
  if (days < 1 || delta < 0) {
    return { status: "insufficient_data", kmPerDay: null, estimated: true };
  }
  return { status: "ok", kmPerDay: delta / days, estimated: true };
}

export function estimateNextDueDate({ remainingKm, kmPerDay, nextDueAt, now = new Date() } = {}) {
  if (nextDueAt) {
    return { dueAt: nextDueAt, estimated: false };
  }
  if (remainingKm == null || !kmPerDay || kmPerDay <= 0) {
    return { dueAt: null, estimated: true, status: "insufficient_data" };
  }
  const days = remainingKm / kmPerDay;
  const due = new Date(now.getTime());
  due.setUTCDate(due.getUTCDate() + Math.max(0, Math.round(days)));
  return { dueAt: due.toISOString(), estimated: true };
}

export function computeHealthScore({
  overdueCount = 0,
  activeDtcCount = 0,
  anomalyCount = 0,
} = {}) {
  let score = 100;
  score -= Math.min(40, overdueCount * 8);
  score -= Math.min(30, activeDtcCount * 12);
  score -= Math.min(20, anomalyCount * 10);
  return Math.max(20, Math.min(100, score));
}

export function attachExplanation(rec) {
  if (!rec) return rec;
  const evidence = rec.evidence || rec.metadata?.evidence || [];
  const explanationAr =
    rec.explanationAr ||
    [
      rec.descriptionAr,
      evidence.length ? `الأدلة: ${evidence.join("؛ ")}.` : null,
      rec.metadata?.ruleSource === DEFAULT_RULE_SOURCE
        ? "الفاصل المستخدم افتراضي للمنصة وليس جدول المصنع لهذه السيارة إلا إذا أُدخل إعداد خاص."
        : null,
      rec.needsWorkshop
        ? "يُفضل فحص الورشة. القراءة وحدها لا تحدد القطعة المعطلة."
        : "يمكن المتابعة وتسجيل الصيانة عند التنفيذ.",
    ]
      .filter(Boolean)
      .join(" ");
  const explanationEn =
    rec.explanationEn ||
    "Mofk used recorded vehicle data only. This is a rule-based notice, not a guaranteed parts diagnosis.";
  return {
    ...rec,
    titleEn: rec.titleEn || rec.titleAr,
    explanationAr,
    explanationEn,
    evidence,
    metadata: {
      ...(rec.metadata || {}),
      evidence,
      explanationAr,
      explanationEn,
      llmGenerated: false,
    },
    confidencePct: rec.metadata?.confidenceSource === "measured" ? rec.confidencePct : undefined,
  };
}

export function buildRepeatedCoolantAnomaly(vehicleId, samples, now = new Date()) {
  const fresh = (samples || []).filter(
    (row) =>
      !row?.synthetic &&
      isFreshTimestamp(row.time, now) &&
      isSupportedPidValue(row.coolantTemp) &&
      Number(row.coolantTemp) >= COOLANT_REPEAT_THRESHOLD_C,
  );
  if (fresh.length < MIN_ANOMALY_SAMPLES) return null;
  const last = fresh[0];
  return attachExplanation({
    vehicleId,
    kind: "telemetry_anomaly",
    category: "diagnostic",
    source: "obd_live_data",
    sourceKey: sourceKeyForTelemetry("coolant_repeat"),
    severity: "critical",
    status: "active",
    titleAr: "ارتفاع متكرر في حرارة سائل التبريد",
    titleEn: "Repeated high coolant temperature",
    descriptionAr: `لاحظ مفك ارتفاع حرارة سائل التبريد في ${fresh.length} قراءات محفوظة وحديثة، آخرها ${Math.round(Number(last.coolantTemp))}°م. القراءة وحدها لا تحدد القطعة المعطلة.`,
    suggestedAction: "افحص نظام التبريد في ورشة قبل القيادة المتواصلة",
    needsWorkshop: true,
    evidence: [
      `${fresh.length} قراءات ≥ ${COOLANT_REPEAT_THRESHOLD_C}°م`,
      `آخر قراءة ${last.time}`,
    ],
    metadata: {
      confidenceSource: "measured",
      sampleCount: fresh.length,
      pid: "0105",
    },
  });
}

export function buildRecurringDtcRecommendation(vehicleId, history = []) {
  const byCode = new Map();
  for (const row of history) {
    const code = String(row.code || "").toUpperCase();
    if (!code) continue;
    const list = byCode.get(code) || [];
    list.push(row);
    byCode.set(code, list);
  }
  const recs = [];
  for (const [code, rows] of byCode) {
    const clearedThenActive =
      rows.some((row) => row.status === "cleared" || row.status === "resolved") &&
      rows.some((row) => row.status === "active" || row.status === "open");
    if (!clearedThenActive || rows.length < 2) continue;
    recs.push(
      attachExplanation({
        ...buildDtcRecommendation({ vehicleId, code, severity: "high" }),
        sourceKey: `${sourceKeyForDtc(code)}:recurring`,
        titleAr: `تكرار ظهور كود العطل ${code}`,
        descriptionAr: `ظهر الكود ${code} بعد إغلاق سابق. هذا مؤشر لتكرار العطل وليس إثباتًا أن الصيانة اكتملت.`,
        suggestedAction: "أعد الفحص التشخيصي ولا تغلق التوصية إلا بعد مسح جديد",
        needsWorkshop: true,
        evidence: [`سجل ${rows.length} حالات للكود ${code}`],
      }),
    );
  }
  return recs;
}

export function maybeCreateMaintenanceApproval({
  vehicleId,
  disappearedDtc,
  recentMaintenanceLogs = [],
} = {}) {
  if (!disappearedDtc?.code) return null;
  const related = recentMaintenanceLogs.some(
    (log) =>
      log.recommendationId === disappearedDtc.recommendationId ||
      String(log.notes || "").toUpperCase().includes(String(disappearedDtc.code).toUpperCase()),
  );
  if (related) return null;
  return {
    vehicleId,
    kind: "dtc_cleared",
    status: "pending",
    titleAr: "هل أجريت صيانة للمركبة؟",
    bodyAr: `لاحظ مفك أن رمز العطل ${String(disappearedDtc.code).toUpperCase()} لم يعد ظاهرًا. لا نحفظ صيانة مكتملة قبل تأكيدك.`,
    dtcCode: String(disappearedDtc.code).toUpperCase(),
  };
}

export function explainForAssistant(rec) {
  const explained = attachExplanation(rec);
  return {
    observedAr: explained.titleAr,
    whyAr: explained.explanationAr,
    dataAr: (explained.evidence || []).join("، ") || "لا توجد قراءات كافية",
    severity: explained.severity,
    nextAr: explained.suggestedAction,
    workshop: Boolean(explained.needsWorkshop),
  };
}

export function evaluateVehicleHealth({
  vehicleId,
  vehicle = {},
  odometerKm,
  logs = [],
  schedule = [],
  dtcs = [],
  telemetrySamples = [],
  ruleOverrides = [],
  now = new Date(),
  anomalyEnabled = false,
} = {}) {
  const quality = assessTelemetryQuality(telemetrySamples, now);
  const vehicleContext = { id: vehicleId, ...vehicle };
  const latestByService = new Map();
  for (const log of logs) {
    if (!latestByService.has(log.serviceType)) latestByService.set(log.serviceType, log);
  }

  const candidates = [];
  const seen = new Set();
  for (const item of schedule) {
    seen.add(item.serviceType);
    const rule = resolveMaintenanceRule(item.serviceType, ruleOverrides, vehicleContext);
    const rec = buildMaintenanceRecommendation({
      vehicleId,
      serviceType: item.serviceType,
      lastDoneKm: item.lastDoneKm,
      lastDoneAt: item.lastDoneAt,
      odometerKm,
      estimatedCost: item.estimatedCost ?? rule?.estimatedCost,
      rule,
      now,
    });
    if (rec) {
      candidates.push(
        attachExplanation({
          ...rec,
          metadata: { ...rec.metadata, ruleSource: rule?.ruleSource || DEFAULT_RULE_SOURCE },
        }),
      );
    }
  }
  for (const [serviceType, log] of latestByService) {
    if (seen.has(serviceType)) continue;
    const rule = resolveMaintenanceRule(serviceType, ruleOverrides, vehicleContext);
    const rec = buildMaintenanceRecommendation({
      vehicleId,
      serviceType,
      lastDoneKm: log.doneAtKm ?? log.lastDoneKm,
      lastDoneAt: log.doneAt ?? log.lastDoneAt,
      odometerKm,
      rule,
      now,
    });
    if (rec) {
      candidates.push(
        attachExplanation({
          ...rec,
          metadata: { ...rec.metadata, ruleSource: rule?.ruleSource || DEFAULT_RULE_SOURCE },
        }),
      );
    }
  }

  for (const dtc of dtcs.filter((row) => row.status === "active" || row.status === "open")) {
    const rec = buildDtcRecommendation({
      vehicleId,
      code: dtc.code,
      descriptionAr: dtc.descriptionAr,
      severity: dtc.severity,
    });
    if (rec) candidates.push(attachExplanation(rec));
  }

  if (anomalyEnabled && quality.status === "ok") {
    const coolant = buildRepeatedCoolantAnomaly(vehicleId, telemetrySamples, now);
    if (coolant) candidates.push(coolant);
    candidates.push(...buildRecurringDtcRecommendation(vehicleId, dtcs));
  }

  const overdueCount = candidates.filter(
    (row) => row.kind === "maintenance_due" && row.scheduleStatus === "overdue",
  ).length;
  const healthScore = computeHealthScore({
    overdueCount,
    activeDtcCount: dtcs.filter((row) => row.status === "active" || row.status === "open").length,
    anomalyCount: candidates.filter((row) => row.kind === "telemetry_anomaly").length,
  });

  return {
    vehicleId,
    healthScore,
    dataQuality: quality,
    lastReadingAt: quality.lastReadingAt,
    insufficientData: quality.status !== "ok",
    candidates,
  };
}

export function notificationDedupeKey({ type, vehicleId, sourceKey }) {
  return ["mofk", type, vehicleId, sourceKey || "na"].join(":");
}

export {
  computeNextDue,
  computeScheduleStatus,
  serviceLabelAr,
};
