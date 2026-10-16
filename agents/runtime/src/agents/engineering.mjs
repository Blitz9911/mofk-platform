import { agentOutput } from "../contract.mjs";

export function runEngineeringAgent(task) {
  const proposed = {
    readOnly: true,
    writesFiles: false,
    executesShell: false,
    summary: `Propose (do not apply) a scoped change for: ${task.title}`,
    candidatePaths: ["artifacts/mfk-mobile/lib/maintenance-engine.mjs"],
    approach: [
      "Keep scheduled/upcoming/overdue evaluation in the existing engine.",
      "Do not call OBD Mode 04 or live GATT writes.",
      "Do not apply SQL or touch production credentials.",
    ],
    rollback: "No repository files are written in simulation, so rollback is a no-op.",
  };
  return agentOutput({
    taskId: task.taskId,
    agentId: "software-engineer",
    findings: ["read-only proposal only", "no workspace mutation"],
    actions: ["drafted technical proposal", "refused to execute shell or patch files"],
    evidence: [{ type: "technical_proposal", proposed }],
    risks: ["proposal is not an approved implementation"],
    testsRun: [],
    approvalNeeded: true,
    nextAgentIds: ["qa-automation", "cybersecurity"],
    nextSteps: ["independent QA", "independent cybersecurity"],
    metadata: { role: "software-engineer", readOnly: true, selfApproved: false },
  });
}
