const AREAS = new Set([
  "product",
  "mobile",
  "api",
  "obd",
  "recommendations",
  "infra",
  "workforce-docs",
]);
const TIERS = new Set(["L0", "L1", "L2", "L3", "L4"]);
const OUTPUT_FIELDS = [
  "taskId",
  "agentId",
  "findings",
  "actions",
  "evidence",
  "risks",
  "testsRun",
  "approvalNeeded",
  "nextAgentIds",
  "nextSteps",
];

export function validateTask(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["task must be an object"] };
  if (typeof raw.taskId !== "string" || !raw.taskId.startsWith("synthetic-")) {
    errors.push("taskId must start with synthetic-");
  }
  if (typeof raw.title !== "string" || !raw.title.trim()) errors.push("title required");
  if (!AREAS.has(raw.area)) errors.push("area invalid");
  if (typeof raw.objective !== "string" || !raw.objective.trim()) errors.push("objective required");
  if (!Array.isArray(raw.acceptanceCriteria) || raw.acceptanceCriteria.length < 1) {
    errors.push("acceptanceCriteria required");
  }
  if (!TIERS.has(raw.riskTier)) errors.push("riskTier invalid");
  if (!Array.isArray(raw.sensitiveChanges)) errors.push("sensitiveChanges must be an array");
  if (!["ceo", "human", "synthetic"].includes(raw.requester)) errors.push("requester invalid");
  if (raw.source && raw.source !== "synthetic") errors.push("source must be synthetic");
  return { ok: errors.length === 0, errors };
}

export function validateAgentOutput(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["output must be an object"] };
  for (const field of OUTPUT_FIELDS) {
    if (!(field in raw)) errors.push(`missing ${field}`);
  }
  if (raw.testsRun && !Array.isArray(raw.testsRun)) errors.push("testsRun must be an array");
  if (raw.nextAgentIds && !Array.isArray(raw.nextAgentIds)) errors.push("nextAgentIds must be an array");
  return { ok: errors.length === 0, errors };
}

export function agentOutput(partial) {
  return {
    taskId: partial.taskId,
    agentId: partial.agentId,
    findings: partial.findings ?? [],
    actions: partial.actions ?? [],
    evidence: partial.evidence ?? [],
    risks: partial.risks ?? [],
    testsRun: partial.testsRun ?? [],
    approvalNeeded: Boolean(partial.approvalNeeded),
    nextAgentIds: partial.nextAgentIds ?? [],
    nextSteps: partial.nextSteps ?? [],
    metadata: partial.metadata ?? {},
  };
}
