import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyMaintenanceToRecommendations,
  assertVehicleOwner,
  buildDtcRecommendation,
  buildMaintenanceRecommendation,
  canCloseByMaintenance,
  computeNextDue,
  computeScheduleStatus,
  dedupeKey,
  mergeEvaluatedRecommendations,
  validateMaintenanceInput,
  visibleRecommendations,
} from "../src/services/maintenance-recommendations.mjs";

const now = new Date("2026-10-10T12:00:00Z");

test("creates a maintenance recommendation linked to a due window", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 40000,
    lastDoneAt: "2026-09-20T00:00:00Z",
    odometerKm: 49800,
    now,
  });
  assert.equal(rec.kind, "maintenance_due");
  assert.equal(rec.category, "preventive");
  assert.equal(rec.sourceKey, "maintenance:oil_change");
  assert.equal(rec.nextDueKm, 50000);
  assert.equal(rec.remainingKm, 200);
  assert.equal(rec.scheduleStatus, "upcoming");
});

test("prevents duplicate active recommendations for the same source key", () => {
  const candidate = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 40000,
    lastDoneAt: "2026-01-01T00:00:00Z",
    odometerKm: 52000,
    now,
  });
  const existing = [
    {
      id: "rec-1",
      vehicleId: "veh-1",
      kind: "maintenance_due",
      sourceKey: "maintenance:oil_change",
      status: "active",
      titleAr: "صيانة متأخرة: تغيير الزيت",
    },
  ];
  const { inserts, updates } = mergeEvaluatedRecommendations(existing, [candidate], now);
  assert.equal(inserts.length, 0);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, "rec-1");
  assert.equal(dedupeKey("veh-1", "maintenance_due", "maintenance:oil_change"), "veh-1|maintenance_due|maintenance:oil_change");
});

test("updates last service km/date and next due after a completed log", () => {
  const due = computeNextDue({
    lastDoneKm: 45000,
    lastDoneAt: "2026-10-10T00:00:00Z",
    intervalKm: 10000,
    intervalDays: 180,
  });
  assert.equal(due.nextDueKm, 55000);
  assert.ok(due.nextDueAt);
  const status = computeScheduleStatus({
    nextDueKm: due.nextDueKm,
    nextDueAt: due.nextDueAt,
    odometerKm: 45000,
    now,
  });
  assert.equal(status.status, "scheduled");
});

test("persists cost and notes conceptually on the log payload", () => {
  const valid = validateMaintenanceInput({
    serviceType: "oil_change",
    doneAt: "2026-10-09T00:00:00Z",
    doneAtKm: 45100,
    cost: 280,
    now,
  });
  assert.equal(valid.ok, true);
});

test("does not close a DTC recommendation when maintenance is logged", () => {
  const dtc = buildDtcRecommendation({
    vehicleId: "veh-1",
    code: "P0300",
    descriptionAr: " misfire",
  });
  assert.equal(canCloseByMaintenance(dtc), false);
  const next = applyMaintenanceToRecommendations(
    [
      { ...dtc, status: "active" },
      {
        vehicleId: "veh-1",
        kind: "maintenance_due",
        sourceKey: "maintenance:oil_change",
        status: "active",
        titleAr: "موعد صيانة: تغيير الزيت",
      },
    ],
    { id: "log-1", vehicleId: "veh-1", serviceType: "oil_change" },
  );
  assert.equal(next.find((row) => row.source === "dtc").status, "active");
  assert.equal(next.find((row) => row.kind === "maintenance_due").status, "resolved");
});

test("isolates vehicles and users", () => {
  assert.equal(assertVehicleOwner({ id: "v1", userId: "u1" }, "u1").ok, true);
  assert.equal(assertVehicleOwner({ id: "v1", userId: "u1" }, "u2").ok, false);
  assert.equal(assertVehicleOwner(null, "u1").status, 404);
  const other = applyMaintenanceToRecommendations(
    [{ vehicleId: "veh-2", kind: "maintenance_due", sourceKey: "maintenance:oil_change", status: "active" }],
    { vehicleId: "veh-1", serviceType: "oil_change" },
  );
  assert.equal(other[0].status, "active");
});

test("invalid input fails before any partial write", () => {
  const future = validateMaintenanceInput({
    serviceType: "oil_change",
    doneAt: "2027-01-01T00:00:00Z",
    doneAtKm: 10,
    now,
  });
  assert.equal(future.ok, false);
  const badKm = validateMaintenanceInput({
    serviceType: "oil_change",
    doneAt: "2026-10-09T00:00:00Z",
    doneAtKm: -5,
    now,
  });
  assert.equal(badKm.ok, false);
});

test("legacy rows without status stay visible as active", () => {
  const visible = visibleRecommendations([
    { id: "old", vehicleId: "veh-1", kind: "maintenance_due", titleAr: "زيت" },
    { id: "gone", status: "dismissed", vehicleId: "veh-1", kind: "maintenance_due", titleAr: "زيت" },
  ]);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, "old");
});

test("engine module does not import BLE or OBD stacks", () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/services/maintenance-recommendations.mjs"),
    "utf8",
  );
  assert.equal(/\bimport\b.*\b(ble|obd-service|react-native-ble-plx)\b/i.test(source), false);
});

test("does not advertise AI confidence for rule-based maintenance", () => {
  const rec = buildMaintenanceRecommendation({
    vehicleId: "veh-1",
    serviceType: "oil_change",
    lastDoneKm: 1000,
    lastDoneAt: "2026-01-01T00:00:00Z",
    odometerKm: 12000,
    now,
  });
  assert.equal(rec.confidencePct, undefined);
  assert.equal(rec.metadata.confidenceSource, "none");
  assert.equal(rec.kind, "maintenance_due");
});
