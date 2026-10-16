import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

const DEFAULT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../contracts/sandbox-policy.json",
);

export function loadSandboxPolicy(policyPath) {
  const raw = JSON.parse(readFileSync(policyPath || DEFAULT_PATH, "utf8"));
  if (raw.liveProvidersEnabled === true && policyPath == null) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      "committed sandbox-policy.json must keep liveProvidersEnabled false",
    );
  }
  return raw;
}

export function expectedFounderApproval(taskId) {
  return `sandbox-approve:product-manager:${taskId}`;
}

export function envFlagEnabled(env, name) {
  return env?.[name] === "1";
}

/**
 * Founder approval is an env/option string compared before any model call.
 * Model output cannot satisfy this check.
 */
export function assertSandboxAuthorization({
  options = {},
  task,
  agentId,
  policy,
  env = process.env,
} = {}) {
  if (agentId && !(policy.allowedAgents || []).includes(agentId)) {
    throw createModelError(
      MODEL_ERROR_CODES.UNAUTHORIZED_ROLE,
      `sandbox live path allows only ${policy.allowedAgents.join(", ")}`,
    );
  }
  if (policy.syntheticTasksOnly !== false && !String(task?.taskId || "").startsWith("synthetic-")) {
    throw createModelError(MODEL_ERROR_CODES.LIVE_RUN_NOT_AUTHORIZED, "sandbox allows synthetic tasks only");
  }
  if (policy.liveProvidersEnabled !== true) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      "live providers are disabled by sandbox policy",
    );
  }
  if (policy.requireExplicitAuthorization !== false && options.authorizeLiveSandbox !== true) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_RUN_NOT_AUTHORIZED,
      "missing explicit live-run authorization",
    );
  }
  if (!envFlagEnabled(env, policy.requireLiveRunEnv)) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_RUN_NOT_AUTHORIZED,
      `${policy.requireLiveRunEnv} is not 1`,
    );
  }
  const expected = expectedFounderApproval(task.taskId);
  const fromEnv = env?.[policy.requireFounderApprovalEnv];
  const fromOptions = options.founderApproval;
  if (!fromEnv || fromEnv !== expected || fromOptions !== expected || fromOptions !== fromEnv) {
    throw createModelError(
      MODEL_ERROR_CODES.FOUNDER_APPROVAL_INVALID,
      "founder approval missing or does not match the synthetic task independently of model output",
    );
  }
  return { ok: true, expected };
}
