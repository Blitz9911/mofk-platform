#!/usr/bin/env node
/**
 * Agent path guard.
 *
 * Fails a PR from an agent branch (agent/<agentId>/<taskId>) when it touches
 * a file outside that agent's writablePaths, or any protectedPaths entry.
 * The workflow runs this script and reads the registry from the PR *base*
 * commit, so a branch cannot loosen its own rules.
 *
 * Read-only: runs `git diff --name-only` and nothing else. No secrets.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const AGENT_BRANCH = /^agent\/([a-z][a-z0-9-]*)\/([A-Za-z0-9._-]+)$/;

export function globToRegExp(pattern, { caseInsensitive = false } = {}) {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        const atSegmentStart = i === 0 || pattern[i - 1] === "/";
        if (atSegmentStart && pattern[i + 2] === "/") {
          // "**/": zero or more directories
          out += "(?:.*/)?";
          i += 2;
        } else {
          out += ".*";
          i += 1;
        }
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`, caseInsensitive ? "i" : "");
}

export function matchesAny(file, patterns, options) {
  return patterns.find((pattern) => globToRegExp(pattern, options).test(file)) ?? null;
}

/**
 * @returns {{ ok: boolean, agentId: string | null, messages: string[], violations: object[] }}
 */
export function evaluate({ registry, branch, author, agentAppLogin, files }) {
  const messages = [];
  const violations = [];
  const match = AGENT_BRANCH.exec(branch ?? "");

  if (!match) {
    if (branch?.startsWith("agent/")) {
      return {
        ok: false,
        agentId: null,
        messages: [`Branch ${branch} starts with agent/ but is not agent/<agentId>/<taskId>.`],
        violations,
      };
    }
    if (agentAppLogin && author && author.toLowerCase() === agentAppLogin.toLowerCase()) {
      return {
        ok: false,
        agentId: null,
        messages: [`PR author ${author} is the agent app but the branch ${branch} is not agent/<agentId>/<taskId>.`],
        violations,
      };
    }
    messages.push(`Not an agent branch (${branch}). Human review rules apply; no path restriction.`);
    return { ok: true, agentId: null, messages, violations };
  }

  const agentId = match[1];
  const agent = registry.agents?.find((candidate) => candidate.id === agentId);
  if (!agent) {
    return { ok: false, agentId, messages: [`Unknown agent id ${agentId}.`], violations };
  }

  const writable = agent.maxLevel === "L0" ? [] : agent.writablePaths ?? [];
  const protectedPaths = registry.protectedPaths ?? [];

  for (const file of files) {
    const hit = protectedPaths.find((entry) =>
      globToRegExp(entry.pattern, { caseInsensitive: true }).test(file),
    );
    if (hit) {
      violations.push({
        file,
        rule: "protected",
        pattern: hit.pattern,
        operation: hit.operation,
        reason: hit.reason,
      });
      continue;
    }
    if (!matchesAny(file, writable)) {
      violations.push({ file, rule: "not-writable", pattern: null, operation: null, reason: `outside ${agentId} writablePaths` });
    }
  }

  if (agent.maxLevel === "L0" && files.length > 0) {
    messages.push(`${agentId} is L0 (read-only) and may not change files.`);
  }
  messages.push(`${agentId}: ${files.length} changed file(s), ${violations.length} violation(s).`);
  return { ok: violations.length === 0, agentId, messages, violations };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    args[key.slice(2)] = argv[i + 1];
    i++;
  }
  return args;
}

function changedFiles(repo, base, head) {
  const output = execFileSync(
    "git",
    ["-C", repo, "diff", "--name-only", "--no-renames", "-z", `${base}...${head}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return output.split("\0").filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(readFileSync(args.registry, "utf8"));
  const branch = args.branch ?? "";
  let files = [];
  if (args.files) {
    files = args.files.split(",");
  } else if (branch.startsWith("agent/")) {
    try {
      files = changedFiles(args.repo, args.base, args.head);
    } catch (error) {
      console.error(`FAIL agent path guard: could not diff ${args.base}...${args.head}: ${error.stderr || error.message}`);
      process.exit(1);
    }
  }

  const result = evaluate({
    registry,
    branch,
    author: args.author,
    agentAppLogin: args["agent-login"],
    files,
  });

  const lines = [...result.messages];
  for (const v of result.violations) {
    lines.push(
      v.rule === "protected"
        ? `DENY ${v.file} — protected (${v.pattern}) needs human ${v.operation}: ${v.reason}`
        : `DENY ${v.file} — ${v.reason}`,
    );
  }
  lines.push(result.ok ? "PASS agent path guard" : "FAIL agent path guard");
  for (const line of lines) (line.startsWith("DENY") || line.startsWith("FAIL") ? console.error : console.log)(line);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Agent path guard\n\n${lines.map((l) => `- ${l}`).join("\n")}\n`);
  }
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
