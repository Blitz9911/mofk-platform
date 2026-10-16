import { assertNotKilled } from "../kill-switch.mjs";
import { modelAuditMetadata, digest } from "./audit-meta.mjs";
import { assertDurationBudget, assertInputBudget, mergeBudgets } from "./budgets.mjs";
import {
  assertProviderQuota,
  assertSpendBudget,
  estimateUpperBoundUsd,
  observeCostUsd,
  providerRates,
} from "./cost.mjs";
import { asFailClosedResult, createModelError, MODEL_ERROR_CODES } from "./errors.mjs";
import { invokeModelForAgent } from "./invoke.mjs";
import { createMockAdapter } from "./mock-adapter.mjs";
import { OpenAIChatAdapter } from "./openai-adapter.mjs";
import { buildPrompt } from "./prompt.mjs";
import { loadSandboxPolicy, assertSandboxAuthorization } from "./sandbox-gate.mjs";
import { redactSecretsInText } from "./secrets.mjs";

function accounting({ estimated, observed, requests, partial, outcome, code }) {
  return {
    requests,
    estimatedUsd: estimated?.estimatedUsd ?? null,
    observedUsd: observed?.observedUsd ?? null,
    partial: Boolean(partial),
    outcome,
    code: code || null,
    knownEstimate: estimated?.known === true,
  };
}

export function invokeSandboxModel({
  agentId = "product-manager",
  task,
  registry,
  policy,
  options = {},
  env = process.env,
  audit,
  limiter,
  now = Date.now,
  transport = null,
  quota = { openai: 0 },
  ...killOptions
} = {}) {
  const startedAt = now();
  const sandbox = policy || loadSandboxPolicy();
  const provider = sandbox.providers?.openai;
  const liveRequested = options.live === true || options.authorizeLiveSandbox === true;

  if (!liveRequested) {
    const mock = invokeModelForAgent({
      agentId,
      task,
      registry,
      adapter: options.modelAdapter || createMockAdapter(options.modelScenario || "product-demo"),
      audit,
      limiter,
      now,
      scenario: options.modelScenario || "product-demo",
      ...killOptions,
    });
    return {
      ...mock,
      live: false,
      provider: "mock",
      accounting: accounting({
        estimated: { estimatedUsd: 0, known: true },
        observed: { observedUsd: 0 },
        requests: 0,
        partial: false,
        outcome: mock.ok ? "mock" : "fail_closed",
        code: mock.code,
      }),
    };
  }

  try {
    assertNotKilled(killOptions);
    assertSandboxAuthorization({ options, task, agentId, policy: sandbox, env });
    limiter?.tick("sandbox-live");
    assertDurationBudget(startedAt, now, { maxDurationMs: sandbox.requestTimeoutMs || 8000 });

    const retriesEnabled = sandbox.retriesEnabled === true && options.allowRetries === true;
    if (options.allowRetries === true && sandbox.retriesEnabled !== true) {
      throw createModelError(
        MODEL_ERROR_CODES.RETRY_DISABLED,
        "retries are disabled by default in the live sandbox",
      );
    }
    const maxAttempts = retriesEnabled ? 1 + (sandbox.maxRetriesIfEnabled || 0) : 1;

    const prompt = buildPrompt({ agentId, task, registry });
    const limits = mergeBudgets(
      { maxInputChars: 12000, maxOutputChars: sandbox.maxOutputChars, estimatedTokenBudget: sandbox.estimatedTokenBudget },
      options.budgets,
    );
    const input = assertInputBudget(prompt.messages, limits);
    const rates = providerRates(provider);
    const estimated = estimateUpperBoundUsd({
      inputChars: input.chars,
      maxOutputChars: sandbox.maxOutputChars,
      rates,
      tokenBudget: sandbox.estimatedTokenBudget,
    });
    assertSpendBudget(estimated.estimatedUsd, sandbox.maxSpendUsd);
    assertProviderQuota(quota.openai || 0, sandbox.maxRequestsPerProvider);

    const adapter = new OpenAIChatAdapter({
      transport,
      env,
      providerConfig: provider,
      requestTimeoutMs: sandbox.requestTimeoutMs,
      maxResponseBytes: sandbox.maxResponseBytes,
    });

    let lastError = null;
    let lastObserved = { observedUsd: null };
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      quota.openai = (quota.openai || 0) + 1;
      try {
        const parsedHttp = adapter.complete({
          requestId: `${task.taskId}:${agentId}:${attempt}`,
          agentId,
          provider: "openai",
          modelId: options.modelId || provider.allowedModels[0],
          messages: prompt.messages,
          budgets: limits,
          attempt,
          sandboxAuthorized: true,
        });
        lastObserved = observeCostUsd({
          promptTokens: parsedHttp.usage?.prompt_tokens,
          completionTokens: parsedHttp.usage?.completion_tokens,
          rates,
        });
        const meta = modelAuditMetadata({
          agentId,
          provider: "openai",
          modelId: options.modelId || provider.allowedModels[0],
          outcome: parsedHttp.parsed.kind === "refusal" ? "refused" : "validated",
          code: parsedHttp.parsed.kind === "refusal" ? MODEL_ERROR_CODES.MODEL_REFUSAL : null,
          attempt,
          inputChars: input.chars,
          outputChars: String(JSON.stringify(parsedHttp.parsed)).length,
          estimatedTokens: estimated.inputTokens + estimated.outputTokens,
          trustedDigest: digest(prompt.messages[0].content),
          untrustedDigest: digest(prompt.messages[1].content),
        });
        meta.live = true;
        meta.cost = accounting({
          estimated,
          observed: lastObserved,
          requests: quota.openai,
          partial: false,
          outcome: parsedHttp.parsed.kind,
        });
        audit?.record("sandbox_model_invoked", meta);
        if (parsedHttp.parsed.kind === "refusal") {
          return {
            ok: false,
            failClosed: true,
            live: true,
            provider: "openai",
            code: MODEL_ERROR_CODES.MODEL_REFUSAL,
            reason: parsedHttp.parsed.refusalReason || "model refused",
            auditMeta: meta,
            accounting: meta.cost,
          };
        }
        return {
          ok: true,
          live: true,
          provider: "openai",
          response: parsedHttp.parsed,
          auditMeta: meta,
          accounting: meta.cost,
        };
      } catch (error) {
        if (error.code === "RUNTIME_KILLED" || error.code === "STEP_LIMIT" || error.code === "TIME_LIMIT") {
          throw error;
        }
        lastError = error;
        lastObserved = observeCostUsd({
          promptTokens: estimated.inputTokens,
          completionTokens: 0,
          rates,
        });
        const retryable =
          retriesEnabled &&
          error.code === MODEL_ERROR_CODES.PROVIDER_UNAVAILABLE &&
          attempt < maxAttempts;
        if (!retryable) break;
      }
    }
    const fail = asFailClosedResult(
      lastError || createModelError(MODEL_ERROR_CODES.PROVIDER_FAILURE, "sandbox live call failed"),
    );
    fail.reason = redactSecretsInText(fail.reason);
    fail.live = true;
    fail.provider = "openai";
    fail.accounting = accounting({
      estimated,
      observed: lastObserved,
      requests: quota.openai,
      partial: true,
      outcome: "fail_closed",
      code: fail.code,
    });
    audit?.record("sandbox_model_fail_closed", {
      ...fail.accounting,
      storedPrompt: false,
      storedSecrets: false,
      live: true,
    });
    return fail;
  } catch (error) {
    if (error.code === "RUNTIME_KILLED" || error.code === "STEP_LIMIT" || error.code === "TIME_LIMIT") {
      throw error;
    }
    const fail = asFailClosedResult(error);
    fail.live = false;
    fail.provider = "openai";
    fail.accounting = accounting({
      estimated: null,
      observed: null,
      requests: quota.openai || 0,
      partial: true,
      outcome: "fail_closed",
      code: fail.code,
    });
    audit?.record("sandbox_model_fail_closed", {
      ...fail.accounting,
      storedPrompt: false,
      storedSecrets: false,
    });
    return fail;
  }
}
