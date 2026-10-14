/** Guards so QA writes never report success unless a durable record exists. */

export function isUnknownColumnError(error) {
  const message = String(error?.message || error || "");
  return /schema cache|Could not find the '.+' column|PGRST204/i.test(message);
}

export function isMissingTableError(error) {
  const message = String(error?.message || error || "");
  return /schema cache|Could not find the table|PGRST205|relation .+ does not exist/i.test(message);
}

export function buildMaintenanceLogInsert({
  vehicleId,
  userId,
  serviceType,
  customServiceName,
  doneAt,
  doneAtKm,
  costSar,
  notes,
  source,
  recommendationId,
  idempotencyKey,
  serviceTypeAr,
}) {
  const row = {
    vehicle_id: vehicleId,
    user_id: userId,
    service_type: serviceType,
    custom_service_name: customServiceName ?? null,
    done_at: doneAt,
    done_at_km: doneAtKm,
    cost_sar: costSar,
    notes: notes ?? null,
    source: source || "manual",
  };
  if (serviceTypeAr) row.service_type_ar = serviceTypeAr;
  if (recommendationId) row.recommendation_id = recommendationId;
  if (idempotencyKey) row.idempotency_key = idempotencyKey;
  return row;
}

export function maintenanceInsertFallbacks(row) {
  const withoutOptional = { ...row };
  delete withoutOptional.idempotency_key;
  delete withoutOptional.recommendation_id;
  delete withoutOptional.service_type_ar;
  const minimal = { ...withoutOptional };
  delete minimal.custom_service_name;
  delete minimal.notes;
  return [row, withoutOptional, minimal];
}

export function assertOdometerWrite({ km, previousKm, estimated = false }) {
  if (!Number.isFinite(km) || km < 0 || km > 2_000_000) {
    return { ok: false, error: "قراءة العداد غير صحيحة." };
  }
  if (
    !estimated &&
    Number.isFinite(previousKm) &&
    previousKm > 0 &&
    km + 1 < previousKm * 0.8
  ) {
    return { ok: false, error: "القراءة أقل من العداد الحالي بشكل غير منطقي." };
  }
  return { ok: true, km, estimated: Boolean(estimated), confirmed: !estimated };
}

export function committedOdometerResponse({ km, estimated, vehicleUpdated, historyStored }) {
  if (!vehicleUpdated) {
    return {
      ok: false,
      error: "تعذر حفظ قراءة العداد في سجل المركبة.",
    };
  }
  return {
    ok: true,
    km,
    estimated: Boolean(estimated),
    confirmed: !estimated,
    stored: historyStored ? "vehicle_and_history" : "vehicle",
  };
}

export function forbidFalseSuccess(kind) {
  return {
    ok: false,
    error: `${kind} لم يُحفظ. لن يُعرض نجاح بدون كتابة مكتملة.`,
  };
}
