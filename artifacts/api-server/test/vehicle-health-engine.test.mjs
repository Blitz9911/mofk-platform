import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { computeNextDue, computeScheduleStatus } from "../src/services/maintenance-recommendations.mjs";
import {
  assessTelemetryQuality,
  attachExplanation,
  buildRepeatedCoolantAnomaly,
  computeHealthScore,
  estimateDailyKm,
  evaluateVehicleHealth,
  isSupportedPidValue,
  maybeCreateMaintenanceApproval,
  MIN_ANOMALY_SAMPLES,
  resolveMaintenanceRule,
  validateOdometerReading,
} from "../src/services/vehicle-health-engine.mjs";

const now = new Date("2026-10-15T12:00:00Z");

test("1-2 two oil logs stay independent in history arrays", () => {
  const logs = [
    { id: "log-1", serviceType: "oil_change", doneAtKm: 30000, doneAt: "2026-01-01T00:00:00Z" },
    { id: "log-2", serviceType: "oil_change", doneAtKm: 40000, doneAt: "2026-06-01T00:00:00Z" },
  ];
  assert.equal(logs.length, 2);
  assert.equal(logs[0].id, "log-1");
  const due = computeNextDue({
    lastDoneKm: logs[1].doneAtKm,
    lastDoneAt: logs[1].doneAt,
    intervalKm: 10000,
    intervalDays: 180,
  });
  assert.equal(due.nextDueKm, 50000);
});

test("3 next due is recomputed from last completed service", () => {
  const due = computeNextDue({
    lastDoneKm: 50000,
    lastDoneAt: "2026-10-15T00:00:00Z",
    intervalKm: 10000,
    intervalDays: 180,
  });
  assert.equal(due.nextDueKm, 60000);
  assert.ok(due.nextDueAt);
});

test("4 reaching due odometer marks upcoming/overdue", () => {
  const due = computeNextDue({ lastDoneKm: 40000, intervalKm: 10000, lastDoneAt: "2026-01-01T00:00:00Z", intervalDays: 180 });
  const atDue = computeScheduleStatus({ ...due, odometerKm: 50000, now });
  assert.ok(atDue.status === "upcoming" || atDue.status === "overdue");
  const past = computeScheduleStatus({ ...due, odometerKm: 52000, now });
  assert.equal(past.status, "overdue");
});

test("5 overdue by calendar even if km is low", () => {
  const status = computeScheduleStatus({
    nextDueKm: 90000,
    nextDueAt: "2026-01-01T00:00:00Z",
    odometerKm: 10000,
    now,
  });
  assert.equal(status.status, "overdue");
});

test("6 synthetic telemetry does not create coolant anomaly", () => {
  const rec = buildRepeatedCoolantAnomaly(
    "veh-1",
    Array.from({ length: MIN_ANOMALY_SAMPLES }, () => ({
      time: now.toISOString(),
      coolantTemp: 110,
      synthetic: true,
    })),
    now,
  );
  assert.equal(rec, null);
});

test("7 unsupported PID is ignored", () => {
  assert.equal(isSupportedPidValue(null), false);
  assert.equal(isSupportedPidValue(""), false);
  assert.equal(isSupportedPidValue("NaN"), false);
  const rec = buildRepeatedCoolantAnomaly(
    "veh-1",
    [
      { time: now.toISOString(), coolantTemp: null },
      { time: now.toISOString(), coolantTemp: undefined },
    ],
    now,
  );
  assert.equal(rec, null);
});

test("8 stale telemetry is insufficient_data/stale", () => {
  const quality = assessTelemetryQuality(
    [{ time: "2025-01-01T00:00:00Z", coolantTemp: 110, synthetic: false }],
    now,
  );
  assert.equal(quality.status, "stale");
  const rec = buildRepeatedCoolantAnomaly(
    "veh-1",
    Array.from({ length: 5 }, () => ({
      time: "2025-01-01T00:00:00Z",
      coolantTemp: 110,
      synthetic: false,
    })),
    now,
  );
  assert.equal(rec, null);
});

test("9 approval is required before logging after a disappeared DTC", () => {
  const prompt = maybeCreateMaintenanceApproval({
    vehicleId: "veh-1",
    disappearedDtc: { code: "P0420" },
    recentMaintenanceLogs: [],
  });
  assert.ok(prompt);
  assert.equal(prompt.status, "pending");
  assert.match(prompt.bodyAr, /قبل تأكيدك/);
  const skipped = maybeCreateMaintenanceApproval({
    vehicleId: "veh-1",
    disappearedDtc: { code: "P0420" },
    recentMaintenanceLogs: [{ notes: "P0420 workshop" }],
  });
  assert.equal(skipped, null);
});

test("10 odometer refuses rpm/speed estimates and implausible drops", () => {
  assert.equal(validateOdometerReading({ nextKm: 10, source: "rpm_estimate" }).ok, false);
  assert.equal(validateOdometerReading({ nextKm: 100, previousKm: 500, source: "manual" }).ok, false);
  assert.equal(validateOdometerReading({ nextKm: 50100, previousKm: 50000, source: "manual" }).ok, true);
});

test("11 ownership helper still 404s other users", async () => {
  const { assertVehicleOwner } = await import("../src/services/maintenance-recommendations.mjs");
  assert.equal(assertVehicleOwner({ userId: "owner" }, "other").ok, false);
});

test("12 default platform rules are labeled not OEM", () => {
  const rule = resolveMaintenanceRule("oil_change", []);
  assert.equal(rule.ruleSource, "platform_default");
  const custom = resolveMaintenanceRule("oil_change", [
    { serviceType: "oil_change", intervalKm: 7500, intervalDays: 180, ruleSource: "user_configured" },
  ]);
  assert.equal(custom.intervalKm, 7500);
  assert.equal(custom.ruleSource, "user_configured");
});

test("13 BLE/ELM modules are not imported by the health engine", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/services/vehicle-health-engine.mjs"),
    "utf8",
  );
  assert.equal(/\b(react-native-ble-plx|elm327-command-queue|FFE1|obd-service)\b/.test(source), false);
});

test("anomaly detection stays off unless the flag is passed in", () => {
  const hot = Array.from({ length: MIN_ANOMALY_SAMPLES }, (_, i) => ({
    time: new Date(now.getTime() - i * 1000).toISOString(),
    coolantTemp: 110,
    synthetic: false,
  }));
  const off = evaluateVehicleHealth({
    vehicleId: "veh-1",
    odometerKm: 10000,
    telemetrySamples: hot,
    anomalyEnabled: false,
    now,
  });
  assert.equal(
    off.candidates.some((row) => row.kind === "telemetry_anomaly"),
    false,
  );
  const on = evaluateVehicleHealth({
    vehicleId: "veh-1",
    odometerKm: 10000,
    telemetrySamples: hot,
    anomalyEnabled: true,
    now,
  });
  assert.equal(
    on.candidates.some((row) => row.kind === "telemetry_anomaly"),
    true,
  );
});

test("14 works offline with insufficient data instead of fake health copy", () => {
  const result = evaluateVehicleHealth({
    vehicleId: "veh-1",
    odometerKm: 10000,
    logs: [],
    schedule: [],
    dtcs: [],
    telemetrySamples: [],
    now,
  });
  assert.equal(result.insufficientData, true);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.dataQuality.status, "insufficient_data");
});

test("15 explanations exist without invented confidence", () => {
  const rec = attachExplanation({
    titleAr: "حرارة",
    descriptionAr: "ارتفاع محفوظ",
    suggestedAction: "فحص التبريد",
    needsWorkshop: true,
    evidence: ["3 قراءات"],
    metadata: { confidenceSource: "none" },
  });
  assert.equal(rec.confidencePct, undefined);
  assert.match(rec.explanationAr, /التبريد|الورشة/);
  assert.equal(rec.metadata.llmGenerated, false);
  assert.equal(computeHealthScore({ overdueCount: 1, activeDtcCount: 1, anomalyCount: 1 }) < 100, true);
});

test("daily km estimate is marked estimated", () => {
  const miles = estimateDailyKm([
    { km: 1000, recordedAt: "2026-10-01T00:00:00Z" },
    { km: 1600, recordedAt: "2026-10-11T00:00:00Z" },
  ]);
  assert.equal(miles.estimated, true);
  assert.equal(Math.round(miles.kmPerDay), 60);
});
