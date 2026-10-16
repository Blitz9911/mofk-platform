import { createAuditLog } from "./audit.mjs";
import { runProductAgent } from "./agents/product.mjs";
import { validateTask } from "./contract.mjs";
import { assertNotKilled } from "./kill-switch.mjs";
import { createLimiter } from "./limits.mjs";
import { invokeSandboxModel } from "./model/invoke-sandbox.mjs";
import { loadSandboxPolicy } from "./model/sandbox-gate.mjs";
import { loadWorkforceRegistry } from "./registry.mjs";
import { asPlainData, assertSyntheticTaskId } from "./sanitize.mjs";

function demoOutput({ task, product, model, audit, extra }) {
  const requirements = [
    product.findings?.[0] || task.objective,
    model.response?.summary || model.reason || "mock product summary",
  ];
  return {
    status: extra.status,
    state: extra.state,
    operational: false,
    live: Boolean(model.live),
    mode: model.live ? "sandbox-live-gated" : "sandbox-mock-offline",
    agentId: "product-manager",
    taskId: task.taskId,
    productRequirements: requirements,
    acceptanceCriteria: task.acceptanceCriteria,
    assumptionsAndRisks: [
      ...(task.nonGoals || []),
      ...(product.risks || []),
      "Model text is untrusted and is not an implementation or approval.",
      "Simulated output is not verification evidence.",
    ],
    proposedNextSteps: [
      ...(model.response?.proposedActions || ["keep the change as a product brief"]),
      "human founder decision on an isolated branch later",
    ],
    humanApproval: {
      pending: extra.status === "human_approval_pending",
      approver: "founder",
      recordedByModel: false,
    },
    cost: model.accounting || null,
    reason: extra.reason || null,
    outputs: { "product-manager": product },
    model,
    audit: audit.report(task),
  };
}

export function runProductSandboxDemo(rawTask, options = {}) {
  const audit = options.audit || createAuditLog({ now: options.now });
  const limiter = options.limiter || createLimiter({ maxSteps: 16, maxMs: 8000, now: options.now });
  const registry = options.registry || loadWorkforceRegistry(options.registryPath);
  const policy = options.sandboxPolicy || loadSandboxPolicy();

  try {
    limiter.tick("sandbox-demo-start");
    assertNotKilled(options);
    if (registry.operational === true) {
      throw new Error("refusing to run while registry.operational is true");
    }
    const task = asPlainData(rawTask);
    const valid = validateTask(task);
    if (!valid.ok) {
      return {
        status: "rejected",
        state: "rejected",
        operational: false,
        live: false,
        reason: valid.errors.join("; "),
        humanApproval: { pending: false, approver: "founder", recordedByModel: false },
        audit: audit.report(task),
      };
    }
    assertSyntheticTaskId(task.taskId);
    audit.record("sandbox_demo_received", { agentId: "product-manager", taskId: task.taskId });

    const model = invokeSandboxModel({
      agentId: "product-manager",
      task,
      registry,
      policy,
      options,
      env: options.env || process.env,
      audit,
      limiter,
      now: options.now,
      transport: options.transport || null,
      quota: options.quota || { openai: 0 },
      killed: options.killed,
      killFile: options.killFile,
    });
    if (!model.ok) {
      audit.record("fail_closed", { reason: model.reason, code: model.code });
      return demoOutput({
        task,
        product: runProductAgent(task),
        model,
        audit,
        extra: { status: "rejected", state: "rejected", reason: model.reason },
      });
    }

    limiter.tick("product-manager");
    const product = runProductAgent(task);
    product.approvalNeeded = true;
    product.metadata = { ...(product.metadata || {}), selfApproved: false, sandboxDemo: true };
    if (product.metadata.selfApproved) {
      return demoOutput({
        task,
        product,
        model,
        audit,
        extra: { status: "rejected", state: "rejected", reason: "self-approval is forbidden" },
      });
    }

    audit.record("human_approval_pending", {
      approver: "founder",
      note: "Sandbox demo cannot approve. Founder approval is independent of model text.",
    });
    return demoOutput({
      task,
      product,
      model,
      audit,
      extra: { status: "human_approval_pending", state: "human_approval_pending" },
    });
  } catch (error) {
    const killed = error.code === "RUNTIME_KILLED";
    audit.record(killed ? "killed" : "failed", { reason: error.message, code: error.code || null });
    return {
      status: killed ? "killed" : "failed",
      state: killed ? "killed" : "failed",
      operational: false,
      live: false,
      reason: error.message,
      humanApproval: { pending: false, approver: "founder", recordedByModel: false },
      audit: audit.report(rawTask),
    };
  }
}
