import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  collapseDuplicateInboxRows,
  createActiveDedupeIndex,
  enqueueWithActiveIndex,
  isUniqueViolation,
  runConcurrentEnqueue,
} from "../src/services/notification-idempotency.mjs";
import {
  resolvePushPassthrough,
  validateApiEnvironment,
} from "../src/services/api-environment.mjs";
import {
  accountSwitchTokenAction,
  authorizeNotificationDestination,
  evaluatePushRegistration,
  isExpoPushToken,
} from "../src/services/push-registration-policy.mjs";
import { preferenceAllowsType } from "../src/services/notification-policy.mjs";
import { toSafeMobileRoute } from "../../mfk-mobile/lib/notification-destinations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("concurrent workers create one active notification", async () => {
  const index = createActiveDedupeIndex();
  const raced = await runConcurrentEnqueue(index, {
    userId: "user-a",
    type: "maintenance_upcoming",
    vehicleId: "veh-1",
    sourceKey: "oil_change:km:500:10500",
  });
  assert.equal(raced.created, 1);
  assert.equal(raced.duplicate, 11);
  assert.equal(raced.ids.length, 1);
});

test("duplicate event processing is idempotent after the first insert", async () => {
  const index = createActiveDedupeIndex();
  const input = { userId: "user-a", type: "dtc_new", vehicleId: "veh-1", sourceKey: "dtc:P0301:new" };
  const first = await enqueueWithActiveIndex(index, input);
  const second = await enqueueWithActiveIndex(index, input);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.id, second.id);
});

test("historical duplicate collapse keeps the oldest active row", () => {
  const now = new Date("2026-10-21T00:00:00Z");
  const result = collapseDuplicateInboxRows(
    [
      { id: "b", userId: "u1", dedupeKey: "mofk:dtc_new:v1:dtc:P0301:new", createdAt: "2026-10-21T02:00:00Z" },
      { id: "a", userId: "u1", dedupeKey: "mofk:dtc_new:v1:dtc:P0301:new", createdAt: "2026-10-21T01:00:00Z" },
      { id: "c", userId: "u1", dedupeKey: "mofk:other:v1:x", createdAt: "2026-10-21T03:00:00Z" },
    ],
    now,
  );
  assert.deepEqual(result.keepIds.sort(), ["a", "c"]);
  assert.equal(result.superseded.length, 1);
  assert.equal(result.superseded[0].id, "b");
});

test("unique violation detector recognizes postgres 23505", () => {
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ message: "ok" }), false);
});

test("API environment isolation rejects mismatched and unlisted origins", () => {
  assert.equal(
    validateApiEnvironment({
      MFK_ENV: "uat",
      EXPO_PUBLIC_MFK_ENV: "production",
      EXPO_PUBLIC_API_BASE_URL: "https://example.test",
      MFK_ALLOWED_API_ORIGINS: "https://example.test",
    }).reason,
    "mfk_env_mismatch",
  );
  assert.equal(
    validateApiEnvironment({
      MFK_ENV: "uat",
      EXPO_PUBLIC_MFK_ENV: "uat",
      MFK_UAT_SUPABASE_REF: "nbuqxtasvqdnallukbyx",
      EXPO_PUBLIC_SUPABASE_URL: "https://nbuqxtasvqdnallukbyx.supabase.co",
      EXPO_PUBLIC_API_BASE_URL: "https://prod.example",
      MFK_ALLOWED_API_ORIGINS: "https://uat.example",
    }).reason,
    "api_origin_not_allowlisted",
  );
  assert.equal(
    validateApiEnvironment({
      MFK_ENV: "production",
      MFK_UAT_PUSH_PROBE: "true",
    }).reason,
    "uat_probe_forbidden_in_production",
  );
  assert.equal(
    validateApiEnvironment({
      MFK_ENV: "uat",
      EXPO_PUBLIC_API_BASE_URL: "https://uat.example",
    }).reason,
    "uat_project_ref_required",
  );
  assert.equal(
    validateApiEnvironment({
      MFK_ENV: "uat",
      EXPO_PUBLIC_MFK_ENV: "uat",
      MFK_UAT_SUPABASE_REF: "nbuqxtasvqdnallukbyx",
      EXPO_PUBLIC_SUPABASE_URL: "https://nbuqxtasvqdnallukbyx.supabase.co",
      EXPO_PUBLIC_API_BASE_URL: "https://uat.example",
      MFK_ALLOWED_API_ORIGINS: "https://uat.example",
    }).ok,
    true,
  );
});

test("local empty API base stays on the bridge and cron is never a client path", () => {
  assert.equal(resolvePushPassthrough("/api/notifications/self-test", { EXPO_PUBLIC_API_BASE_URL: "" }).passthrough, false);
  assert.equal(resolvePushPassthrough("/api/jobs/notifications-due", { EXPO_PUBLIC_API_BASE_URL: "https://uat.example" }).reason, "cron_not_a_client_path");
  assert.equal(
    resolvePushPassthrough("/api/notifications/self-test", {
      MFK_ENV: "uat",
      EXPO_PUBLIC_API_BASE_URL: "https://uat.example",
    }).blocked,
    true,
  );
});

test("push permission denied still leaves inbox usable", () => {
  const denied = evaluatePushRegistration({ osAvailable: true, permissionGranted: false, projectId: "proj", token: "ExponentPushToken[abcd]" });
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, "denied");
});

test("invalid push token is rejected", () => {
  assert.equal(isExpoPushToken("not-a-token"), false);
  assert.equal(
    evaluatePushRegistration({
      osAvailable: true,
      permissionGranted: true,
      projectId: "proj",
      token: "gcm-token",
    }).reason,
    "invalid_expo_push_token",
  );
});

test("account switching unregisters the previous token", () => {
  const switched = accountSwitchTokenAction({ previousUserId: "u1", nextUserId: "u2", hasToken: true });
  assert.equal(switched.unregister, true);
  assert.equal(switched.register, true);
  const same = accountSwitchTokenAction({ previousUserId: "u1", nextUserId: "u1", hasToken: true });
  assert.equal(same.unregister, false);
});

test("deep-link authorization denies other users and deleted vehicles", () => {
  assert.equal(
    authorizeNotificationDestination({
      authenticated: true,
      viewerUserId: "u1",
      ownerUserId: "u2",
      actionUrl: "/dtc",
      sanitize: toSafeMobileRoute,
    }).reason,
    "not_owned",
  );
  assert.equal(
    authorizeNotificationDestination({
      authenticated: true,
      viewerUserId: "u1",
      vehicleDeleted: true,
      actionUrl: "/maintenance",
      sanitize: toSafeMobileRoute,
    }).reason,
    "deleted_vehicle",
  );
  assert.equal(
    authorizeNotificationDestination({
      authenticated: false,
      actionUrl: "/dtc",
      sanitize: toSafeMobileRoute,
    }).actionUrl,
    "/welcome",
  );
  assert.equal(
    authorizeNotificationDestination({
      authenticated: true,
      viewerUserId: "u1",
      ownerUserId: "u1",
      actionUrl: "https://evil.example",
      sanitize: toSafeMobileRoute,
    }).actionUrl,
    "/notifications",
  );
});

test("notification preferences suppress optional push categories", () => {
  assert.equal(preferenceAllowsType({ pushEnabled: true, maintenanceEnabled: false }, "maintenance_upcoming"), false);
  assert.equal(preferenceAllowsType({ pushEnabled: true, diagnosticsEnabled: false }, "dtc_new"), false);
  assert.equal(preferenceAllowsType({ pushEnabled: true, subscriptionsEnabled: false }, "subscription_renewal"), false);
  assert.equal(preferenceAllowsType({ pushEnabled: false, maintenanceEnabled: true }, "maintenance_overdue"), false);
});

test("UAT/Production separation is encoded in SQL and env policy", () => {
  const uniqueSql = readFileSync(join(root, "supabase1/supabase/20261021_notification_dedupe_unique.sql"), "utf8");
  assert.match(uniqueSql, /DO NOT APPLY/);
  assert.match(uniqueSql, /idx_notifications_active_dedupe/);
  assert.match(uniqueSql, /superseded_at IS NULL/);
  assert.equal(validateApiEnvironment({ MFK_ENV: "production", MFK_UAT_PUSH_PROBE: "true" }).ok, false);
});
