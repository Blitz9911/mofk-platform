import type { RecommendationCandidate, RecommendationInput } from "./types";
import { makeDedupeKey, vehicleDisplayName } from "./types";

export function evaluateDataQualityRecommendations(input: RecommendationInput): RecommendationCandidate[] {
  const { vehicle, maintenance } = input;
  const out: RecommendationCandidate[] = [];

  if (!vehicle.odometerKm || vehicle.odometerKm <= 0) {
    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "data_quality",
      kind: "behavioral",
      priority: "low",
      severity: "low",
      status: "active",
      source: "odometer",
      sourceReferenceId: vehicle.id,
      ruleCode: "MISSING_ODOMETER",
      dedupeKey: makeDedupeKey(vehicle.id, "MISSING_ODOMETER"),
      titleAr: "حدّث قراءة العداد",
      summaryAr: "قراءة العداد مطلوبة للحصول على توصيات صيانة أدق.",
      reasonAr: "لا يمكن حساب الصيانة القادمة بدقة بدون قراءة عداد حديثة.",
      descriptionAr: "أضف قراءة العداد الحالية للمركبة حتى تظهر مواعيد الصيانة القريبة والمتأخرة.",
      recommendedActionAr: "حدّث قراءة العداد من صفحة المركبة.",
      confidencePct: 95,
      suggestedAction: "update_odometer",
      metadata: { odometerKm: vehicle.odometerKm ?? null },
    });
  }

  if (maintenance.length === 0) {
    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "data_quality",
      kind: "maintenance_due",
      priority: "low",
      severity: "low",
      status: "active",
      source: "maintenance_record",
      sourceReferenceId: null,
      ruleCode: "MISSING_MAINTENANCE_HISTORY",
      dedupeKey: makeDedupeKey(vehicle.id, "MISSING_MAINTENANCE_HISTORY"),
      titleAr: "أضف سجل الصيانة",
      summaryAr: `لا توجد صيانة مسجلة لـ ${vehicleDisplayName(vehicle)}.`,
      reasonAr: "سجل الصيانة هو المصدر الأساسي لمعرفة الخدمة القادمة.",
      descriptionAr: "سجل آخر تغيير زيت أو صيانة دورية للحصول على توصيات عملية.",
      recommendedActionAr: "أضف آخر صيانة تعرفها، حتى لو كانت تقريبية.",
      confidencePct: 90,
      suggestedAction: "log_maintenance",
      metadata: { maintenanceCount: 0 },
    });
  }

  if (!vehicle.adapterMac) {
    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "data_quality",
      kind: "behavioral",
      priority: "info",
      severity: "info",
      status: "active",
      source: "vehicle_profile",
      sourceReferenceId: vehicle.id,
      ruleCode: "DEVICE_NOT_CONNECTED",
      dedupeKey: makeDedupeKey(vehicle.id, "DEVICE_NOT_CONNECTED"),
      titleAr: "اربط جهاز مفك للحصول على توصيات لحظية",
      summaryAr: "التوصيات الحالية تعتمد على البيانات المسجلة يدويًا.",
      reasonAr: "ربط الجهاز يضيف بيانات الأعطال والجهد والقراءات الحية عند توفرها.",
      descriptionAr: "يمكنك استخدام مفك بدون الجهاز للبيانات الأساسية، لكن الجهاز يحسن دقة التوصيات.",
      recommendedActionAr: "اربط جهاز مفك عند وصول القطعة.",
      confidencePct: 85,
      suggestedAction: "pair_device",
      metadata: { adapterMac: null },
    });
  }

  return out;
}
