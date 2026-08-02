import type { RecommendationCandidate, RecommendationInput } from "./types";
import { evaluateBatteryRecommendations } from "./battery";
import { evaluateDataQualityRecommendations } from "./data-quality";
import { evaluateDiagnosticRecommendations } from "./diagnostics";
import { evaluateFuelRecommendations } from "./fuel";
import { evaluateMaintenanceRecommendations } from "./maintenance";
import { makeDedupeKey, vehicleDisplayName } from "./types";

function positiveRecommendation(input: RecommendationInput): RecommendationCandidate[] {
  const { vehicle } = input;
  const hasBlockingDataGaps = !vehicle.odometerKm || input.maintenance.length === 0;
  const hasActiveHighRiskDtc = input.dtcs.some((dtc) => !dtc.clearedAt && ["critical", "high"].includes(dtc.severity ?? ""));
  const hasUrgentMaintenance = input.maintenance.some((item) => item.status === "overdue" || item.status === "upcoming");

  if (hasBlockingDataGaps || hasActiveHighRiskDtc || hasUrgentMaintenance) return [];

  return [
    {
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "general",
      kind: "behavioral",
      priority: "info",
      severity: "info",
      status: "active",
      source: "system_rule",
      sourceReferenceId: null,
      ruleCode: "NO_URGENT_RECOMMENDATIONS",
      dedupeKey: makeDedupeKey(vehicle.id, "NO_URGENT_RECOMMENDATIONS"),
      titleAr: "لا توجد توصيات عاجلة حاليًا",
      summaryAr: `${vehicleDisplayName(vehicle)} لا تحتاج إلى إجراء عاجل الآن.`,
      reasonAr: "لم تظهر صيانة متأخرة أو أعطال عالية الخطورة في البيانات المتاحة.",
      descriptionAr: "استمر بتحديث العداد وتسجيل الصيانة والوقود لتحسين دقة التوصيات.",
      recommendedActionAr: "تابع استخدام مفك بشكل طبيعي.",
      confidencePct: 72,
      suggestedAction: "view_vehicle",
      metadata: { generatedAsPositiveState: true },
    },
  ];
}

export function evaluateVehicleRecommendations(input: RecommendationInput): RecommendationCandidate[] {
  const candidates = [
    ...evaluateMaintenanceRecommendations(input),
    ...evaluateDiagnosticRecommendations(input),
    ...evaluateBatteryRecommendations(input),
    ...evaluateFuelRecommendations(input),
    ...evaluateDataQualityRecommendations(input),
  ];

  const unique = new Map<string, RecommendationCandidate>();
  for (const candidate of candidates) {
    if (!unique.has(candidate.dedupeKey)) unique.set(candidate.dedupeKey, candidate);
  }

  const active = Array.from(unique.values());
  if (active.some((item) => item.priority !== "info" && item.priority !== "low")) {
    return active;
  }

  return [...active, ...positiveRecommendation(input)];
}

export * from "./types";
