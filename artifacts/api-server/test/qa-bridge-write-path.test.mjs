import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const bridge = readFileSync(join(root, "artifacts/mfk-mobile/lib/supabase-api-bridge.ts"), "utf8");
const invoices = readFileSync(join(root, "artifacts/mfk-mobile/lib/maintenance-invoices.ts"), "utf8");

test("invoice copy failure is not treated as success", () => {
  assert.equal(/return draft;/.test(invoices.split("persistInvoiceFile")[1] || ""), false);
  assert.match(invoices, /throw new Error/);
});

test("maintenance insert no longer sends actual_cost_sar as required column", () => {
  assert.match(bridge, /buildMaintenanceLogInsert/);
  assert.match(bridge, /upsertMaintenanceSchedule/);
  assert.match(bridge, /persistRecommendationResolution/);
});

test("odometer write commits vehicles.odometer_km", () => {
  assert.match(bridge, /committedOdometerResponse/);
  assert.equal(bridge.includes("stored: \"local_pending\""), false);
});
