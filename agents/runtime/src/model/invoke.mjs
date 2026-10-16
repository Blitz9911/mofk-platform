import { assertNotKilled } from "../kill-switch.mjs";
import { assertOfflineAdapter } from "./adapter.mjs";
import { modelAuditMetadata, digest } from "./audit-meta.mjs";
import {
  assertAttemptBudget,
  assertDurationBudget,
  assertInputBudget,
  assertOutputBudget,
  mergeBudgets,
} from "./budgets.mjs";
import { asFailClosedResult, createModelError, MODEL_ERROR_CODES } from "./errors.mjs";
import { parseAndValidateModelOutput } from "./schema.mjs";
import { createMockAdapter } from "./mock-adapter.mjs";
import { buildPrompt } from "./prompt.mjs";
import { loadModelRouting, resolveRoute } from "./routing.mjs";

function snapshotMeta(partial) {
  return modelAuditMetadata(partial);
}

export function invokeModelForAgent({
  agentId,
  task,
  registry,
  adapter,
  routing,
  budgets,
  audit,
  limiter,
  now = Date.now,
  scenario,
  ...killOptions
} = {}) {
  const startedAt = now();
  try {
    assertNotKilled(killOptions);
    const policy = routing || loadModelRouting();
    const route = resolveRoute(policy, agentId);
    const resolvedAdapter = assertOfflineAdapter(adapter || createMockAdapter(scenario));
    const limits = mergeBudgets(policy.budgets, budgets);
    const prompt = buildPrompt({ agentId, task, registry, routing: policy });
    const input = assertInputBudget(prompt.messages, limits);
    const trustedDigest = digest(prompt.messages[0].content);
    const untrustedDigest = digest(prompt.messages[1].content);

    let lastError = null;
    for (let attempt = 1; attempt <= limits.maxAttempts; attempt += 1) {
      assertAttemptBudget(attempt, limits);
      limiter?.tick(`model:${agentId}:${attempt}`);
      assertNotKilled(killOptions);
      assertDurationBudget(startedAt, now, limits);
      try {
        const raw = resolvedAdapter.complete({
          requestId: `${task?.taskId || "synthetic"}:${agentId}:${attempt}`,
          agentId,
          provider: route.provider,
          modelId: route.modelId,
          messages: prompt.messages,
          budgets: limits,
          attempt,
          scenario,
        });
        if (raw && typeof raw.then === "function") {
          throw createModelError(
            MODEL_ERROR_CODES.ADAPTER_CONTRACT,
            "async adapters are not enabled in Phase 4A",
          );
        }
        const output = assertOutputBudget(raw, limits, input.tokens);
        const parsed = parseAndValidateModelOutput(raw);
        const meta = snapshotMeta({
          agentId,
          provider: route.provider,
          modelId: route.modelId,
          outcome: parsed.kind === "refusal" ? "refused" : "validated",
          code: parsed.kind === "refusal" ? MODEL_ERROR_CODES.MODEL_REFUSAL : null,
          attempt,
          inputChars: input.chars,
          outputChars: output.chars,
          estimatedTokens: output.tokens,
          trustedDigest,
          untrustedDigest,
        });
        audit?.record("model_invoked", meta);
        if (parsed.kind === "refusal") {
          return {
            ok: false,
            failClosed: true,
            code: MODEL_ERROR_CODES.MODEL_REFUSAL,
            reason: parsed.refusalReason || "model refused",
            auditMeta: meta,
          };
        }
        return { ok: true, failClosed: false, response: parsed, auditMeta: meta };
      } catch (error) {
        if (error.code === "RUNTIME_KILLED" || error.code === "STEP_LIMIT" || error.code === "TIME_LIMIT") {
          throw error;
        }
        lastError = error;
        const retryable = error.code === MODEL_ERROR_CODES.PROVIDER_FAILURE && attempt < limits.maxAttempts;
        if (!retryable) break;
      }
    }
    if (!lastError) {
      lastError = createModelError(MODEL_ERROR_CODES.ATTEMPT_BUDGET, "no model attempt succeeded");
    }
    const meta = snapshotMeta({
      agentId,
      provider: route.provider,
      modelId: route.modelId,
      outcome: "fail_closed",
      code: lastError.code || MODEL_ERROR_CODES.PROVIDER_FAILURE,
      attempt: limits.maxAttempts,
      inputChars: input.chars,
      outputChars: 0,
      estimatedTokens: input.tokens,
      trustedDigest,
      untrustedDigest,
    });
    audit?.record("model_fail_closed", meta);
    return { ...asFailClosedResult(lastError), auditMeta: meta };
  } catch (error) {
    if (error.code === "RUNTIME_KILLED" || error.code === "STEP_LIMIT" || error.code === "TIME_LIMIT") {
      throw error;
    }
    const meta = snapshotMeta({
      agentId,
      provider: "none",
      modelId: "none",
      outcome: "fail_closed",
      code: error.code || MODEL_ERROR_CODES.PROVIDER_FAILURE,
      attempt: 0,
      inputChars: 0,
      outputChars: 0,
      estimatedTokens: 0,
      trustedDigest: digest(""),
      untrustedDigest: digest(""),
    });
    audit?.record("model_fail_closed", meta);
    return { ...asFailClosedResult(error), auditMeta: meta };
  }
}
