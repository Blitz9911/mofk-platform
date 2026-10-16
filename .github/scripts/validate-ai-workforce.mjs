#!/usr/bin/env node
/**
 * Isolated AI workforce config validator.
 * No pnpm install, no application compile, no secrets access.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(rel) {
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) {
    fail(`missing file: ${rel}`);
    return null;
  }
  return readFileSync(abs, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`${rel} is not valid JSON: ${error.message}`);
    return null;
  }
}

const LEVELS = new Set(["L0", "L1", "L2", "L3", "L4"]);
const REQUIRED_AGENT_IDS = [
  "orchestrator",
  "product-lead",
  "product-manager",
  "business-analyst",
  "ux-reviewer",
  "product-analytics",
  "uat",
  "engineering-lead",
  "software-engineer",
  "obd-iot",
  "devops",
  "qa-automation",
  "data-recommendations",
  "cybersecurity",
];
const REQUIRED_GLOBAL_DENY = [
  "production_db_write",
  "production_deploy",
  "live_obd_write",
  "obd_mode_04",
  "secret_exfiltration",
  "disable_ci",
  "create_production_write_token",
];
const REQUIRED_SENSITIVE = [
  "database_migration",
  "auth_policy",
  "pricing_billing",
  "customer_data_processing",
  "device_binding",
  "live_obd_or_vehicle_write",
  "production_release",
];
const REQUIRED_CODEOWNERS = [
  "/policies/",
  "/agents/",
  "/.github/",
  "/supabase1/",
];

const registry = readJson("agents/registry.json");
const schema = readJson("agents/registry.schema.json");

if (schema) {
  for (const key of [
    "version",
    "operational",
    "policyFile",
    "instructionBase",
    "handoffContract",
    "globalForbiddenActions",
    "sensitiveOperations",
    "agents",
  ]) {
    if (!schema.required?.includes(key)) {
      fail(`agents/registry.schema.json missing required key ${key}`);
    }
  }
}

if (registry) {
  if (registry.operational !== false) {
    fail("agents/registry.json operational must be false until orchestrator and enforceable controls are tested");
  }
  if (registry.version !== 1) {
    fail("agents/registry.json version must be 1");
  }
  if (registry.handoffContract?.cannotSelfApprove !== true) {
    fail("handoffContract.cannotSelfApprove must be true");
  }
  if (registry.handoffContract?.failClosedIfMissingEvidence !== true) {
    fail("handoffContract.failClosedIfMissingEvidence must be true");
  }
  for (const action of REQUIRED_GLOBAL_DENY) {
    if (!registry.globalForbiddenActions?.includes(action)) {
      fail(`globalForbiddenActions missing ${action}`);
    }
  }
  for (const key of REQUIRED_SENSITIVE) {
    const op = registry.sensitiveOperations?.[key];
    if (!op) {
      fail(`sensitiveOperations missing ${key}`);
      continue;
    }
    if (op.failClosed !== true) fail(`${key}.failClosed must be true`);
    if (!Array.isArray(op.requiredHumanApprovals) || op.requiredHumanApprovals.length < 1) {
      fail(`${key} must list at least one human approver`);
    }
    if (op.requiredHumanApprovals?.some((name) => /agent|orchestrator|ai/i.test(name))) {
      fail(`${key} lists a non-human approver`);
    }
    if (!LEVELS.has(op.minLevel)) fail(`${key}.minLevel invalid`);
  }
  if (registry.sensitiveOperations?.production_release?.minLevel !== "L4") {
    fail("production_release.minLevel must be L4");
  }

  const policy = read(registry.policyFile);
  const base = read(registry.instructionBase);
  if (policy && !policy.includes("Fail closed")) {
    fail("policies/AGENT_POLICY.md must document fail-closed behavior");
  }
  if (base && !base.includes("agents/registry.json")) {
    fail("agents/BASE.md must reference agents/registry.json");
  }

  const agents = Array.isArray(registry.agents) ? registry.agents : [];
  const ids = new Set();
  for (const agent of agents) {
    if (!agent?.id || ids.has(agent.id)) fail(`duplicate or missing agent id: ${agent?.id}`);
    ids.add(agent.id);
    for (const field of [
      "instructionFile",
      "maxLevel",
      "responsibilities",
      "allowedPaths",
      "forbiddenActions",
      "handoff",
    ]) {
      if (agent[field] == null) fail(`agent ${agent.id} missing ${field}`);
    }
    if (!LEVELS.has(agent.maxLevel)) fail(`agent ${agent.id} invalid maxLevel`);
    if (agent.maxLevel === "L4") {
      fail(`agent ${agent.id} must not have maxLevel L4`);
    }
    if (!Array.isArray(agent.responsibilities) || agent.responsibilities.length < 1) {
      fail(`agent ${agent.id} needs responsibilities`);
    }
    if (!Array.isArray(agent.allowedPaths) || agent.allowedPaths.length < 1) {
      fail(`agent ${agent.id} needs allowedPaths`);
    }
    if (!Array.isArray(agent.forbiddenActions) || agent.forbiddenActions.length < 1) {
      fail(`agent ${agent.id} needs forbiddenActions`);
    }
    const instruction = read(agent.instructionFile);
    if (instruction) {
      if (!instruction.includes("agents/BASE.md")) {
        fail(`${agent.instructionFile} must tell the role to read BASE.md`);
      }
      if (!instruction.includes("policies/AGENT_POLICY.md")) {
        fail(`${agent.instructionFile} must tell the role to read AGENT_POLICY.md`);
      }
    }
    const next = agent.handoff?.nextAgentIds;
    if (!Array.isArray(next)) fail(`agent ${agent.id} handoff.nextAgentIds must be an array`);
  }

  for (const id of REQUIRED_AGENT_IDS) {
    if (!ids.has(id)) fail(`registry missing required agent ${id}`);
  }

  const orchestrator = agents.find((agent) => agent.id === "orchestrator");
  if (orchestrator) {
    if (orchestrator.maxLevel !== "L0") fail("orchestrator maxLevel must be L0");
    for (const action of ["execute_code", "deploy", "grant_approval"]) {
      if (!orchestrator.forbiddenActions.includes(action)) {
        fail(`orchestrator must forbid ${action}`);
      }
    }
  }

  for (const agent of agents) {
    for (const nextId of agent.handoff?.nextAgentIds || []) {
      if (!ids.has(nextId)) fail(`agent ${agent.id} hands off to unknown ${nextId}`);
    }
  }

  const agentsDir = join(repoRoot, "agents");
  const mdFiles = readdirSync(agentsDir).filter((name) => name.endsWith(".md") && name !== "BASE.md");
  for (const name of mdFiles) {
    const rel = `agents/${name}`;
    if (!agents.some((agent) => agent.instructionFile.replace(/\\/g, "/") === rel)) {
      fail(`instruction file not in registry: ${rel}`);
    }
  }
}

const githubFiles = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/mfk-task.yml",
  ".github/pull_request_template.md",
  ".github/CODEOWNERS",
  ".github/workflows/ai-workforce-config-validate.yml",
  ".github/workflows/mobile-typecheck.yml",
  ".github/workflows/pr-gate.yml",
  ".github/scripts/select-ci-paths.mjs",
  "docs/github-controls.md",
  "docs/CI_PR_GATE.md",
  "docs/FAIL_CLOSED_APPROVALS.md",
  "docs/AI_WORKFORCE_PHASE01_VALIDATION.md",
  "docs/AI_LIVE_SANDBOX.md",
  "agents/runtime/contracts/sandbox-policy.json",
];
for (const file of githubFiles) read(file);

const sandboxPolicy = readJson("agents/runtime/contracts/sandbox-policy.json");
if (sandboxPolicy) {
  if (sandboxPolicy.liveProvidersEnabled !== false) {
    fail("sandbox-policy.json liveProvidersEnabled must be false");
  }
  if (sandboxPolicy.providers?.openai?.enabled !== false) {
    fail("sandbox-policy.json openai.enabled must be false");
  }
  if (sandboxPolicy.retriesEnabled !== false) {
    fail("sandbox-policy.json retriesEnabled must be false");
  }
}

const issueForm = read(".github/ISSUE_TEMPLATE/mfk-task.yml");
if (issueForm) {
  for (const field of ["risk_tier", "sensitive", "acceptance", "approver"]) {
    if (!issueForm.includes(`id: ${field}`)) {
      fail(`issue form missing field ${field}`);
    }
  }
}

const prTemplate = read(".github/pull_request_template.md");
if (prTemplate && !prTemplate.includes("Fail-closed checklist")) {
  fail("pull_request_template.md missing fail-closed checklist");
}

const codeowners = read(".github/CODEOWNERS");
if (codeowners) {
  if (!codeowners.includes("does not enforce")) {
    fail("CODEOWNERS must state that it does not enforce reviews by itself");
  }
  for (const path of REQUIRED_CODEOWNERS) {
    if (!codeowners.includes(path)) fail(`CODEOWNERS missing ${path}`);
  }
  if (!/@[A-Za-z0-9-]+/.test(codeowners)) {
    fail("CODEOWNERS has no GitHub owner handles");
  }
}

const mobile = read(".github/workflows/mobile-typecheck.yml");
if (mobile) {
  if (!mobile.includes("windows-latest")) fail("mobile-typecheck.yml must stay on windows-latest");
  if (!/node-version:\s*20/.test(mobile)) fail("mobile-typecheck.yml must stay on Node 20");
  if (!mobile.includes("pnpm --filter @workspace/mfk-mobile typecheck")) {
    fail("mobile-typecheck.yml job steps were altered");
  }
}

const gate = read(".github/workflows/pr-gate.yml");
if (gate) {
  if (!gate.includes("contents: read")) fail("pr-gate.yml must set contents: read");
  if (!gate.includes("select-ci-paths.mjs")) fail("pr-gate.yml must classify paths");
  if (!gate.includes("windows-latest")) fail("pr-gate.yml must keep Windows mobile typecheck");
  if (!/node-version:\s*20/.test(gate)) fail("pr-gate.yml mobile job must stay on Node 20");
  if (!gate.includes("pnpm --filter @workspace/mfk-mobile typecheck")) {
    fail("pr-gate.yml must run the mobile typecheck command when selected");
  }
  if (!gate.includes("validate-ai-workforce.mjs")) {
    fail("pr-gate.yml must keep workforce config validation");
  }
  if (!gate.includes("name: PR required checks")) {
    fail("pr-gate.yml must expose a permanent required job named PR required checks");
  }
  if (!gate.includes("name: AI sandbox tests")) {
    fail("pr-gate.yml must always run AI sandbox tests");
  }
  if (!gate.includes("live-sandbox.test.mjs")) {
    fail("pr-gate.yml must execute live-sandbox.test.mjs");
  }
  if (!gate.includes("ai-sandbox-tests")) {
    fail("pr-gate.yml PR required checks must depend on ai-sandbox-tests");
  }
  if (!gate.includes("SANDBOX_RUN")) {
    fail("pr-gate.yml must fail closed when sandbox tests do not succeed");
  }
}

const isolated = read(".github/workflows/ai-workforce-config-validate.yml");
if (isolated) {
  if (/pnpm install/.test(isolated)) fail("config-validate workflow must not install workspace dependencies");
  if (/pnpm run typecheck/.test(isolated)) fail("config-validate workflow must not run app typecheck");
  if (!isolated.includes("validate-ai-workforce.mjs")) {
    fail("config-validate workflow must run validate-ai-workforce.mjs");
  }
  if (!isolated.includes("contents: read")) {
    fail("config-validate workflow must set contents: read");
  }
}

const legacy = read(".github/workflows/mfk-ai-pr-checks.yml");
if (legacy) {
  if (/pnpm run typecheck/.test(legacy) || /pnpm install/.test(legacy)) {
    fail("mfk-ai-pr-checks.yml must not run workspace typecheck or pnpm install");
  }
  if (legacy.includes("pull_request:")) {
    fail("mfk-ai-pr-checks.yml must not run on pull_request; use ai-workforce-config-validate.yml");
  }
}

const forbiddenAppTouches = [
  "artifacts/mfk-mobile/package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
];
void forbiddenAppTouches;
void relative;

if (warnings.length) {
  for (const message of warnings) console.warn(`WARN ${message}`);
}
if (errors.length) {
  for (const message of errors) console.error(`FAIL ${message}`);
  console.error(`\n${errors.length} error(s). AI workforce config is not valid.`);
  process.exit(1);
}

console.log("PASS AI workforce config validation");
console.log(`repo ${repoRoot}`);
console.log("operational=false; agents are not running.");
