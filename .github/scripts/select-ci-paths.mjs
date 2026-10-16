#!/usr/bin/env node
/**
 * Classify changed files for PR CI. No network, no secrets, no pnpm.
 * Fail-closed: if the file list cannot be determined, both suites run.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** Same mobile surfaces as .github/workflows/mobile-typecheck.yml, plus the gate that can run that job. */
export const MOBILE_PATTERNS = [
  ".github/scripts/select-ci-paths.mjs",
  ".github/scripts/select-ci-paths.test.mjs",
  "artifacts/mfk-mobile/**",
  "lib/api-client-react/**",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  ".github/workflows/mobile-typecheck.yml",
  ".github/workflows/pr-gate.yml",
];

export const WORKFORCE_PATTERNS = [
  "agents/**",
  "policies/**",
  "templates/**",
  "docs/ARCHITECTURE.md",
  "docs/IMPLEMENTATION_ROADMAP.md",
  "docs/github-controls.md",
  "docs/FAIL_CLOSED_APPROVALS.md",
  "docs/AI_WORKFORCE_PHASE01_VALIDATION.md",
  "docs/CI_PR_GATE.md",
  "docs/AGENT_RUNTIME.md",
  "docs/AGENT_RUNTIME_SECURITY.md",
  "docs/AI_MODEL_ADAPTER.md",
  "docs/AI_LIVE_SANDBOX.md",
  ".github/CODEOWNERS",
  ".github/ISSUE_TEMPLATE/**",
  ".github/pull_request_template.md",
  ".github/scripts/validate-ai-workforce.mjs",
  ".github/scripts/select-ci-paths.mjs",
  ".github/scripts/select-ci-paths.test.mjs",
  ".github/workflows/ai-workforce-config-validate.yml",
  ".github/workflows/mfk-ai-pr-checks.yml",
  ".github/workflows/pr-gate.yml",
  ".github/workflows/mobile-typecheck.yml",
];

export function normalizePath(file) {
  return String(file || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

export function matchPattern(file, pattern) {
  const path = normalizePath(file);
  const glob = normalizePath(pattern);
  if (!path || path.endsWith("/")) return false;
  if (glob.endsWith("/**")) {
    const prefix = glob.slice(0, -2);
    return path === prefix.slice(0, -1) || path.startsWith(prefix);
  }
  return path === glob;
}

export function classifyPaths(files) {
  const list = (files || []).map(normalizePath).filter(Boolean);
  return {
    mobile: list.some((file) => MOBILE_PATTERNS.some((pattern) => matchPattern(file, pattern))),
    workforce: list.some((file) =>
      WORKFORCE_PATTERNS.some((pattern) => matchPattern(file, pattern)),
    ),
  };
}

function gitChangedFiles(baseSha, headSha) {
  if (!baseSha || !headSha) {
    throw new Error("missing BASE_SHA or HEAD_SHA");
  }
  const output = execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", `${baseSha}...${headSha}`],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function classifyOrFailClosed(files, options = {}) {
  if (options.error) {
    return { mobile: true, workforce: true, failClosed: true, reason: String(options.error) };
  }
  if (!Array.isArray(files)) {
    return { mobile: true, workforce: true, failClosed: true, reason: "file list missing" };
  }
  const selected = classifyPaths(files);
  return { ...selected, failClosed: false, reason: null };
}

function isMain() {
  const self = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
  return self === invoked;
}

function parseArgFiles(argv) {
  const idx = argv.indexOf("--files");
  if (idx === -1) return null;
  return argv.slice(idx + 1).filter((arg) => !arg.startsWith("--"));
}

if (isMain()) {
  let files = parseArgFiles(process.argv);
  let failClosed = false;
  let reason = null;
  if (!files) {
    try {
      files = gitChangedFiles(process.env.BASE_SHA, process.env.HEAD_SHA);
    } catch (error) {
      failClosed = true;
      reason = error instanceof Error ? error.message : String(error);
      files = [];
    }
  }
  const selected = failClosed
    ? classifyOrFailClosed(files, { error: reason })
    : classifyOrFailClosed(files);
  const lines = [
    `mobile=${selected.mobile ? "true" : "false"}`,
    `workforce=${selected.workforce ? "true" : "false"}`,
    `fail_closed=${selected.failClosed ? "true" : "false"}`,
  ];
  for (const line of lines) {
    console.log(line);
  }
  if (selected.failClosed) {
    console.error(`select-ci-paths fail-closed: ${selected.reason}; running mobile and workforce suites`);
  }
}
