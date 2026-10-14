declare module "@/lib/vehicle-health-engine.mjs" {
  export function describeVehicleLink(input?: Record<string, unknown>): {
    paired: boolean;
    connected: boolean;
    lastSeenAt: string | null;
    live: boolean;
  };
  export function evaluateVehicleHealth(input?: Record<string, unknown>): any;
  export function estimateDailyKm(readings?: any[]): any;
  export function validateOdometerReading(
    input?: Record<string, unknown>,
  ): { ok: true; km: number } | { ok: false; error: string };
  export function buildRepeatedCoolantAnomaly(vehicleId: string, samples: any[], now?: Date): any;
  export function isFreshTimestamp(time: any, now?: Date, maxAgeMs?: number): boolean;
}

declare module "*.mjs" {
  export function describeVehicleLink(input?: Record<string, unknown>): {
    paired: boolean;
    connected: boolean;
    lastSeenAt: string | null;
    live: boolean;
  };
  export function evaluateVehicleHealth(input?: Record<string, unknown>): any;
}
