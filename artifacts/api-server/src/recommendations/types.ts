export const recommendationCategories = [
  "maintenance",
  "diagnostic",
  "battery",
  "fuel",
  "safety",
  "data_quality",
  "general",
] as const;

export const recommendationPriorities = ["critical", "high", "medium", "low", "info"] as const;
export const recommendationStatuses = ["active", "completed", "dismissed", "expired"] as const;
export const recommendationSources = [
  "maintenance_record",
  "odometer",
  "dtc",
  "live_data",
  "fuel_record",
  "vehicle_profile",
  "system_rule",
] as const;

export type RecommendationCategory = (typeof recommendationCategories)[number];
export type RecommendationPriority = (typeof recommendationPriorities)[number];
export type RecommendationStatus = (typeof recommendationStatuses)[number];
export type RecommendationSource = (typeof recommendationSources)[number];

export type RecommendationRuleCode =
  | "MAINTENANCE_OVERDUE"
  | "MAINTENANCE_DUE_SOON"
  | "ACTIVE_HIGH_RISK_DTC"
  | "REPEATED_DTC"
  | "LOW_BATTERY_VOLTAGE"
  | "FUEL_CONSUMPTION_INCREASE"
  | "FUEL_DATA_STALE"
  | "MISSING_ODOMETER"
  | "MISSING_MAINTENANCE_HISTORY"
  | "DEVICE_NOT_CONNECTED"
  | "NO_URGENT_RECOMMENDATIONS";

export type VehicleSnapshot = {
  id: string;
  userId: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  nickname?: string | null;
  odometerKm?: number | null;
  adapterMac?: string | null;
  healthScore?: number | null;
};

export type MaintenanceSnapshot = {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceTypeAr: string;
  lastDoneKm?: number | null;
  lastDoneAt?: Date | string | null;
  nextDueKm?: number | null;
  nextDueAt?: Date | string | null;
  status?: string | null;
  estimatedCost?: number | null;
};

export type DtcSnapshot = {
  id: string;
  vehicleId: string;
  code: string;
  status?: string | null;
  severity?: string | null;
  descriptionAr?: string | null;
  recommendedAction?: string | null;
  detectedAt?: Date | string | null;
  clearedAt?: Date | string | null;
};

export type TelemetrySnapshot = {
  id: string;
  vehicleId: string;
  time: Date | string;
  batteryV?: string | number | null;
};

export type FuelSnapshot = {
  id: string;
  vehicleId: string;
  filledAt: Date | string;
  odometerKm: number;
  liters: string | number;
  isFull?: boolean | null;
};

export type RecommendationInput = {
  vehicle: VehicleSnapshot;
  maintenance: MaintenanceSnapshot[];
  dtcs: DtcSnapshot[];
  telemetry: TelemetrySnapshot[];
  fuelLogs: FuelSnapshot[];
  now?: Date;
};

export type RecommendationCandidate = {
  vehicleId: string;
  userId: string;
  category: RecommendationCategory;
  kind: string;
  priority: RecommendationPriority;
  severity: RecommendationPriority;
  status: RecommendationStatus;
  source: RecommendationSource;
  sourceReferenceId?: string | null;
  ruleCode: RecommendationRuleCode;
  dedupeKey: string;
  titleAr: string;
  summaryAr: string;
  reasonAr: string;
  descriptionAr: string;
  recommendedActionAr: string;
  confidencePct: number;
  suggestedAction?: string | null;
  suggestedCostSar?: number | null;
  dueDate?: Date | null;
  dueMileage?: number | null;
  expiresAt?: Date | null;
  metadata: Record<string, unknown>;
};

export function makeDedupeKey(vehicleId: string, ruleCode: RecommendationRuleCode, sourceReferenceId?: string | null) {
  return [vehicleId, ruleCode, sourceReferenceId || "vehicle"].join(":");
}

export function vehicleDisplayName(vehicle: VehicleSnapshot) {
  return vehicle.nickname || [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "المركبة";
}
