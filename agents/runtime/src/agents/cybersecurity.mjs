import { agentOutput } from "../contract.mjs";

export function runCybersecurityAgent(task, { skipEvidence = false } = {}) {
  return agentOutput({
    taskId: task.taskId,
    agentId: "cybersecurity",
    findings: [
      "runtime has no GitHub write token",
      "runtime has no LLM or production network client",
      "L3/L4 remain fail-closed for humans",
    ],
    actions: ["threat review of the synthetic proposal", "did not rotate credentials"],
    evidence: skipEvidence
      ? []
      : [
          {
            type: "threat_review",
            riskTier: task.riskTier,
            denied: [
              "production_deploy",
              "live_obd_write",
              "secret_exfiltration",
              "auto_merge",
            ],
          },
        ],
    risks: task.riskTier === "L0" || task.riskTier === "L1" ? ["low simulation risk"] : ["human approval required"],
    testsRun: [],
    approvalNeeded: true,
    nextAgentIds: [],
    nextSteps: ["human founder decision; AI cannot approve"],
    metadata: { role: "cybersecurity", independent: true, selfApproved: false },
  });
}
