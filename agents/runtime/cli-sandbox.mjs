#!/usr/bin/env node
/**
 * Product-manager sandbox demo. Offline mock by default. No GitHub writes, no app changes.
 * Live provider calls stay disabled unless a future founder-authorized isolated runner is used.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runProductSandboxDemo } from "./src/sandbox-demo.mjs";

const fixturePath = fileURLToPath(
  new URL("./fixtures/maintenance-recommendation-task.json", import.meta.url),
);
const task = JSON.parse(readFileSync(fixturePath, "utf8"));
const result = runProductSandboxDemo(task);

const summary = {
  workflow: ["Synthetic CEO request", "Product Manager sandbox demo", "Human Approval Pending"],
  status: result.status,
  live: result.live,
  operational: result.operational,
  mode: result.mode,
  productRequirements: result.productRequirements,
  acceptanceCriteria: result.acceptanceCriteria,
  assumptionsAndRisks: result.assumptionsAndRisks,
  proposedNextSteps: result.proposedNextSteps,
  humanApproval: result.humanApproval,
  cost: result.cost,
};

console.log(JSON.stringify({ summary, result: { ...result, audit: result.audit } }, null, 2));
if (result.status !== "human_approval_pending") {
  process.exitCode = 2;
}
