declare module "@/lib/maintenance-engine.mjs" {
  export const LIFECYCLE_STATUSES: string[];
  export const OPEN_STATUSES: string[];
  export const MAINTENANCE_LABELS: Record<string, string>;
  export const MAINTENANCE_RULES: Record<
    string,
    {
      intervalKm?: number;
      intervalDays?: number;
      soonKm?: number;
      soonDays?: number;
      estimatedCost?: number;
    }
  >;

  export function serviceLabelAr(serviceType: string): string;
  export function ruleSourceLabelAr(source?: string): string;
  export function mergeLifecycleOntoRecommendation(
    rec: Record<string, unknown> | null | undefined,
    overlay?: Record<string, unknown> | null,
  ): Record<string, unknown> | null | undefined;
  export function addDaysIso(dateInput: Date | string, days: number): string | null;
  export function daysUntilIso(dateInput: Date | string, now?: Date): number | null;
  export function validateMaintenanceInput(input: Record<string, unknown>): {
    ok: boolean;
    errors: string[];
  };
  export function computeNextDue(input: {
    lastDoneKm?: number | null;
    lastDoneAt?: string | null;
    intervalKm?: number | null;
    intervalDays?: number | null;
  }): { nextDueKm: number | null; nextDueAt: string | null };
  export function computeScheduleStatus(input: {
    nextDueKm?: number | null;
    nextDueAt?: string | null;
    odometerKm?: number | null;
    soonKm?: number;
    soonDays?: number;
    now?: Date;
  }): {
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
  export function applyMaintenanceToRecommendations(
    recommendations: Record<string, unknown>[],
    log: Record<string, unknown>,
  ): Record<string, unknown>[];
  export function buildMaintenanceRecommendation(input: {
    vehicleId?: string;
    serviceType?: string;
    lastDoneKm?: number | null;
    lastDoneAt?: string | null;
    odometerKm?: number | null;
    estimatedCost?: number | null;
    rule?: Record<string, unknown> | null;
    now?: Date;
  }): Record<string, unknown> | null;
  export function buildDtcRecommendation(input: Record<string, unknown>): Record<string, unknown> | null;
  export function visibleRecommendations(
    rows: Record<string, unknown>[],
    now?: Date,
  ): Record<string, unknown>[];
}

declare module "@/lib/vehicle-health-engine.mjs" {
  export type MaintenanceRuleOverride = {
    serviceType?: string;
    vehicleId?: string | null;
    make?: string | null;
    model?: string | null;
    year?: number | string | null;
    intervalKm?: number | null;
    intervalDays?: number | null;
    soonKm?: number | null;
    soonDays?: number | null;
    estimatedCost?: number | null;
    ruleSource?: string;
  };

  export type ResolvedMaintenanceRule = {
    intervalKm?: number | null;
    intervalDays?: number | null;
    soonKm?: number;
    soonDays?: number;
    estimatedCost?: number | null;
    ruleSource: string;
  };

  export function maintenanceIdempotencyKey(input?: {
    userId?: string;
    vehicleId?: string;
    serviceType?: string;
    doneAt?: string | Date | null;
    doneAtKm?: number | string | null;
  }): string;
  export function describeVehicleLink(input?: {
    adapterMac?: string | null;
    lastTelemetryAt?: string | Date | null;
    now?: Date;
  }): {
    paired: boolean;
    connected: boolean;
    lastSeenAt: string | null;
    live: boolean;
  };
  export function resolveMaintenanceRule(
    serviceType: string,
    overrides?: MaintenanceRuleOverride[],
    vehicle?: { id?: string; make?: string | null; model?: string | null; year?: number | string | null },
  ): ResolvedMaintenanceRule | null;
  export function isFreshTimestamp(
    time: Date | string | null | undefined,
    now?: Date,
    maxAgeMs?: number,
  ): boolean;
  export function buildRepeatedCoolantAnomaly(
    vehicleId: string,
    samples: Array<Record<string, unknown>>,
    now?: Date,
  ): Record<string, unknown> | null;
  export function evaluateVehicleHealth(input?: {
    vehicleId?: string;
    vehicle?: Record<string, unknown>;
    odometerKm?: number | null;
    logs?: Array<Record<string, unknown>>;
    schedule?: Array<Record<string, unknown>>;
    dtcs?: Array<Record<string, unknown>>;
    telemetrySamples?: Array<Record<string, unknown>>;
    ruleOverrides?: MaintenanceRuleOverride[];
    now?: Date;
    anomalyEnabled?: boolean;
  }): {
    healthScore: number;
    dataQuality: Record<string, unknown>;
    lastReadingAt: string | Date | null;
    insufficientData: boolean;
    candidates: Record<string, unknown>[];
  };
}

declare module "@/lib/qa-write-guards.mjs" {
  export function isUnknownColumnError(error: unknown): boolean;
  export function isMissingTableError(error: unknown): boolean;
  export function buildMaintenanceLogInsert(input: {
    vehicleId: string;
    userId: string;
    serviceType: string;
    customServiceName?: string | null;
    doneAt: string;
    doneAtKm: number | null;
    costSar: number | null;
    notes?: string | null;
    source?: string;
    recommendationId?: string | null;
    idempotencyKey?: string | null;
    serviceTypeAr?: string | null;
  }): Record<string, unknown>;
  export function maintenanceInsertFallbacks(
    row: Record<string, unknown>,
  ): Array<Record<string, unknown>>;
  export function assertOdometerWrite(input: {
    km: number;
    previousKm?: number;
    estimated?: boolean;
  }):
    | { ok: true; km: number; estimated: boolean; confirmed: boolean; error?: undefined }
    | { ok: false; error: string };
  export function committedOdometerResponse(input: {
    km: number;
    estimated: boolean;
    vehicleUpdated: boolean;
    historyStored?: boolean;
  }):
    | {
        ok: true;
        km: number;
        estimated: boolean;
        confirmed: boolean;
        stored: string;
        error?: undefined;
      }
    | { ok: false; error: string };
}
