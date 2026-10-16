import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { evaluate, globToRegExp } from "./agent-path-guard.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registry = JSON.parse(readFileSync(join(repoRoot, "agents/registry.json"), "utf8"));

function run(branch, files, extra = {}) {
  return evaluate({ registry, branch, files, ...extra });
}

test("glob matching", () => {
  assert.ok(globToRegExp(".github/**").test(".github/workflows/x.yml"));
  assert.ok(!globToRegExp(".github/**").test("docs/.github"));
  assert.ok(globToRegExp("**/package.json").test("package.json"));
  assert.ok(globToRegExp("**/package.json").test("artifacts/mfk-mobile/package.json"));
  assert.ok(globToRegExp("**/*checkout*").test("artifacts/mfk-web/src/pages/checkout-plan.tsx"));
  assert.ok(globToRegExp("artifacts/**/test/**").test("artifacts/api-server/test/a.test.mjs"));
  assert.ok(!globToRegExp("artifacts/*/x").test("artifacts/a/b/x"));
  assert.ok(globToRegExp("**/*payment*", { caseInsensitive: true }).test("src/PaymentSheet.tsx"));
  assert.ok(globToRegExp("docs/obd-*.md").test("docs/obd-ble-integration.md"));
});

test("human branches are not restricted", () => {
  const result = run("feature/foo", ["pnpm-workspace.yaml"]);
  assert.equal(result.ok, true);
  assert.equal(result.agentId, null);
});

test("agent app on a non-agent branch fails", () => {
  const result = run("feature/foo", [], { author: "mfk-agent[bot]", agentAppLogin: "mfk-agent[bot]" });
  assert.equal(result.ok, false);
});

test("malformed or unknown agent branch fails", () => {
  assert.equal(run("agent/software-engineer", ["docs/a.md"]).ok, false);
  assert.equal(run("agent/root/T-1", ["docs/a.md"]).ok, false);
});

test("L0 agents cannot change any file", () => {
  const result = run("agent/orchestrator/T-1", ["docs/plan.md"]);
  assert.equal(result.ok, false);
  assert.equal(result.violations[0].rule, "not-writable");
});

test("software-engineer can edit app code but not protected paths", () => {
  assert.equal(run("agent/software-engineer/T-2", ["artifacts/mfk-mobile/app/dtc.tsx"]).ok, true);

  const protectedFiles = {
    "artifacts/api-server/src/lib/auth.ts": "auth_policy",
    "artifacts/mfk-mobile/context/AuthContext.tsx": "auth_policy",
    "artifacts/mfk-web/src/pages/pricing.tsx": "pricing_billing",
    "artifacts/mfk-mobile/app/subscription.tsx": "pricing_billing",
    "artifacts/api-server/src/routes/vehicles.ts": "device_binding",
    "artifacts/mfk-mobile/package.json": "supply_chain_config",
    "pnpm-workspace.yaml": "supply_chain_config",
    "lib/db/src/schema/mfk.ts": "database_migration",
    "supabase1/supabase/mofk_schema.sql": "database_migration",
    ".github/workflows/mobile-typecheck.yml": "control_plane_change",
    "agents/registry.json": "control_plane_change",
    "artifacts/mfk-mobile/.env": "customer_data_processing",
    "artifacts/mfk-mobile/eas.json": "production_release",
  };
  for (const [file, operation] of Object.entries(protectedFiles)) {
    const result = run("agent/software-engineer/T-3", [file]);
    assert.equal(result.ok, false, file);
    assert.equal(result.violations[0].operation, operation, file);
  }
});

test("qa-automation may only write tests", () => {
  assert.equal(run("agent/qa-automation/T-4", ["artifacts/api-server/test/x.test.mjs"]).ok, true);
  assert.equal(run("agent/qa-automation/T-4", ["artifacts/api-server/src/routes/dtc.ts"]).ok, false);
});

test("obd-iot cannot touch device binding", () => {
  assert.equal(run("agent/obd-iot/T-5", ["artifacts/mfk-mobile/src/obd/pids/pid-decoder.ts"]).ok, true);
  assert.equal(run("agent/obd-iot/T-5", ["artifacts/mfk-mobile/src/obd/binding/bind.ts"]).ok, false);
});

test("devops cannot edit workflows", () => {
  assert.equal(run("agent/devops/T-6", [".github/workflows/new.yml"]).ok, false);
  assert.equal(run("agent/devops/T-6", ["docs/ci-proposal.md"]).ok, true);
});
