import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

export const DEFAULT_BUDGETS = Object.freeze({
  maxInputChars: 12000,
  maxOutputChars: 4000,
  maxAttempts: 2,
  maxDurationMs: 2000,
  estimatedTokenBudget: 4000,
});

export function mergeBudgets(routingBudgets, override) {
  return { ...DEFAULT_BUDGETS, ...(routingBudgets || {}), ...(override || {}) };
}

export function charLength(value) {
  if (value == null) return 0;
  if (typeof value === "string") return value.length;
  return JSON.stringify(value).length;
}

export function estimateTokens(chars) {
  return Math.ceil(chars / 4);
}

export function assertInputBudget(messages, budgets) {
  const chars = charLength(messages);
  if (chars > budgets.maxInputChars) {
    throw createModelError(
      MODEL_ERROR_CODES.INPUT_BUDGET,
      `input size ${chars} exceeds maxInputChars ${budgets.maxInputChars}`,
    );
  }
  const tokens = estimateTokens(chars);
  if (tokens > budgets.estimatedTokenBudget) {
    throw createModelError(
      MODEL_ERROR_CODES.TOKEN_BUDGET,
      `estimated input tokens ${tokens} exceed budget ${budgets.estimatedTokenBudget}`,
    );
  }
  return { chars, tokens };
}

export function assertOutputBudget(raw, budgets, inputTokens) {
  const text = typeof raw === "string" ? raw : raw?.text || "";
  const chars = charLength(text);
  if (chars > budgets.maxOutputChars) {
    throw createModelError(
      MODEL_ERROR_CODES.OUTPUT_BUDGET,
      `output size ${chars} exceeds maxOutputChars ${budgets.maxOutputChars}`,
    );
  }
  const tokens = estimateTokens(chars) + (inputTokens || 0);
  if (tokens > budgets.estimatedTokenBudget) {
    throw createModelError(
      MODEL_ERROR_CODES.TOKEN_BUDGET,
      `estimated tokens ${tokens} exceed budget ${budgets.estimatedTokenBudget}`,
    );
  }
  return { chars, tokens };
}

export function assertAttemptBudget(attempt, budgets) {
  if (attempt > budgets.maxAttempts) {
    throw createModelError(
      MODEL_ERROR_CODES.ATTEMPT_BUDGET,
      `attempt ${attempt} exceeds maxAttempts ${budgets.maxAttempts}`,
    );
  }
}

export function assertDurationBudget(startedAt, now, budgets) {
  const elapsed = now() - startedAt;
  if (elapsed > budgets.maxDurationMs) {
    throw createModelError(
      MODEL_ERROR_CODES.TIME_BUDGET,
      `model duration ${elapsed}ms exceeds maxDurationMs ${budgets.maxDurationMs}`,
    );
  }
  return elapsed;
}
