import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";
import { estimateTokens } from "./budgets.mjs";

export function providerRates(provider) {
  if (provider?.inputUsdPer1kTokens == null || provider?.outputUsdPer1kTokens == null) {
    return null;
  }
  const input = Number(provider.inputUsdPer1kTokens);
  const output = Number(provider.outputUsdPer1kTokens);
  if (!(input >= 0) || !(output >= 0) || Number.isNaN(input) || Number.isNaN(output)) {
    return null;
  }
  return { input, output };
}

export function estimateUpperBoundUsd({ inputChars, maxOutputChars, rates, tokenBudget }) {
  if (!rates) {
    throw createModelError(
      MODEL_ERROR_CODES.COST_UNKNOWN,
      "estimated upper-bound cost cannot be established; live run refused",
    );
  }
  const inputTokens = estimateTokens(inputChars || 0);
  const outputTokens = estimateTokens(maxOutputChars || 0);
  const totalTokens = inputTokens + outputTokens;
  if (tokenBudget && totalTokens > tokenBudget) {
    throw createModelError(
      MODEL_ERROR_CODES.TOKEN_BUDGET,
      `estimated tokens ${totalTokens} exceed budget ${tokenBudget}`,
    );
  }
  const usd = (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
  return {
    inputTokens,
    outputTokens,
    estimatedUsd: Number(usd.toFixed(6)),
    known: true,
  };
}

export function observeCostUsd({ promptTokens, completionTokens, rates }) {
  if (!rates) {
    return { observedUsd: null, known: false, promptTokens, completionTokens };
  }
  const usd =
    ((promptTokens || 0) / 1000) * rates.input + ((completionTokens || 0) / 1000) * rates.output;
  return {
    observedUsd: Number(usd.toFixed(6)),
    known: true,
    promptTokens: promptTokens || 0,
    completionTokens: completionTokens || 0,
  };
}

export function assertSpendBudget(estimatedUsd, maxSpendUsd) {
  if (typeof estimatedUsd !== "number" || Number.isNaN(estimatedUsd)) {
    throw createModelError(
      MODEL_ERROR_CODES.COST_UNKNOWN,
      "estimated upper-bound cost cannot be established; live run refused",
    );
  }
  if (estimatedUsd > maxSpendUsd) {
    throw createModelError(
      MODEL_ERROR_CODES.COST_BUDGET,
      `estimated $${estimatedUsd} exceeds maxSpendUsd ${maxSpendUsd}`,
    );
  }
}

export function assertProviderQuota(used, maxRequests) {
  if (used + 1 > maxRequests) {
    throw createModelError(
      MODEL_ERROR_CODES.QUOTA_EXCEEDED,
      `provider request quota exceeded (${used + 1}/${maxRequests})`,
    );
  }
}
