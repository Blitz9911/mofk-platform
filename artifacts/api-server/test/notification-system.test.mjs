import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  dtcLifecycleAlert,
  documentReminderAlert,
  ignoreRoutineBleDisconnect,
  isInQuietHours,
  isVerifiedPaymentEvent,
  maintenanceThresholdAlert,
  odometerDiscrepancyAlert,
  shouldLocalObdNotify,
  shouldServerPushObd,
  subscriptionReminderAlert,
  tightestCrossedKmThreshold,
} from "../src/services/notification-rules.mjs";
import { isAllowedActionUrl, sanitizeActionUrl } from "../src/services/notification-destinations.mjs";
import { lockScreenCopy, preferenceAllowsType, shouldSkipOptionalPushForQuietHours } from "../src/services/notification-policy.mjs";
import { evaluateObdConnectionEvent } from "../../mfk-mobile/lib/obd-notification-policy.mjs";
import { toSafeMobileRoute } from "../../mfk-mobile/lib/notification-destinations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("UAT-02 500 km remaining uses one threshold key", () => {
  const first = maintenanceThresholdAlert({
    remainingKm: 500,
    serviceType: "oil_change",
    nextDueKm: 10500,
    status: "active",
  });
  const again = maintenanceThresholdAlert({
    remainingKm: 480,
    serviceType: "oil_change",
    nextDueKm: 10500,
    status: "active",
  });
  assert.equal(first.threshold, 500);
  assert.equal(first.sourceKey, again.sourceKey);
  assert.equal(tightestCrossedKmThreshold(480), 500);
});

test("UAT-03 completed maintenance does not keep old reminder", () => {
  assert.equal(
    maintenanceThresholdAlert({ remainingKm: 0, serviceType: "oil_change", status: "completed" }),
    null,
  );
});

test("UAT-06 duplicate active DTC does not create a new lifecycle event", () => {
  assert.equal(dtcLifecycleAlert({ code: "P0301", status: "active", previousStatus: "active" }), null);
});

test("UAT-07 reappearing DTC is a new event", () => {
  const alert = dtcLifecycleAlert({ code: "P0301", status: "active", previousStatus: "cleared", detectedAt: "2026-10-21" });
  assert.equal(alert.type, "dtc_reappeared");
});

test("UAT-08 insurance 7 days uses verified date only", () => {
  const now = new Date("2026-10-21T00:00:00Z");
  const alert = documentReminderAlert({ kind: "insurance", expiresAt: "2026-10-28", now });
  assert.equal(alert.threshold, 7);
  assert.equal(documentReminderAlert({ kind: "insurance", expiresAt: null, now }), null);
});

test("UAT-09 missing expiration invents nothing", () => {
  assert.equal(documentReminderAlert({ kind: "registration" }), null);
});

test("UAT-10 routine BLE disconnect is ignored", () => {
  assert.equal(ignoreRoutineBleDisconnect("disconnect"), true);
  assert.equal(evaluateObdConnectionEvent("disconnect").inbox, false);
  assert.equal(shouldLocalObdNotify("disconnect"), false);
});

test("UAT-11 pairing error is local guidance", () => {
  assert.equal(evaluateObdConnectionEvent("pair_error").local, true);
  assert.equal(shouldServerPushObd("pair_error"), false);
});

test("UAT-13 mock payment cannot produce success", () => {
  assert.equal(isVerifiedPaymentEvent({ status: "paid", source: "mock" }), false);
  assert.equal(isVerifiedPaymentEvent({ status: "paid", providerStatus: "paid", source: "moyasar" }), true);
});

test("UAT-14 category opt-out suppresses optional push", () => {
  assert.equal(
    preferenceAllowsType({ pushEnabled: true, documentsEnabled: false }, "document_insurance"),
    false,
  );
  assert.equal(
    preferenceAllowsType({ pushEnabled: true, subscriptionsEnabled: true }, "subscription_renewal"),
    true,
  );
});

test("UAT-20 / UAT-28 threshold keys stay stable under repeated scans", () => {
  const a = maintenanceThresholdAlert({ remainingKm: 900, serviceType: "oil_change", nextDueKm: 10000, status: "active" });
  const b = maintenanceThresholdAlert({ remainingKm: 850, serviceType: "oil_change", nextDueKm: 10000, status: "active" });
  assert.equal(a.sourceKey, b.sourceKey);
  assert.equal(a.threshold, 1000);
});

test("UAT-26 quiet hours skip optional push", () => {
  const quiet = { quietHoursStart: 22, quietHoursEnd: 7 };
  const night = new Date("2026-10-21T20:30:00Z");
  assert.equal(isInQuietHours(quiet, night), true);
  assert.equal(shouldSkipOptionalPushForQuietHours(quiet, "maintenance_upcoming", night), true);
  assert.equal(shouldSkipOptionalPushForQuietHours(quiet, "push_probe", night), false);
});

test("UAT-29 invalid payload destinations are rejected", () => {
  assert.equal(isAllowedActionUrl("https://evil.example/login"), false);
  assert.equal(sanitizeActionUrl("https://evil.example", "dtc_new"), "/dtc");
  assert.equal(toSafeMobileRoute("javascript:alert(1)"), "/notifications");
});

test("lock screen copy stays generic for new types", () => {
  for (const type of ["document_insurance", "subscription_activated", "obd_pair_success", "dtc_reappeared"]) {
    const copy = lockScreenCopy(type);
    assert.doesNotMatch(`${copy.title} ${copy.body}`, /P0301|لوحة|كمري|VIN/);
  }
});

test("odometer discrepancy requires a large verified jump", () => {
  assert.equal(odometerDiscrepancyAlert({ previousKm: 10000, nextKm: 10100, estimated: false }), null);
  assert.ok(odometerDiscrepancyAlert({ previousKm: 10000, nextKm: 12000, estimated: false }));
  assert.equal(odometerDiscrepancyAlert({ previousKm: 10000, nextKm: 12000, estimated: true }), null);
});

test("subscription reminder uses period end", () => {
  const now = new Date("2026-10-21T00:00:00Z");
  const alert = subscriptionReminderAlert({ status: "active", currentPeriodEnd: "2026-10-28", now });
  assert.equal(alert.type, "subscription_renewal");
});

test("additive SQL files are not apply-to-production scripts", () => {
  const sql = readFileSync(join(root, "supabase1/supabase/20261021_notification_system.sql"), "utf8");
  assert.match(sql, /DO NOT APPLY/);
  assert.match(sql, /vehicle_documents/);
  assert.match(sql, /notification_events/);
  assert.doesNotMatch(sql, /DROP TABLE notifications/i);
});
