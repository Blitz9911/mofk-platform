/** Shared maintenance + recommendation rules. No BLE/OBD imports. */

export const LIFECYCLE_STATUSES = [
  "active",
  "in_progress",
  "resolved",
  "deferred",
  "dismissed",
];

export const OPEN_STATUSES = ["active", "in_progress", "deferred"];

export const MAINTENANCE_LABELS = {
  oil_change: "تغيير الزيت",
  tire_rotation: "تدوير الإطارات",
  brake_inspection: "فحص الفرامل",
  battery_check: "فحص البطارية",
  air_filter: "تغيير فلتر الهواء",
  transmission_fluid: "سائل ناقل الحركة",
  coolant_flush: "تغيير سائل التبريد",
  spark_plugs: "تغيير شمعات الإشعال",
  timing_belt: "سير التوقيت",
  wheel_alignment: "ضبط زوايا الإطارات",
  ac_service: "صيانة التكييف",
  other: "صيانة أخرى",
};

export const MAINTENANCE_RULES = {
  oil_change: { intervalKm: 10000, intervalDays: 180, soonKm: 1500, soonDays: 30, estimatedCost: 250 },
  tire_rotation: { intervalKm: 10000, intervalDays: 180, soonKm: 1500, soonDays: 30, estimatedCost: 80 },
  brake_inspection: { intervalKm: 20000, intervalDays: 365, soonKm: 2000, soonDays: 45, estimatedCost: 150 },
  battery_check: { intervalKm: 30000, intervalDays: 365, soonKm: 3000, soonDays: 45, estimatedCost: 50 },
  air_filter: { intervalKm: 20000, intervalDays: 365, soonKm: 2000, soonDays: 45, estimatedCost: 80 },
  transmission_fluid: { intervalKm: 40000, intervalDays: 730, soonKm: 3000, soonDays: 60, estimatedCost: 350 },
  coolant_flush: { intervalKm: 40000, intervalDays: 730, soonKm: 3000, soonDays: 60, estimatedCost: 200 },
  spark_plugs: { intervalKm: 40000, intervalDays: 730, soonKm: 3000, soonDays: 60, estimatedCost: 180 },
  timing_belt: { intervalKm: 80000, intervalDays: 1825, soonKm: 5000, soonDays: 90, estimatedCost: 900 },
  wheel_alignment: { intervalKm: 20000, intervalDays: 365, soonKm: 2000, soonDays: 45, estimatedCost: 120 },
  ac_service: { intervalKm: 20000, intervalDays: 365, soonKm: 2000, soonDays: 45, estimatedCost: 180 },
};

export function serviceLabelAr(serviceType) {
  return MAINTENANCE_LABELS[serviceType] || serviceType || "صيانة";
}

export function addDaysIso(dateInput, days) {
  const date = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString();
}

export function daysUntilIso(dateInput, now = new Date()) {
  const target = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(target.getTime())) return null;
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end - start) / 86400000);
}

export function validateMaintenanceInput({
  doneAt,
  doneAtKm,
  cost,
  serviceType,
  now = new Date(),
} = {}) {
  const errors = [];
  if (!serviceType || String(serviceType).trim() === "") {
    errors.push("نوع الصيانة مطلوب.");
  }
  const at = doneAt ? new Date(doneAt) : null;
  if (!at || Number.isNaN(at.getTime())) {
    errors.push("تاريخ الصيانة غير صحيح.");
  } else if (at.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    errors.push("لا يمكن تسجيل صيانة بتاريخ مستقبلي.");
  }
  if (doneAtKm !== undefined && doneAtKm !== null && doneAtKm !== "") {
    const km = Number(doneAtKm);
    if (!Number.isFinite(km) || km < 0 || km > 2_000_000) {
      errors.push("قراءة العداد غير صحيحة.");
    }
  }
  if (cost !== undefined && cost !== null && cost !== "") {
    const value = Number(cost);
    if (!Number.isFinite(value) || value < 0) {
      errors.push("التكلفة غير صحيحة.");
    }
  }
  return { ok: errors.length === 0, errors };
}

export function computeNextDue({
  lastDoneKm,
  lastDoneAt,
  intervalKm,
  intervalDays,
} = {}) {
  const km =
    intervalKm && lastDoneKm !== null && lastDoneKm !== undefined && Number.isFinite(Number(lastDoneKm))
      ? Number(lastDoneKm) + Number(intervalKm)
      : null;
  const at =
    intervalDays && lastDoneAt
      ? addDaysIso(lastDoneAt, intervalDays)
      : null;
  return { nextDueKm: km, nextDueAt: at };
}

export function computeScheduleStatus({
  nextDueKm,
  nextDueAt,
  odometerKm,
  soonKm = 1500,
  soonDays = 30,
  now = new Date(),
} = {}) {
  const remainingKm =
    nextDueKm !== null && nextDueKm !== undefined && Number.isFinite(Number(odometerKm))
      ? Number(nextDueKm) - Number(odometerKm)
      : null;
  const remainingDays = nextDueAt ? daysUntilIso(nextDueAt, now) : null;
  const overdue =
    (remainingKm !== null && remainingKm < 0) ||
    (remainingDays !== null && remainingDays < 0);
  const upcoming =
    !overdue &&
    ((remainingKm !== null && remainingKm >= 0 && remainingKm <= soonKm) ||
      (remainingDays !== null && remainingDays >= 0 && remainingDays <= soonDays));
  return {
    status: overdue ? "overdue" : upcoming ? "upcoming" : "scheduled",
    remainingKm,
    remainingDays,
  };
}

export function sourceKeyForMaintenance(serviceType) {
  return `maintenance:${serviceType}`;
}

export function sourceKeyForDtc(code) {
  return `dtc:${String(code || "").toUpperCase()}`;
}

export function sourceKeyForTelemetry(signal) {
  return `telemetry:${signal}`;
}

export function dedupeKey(vehicleId, kind, sourceKey) {
  return `${vehicleId}|${kind}|${sourceKey}`;
}

export function isOpenStatus(status) {
  return OPEN_STATUSES.includes(status || "active");
}

export function canCloseByMaintenance(recommendation) {
  if (!recommendation) return false;
  if (recommendation.source === "dtc" || recommendation.kind === "predictive_failure") {
    return false;
  }
  if (String(recommendation.sourceKey || "").startsWith("dtc:")) return false;
  return recommendation.kind === "maintenance_due";
}

export function applyMaintenanceToRecommendations(recommendations, log) {
  const serviceType = log?.serviceType;
  const vehicleId = log?.vehicleId;
  const nowIso = (log?.doneAt && new Date(log.doneAt).toISOString()) || new Date().toISOString();
  return (recommendations || []).map((rec) => {
    if (rec.vehicleId !== vehicleId) return rec;
    if (!canCloseByMaintenance(rec)) return rec;
    const expectedKey = sourceKeyForMaintenance(serviceType);
    const label = serviceLabelAr(serviceType);
    const matchesKey = rec.sourceKey === expectedKey;
    const matchesLegacyTitle =
      !rec.sourceKey || String(rec.sourceKey).startsWith("legacy:")
        ? String(rec.titleAr || "").includes(label)
        : false;
    if (!matchesKey && !matchesLegacyTitle) return rec;
    if (!isOpenStatus(rec.status)) return rec;
    return {
      ...rec,
      status: "resolved",
      linkedMaintenanceLogId: log.id ?? rec.linkedMaintenanceLogId ?? null,
      linkedMaintenanceItemId: log.scheduleId ?? rec.linkedMaintenanceItemId ?? null,
      resolvedAt: nowIso,
      updatedAt: nowIso,
      resolutionReason: "maintenance_logged",
    };
  });
}

function measuredConfidence(hasMeasurement) {
  return hasMeasurement
    ? { confidencePct: undefined, metadata: { confidenceSource: "measured" } }
    : { confidencePct: undefined, metadata: { confidenceSource: "none" } };
}

export function buildMaintenanceRecommendation({
  vehicleId,
  serviceType,
  lastDoneKm,
  lastDoneAt,
  odometerKm,
  estimatedCost,
  now = new Date(),
} = {}) {
  const rule = MAINTENANCE_RULES[serviceType];
  if (!rule) return null;
  const due = computeNextDue({
    lastDoneKm,
    lastDoneAt,
    intervalKm: rule.intervalKm,
    intervalDays: rule.intervalDays,
  });
  const statusInfo = computeScheduleStatus({
    ...due,
    odometerKm,
    soonKm: rule.soonKm,
    soonDays: rule.soonDays,
    now,
  });
  if (statusInfo.status === "scheduled") return null;
  const overdue = statusInfo.status === "overdue";
  const label = serviceLabelAr(serviceType);
  return {
    vehicleId,
    kind: "maintenance_due",
    category: "preventive",
    source: "maintenance_schedule",
    sourceKey: sourceKeyForMaintenance(serviceType),
    severity: overdue ? "warning" : "info",
    status: "active",
    titleAr: overdue ? `صيانة متأخرة: ${label}` : `موعد صيانة: ${label}`,
    descriptionAr: overdue
      ? `بند ${label} تجاوز الفاصل المعتمد حسب آخر صيانة مسجلة. هذا تنبيه جدولة وليس تشخيص عطل.`
      : `بند ${label} قريب حسب فاصل الصيانة المعتمد لهذه المركبة.`,
    suggestedAction: `تسجيل ${label}`,
    suggestedCostSar: estimatedCost ?? rule.estimatedCost ?? null,
    lastDoneKm: lastDoneKm ?? null,
    lastDoneAt: lastDoneAt ?? null,
    intervalKm: rule.intervalKm ?? null,
    intervalDays: rule.intervalDays ?? null,
    nextDueKm: due.nextDueKm,
    nextDueAt: due.nextDueAt,
    remainingKm: statusInfo.remainingKm,
    daysUntilDue: statusInfo.remainingDays,
    scheduleStatus: statusInfo.status,
    serviceType,
    serviceTypeAr: label,
    metadata: { confidenceSource: "none", ruleBased: true },
    confidencePct: undefined,
  };
}

export function buildDtcRecommendation({ vehicleId, code, descriptionAr, severity } = {}) {
  if (!code) return null;
  const upper = String(code).toUpperCase();
  return {
    vehicleId,
    kind: "telemetry_anomaly",
    category: "diagnostic",
    source: "dtc",
    sourceKey: sourceKeyForDtc(upper),
    severity: severity === "critical" || severity === "high" ? "warning" : "info",
    status: "active",
    titleAr: `كود عطل يحتاج فحصًا: ${upper}`,
    descriptionAr:
      descriptionAr ||
      `ظهر الكود ${upper} في سجل الأعطال. تسجيل صيانة دورية لا يغلق هذا التنبيه قبل إعادة الفحص التشخيصي.`,
    suggestedAction: "افتح فحص الأعطال وأعد المسح",
    suggestedCostSar: null,
    metadata: { confidenceSource: "none", requiresRescan: true, dtcCode: upper },
    confidencePct: undefined,
  };
}

export function buildTelemetryRecommendations(vehicleId, latest) {
  if (!latest) return [];
  const recs = [];
  if (latest.coolantTemp != null && Number(latest.coolantTemp) >= 105) {
    recs.push({
      vehicleId,
      kind: "telemetry_anomaly",
      category: "diagnostic",
      source: "obd_live_data",
      sourceKey: sourceKeyForTelemetry("coolant"),
      severity: "critical",
      status: "active",
      titleAr: "حرارة المحرك مرتفعة",
      descriptionAr: `قراءة محفوظة لحرارة سائل التبريد ${Math.round(Number(latest.coolantTemp))}°م. هذا قياس مباشر وليس تنبؤًا بالذكاء الاصطناعي.`,
      suggestedAction: "راجع نظام التبريد قبل القيادة المتواصلة",
      suggestedCostSar: null,
      ...measuredConfidence(true),
    });
  }
  if (latest.batteryV != null && Number(latest.batteryV) > 0 && Number(latest.batteryV) < 12.2) {
    recs.push({
      vehicleId,
      kind: "telemetry_anomaly",
      category: "diagnostic",
      source: "obd_live_data",
      sourceKey: sourceKeyForTelemetry("battery"),
      severity: "warning",
      status: "active",
      titleAr: "جهد البطارية منخفض",
      descriptionAr: `قراءة محفوظة لجهد البطارية ${Number(latest.batteryV).toFixed(1)} فولت. راقب الشحن مع الفحص التشخيصي عند الحاجة.`,
      suggestedAction: "افحص البطارية عند أقرب فرصة",
      suggestedCostSar: null,
      ...measuredConfidence(true),
    });
  }
  return recs;
}

export function mergeEvaluatedRecommendations(existing, candidates, now = new Date()) {
  const byKey = new Map();
  for (const row of existing || []) {
    const key =
      row.sourceKey && row.kind
        ? dedupeKey(row.vehicleId, row.kind, row.sourceKey)
        : dedupeKey(row.vehicleId, row.kind, `legacy:${row.titleAr}`);
    byKey.set(key, { ...row, status: row.status || "active" });
  }

  const inserts = [];
  const updates = [];

  for (const candidate of candidates || []) {
    const key = dedupeKey(candidate.vehicleId, candidate.kind, candidate.sourceKey);
    const current = byKey.get(key);
    if (!current) {
      inserts.push({ ...candidate, createdAt: now.toISOString(), updatedAt: now.toISOString() });
      continue;
    }
    if (current.status === "dismissed" || current.status === "resolved") {
      if (candidate.kind === "maintenance_due" && candidate.scheduleStatus === "overdue") {
        updates.push({
          id: current.id,
          patch: {
            ...candidate,
            status: "active",
            updatedAt: now.toISOString(),
            resolvedAt: null,
          },
        });
      }
      continue;
    }
    if (current.status === "deferred") {
      if (current.deferredUntil && new Date(current.deferredUntil).getTime() > now.getTime()) {
        continue;
      }
    }
    updates.push({
      id: current.id,
      patch: {
        severity: candidate.severity,
        titleAr: candidate.titleAr,
        descriptionAr: candidate.descriptionAr,
        lastDoneKm: candidate.lastDoneKm,
        lastDoneAt: candidate.lastDoneAt,
        nextDueKm: candidate.nextDueKm,
        nextDueAt: candidate.nextDueAt,
        remainingKm: candidate.remainingKm,
        daysUntilDue: candidate.daysUntilDue,
        scheduleStatus: candidate.scheduleStatus,
        suggestedCostSar: candidate.suggestedCostSar,
        updatedAt: now.toISOString(),
        status: current.status === "deferred" ? "active" : current.status,
      },
    });
  }

  return { inserts, updates };
}

export function visibleRecommendations(rows, now = new Date()) {
  return (rows || []).filter((row) => {
    const status = row.status || "active";
    if (status === "dismissed" || status === "resolved") return false;
    if (status === "deferred" && row.deferredUntil && new Date(row.deferredUntil).getTime() > now.getTime()) {
      return true;
    }
    return isOpenStatus(status);
  });
}

export function lifecycleEvent(action, extra = {}) {
  return {
    action,
    at: extra.at || new Date().toISOString(),
    ...extra,
  };
}

export function assertVehicleOwner(vehicle, userId) {
  if (!vehicle) return { ok: false, status: 404, error: "Vehicle not found" };
  if (vehicle.userId !== userId && vehicle.user_id !== userId) {
    return { ok: false, status: 404, error: "Vehicle not found" };
  }
  return { ok: true };
}
