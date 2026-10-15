export const LIFECYCLE_STATUSES: string[];
export const OPEN_STATUSES: string[];
export const MAINTENANCE_LABELS: Record<string, string>;
export const MAINTENANCE_RULES: Record<
  string,
  { intervalKm?: number; intervalDays?: number; soonKm?: number; soonDays?: number; estimatedCost?: number }
>;

export function serviceLabelAr(serviceType: string): string;
export function ruleSourceLabelAr(source?: string): string;
export function mergeLifecycleOntoRecommendation(rec: any, overlay?: Record<string, unknown> | null): any;
export function addDaysIso(dateInput: Date | string, days: number): string | null;
export function daysUntilIso(dateInput: Date | string, now?: Date): number | null;
export function validateMaintenanceInput(input: Record<string, unknown>): { ok: boolean; errors: string[] };
export function computeNextDue(input: Record<string, unknown>): { nextDueKm: number | null; nextDueAt: string | null };
export function computeScheduleStatus(input: Record<string, unknown>): {
  status: "scheduled" | "upcoming" | "overdue";
  remainingKm: number | null;
  remainingDays: number | null;
};
export function sourceKeyForMaintenance(serviceType: string): string;
export function sourceKeyForDtc(code: string): string;
export function sourceKeyForTelemetry(signal: string): string;
export function dedupeKey(vehicleId: string, kind: string, sourceKey: string): string;
export function isOpenStatus(status?: string): boolean;
export function canCloseByMaintenance(recommendation: Record<string, unknown>): boolean;
export function applyMaintenanceToRecommendations(recommendations: any[], log: any): any[];
export function buildMaintenanceRecommendation(input: Record<string, unknown>): any | null;
export function buildDtcRecommendation(input: Record<string, unknown>): any | null;
export function buildTelemetryRecommendations(vehicleId: string, latest: any): any[];
export function mergeEvaluatedRecommendations(existing: any[], candidates: any[], now?: Date): {
  inserts: any[];
  updates: Array<{ id?: string; patch: any }>;
};
export function visibleRecommendations(rows: any[], now?: Date): any[];
export function lifecycleEvent(action: string, extra?: Record<string, unknown>): Record<string, unknown>;
export function assertVehicleOwner(vehicle: any, userId: string): { ok: boolean; status?: number; error?: string };
