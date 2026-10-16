import { asPlainData, assertSyntheticTaskId } from "./sanitize.mjs";
import { validateAgentOutput, validateTask } from "./contract.mjs";
import { agentMayAct, assertSimulationRole, loadWorkforceRegistry } from "./registry.mjs";
import { assertNotKilled } from "./kill-switch.mjs";
import { createLimiter } from "./limits.mjs";
import { STATES, transition } from "./state-machine.mjs";
import { createAuditLog } from "./audit.mjs";
import { assertEvidenceForApproval, denyIfUnauthorized } from "./policy-engine.mjs";
import { runProductAgent } from "./agents/product.mjs";
import { runEngineeringAgent } from "./agents/engineering.mjs";
import { runQaAgent } from "./agents/qa.mjs";
import { runCybersecurityAgent } from "./agents/cybersecurity.mjs";
import { invokeModelForAgent } from "./model/invoke.mjs";
import { createMockAdapter } from "./model/mock-adapter.mjs";

const PIPELINE = [
  { id: "product-manager", run: runProductAgent, from: STATES.ROUTED, to: STATES.PRODUCT_COMPLETE },
  {
    id: "software-engineer",
    run: runEngineeringAgent,
    from: STATES.PRODUCT_COMPLETE,
    to: STATES.ENGINEERING_PROPOSED,
  },
  { id: "qa-automation", run: runQaAgent, from: STATES.ENGINEERING_PROPOSED, to: STATES.QA_ASSESSED },
  {
    id: "cybersecurity",
    run: runCybersecurityAgent,
    from: STATES.QA_ASSESSED,
    to: STATES.SECURITY_ASSESSED,
  },
];

function finish(status, state, task, audit, extra = {}) {
  return {
    status,
    state,
    taskId: task?.taskId ?? null,
    operational: false,
    mode: "deterministic-offline",
    outputs: extra.outputs || {},
    reason: extra.reason || null,
    limits: extra.limits || null,
    model: extra.model || { enabled: false, live: false, provider: "none" },
    audit: audit.report(task),
  };
}

export function runSimulation(rawTask, options = {}) {
  const audit = options.audit || createAuditLog({ now: options.now });
  const limiter =
    options.limiter ||
    createLimiter({
      ...options.limits,
      maxSteps: options.limits?.maxSteps ?? (options.useModelAdapter ? 24 : 12),
    });
  const registry = options.registry || loadWorkforceRegistry(options.registryPath);

  try {
    limiter.tick("start");
    assertNotKilled(options);
    const task = asPlainData(rawTask);
    const valid = validateTask(task);
    if (!valid.ok) {
      audit.record("task_rejected", { reason: valid.errors.join("; ") });
      return finish("rejected", STATES.REJECTED, task, audit, {
        reason: valid.errors.join("; "),
        limits: limiter.snapshot(),
      });
    }
    assertSyntheticTaskId(task.taskId);
    if (registry.operational === true) {
      throw new Error("refusing to run while registry.operational is true in this simulation build");
    }

    let state = STATES.RECEIVED;
    audit.record("task_received", { taskId: task.taskId, requester: task.requester });

    const denied = denyIfUnauthorized(task, registry);
    if (!denied.ok) {
      state = transition(state, STATES.REJECTED);
      audit.record("policy_denied", { reason: denied.reason });
      return finish("rejected", state, task, audit, {
        reason: denied.reason,
        limits: limiter.snapshot(),
      });
    }
    audit.record("policy_classified", denied.classified);

    limiter.tick("route");
    assertNotKilled(options);
    state = transition(state, STATES.ROUTED);
    audit.record("routed", {
      pipeline: PIPELINE.map((step) => step.id),
      orchestrator: "orchestrator",
    });

    const outputs = {};
    const modelCalls = [];
    const modelEnabled = options.useModelAdapter === true;
    for (const step of PIPELINE) {
      limiter.tick(step.id);
      assertNotKilled(options);
      assertSimulationRole(step.id);
      if (!agentMayAct(registry, step.id, "grant_approval")) {
        /* grant_approval is orchestrator-forbidden; implementers also cannot approve */
      }
      if (options.forbiddenAgentId === step.id) {
        throw new Error(`role ${step.id} is not permitted for this run`);
      }
      if (modelEnabled) {
        const invoked = invokeModelForAgent({
          agentId: step.id,
          task,
          registry,
          adapter: options.modelAdapter || createMockAdapter(options.modelScenario),
          routing: options.modelRouting,
          budgets: options.modelBudgets,
          audit,
          limiter,
          now: options.now,
          scenario: options.modelScenario,
          killed: options.killed,
          killFile: options.killFile,
        });
        modelCalls.push(invoked.auditMeta);
        if (!invoked.ok) {
          state = transition(state, STATES.REJECTED);
          audit.record("fail_closed", { reason: invoked.reason, code: invoked.code });
          return finish("rejected", state, task, audit, {
            reason: invoked.reason,
            outputs,
            limits: limiter.snapshot(),
            model: { enabled: true, live: false, provider: "mock", calls: modelCalls },
          });
        }
      }
      const output = step.run(task, options.agentOptions?.[step.id] || {});
      const outputValid = validateAgentOutput(output);
      if (!outputValid.ok) {
        state = transition(state, STATES.FAILED);
        audit.record("invalid_output", { agentId: step.id, errors: outputValid.errors });
        return finish("failed", state, task, audit, {
          reason: outputValid.errors.join("; "),
          outputs,
          limits: limiter.snapshot(),
        });
      }
      if (output.metadata?.selfApproved) {
        state = transition(state, STATES.REJECTED);
        audit.record("self_approval_denied", { agentId: step.id });
        return finish("rejected", state, task, audit, {
          reason: "self-approval is forbidden",
          outputs,
          limits: limiter.snapshot(),
        });
      }
      outputs[step.id] = output;
      state = transition(state, step.to);
      audit.record("handoff", {
        agentId: step.id,
        state,
        nextAgentIds: output.nextAgentIds,
      });
    }

    limiter.tick("evidence-gate");
    const evidence = assertEvidenceForApproval({
      qa: outputs["qa-automation"],
      cybersecurity: outputs.cybersecurity,
      classified: denied.classified,
    });
    if (!evidence.ok) {
      state = transition(state, STATES.REJECTED);
      audit.record("fail_closed", { reason: evidence.reason });
      return finish("rejected", state, task, audit, {
        reason: evidence.reason,
        outputs,
        limits: limiter.snapshot(),
      });
    }

    limiter.tick("human-gate");
    state = transition(state, STATES.HUMAN_APPROVAL_PENDING);
    audit.record("human_approval_pending", {
      approver: "founder",
      note: "AI cannot approve. L3/L4 remain fail-closed.",
    });
    return finish("human_approval_pending", state, task, audit, {
      outputs,
      limits: limiter.snapshot(),
      model: {
        enabled: modelEnabled,
        live: false,
        provider: modelEnabled ? "mock" : "none",
        calls: modelCalls,
      },
    });
  } catch (error) {
    const killed = error.code === "RUNTIME_KILLED";
    audit.record(killed ? "killed" : "failed", {
      reason: error.message,
      code: error.code || null,
    });
    return finish(killed ? "killed" : "failed", killed ? STATES.KILLED : STATES.FAILED, rawTask, audit, {
      reason: error.message,
      limits: limiter.snapshot(),
    });
  }
}
