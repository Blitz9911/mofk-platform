import type { RecommendationCandidate, RecommendationInput } from "./types";
import { makeDedupeKey, vehicleDisplayName } from "./types";

const ACTIVE_STATUSES = new Set(["active", "pending", "confirmed", "permanent"]);
const HIGH_RISK_SEVERITIES = new Set(["critical", "high"]);

function actionForDtc(severity?: string | null) {
  if (severity === "critical") {
    return "لا يُنصح بتجاهل العطل. افحص المركبة لدى فني مختص قبل الاستمرار في القيادة لمسافات طويلة.";
  }
  return "يمكن القيادة بحذر مع ترتيب فحص قريب، ولا يمكن تأكيد السبب دون فحص متخصص.";
}

export function evaluateDiagnosticRecommendations(input: RecommendationInput): RecommendationCandidate[] {
  const { vehicle, dtcs } = input;
  const out: RecommendationCandidate[] = [];
  const vehicleName = vehicleDisplayName(vehicle);
  const repeatedByCode = new Map<string, number>();

  for (const dtc of dtcs) {
    repeatedByCode.set(dtc.code, (repeatedByCode.get(dtc.code) ?? 0) + 1);
  }

  for (const dtc of dtcs) {
    const isActive = ACTIVE_STATUSES.has(dtc.status ?? "active") && !dtc.clearedAt;
    if (!isActive) continue;

    const repeated = (repeatedByCode.get(dtc.code) ?? 0) > 1;
    const highRisk = HIGH_RISK_SEVERITIES.has(dtc.severity ?? "medium");
    if (!highRisk && !repeated) continue;

    const ruleCode = highRisk ? "ACTIVE_HIGH_RISK_DTC" : "REPEATED_DTC";
    const priority = dtc.severity === "critical" ? "critical" : highRisk ? "high" : "medium";
    const description = dtc.descriptionAr ? `قد يشير الكود ${dtc.code} إلى: ${dtc.descriptionAr}` : `ظهر كود العطل ${dtc.code}.`;

    out.push({
      vehicleId: vehicle.id,
      userId: vehicle.userId,
      category: "diagnostic",
      kind: "predictive_failure",
      priority,
      severity: priority,
      status: "active",
      source: "dtc",
      sourceReferenceId: dtc.id,
      ruleCode,
      dedupeKey: makeDedupeKey(vehicle.id, ruleCode, dtc.id),
      titleAr: highRisk ? "ظهر عطل يحتاج إلى فحص" : "ظهر العطل أكثر من مرة",
      summaryAr: `${dtc.code} على ${vehicleName}.`,
      reasonAr: highRisk
        ? "درجة خطورة هذا الكود تستدعي مراجعته بدل تجاهله."
        : "تكرار ظهور نفس الكود قد يعني أن السبب لم يُعالج بالكامل.",
      descriptionAr: `${description} لا يمكن تأكيد السبب دون فحص متخصص.`,
      recommendedActionAr: actionForDtc(dtc.severity),
      confidencePct: highRisk ? 88 : 78,
      suggestedAction: "view_dtc",
      metadata: {
        code: dtc.code,
        dtcStatus: dtc.status,
        dtcSeverity: dtc.severity,
        repeatedCount: repeatedByCode.get(dtc.code) ?? 1,
      },
    });
  }

  return out;
}
