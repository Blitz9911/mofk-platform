import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyOrFailClosed,
  classifyPaths,
  matchPattern,
} from "./select-ci-paths.mjs";

test("exact package.json is mobile (shared dependency), not workforce", () => {
  const result = classifyPaths(["package.json"]);
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, false);
});

test("pnpm lockfile and workspace files are mobile shared dependencies", () => {
  for (const file of ["pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json"]) {
    const result = classifyPaths([file]);
    assert.equal(result.mobile, true, file);
    assert.equal(result.workforce, false, file);
  }
});

test("nested paths are not treated as root package.json", () => {
  const result = classifyPaths(["artifacts/mfk-mobile/package.json"]);
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, false);
});

test("mobile app and API client paths select mobile only", () => {
  const result = classifyPaths([
    "artifacts/mfk-mobile/lib/supabase-api-bridge.ts",
    "lib/api-client-react/src/index.ts",
  ]);
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, false);
});

test("existing mobile-typecheck workflow changes select both (gate + historical job)", () => {
  const result = classifyPaths([".github/workflows/mobile-typecheck.yml"]);
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, true);
});

test("AI workforce docs and agents select workforce only", () => {
  const result = classifyPaths(["agents/orchestrator.md", "policies/AGENT_POLICY.md"]);
  assert.equal(result.mobile, false);
  assert.equal(result.workforce, true);
});

test("documentation-only OBD guide does not require mobile or workforce suites", () => {
  const result = classifyPaths(["docs/obd-ble-integration.md"]);
  assert.equal(result.mobile, false);
  assert.equal(result.workforce, false);
});

test("unrelated markdown does not require mobile typecheck", () => {
  const result = classifyPaths(["README.md", "DEPLOYMENT_CHECKLIST.md"]);
  assert.equal(result.mobile, false);
  assert.equal(result.workforce, false);
});

test("mixed PR selects both suites", () => {
  const result = classifyPaths([
    "agents/registry.json",
    "artifacts/mfk-mobile/app/recommendations.tsx",
  ]);
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, true);
});

test("PR gate workflow changes fail closed toward both suites", () => {
  const result = classifyPaths([".github/workflows/pr-gate.yml"]);
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, true);
});

test("path matcher honors ** and rejects lookalike prefixes", () => {
  assert.equal(matchPattern("agents/foo.md", "agents/**"), true);
  assert.equal(matchPattern("agents-extra/foo.md", "agents/**"), false);
  assert.equal(matchPattern("package.json.bak", "package.json"), false);
});

test("Windows separators are normalized", () => {
  const result = classifyPaths(["agents\\BASE.md"]);
  assert.equal(result.workforce, true);
  assert.equal(result.mobile, false);
});

test("empty change list skips both suites", () => {
  const result = classifyOrFailClosed([]);
  assert.equal(result.mobile, false);
  assert.equal(result.workforce, false);
  assert.equal(result.failClosed, false);
});

test("undetermined file list fail-closed runs both suites", () => {
  const result = classifyOrFailClosed(null, { error: "git diff failed" });
  assert.equal(result.mobile, true);
  assert.equal(result.workforce, true);
  assert.equal(result.failClosed, true);
});

test("classifier changes select both CI suites", () => {
  for (const file of [
    ".github/scripts/select-ci-paths.mjs",
    ".github/scripts/select-ci-paths.test.mjs",
  ]) {
    const result = classifyPaths([file]);
    assert.equal(result.mobile, true, file);
    assert.equal(result.workforce, true, file);
  }
});

test("deleted and renamed paths still classify", () => {
  const deleted = classifyPaths(["artifacts/mfk-mobile/app/gone.tsx"]);
  assert.equal(deleted.mobile, true);
  const renamed = classifyPaths(["agents/old-name.md"]);
  assert.equal(renamed.workforce, true);
});
