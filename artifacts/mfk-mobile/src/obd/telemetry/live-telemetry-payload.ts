import type { LiveReading } from "../types/diagnostics.types";
import type { LiveObdValues } from "../types/obd.types";

export type LiveTelemetryPersistPayload = {
  time: string;
  rpm: number | null;
  speedKmh: number | null;
  coolantTemp: number | null;
  intakeTemp: number | null;
  batteryV: number | null;
  fuelLevelPct: number | null;
  engineLoad: number | null;
  throttlePos: number | null;
};

function metricNumber(
  metric: { status: string; value: number | string | null } | null | undefined,
): number | null {
  if (!metric || metric.status !== "ok" || metric.value == null) return null;
  const parsed = Number(metric.value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundInt(value: number | null) {
  return value == null ? null : Math.round(value);
}

function roundDecimal(value: number | null, digits: number) {
  if (value == null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildLiveTelemetryPayload(
  liveValues: LiveObdValues,
  liveReadings: Record<string, LiveReading> = {},
): LiveTelemetryPersistPayload | null {
  const payload: LiveTelemetryPersistPayload = {
    time: new Date().toISOString(),
    rpm: roundInt(metricNumber(liveValues.rpm)),
    speedKmh: roundInt(metricNumber(liveValues.speed)),
    coolantTemp: roundInt(metricNumber(liveValues.coolantTemp)),
    intakeTemp: roundInt(metricNumber(liveReadings["010F"])),
    batteryV: roundDecimal(metricNumber(liveValues.controlModuleVoltage), 2),
    fuelLevelPct: roundInt(metricNumber(liveValues.fuelLevel)),
    engineLoad: roundInt(metricNumber(liveValues.engineLoad)),
    throttlePos: roundInt(metricNumber(liveValues.throttle)),
  };

  const hasValue = [
    payload.rpm,
    payload.speedKmh,
    payload.coolantTemp,
    payload.intakeTemp,
    payload.batteryV,
    payload.fuelLevelPct,
    payload.engineLoad,
    payload.throttlePos,
  ].some((value) => value != null);

  return hasValue ? payload : null;
}
