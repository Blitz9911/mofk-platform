import { agentOutput } from "../contract.mjs";

export function runQaAgent(task, { skipEvidence = false } = {}) {
  const testsRun = [
    {
      name: "qa-recommendations-schedule (synthetic matrix)",
      status: "not_tested",
      executed: false,
      note: "Simulation does not invoke application tests. Status stays Not tested.",
    },
  ];
  return agentOutput({
    taskId: task.taskId,
    agentId: "qa-automation",
    findings: [
      "independent of the implementer",
      "no unexecuted case marked Pass",
    ],
    actions: ["produced regression matrix", "did not approve the change"],
    evidence: skipEvidence
      ? []
      : [
          {
            type: "qa_matrix",
            items: [
              { case: "oil 80k->90k scheduled", result: "not_tested" },
              { case: "resolved overlay does not hide next interval", result: "not_tested" },
            ],
          },
        ],
    risks: ["tests were not executed in simulation"],
    testsRun,
    approvalNeeded: true,
    nextAgentIds: ["cybersecurity"],
    nextSteps: ["cybersecurity review", "human decision"],
    metadata: { role: "qa-automation", independent: true, selfApproved: false },
  });
}
