import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

/**
 * Provider-independent adapter contract.
 *
 * A ModelAdapter MUST:
 * - declare `id` (string) and `live` (boolean)
 * - implement `complete(request)` synchronously or as a thenable
 * - never perform network I/O in Phase 4A (`live` must be false for usable adapters)
 *
 * complete() receives:
 * {
 *   requestId, agentId, provider, modelId,
 *   messages: [{ role, trust: "trusted"|"untrusted", content }],
 *   budgets, attempt
 * }
 *
 * complete() returns:
 * { text: string, finishReason?: string }  // text is JSON matching model-response schema
 */

export function assertAdapter(adapter) {
  if (!adapter || typeof adapter !== "object") {
    throw createModelError(MODEL_ERROR_CODES.ADAPTER_CONTRACT, "model adapter missing");
  }
  if (typeof adapter.id !== "string" || !adapter.id.trim()) {
    throw createModelError(MODEL_ERROR_CODES.ADAPTER_CONTRACT, "adapter.id required");
  }
  if (typeof adapter.live !== "boolean") {
    throw createModelError(MODEL_ERROR_CODES.ADAPTER_CONTRACT, "adapter.live must be boolean");
  }
  if (typeof adapter.complete !== "function") {
    throw createModelError(MODEL_ERROR_CODES.ADAPTER_CONTRACT, "adapter.complete required");
  }
  return adapter;
}

export function assertOfflineAdapter(adapter) {
  const checked = assertAdapter(adapter);
  if (checked.live === true) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      `live adapter ${checked.id} is disabled in Phase 4A`,
    );
  }
  return checked;
}
