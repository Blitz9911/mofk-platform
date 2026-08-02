import type { FuelSnapshot, RecommendationCandidate, RecommendationInput } from "./types";
import { makeDedupeKey, vehicleDisplayName } from "./types";

function liters(row: FuelSnapshot) {
  const value = Number(row.liters);
  return Number.isFinite(value) ? value : null;
}

function consumptionSeries(logs: FuelSnapshot[]) {
  const sorted = [...logs].sort((a, b) => new Date(a.filledAt).getTime() - new Date(b.filledAt).getTime());
  const values: number[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const distance = current.odometerKm - previous.odometerKm;
    const fuelLiters = liters(current);
    if (distance <= 0 || !fuelLiters || fuelLiters <= 0) continue;
    values.push((fuelLiters / distance) * 100);
  }

  return values;
}

export function evaluateFuelRecommendations(input: RecommendationInput): RecommendationCandidate[] {
  const { vehicle, fuelLogs, now = new Date() } = input;
  const out: RecommendationCandidate[] = [];
  const sorted = [...fuelLogs].sort((a, b) => new Date(b.filledAt).getTime() - new Date(a.filledAt).getTime());
  const latest = sorted[0];

  if (!latest) {
    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "fuel",
      kind: "behavioral",
      priority: "low",
      severity: "low",
      status: "active",
      source: "fuel_record",
      sourceReferenceId: null,
      ruleCode: "FUEL_DATA_STALE",
      dedupeKey: makeDedupeKey(vehicle.id, "FUEL_DATA_STALE"),
      titleAr: "لا توجد بيانات وقود كافية",
      summaryAr: "سجّل تعبئة وقود للحصول على توصيات صرفية أدق.",
      reasonAr: "لا توجد سجلات وقود كافية لحساب متوسط المركبة.",
      descriptionAr: "كلما زادت سجلات التعبئة أصبحت توصيات استهلاك الوقود أدق.",
      recommendedActionAr: "سجّل تعبئة الوقود القادمة مع قراءة العداد.",
      confidencePct: 70,
      suggestedAction: "log_fuel",
      metadata: { fuelLogCount: 0 },
    });
    return out;
  }

  const daysSinceLatest = Math.floor((now.getTime() - new Date(latest.filledAt).getTime()) / 86_400_000);
  if (daysSinceLatest > 30) {
    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "fuel",
      kind: "behavioral",
      priority: "low",
      severity: "low",
      status: "active",
      source: "fuel_record",
      sourceReferenceId: latest.id,
      ruleCode: "FUEL_DATA_STALE",
      dedupeKey: makeDedupeKey(vehicle.id, "FUEL_DATA_STALE", latest.id),
      titleAr: "لم يتم تسجيل تعبئة وقود منذ مدة",
      summaryAr: `آخر تعبئة قبل ${daysSinceLatest.toLocaleString("ar-SA")} يوم.`,
      reasonAr: "غياب سجلات الوقود الحديثة يقلل دقة توصيات الصرفية.",
      descriptionAr: "سجل التعبئة القادمة حتى نقارن استهلاك المركبة بمتوسطها التاريخي.",
      recommendedActionAr: "أضف تعبئة وقود جديدة مع قراءة العداد.",
      confidencePct: 76,
      suggestedAction: "log_fuel",
      metadata: { daysSinceLatestFuelLog: daysSinceLatest },
    });
  }

  const series = consumptionSeries(fuelLogs);
  if (series.length < 4) return out;

  const recent = series.slice(-2);
  const baseline = series.slice(0, -2);
  if (baseline.length < 2) return out;

  const recentAvg = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const baselineAvg = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
  const increasePct = ((recentAvg - baselineAvg) / baselineAvg) * 100;

  if (increasePct < 20) return out;

  out.push({
    vehicleId: vehicle.id,
    userId: vehicle.userId,
    category: "fuel",
    kind: "behavioral",
    priority: increasePct >= 35 ? "medium" : "low",
    severity: increasePct >= 35 ? "medium" : "low",
    status: "active",
    source: "fuel_record",
    sourceReferenceId: latest.id,
    ruleCode: "FUEL_CONSUMPTION_INCREASE",
    dedupeKey: makeDedupeKey(vehicle.id, "FUEL_CONSUMPTION_INCREASE"),
    titleAr: "استهلاك الوقود أعلى من متوسط مركبتك",
    summaryAr: `ارتفع الاستهلاك تقريبًا ${Math.round(increasePct).toLocaleString("ar-SA")}٪ عن متوسط ${vehicleDisplayName(vehicle)}.`,
    reasonAr: "المقارنة تمت مع متوسط نفس المركبة التاريخي وليس مع رقم عام لكل السيارات.",
    descriptionAr: "قد يرتبط الارتفاع بضغط الإطارات، أسلوب القيادة، الزحام، أو حاجة المركبة لصيانة بسيطة.",
    recommendedActionAr: "تحقق من ضغط الإطارات وسجل التعبئات القادمة للمقارنة.",
    confidencePct: 80,
    suggestedAction: "view_fuel",
    metadata: {
      recentConsumptionL100km: Number(recentAvg.toFixed(2)),
      baselineConsumptionL100km: Number(baselineAvg.toFixed(2)),
      increasePct: Number(increasePct.toFixed(1)),
      sampleCount: series.length,
    },
  });

  return out;
}
