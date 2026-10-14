declare module "*.mjs" {
  export const TELEMETRY_MAX_AGE_MS: number;
  export const LIVE_WINDOW_MS: number;
  export const DEFAULT_RULE_SOURCE: string;
  export const MAINTENANCE_RULES: Record<string, any>;
  export const LIFECYCLE_STATUSES: string[];
  export const OPEN_STATUSES: string[];
  export function isRecommendationId(value: unknown): value is string;
  export function maintenanceIdempotencyKey(input?: Record<string, unknown>): string;
  export function describeVehicleLink(input?: Record<string, unknown>): {
    paired: boolean;
    connected: boolean;
    lastSeenAt: string | null;
    live: boolean;
  };
  export function resolveMaintenanceRule(serviceType: string, overrides?: any[], vehicle?: any): any;
  export function isFreshTimestamp(time: any, now?: Date, maxAgeMs?: number): boolean;
  export function evaluateVehicleHealth(input?: Record<string, unknown>): any;
  export function explainForAssistant(rec: any): any;
  export function validateOdometerReading(
    input?: Record<string, unknown>,
  ): { ok: true; km: number } | { ok: false; error: string };
  export function estimateDailyKm(readings?: any[]): any;
  export function notificationDedupeKey(input?: Record<string, unknown>): string;
  export function serviceLabelAr(serviceType: string): string;
  export function validateMaintenanceInput(input?: Record<string, unknown>): { ok: boolean; errors: string[] };
  export function computeNextDue(input?: Record<string, unknown>): {
    nextDueKm: number | null;
    nextDueAt: string | null;
  };
  export function computeScheduleStatus(input?: Record<string, unknown>): any;
  export function sourceKeyForMaintenance(serviceType: string): string;
  export function applyMaintenanceToRecommendations(recommendations: any[], log: any): any[];
  export function buildMaintenanceRecommendation(input?: Record<string, unknown>): any;
  export function buildDtcRecommendation(input?: Record<string, unknown>): any;
  export function buildTelemetryRecommendations(vehicleId: string, latest: any): any[];
  export function mergeEvaluatedRecommendations(
    existing: any[],
    candidates: any[],
    now?: Date,
  ): { inserts: any[]; updates: any[] };
  export function visibleRecommendations(rows: any[], now?: Date): any[];
}
