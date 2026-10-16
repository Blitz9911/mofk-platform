#!/usr/bin/env node
/**
 * Offline simulation CLI. No network, no git writes, no live LLM.
 * Usage: node agents/runtime/cli.mjs --fixture agents/runtime/fixtures/maintenance-recommendation-task.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSimulation } from "./src/orchestrator.mjs";

function arg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

const defaultFixture = fileURLToPath(
  new URL("./fixtures/maintenance-recommendation-task.json", import.meta.url),
);
const fixturePath = resolve(arg("--fixture", defaultFixture));
const task = JSON.parse(readFileSync(fixturePath, "utf8"));
const result = runSimulation(task);

const summary = {
  workflow: [
    "CEO Request",
    "Orchestrator",
    "Product Agent",
    "Engineering Agent (read-only)",
    "QA Agent",
    "Cybersecurity Agent",
    "Human Approval Pending",
  ],
  status: result.status,
  state: result.state,
  taskId: result.taskId,
  reason: result.reason,
  operational: result.operational,
  agents: Object.keys(result.outputs || {}),
  auditEvents: result.audit.events.map((event) => event.type),
};

console.log(JSON.stringify({ summary, result }, null, 2));
if (result.status !== "human_approval_pending") {
  process.exitCode = 2;
}
