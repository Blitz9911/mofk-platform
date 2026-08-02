import type { RecommendationCandidate, RecommendationInput } from "./types";
import { makeDedupeKey, vehicleDisplayName } from "./types";

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function evaluateBatteryRecommendations(input: RecommendationInput): RecommendationCandidate[] {
  const { vehicle, telemetry } = input;
  const readings = telemetry
    .map((row) => toNumber(row.batteryV))
    .filter((value): value is number => value !== null);

  if (readings.length < 3) return [];

  const lowReadings = readings.filter((value) => value > 0 && value < 12.1);
  if (lowReadings.length < 2) return [];

  const avg = readings.reduce((sum, value) => sum + value, 0) / readings.length;
  const min = Math.min(...readings);
  const priority = min < 11.8 || avg < 12 ? "high" : "medium";

  return [
    {
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "battery",
      kind: "telemetry_anomaly",
      priority,
      severity: priority,
      status: "active",
      source: "live_data",
      sourceReferenceId: null,
      ruleCode: "LOW_BATTERY_VOLTAGE",
      dedupeKey: makeDedupeKey(vehicle.id, "LOW_BATTERY_VOLTAGE"),
      titleAr: "جهد البطارية منخفض",
      summaryAr: `ظهرت قراءات منخفضة للبطارية في ${vehicleDisplayName(vehicle)}.`,
      reasonAr: "تم رصد أكثر من قراءة منخفضة، لذلك لا نعتمد على قراءة واحدة فقط.",
      descriptionAr: `متوسط الجهد ${avg.toFixed(2)}V وأقل قراءة ${min.toFixed(2)}V.`,
      recommendedActionAr: "يُنصح بفحص البطارية والدينمو، خاصة إذا تكرر ضعف التشغيل.",
      confidencePct: 82,
      suggestedAction: "inspect_battery",
      metadata: {
        averageBatteryV: Number(avg.toFixed(2)),
        minBatteryV: Number(min.toFixed(2)),
        sampleCount: readings.length,
        lowReadingCount: lowReadings.length,
      },
    },
  ];
}
