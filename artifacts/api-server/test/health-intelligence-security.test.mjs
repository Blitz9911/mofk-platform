import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  describeVehicleLink,
  maintenanceIdempotencyKey,
  resolveMaintenanceRule,
  LIVE_WINDOW_MS,
} from "../src/services/vehicle-health-engine.mjs";

function envFlag(name) {
  const value = process.env[name];
  if (value == null) return false;
  return value === "true" || value === "1" || value === "yes";
}
function isHealthIntelligenceEnabled() {
  return envFlag("MFK_HEALTH_INTELLIGENCE_ENABLED");
}
function isAnomalyDetectionEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_ANOMALY_DETECTION_ENABLED");
}
function isApprovalLoggingEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_APPROVAL_LOGGING_ENABLED");
}
function isOdometerTrackingEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_ODOMETER_TRACKING_ENABLED");
}
function isOcrEnabled() {
  return isHealthIntelligenceEnabled() && envFlag("MFK_OCR_ENABLED");
}
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isRecommendationId(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const sqlPath = join(root, "supabase1/supabase/20261015_vehicle_health_intelligence.sql");
const sql = readFileSync(sqlPath, "utf8");
const routeSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/routes/health-intelligence.ts"),
  "utf8",
);
const storeSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/services/recommendation-store.ts"),
  "utf8",
);

test("flags default off", () => {
  delete process.env.MFK_HEALTH_INTELLIGENCE_ENABLED;
  delete process.env.MFK_ANOMALY_DETECTION_ENABLED;
  delete process.env.MFK_APPROVAL_LOGGING_ENABLED;
  delete process.env.MFK_ODOMETER_TRACKING_ENABLED;
  delete process.env.MFK_OCR_ENABLED;
  assert.equal(isHealthIntelligenceEnabled(), false);
  assert.equal(isAnomalyDetectionEnabled(), false);
  assert.equal(isApprovalLoggingEnabled(), false);
  assert.equal(isOdometerTrackingEnabled(), false);
  assert.equal(isOcrEnabled(), false);
});

test("anomaly flag is required even when intelligence is on", () => {
  process.env.MFK_HEALTH_INTELLIGENCE_ENABLED = "true";
  delete process.env.MFK_ANOMALY_DETECTION_ENABLED;
  assert.equal(isHealthIntelligenceEnabled(), true);
  assert.equal(isAnomalyDetectionEnabled(), false);
  process.env.MFK_ANOMALY_DETECTION_ENABLED = "true";
  assert.equal(isAnomalyDetectionEnabled(), true);
  delete process.env.MFK_HEALTH_INTELLIGENCE_ENABLED;
  delete process.env.MFK_ANOMALY_DETECTION_ENABLED;
});

test("health summary does not hardcode anomalyEnabled true", () => {
  assert.equal(/anomalyEnabled:\s*true/.test(routeSource), false);
  assert.match(routeSource, /isAnomalyDetectionEnabled\(\)/);
});

test("explain endpoint requires stored recommendationId", () => {
  assert.match(routeSource, /explainOwnedRecommendation/);
  assert.equal(/maybeLlmExplain\(rec\)/.test(routeSource), false);
  assert.equal(isRecommendationId("not-a-uuid"), false);
  assert.equal(isRecommendationId("11111111-1111-4111-8111-111111111111"), true);
});

test("migration enables RLS and foreign keys", () => {
  assert.match(sql, /REFERENCES maintenance_logs\(id\)/);
  assert.match(sql, /REFERENCES vehicles\(id\)/);
  assert.match(sql, /REFERENCES users\(id\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE IF EXISTS maintenance_logs ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_maint_logs_idempotency/);
  assert.equal(/DROP TABLE IF EXISTS notifications/.test(sql), false);
  assert.match(sql, /Never recreate notifications|Never recreate a pre-existing|ALTER TABLE IF EXISTS notifications/);
});

test("RLS policies isolate by owner user id", () => {
  assert.match(sql, /user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql, /v\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql, /owners write own maintenance_rules/);
});

test("vehicle rules beat catalog then platform default", () => {
  const overrides = [
    {
      serviceType: "oil_change",
      vehicleId: "veh-1",
      intervalKm: 7000,
      intervalDays: 180,
      ruleSource: "vehicle_rule",
    },
    {
      serviceType: "oil_change",
      make: "Toyota",
      model: "Camry",
      year: 2020,
      intervalKm: 8000,
      intervalDays: 180,
      ruleSource: "catalog_rule",
    },
  ];
  const vehicle = resolveMaintenanceRule("oil_change", overrides, {
    id: "veh-1",
    make: "Toyota",
    model: "Camry",
    year: 2020,
  });
  assert.equal(vehicle.intervalKm, 7000);
  assert.equal(vehicle.ruleSource, "vehicle_rule");
  const catalog = resolveMaintenanceRule("oil_change", overrides, {
    id: "veh-2",
    make: "Toyota",
    model: "Camry",
    year: 2020,
  });
  assert.equal(catalog.intervalKm, 8000);
  assert.equal(catalog.ruleSource, "catalog_rule");
  const fallback = resolveMaintenanceRule("oil_change", [], { id: "veh-3", make: "X" });
  assert.equal(fallback.ruleSource, "platform_default");
  assert.equal(fallback.intervalKm, 10000);
});

test("paired is not the same as connected", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const pairedOnly = describeVehicleLink({
    adapterMac: "AA:BB",
    lastTelemetryAt: "2026-10-14T12:00:00Z",
    now,
  });
  assert.equal(pairedOnly.paired, true);
  assert.equal(pairedOnly.connected, false);
  assert.equal(pairedOnly.live, false);
  const live = describeVehicleLink({
    adapterMac: "AA:BB",
    lastTelemetryAt: new Date(now.getTime() - LIVE_WINDOW_MS / 2),
    now,
  });
  assert.equal(live.connected, true);
  const unpaired = describeVehicleLink({ adapterMac: null, lastTelemetryAt: now, now });
  assert.equal(unpaired.paired, false);
  assert.equal(unpaired.connected, false);
});

test("idempotency keys collide for identical payloads only", () => {
  const a = maintenanceIdempotencyKey({
    userId: "u1",
    vehicleId: "v1",
    serviceType: "oil_change",
    doneAt: "2026-10-15T00:00:00.000Z",
    doneAtKm: 40000,
  });
  const b = maintenanceIdempotencyKey({
    userId: "u1",
    vehicleId: "v1",
    serviceType: "oil_change",
    doneAt: "2026-10-15T00:00:00.000Z",
    doneAtKm: 40000,
  });
  const c = maintenanceIdempotencyKey({
    userId: "u1",
    vehicleId: "v1",
    serviceType: "oil_change",
    doneAt: "2026-11-15T00:00:00.000Z",
    doneAtKm: 50000,
  });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("logging uses vehicle lock, idempotency, and rules", () => {
  assert.match(storeSource, /for\("update"\)/);
  assert.match(storeSource, /idempotencyKey/);
  assert.match(storeSource, /resolveMaintenanceRule/);
  assert.match(storeSource, /approvalId/);
});

test("BLE modules stay out of health intelligence routes", () => {
  assert.equal(/\b(react-native-ble-plx|elm327-command-queue|FFE1)\b/.test(routeSource), false);
  assert.equal(/\b(react-native-ble-plx|elm327-command-queue|FFE1)\b/.test(storeSource), false);
});
