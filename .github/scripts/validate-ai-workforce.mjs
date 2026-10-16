#!/usr/bin/env node
/**
 * Isolated AI workforce config validator.
 * No pnpm install, no application compile, no secrets access.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
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

/** Text of every `run:` step: the run line plus the more-indented lines under it. */
function extractRunBlocks(yaml) {
  const lines = yaml.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(?:-\s+)?run:(.*)$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    const block = [m[2]];
    while (i + 1 < lines.length && (lines[i + 1].trim() === "" || /^\s*/.exec(lines[i + 1])[0].length > indent)) {
      block.push(lines[++i]);
    }
    blocks.push(block.join("\n"));
  }
  return blocks.join("\n");
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
  "supply_chain_config",
  "control_plane_change",
  "production_release",
];
const REQUIRED_PROTECTED_PATTERNS = [
  ".github/**",
  "agents/**",
  "policies/**",
  "pnpm-workspace.yaml",
  ".npmrc",
  "pnpm-lock.yaml",
  "lib/db/**",
  "supabase1/**",
  "artifacts/api-server/src/lib/auth.ts",
  "artifacts/api-server/src/routes/subscriptions.ts",
  "artifacts/api-server/src/routes/vehicles.ts",
];
const HUMAN_ONLY_STATUSES = ["approved", "done", "rejected", "cancelled"];
const CONTRACT_FILES = [
  "agents/contracts/task-status.json",
  "agents/contracts/handoff-report.schema.json",
  "agents/contracts/test-report.schema.json",
  "agents/contracts/approval-record.schema.json",
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
    "permissionModel",
    "handoffContract",
    "globalForbiddenActions",
    "sensitiveOperations",
    "protectedPaths",
    "obdCommandPolicy",
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
  if (registry.version !== 2) {
    fail("agents/registry.json version must be 2");
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

  const protectedPatterns = (registry.protectedPaths ?? []).map((entry) => entry.pattern);
  for (const pattern of REQUIRED_PROTECTED_PATTERNS) {
    if (!protectedPatterns.includes(pattern)) fail(`protectedPaths missing ${pattern}`);
  }
  for (const entry of registry.protectedPaths ?? []) {
    if (!registry.sensitiveOperations?.[entry.operation]) {
      fail(`protectedPaths ${entry.pattern} maps to unknown operation ${entry.operation}`);
    }
  }

  const obd = registry.obdCommandPolicy;
  if (obd?.default !== "deny") fail("obdCommandPolicy.default must be deny");
  for (const mode of ["04", "08"]) {
    if (!obd?.deniedObdModes?.includes(mode)) fail(`obdCommandPolicy must deny OBD mode ${mode}`);
  }
  for (const mode of obd?.readOnlyObdModes ?? []) {
    if (obd.deniedObdModes?.includes(mode)) fail(`OBD mode ${mode} is both read-only and denied`);
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
      "writablePaths",
      "forbiddenActions",
      "handoff",
    ]) {
      if (agent[field] == null) fail(`agent ${agent.id} missing ${field}`);
    }
    if (!LEVELS.has(agent.maxLevel)) fail(`agent ${agent.id} invalid maxLevel`);
    if (agent.maxLevel === "L3" || agent.maxLevel === "L4") {
      fail(`agent ${agent.id} must not have maxLevel ${agent.maxLevel}; L3/L4 are human seats`);
    }
    if (!Array.isArray(agent.writablePaths)) {
      fail(`agent ${agent.id} writablePaths must be an array`);
    } else if (agent.maxLevel === "L0" && agent.writablePaths.length > 0) {
      fail(`agent ${agent.id} is L0 and must have empty writablePaths`);
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

for (const file of CONTRACT_FILES) readJson(file);

const taskStatus = readJson("agents/contracts/task-status.json");
if (taskStatus) {
  const states = new Set(Object.keys(taskStatus.statuses ?? {}));
  for (const t of taskStatus.transitions ?? []) {
    if (!states.has(t.from) || !states.has(t.to)) fail(`task-status transition ${t.from} -> ${t.to} uses unknown status`);
    if (HUMAN_ONLY_STATUSES.includes(t.to) && t.actor !== "human") {
      fail(`task-status: only a human may move a task to ${t.to}`);
    }
  }
  for (const status of HUMAN_ONLY_STATUSES) {
    if (!states.has(status)) fail(`task-status missing ${status}`);
  }
}

const handoffSchema = readJson("agents/contracts/handoff-report.schema.json");
if (handoffSchema) {
  const agentStatuses = handoffSchema.properties?.status?.enum ?? [];
  for (const status of HUMAN_ONLY_STATUSES) {
    if (agentStatuses.includes(status)) fail(`handoff report must not let an agent set ${status}`);
  }
  for (const output of registry?.handoffContract?.requiredOutputs ?? []) {
    if (!handoffSchema.required?.includes(output)) fail(`handoff-report.schema.json does not require ${output}`);
  }
}

const approvalSchema = readJson("agents/contracts/approval-record.schema.json");
if (approvalSchema && approvalSchema.properties?.approverType?.const !== "User") {
  fail("approval-record approverType must be const User (no bots or apps)");
}

const workspace = read("pnpm-workspace.yaml");
if (workspace) {
  const age = /^minimumReleaseAge:\s*(\d+)\s*$/m.exec(workspace);
  if (!age || Number(age[1]) < 1440) {
    fail("pnpm-workspace.yaml minimumReleaseAge must stay at 1440 or higher");
  }
  if (/^\s*-\s*['"]?\*['"]?\s*$/m.test(workspace)) {
    fail("pnpm-workspace.yaml must not list a bare * wildcard (for example in minimumReleaseAgeExclude)");
  }
}

const workflowDir = join(repoRoot, ".github", "workflows");
for (const name of existsSync(workflowDir) ? readdirSync(workflowDir) : []) {
  if (!/\.ya?ml$/.test(name)) continue;
  const text = read(`.github/workflows/${name}`) ?? "";
  if (/^\s*pull_request_target\s*:/m.test(text)) {
    fail(`.github/workflows/${name} uses pull_request_target`);
  }
  if (name.startsWith("ai-") && /\$\{\{\s*secrets\./.test(text)) {
    fail(`.github/workflows/${name} must not use secrets`);
  }
}

const guard = read(".github/workflows/ai-agent-path-guard.yml");
if (guard) {
  if (!guard.includes("ref: ${{ github.event.pull_request.base.sha }}")) {
    fail("ai-agent-path-guard.yml must load the guard from the PR base commit");
  }
  const runBlocks = extractRunBlocks(guard);
  if (/\$\{\{\s*github\.(head_ref|event\.pull_request\.(title|body|head\.ref|user\.login))/.test(runBlocks)) {
    fail("ai-agent-path-guard.yml must pass PR-controlled strings through env, not inline in run");
  }
}

const githubFiles = [
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/mfk-task.yml",
  ".github/pull_request_template.md",
  ".github/CODEOWNERS",
  ".github/workflows/ai-workforce-config-validate.yml",
  ".github/workflows/ai-agent-path-guard.yml",
  ".github/scripts/agent-path-guard.mjs",
  ".github/workflows/mobile-typecheck.yml",
  "docs/github-controls.md",
  "docs/FAIL_CLOSED_APPROVALS.md",
  "docs/AI_WORKFORCE_PHASE01_VALIDATION.md",
];
for (const file of githubFiles) read(file);

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

// Optional: an earlier draft added a disabled stub with this name.
const legacyPath = ".github/workflows/mfk-ai-pr-checks.yml";
const legacy = existsSync(join(repoRoot, legacyPath)) ? read(legacyPath) : null;
if (legacy) {
  if (/pnpm run typecheck/.test(legacy) || /pnpm install/.test(legacy)) {
    fail("mfk-ai-pr-checks.yml must not run workspace typecheck or pnpm install");
  }
  if (legacy.includes("pull_request:")) {
    fail("mfk-ai-pr-checks.yml must not run on pull_request; use ai-workforce-config-validate.yml");
  }
}

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
