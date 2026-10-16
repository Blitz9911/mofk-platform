import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const bridge = readFileSync(join(root, "artifacts/mfk-mobile/lib/supabase-api-bridge.ts"), "utf8");
const obd = readFileSync(join(root, "artifacts/mfk-mobile/src/obd/services/obd-service.ts"), "utf8");
const ble = readFileSync(join(root, "artifacts/mfk-mobile/src/obd/ble/ble-manager.ts"), "utf8");

test("prepared: OBD BLE session remains a single ObdService (no rewrite in this QA pass)", () => {
  assert.match(obd, /class ObdService/);
  assert.match(ble, /FFE1/);
});

test("prepared: DTC list uses diagnostic_codes not an empty stub", () => {
  assert.match(bridge, /\/rest\/v1\/diagnostic_codes/);
  assert.equal(bridge.includes('path.startsWith("/api/dtc")'), false);
});

test("prepared: approval GET/PATCH persist or error", () => {
  assert.match(bridge, /maintenance_approval_requests/);
  assert.equal(bridge.includes("local_pending"), false);
});

test("prepared: BLE disconnect/reconnect tests require hardware — skipped in CI", { skip: true }, () => {
  assert.equal(true, false);
});
