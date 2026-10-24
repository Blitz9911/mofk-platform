import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  dueAlertFromSchedule,
  isClosedStatus,
  isUatPushProbeEnabled,
  lockScreenCopy,
  maskSecretTail,
  notificationTypeForRecommendation,
  parseExpoReceipts,
  parseExpoTickets,
  preferenceAllowsType,
  verifyCronSecret,
  cronSecretFromRequest,
} from "../src/services/notification-policy.mjs";
import { buildExpoMessage, fetchExpoReceipts, sendExpoPushMessages } from "../src/services/expo-push.mjs";
import {
  publicApiBaseUrl,
  shouldPassthroughPushApi,
} from "../../mfk-mobile/lib/push-api-passthrough.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("lock screen copy never includes vehicle identity", () => {
  for (const type of [
    "maintenance_upcoming",
    "maintenance_overdue",
    "recommendation_new",
    "recommendation_priority",
    "dtc_new",
  ]) {
    const copy = lockScreenCopy(type);
    const blob = `${copy.title} ${copy.body}`;
    assert.doesNotMatch(blob, /لوحة|VIN|هيونداي|كامري|كم/);
    assert.match(blob, /مفك/);
  }
});

test("closed recommendations and completed maintenance are not alerted", () => {
  assert.equal(isClosedStatus("resolved"), true);
  assert.equal(isClosedStatus("dismissed"), true);
  assert.equal(
    notificationTypeForRecommendation({ kind: "maintenance_due", status: "resolved", scheduleStatus: "overdue" }),
    null,
  );
  assert.equal(dueAlertFromSchedule({ status: "completed", scheduleStatus: "overdue", serviceType: "oil" }), null);
});

test("duplicate due keys stay stable for the same event and change after reschedule", () => {
  const first = dueAlertFromSchedule({
    status: "active",
    scheduleStatus: "upcoming",
    serviceType: "oil_change",
    nextDueAt: "2026-11-01",
  });
  const again = dueAlertFromSchedule({
    status: "active",
    scheduleStatus: "upcoming",
    serviceType: "oil_change",
    nextDueAt: "2026-11-01",
  });
  const afterComplete = dueAlertFromSchedule({
    status: "active",
    scheduleStatus: "upcoming",
    serviceType: "oil_change",
    nextDueAt: "2027-05-01",
  });
  assert.equal(first.sourceKey, again.sourceKey);
  assert.notEqual(first.sourceKey, afterComplete.sourceKey);
});

test("priority increase maps to recommendation_priority", () => {
  assert.equal(
    notificationTypeForRecommendation(
      { kind: "telemetry", status: "active", severity: "critical" },
      { previousSeverity: "warning" },
    ),
    "recommendation_priority",
  );
});

test("unsubscribe preferences block push types", () => {
  assert.equal(
    preferenceAllowsType({ pushEnabled: false, maintenanceEnabled: true }, "maintenance_overdue"),
    false,
  );
  assert.equal(
    preferenceAllowsType({ pushEnabled: true, diagnosticsEnabled: false }, "dtc_new"),
    false,
  );
  assert.equal(
    preferenceAllowsType({ pushEnabled: true, maintenanceEnabled: true }, "maintenance_upcoming"),
    true,
  );
});

test("cron secret is required and compared", () => {
  assert.equal(verifyCronSecret("abc", undefined).ok, false);
  assert.equal(verifyCronSecret("wrong", "secret").ok, false);
  assert.equal(verifyCronSecret("secret", "secret").ok, true);
  assert.equal(verifyCronSecret("a.b.c", "a.b.c").ok, false);
  assert.equal(cronSecretFromRequest(undefined), "");
  assert.equal(cronSecretFromRequest("cron-secret-value"), "cron-secret-value");
});

test("UAT probe stays off in production env", () => {
  assert.equal(isUatPushProbeEnabled({ MFK_UAT_PUSH_PROBE: "true", MFK_ENV: "production" }), false);
  assert.equal(isUatPushProbeEnabled({ MFK_UAT_PUSH_PROBE: "true", MFK_ENV: "uat" }), true);
  assert.equal(isUatPushProbeEnabled({ MFK_UAT_PUSH_PROBE: "false" }), false);
  assert.equal(preferenceAllowsType({ pushEnabled: true }, "push_probe"), true);
});

test("secrets and tokens are masked in diagnostics helpers", () => {
  assert.equal(maskSecretTail("ExponentPushToken[abcdefgh]"), "…fgh]");
  assert.doesNotMatch(maskSecretTail("ExponentPushToken[abcdefgh]"), /ExponentPushToken/);
});

test("expo receipts distinguish ok vs device errors", () => {
  const parsed = parseExpoReceipts({
    "ticket-1": { status: "ok" },
    "ticket-2": { status: "error", message: "DeviceNotRegistered", details: { error: "DeviceNotRegistered" } },
  });
  assert.equal(parsed[0].status, "ok");
  assert.equal(parsed[1].invalid, true);
});

test("expo tickets distinguish accepted vs invalid device", () => {
  const parsed = parseExpoTickets([
    { status: "ok", id: "ticket-1" },
    { status: "error", message: "DeviceNotRegistered", details: { error: "DeviceNotRegistered" } },
  ]);
  assert.equal(parsed[0].status, "accepted");
  assert.equal(parsed[1].invalid, true);
});

test("expo transport retries 5xx then records tickets", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls < 2) {
      return { status: 503, ok: false, json: async () => ({}) };
    }
    return {
      status: 200,
      ok: true,
      json: async () => ({ data: [{ status: "ok", id: "t1" }] }),
    };
  };
  const result = await sendExpoPushMessages(
    [{ to: "ExponentPushToken[test]", title: "x" }],
    { fetchImpl, accessToken: "test-token", sleep: async () => undefined },
  );
  assert.equal(result.skipped, false);
  assert.equal(calls, 2);
  assert.equal(result.tickets[0].id, "t1");
});

test("missing Expo access token is skipped, not treated as device receipt", async () => {
  const result = await sendExpoPushMessages([{ to: "ExponentPushToken[test]" }], {
    accessToken: "",
    fetchImpl: async () => {
      throw new Error("network should not run");
    },
  });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "missing_expo_access_token");
});

test("expo message payload stays generic", () => {
  const message = buildExpoMessage({
    token: "ExponentPushToken[abc]",
    type: "dtc_new",
    notificationId: "nid",
    actionUrl: "/dtc",
  });
  assert.equal(message.title, "تنبيه من مفك");
  assert.doesNotMatch(message.body, /P0300|كمري/);
  assert.equal(message.data.actionUrl, "/dtc");
});

test("SQL is additive and not a production apply script", () => {
  const sql = readFileSync(join(root, "supabase1/supabase/20261016_push_notifications.sql"), "utf8");
  assert.match(sql, /Do NOT apply to production/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS device_push_tokens/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /receipt_status/);
  assert.doesNotMatch(sql, /DROP TABLE notifications/i);
  assert.doesNotMatch(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_unique/);
});

test("receipt fetch is skipped without provider token", async () => {
  const result = await fetchExpoReceipts(["abc"], {
    accessToken: "",
    fetchImpl: async () => {
      throw new Error("network should not run");
    },
  });
  assert.equal(result.skipped, true);
});

test("push API passthrough skips the bridge only when an API origin is set", () => {
  const local = { MFK_ENV: "local" };
  assert.equal(shouldPassthroughPushApi("/api/notifications/self-test", "", local), false);
  assert.equal(shouldPassthroughPushApi("/api/notifications/self-test", "https://uat.example", local), true);
  assert.equal(shouldPassthroughPushApi("/api/devices/push-token", "https://uat.example", local), true);
  assert.equal(shouldPassthroughPushApi("/api/notifications", "https://uat.example", local), false);
  assert.equal(shouldPassthroughPushApi("/api/jobs/notifications-due", "https://uat.example", local), false);
  assert.equal(publicApiBaseUrl({ EXPO_PUBLIC_API_BASE_URL: "https://uat.example/" }), "https://uat.example");
});

test("UAT rollback does not drop the inbox", () => {
  const sql = readFileSync(join(root, "supabase1/supabase/20261016_push_notifications_rollback.sql"), "utf8");
  assert.match(sql, /UAT only/);
  assert.match(sql, /DROP TABLE IF EXISTS device_push_tokens/);
  assert.doesNotMatch(sql, /DROP TABLE IF EXISTS notifications;/);
});

test("EAS profiles remain present and this worktree does not embed App Store keys", () => {
  const eas = JSON.parse(readFileSync(join(root, "artifacts/mfk-mobile/eas.json"), "utf8"));
  assert.equal(eas.build.development.distribution, "internal");
  assert.ok(eas.build.uat);
  assert.equal(eas.submit?.production?.ios?.ascApiKeyPath, undefined);
});
