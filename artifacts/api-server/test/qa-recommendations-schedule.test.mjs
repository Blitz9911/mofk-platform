import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyMaintenanceToRecommendations,
  buildDtcRecommendation,
  buildMaintenanceRecommendation,
  computeNextDue,
  mergeLifecycleOntoRecommendation,
  visibleRecommendations,
} from "../src/services/maintenance-recommendations.mjs";
import { resolveMaintenanceRule } from "../src/services/vehicle-health-engine.mjs";

const now = new Date("2026-10-15T12:00:00Z");

test("oil change at 80000 km schedules next due at 90000", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    lastDoneAt: "2026-10-15T00:00:00Z",
    odometerKm: 80000,
    now,
  });
  assert.equal(rec.scheduleStatus, "scheduled");
  assert.equal(rec.nextDueKm, 90000);
  assert.equal(rec.remainingKm, 10000);
  assert.equal(rec.severity, "info");
  assert.match(rec.titleAr, /مجدولة/);
  assert.equal(rec.metadata.oemSchedule, false);
});

test("oil change with 1000 km remaining is upcoming", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    lastDoneAt: "2026-10-01T00:00:00Z",
    odometerKm: 89000,
    now,
  });
  assert.equal(rec.scheduleStatus, "upcoming");
  assert.equal(rec.remainingKm, 1000);
});

test("overdue oil change is a warning not a scheduled card", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    lastDoneAt: "2026-01-01T00:00:00Z",
    odometerKm: 95000,
    now,
  });
  assert.equal(rec.scheduleStatus, "overdue");
  assert.equal(rec.severity, "warning");
});

test("two historical oil changes use the latest log for next due", () => {
  const first = computeNextDue({ lastDoneKm: 70000, intervalKm: 10000, lastDoneAt: "2026-01-01T00:00:00Z", intervalDays: 180 });
  const second = computeNextDue({ lastDoneKm: 80000, intervalKm: 10000, lastDoneAt: "2026-10-15T00:00:00Z", intervalDays: 180 });
  assert.equal(first.nextDueKm, 80000);
  assert.equal(second.nextDueKm, 90000);
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    lastDoneAt: "2026-10-15T00:00:00Z",
    odometerKm: 80000,
    now,
  });
  assert.equal(rec.nextDueKm, 90000);
});

test("odometer update changes due status from scheduled to upcoming", () => {
  const before = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    odometerKm: 80000,
    now,
  });
  const after = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    odometerKm: 89000,
    now,
  });
  assert.equal(before.scheduleStatus, "scheduled");
  assert.equal(after.scheduleStatus, "upcoming");
});

test("resolved overlay does not hide the recalculated next interval", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    odometerKm: 80000,
    now,
  });
  const merged = mergeLifecycleOntoRecommendation(rec, {
    status: "resolved",
    linkedMaintenanceLogId: "log-1",
  });
  assert.equal(merged.status, "active");
  assert.equal(merged.scheduleStatus, "scheduled");
  assert.equal(merged.linkedMaintenanceLogId, "log-1");
  const visible = visibleRecommendations([merged]);
  assert.equal(visible.length, 1);
});

test("query cache key for AI recommendations includes the vehicle id", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../../lib/api-client-react/src/generated/api.ts"),
    "utf8",
  );
  assert.match(source, /getGetAiRecommendationsQueryKey = \(vehicleId: string\)/);
  const maintenance = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../mfk-mobile/app/maintenance/index.tsx"),
    "utf8",
  );
  assert.match(maintenance, /includes\("recommendations"\)/);
});

test("unsupported service type yields no recommendation", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "unknown_service",
    lastDoneKm: 1000,
    odometerKm: 1000,
    now,
  });
  assert.equal(rec, null);
});

test("vehicle-specific rule overrides platform default", () => {
  const rule = resolveMaintenanceRule(
    "oil_change",
    [{ serviceType: "oil_change", vehicleId: "veh-1", intervalKm: 7000, intervalDays: 180 }],
    { id: "veh-1", make: "Toyota" },
  );
  assert.equal(rule.intervalKm, 7000);
  assert.equal(rule.ruleSource, "vehicle_rule");
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 80000,
    odometerKm: 80000,
    rule,
    now,
  });
  assert.equal(rec.nextDueKm, 87000);
  assert.equal(rec.metadata.ruleSource, "vehicle_rule");
});

test("different vehicles stay isolated when resolving maintenance", () => {
  const next = applyMaintenanceToRecommendations(
    [
      { vehicleId: "veh-a", kind: "maintenance_due", sourceKey: "maintenance:oil_change", status: "active" },
      { vehicleId: "veh-b", kind: "maintenance_due", sourceKey: "maintenance:oil_change", status: "active" },
    ],
    { vehicleId: "veh-a", serviceType: "oil_change", id: "log-a" },
  );
  assert.equal(next.find((row) => row.vehicleId === "veh-a").status, "resolved");
  assert.equal(next.find((row) => row.vehicleId === "veh-b").status, "active");
});

test("bridge surfaces recommendation evaluation errors instead of empty success", () => {
  const bridge = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../mfk-mobile/lib/supabase-api-bridge.ts"),
    "utf8",
  );
  assert.match(bridge, /evaluatedMaintenanceRecommendations/);
  assert.match(bridge, /if \(!isMissingTableError\(error\) && !isUnknownColumnError\(error\)\) throw error/);
  assert.equal(bridge.includes("if (statusInfo.status === \"scheduled\") return null"), false);
});

test("DTC recommendation stays open after oil-change resolution", () => {
  const dtc = buildDtcRecommendation({ vehicleId: "veh-1", code: "P0420" });
  const next = applyMaintenanceToRecommendations(
    [dtc, { vehicleId: "veh-1", kind: "maintenance_due", sourceKey: "maintenance:oil_change", status: "active" }],
    { vehicleId: "veh-1", serviceType: "oil_change" },
  );
  assert.equal(next.find((row) => row.source === "dtc").status, "active");
});
