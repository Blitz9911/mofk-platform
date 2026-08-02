import type { RecommendationCandidate, RecommendationInput } from "./types";
import { makeDedupeKey, vehicleDisplayName } from "./types";

const SOON_KM = 500;
const SOON_DAYS = 14;

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(a: Date, b: Date) {
  return Math.ceil((a.getTime() - b.getTime()) / 86_400_000);
}

function formatNumber(value: number) {
  return value.toLocaleString("ar-SA");
}

export function evaluateMaintenanceRecommendations(input: RecommendationInput): RecommendationCandidate[] {
  const { vehicle, maintenance, now = new Date() } = input;
  const out: RecommendationCandidate[] = [];
  const odometer = vehicle.odometerKm ?? null;
  const vehicleName = vehicleDisplayName(vehicle);

  for (const item of maintenance) {
    const dueMileage = item.nextDueKm ?? null;
    const dueDate = asDate(item.nextDueAt);
    const remainingKm = odometer !== null && dueMileage !== null ? dueMileage - odometer : null;
    const remainingDays = dueDate ? daysBetween(dueDate, now) : null;
    const overdue = (remainingKm !== null && remainingKm < 0) || (remainingDays !== null && remainingDays < 0);
    const dueSoon =
      (remainingKm !== null && remainingKm >= 0 && remainingKm <= SOON_KM) ||
      (remainingDays !== null && remainingDays >= 0 && remainingDays <= SOON_DAYS);

    if (!overdue && !dueSoon) continue;

    const ruleCode = overdue ? "MAINTENANCE_OVERDUE" : "MAINTENANCE_DUE_SOON";
    const priority = overdue ? "high" : "medium";
    const remainingText =
      remainingKm !== null
        ? overdue
          ? `متأخرة ${formatNumber(Math.abs(remainingKm))} كم`
          : `متبقي ${formatNumber(remainingKm)} كم`
        : remainingDays !== null
          ? overdue
            ? `متأخرة ${Math.abs(remainingDays)} يوم`
            : `متبقي ${remainingDays} يوم`
          : "اقترب موعدها";

    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "maintenance",
      kind: "maintenance_due",
      priority,
      severity: priority,
      status: "active",
      source: "maintenance_record",
      sourceReferenceId: item.id,
      ruleCode,
      dedupeKey: makeDedupeKey(vehicle.id, ruleCode, item.id),
      titleAr: overdue ? `${item.serviceTypeAr} متأخرة` : `${item.serviceTypeAr} قريبة`,
      summaryAr: `${remainingText} لـ ${vehicleName}.`,
      reasonAr:
        remainingKm !== null
          ? `آخر بيانات الصيانة والعداد الحالي تشير إلى أن ${item.serviceTypeAr} ${overdue ? "تجاوزت" : "اقتربت من"} موعدها.`
          : `تاريخ الصيانة القادم يشير إلى أن ${item.serviceTypeAr} ${overdue ? "تجاوزت" : "اقتربت من"} موعدها.`,
      descriptionAr: `${remainingText}. ننصح بجدولة ${item.serviceTypeAr} حتى تبقى المركبة بحالة مستقرة.`,
      recommendedActionAr: overdue ? "سجل الصيانة أو احجز فحصًا في أقرب وقت." : "خطط لتنفيذ الصيانة قريبًا.",
      confidencePct: overdue ? 92 : 84,
      suggestedAction: overdue ? "log_maintenance" : "schedule_maintenance",
      suggestedCostSar: item.estimatedCost ?? null,
      dueDate,
      dueMileage,
      metadata: {
        serviceType: item.serviceType,
        serviceTypeAr: item.serviceTypeAr,
        remainingKm,
        remainingDays,
        vehicleName,
      },
    });
  }

  return out;
}
