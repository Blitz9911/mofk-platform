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
  export function assertEnvironmentIsolation(env?: NodeJS.ProcessEnv): {
    ok: true;
    reason: string;
    origin?: string;
    mfkEnv: string;
    projectRef?: string;
  };
  export function isFreshTimestamp(time: any, now?: Date, maxAgeMs?: number): boolean;
  export function evaluateVehicleHealth(input?: Record<string, unknown>): any;
  export function explainForAssistant(rec: any): any;
  export function validateOdometerReading(
    input?: Record<string, unknown>,
  ): { ok: true; km: number } | { ok: false; error: string };
  export function estimateDailyKm(readings?: any[]): any;
  export function notificationDedupeKey(input?: Record<string, unknown>): string;
  export function buildNotificationDedupeKey(input?: Record<string, unknown>): string;
  export function isUniqueViolation(error: unknown): boolean;
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
  export const CLOSED_STATUSES: Set<string>;
  export const PUSH_TYPES: Set<string>;
  export function isClosedStatus(status: unknown): boolean;
  export function severityRank(severity: unknown): number;
  export function isImportantSeverity(severity: unknown): boolean;
  export function lockScreenCopy(type: string): { title: string; body: string };
  export function preferenceAllowsType(prefs: Record<string, unknown>, type: string): boolean;
  export function shouldAlertRecommendation(rec: Record<string, unknown>): boolean;
  export function notificationTypeForRecommendation(
    rec: Record<string, unknown>,
    options?: { previousSeverity?: string },
  ): string | null;
  export function actionUrlForType(type: string): string;
  export function shouldSkipOptionalPushForQuietHours(
    prefs: Record<string, unknown>,
    type: string,
    now?: Date,
  ): boolean;
  export function sanitizeActionUrl(url: string | null | undefined, type: string): string;
  export function isAllowedActionUrl(url: string | null | undefined): boolean;
  export function categoryForType(type: string): string;
  export function mergeNotificationRules(overrides?: Record<string, unknown>): Record<string, unknown>;
  export function maintenanceThresholdAlert(input: Record<string, unknown>): Record<string, unknown> | null;
  export function documentReminderAlert(input: Record<string, unknown>): Record<string, unknown> | null;
  export function subscriptionReminderAlert(input: Record<string, unknown>): Record<string, unknown> | null;
  export function isVerifiedPaymentEvent(input?: Record<string, unknown>): boolean;
  export function odometerDiscrepancyAlert(input: Record<string, unknown>): Record<string, unknown> | null;
  export function dtcLifecycleAlert(input: Record<string, unknown>): Record<string, unknown> | null;
  export function isInQuietHours(prefs?: Record<string, unknown>, now?: Date, rules?: Record<string, unknown>): boolean;
  export function dueAlertFromSchedule(item: Record<string, unknown>): {
    type: string;
    severity: string;
    sourceKey: string;
  } | null;
  export function isUatPushProbeEnabled(env?: NodeJS.ProcessEnv): boolean;
  export function maskSecretTail(value: unknown): string;
  export function ticketIdPrefix(ticketId: unknown): string | null;
  export function cronSecretFromRequest(named: string | string[] | undefined): string;
  export function verifyCronSecret(
    provided: string | undefined,
    expected: string | undefined,
  ): { ok: boolean; reason?: string };
  export function parseExpoReceipts(receipts?: Record<string, unknown>): Array<{
    ticketId: string;
    status: string;
    errorMessage: unknown;
    invalid: boolean;
  }>;
  export function parseExpoTickets(tickets?: any[]): Array<{
    index: number;
    status: string;
    ticketId: string | null;
    errorMessage: unknown;
    invalid: boolean;
  }>;
  export function sendExpoPushMessages(
    messages: unknown[],
    options?: Record<string, unknown>,
  ): Promise<{ skipped: boolean; reason?: string; tickets: any[] }>;
  export function fetchExpoReceipts(
    ticketIds: string[],
    options?: Record<string, unknown>,
  ): Promise<{ skipped: boolean; reason?: string; receipts: Record<string, unknown>; error?: string }>;
  export function buildExpoMessage(input: {
    token: string;
    type: string;
    notificationId: string;
    actionUrl?: string | null;
  }): Record<string, unknown>;
  export function isExpoPushToken(token: unknown): boolean;
  export function authorizeNotificationDestination(input: {
    authenticated?: boolean;
    viewerUserId?: string;
    ownerUserId?: string | null;
    vehicleDeleted?: boolean;
    actionUrl?: string | null;
    sanitize?: (url: string | null | undefined) => string;
  }): { ok: boolean; actionUrl: string; reason: string };
}
