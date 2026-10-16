import { agentOutput } from "../contract.mjs";

export function runProductAgent(task) {
  return agentOutput({
    taskId: task.taskId,
    agentId: "product-manager",
    findings: [
      `Objective: ${task.objective}`,
      `Area: ${task.area}`,
      `Non-goals: ${(task.nonGoals || []).join("; ") || "none stated"}`,
    ],
    actions: ["wrote acceptance criteria from the synthetic request", "did not implement code"],
    evidence: [
      {
        type: "acceptance_criteria",
        items: task.acceptanceCriteria,
      },
    ],
    risks: task.sensitiveChanges?.length ? task.sensitiveChanges : ["none"],
    testsRun: [],
    approvalNeeded: false,
    nextAgentIds: ["software-engineer"],
    nextSteps: ["engineering proposes a read-only technical plan"],
    metadata: { role: "product-manager", readOnly: true },
  });
}
