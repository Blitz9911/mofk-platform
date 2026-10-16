import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";
import { parseAndValidateModelOutput } from "./schema.mjs";

export function classifyHttpStatus(status) {
  if (status === 429) return MODEL_ERROR_CODES.RATE_LIMIT;
  if (status === 408 || status === 504) return MODEL_ERROR_CODES.TIMEOUT;
  if (status >= 500) return MODEL_ERROR_CODES.PROVIDER_UNAVAILABLE;
  if (status >= 400) return MODEL_ERROR_CODES.PROVIDER_FAILURE;
  return null;
}

export function parseProviderHttpResult(result, { maxResponseBytes } = {}) {
  if (result?.timedOut) {
    throw createModelError(MODEL_ERROR_CODES.TIMEOUT, "provider request timed out");
  }
  const bytes = result?.bytes ?? Buffer.byteLength(String(result?.bodyText || ""), "utf8");
  if (maxResponseBytes && bytes > maxResponseBytes) {
    throw createModelError(
      MODEL_ERROR_CODES.OVERSIZE_RESPONSE,
      `provider response ${bytes} bytes exceeds ${maxResponseBytes}`,
    );
  }
  const status = result?.status ?? 0;
  const classified = classifyHttpStatus(status);
  if (classified) {
    throw createModelError(classified, `provider HTTP ${status}`, { httpStatus: status });
  }
  let payload;
  try {
    payload = typeof result.body === "object" && result.body ? result.body : JSON.parse(result.bodyText);
  } catch {
    throw createModelError(MODEL_ERROR_CODES.SCHEMA_INVALID, "provider body is not JSON");
  }
  const message = payload?.choices?.[0]?.message || {};
  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    throw createModelError(
      MODEL_ERROR_CODES.UNAUTHORIZED_TOOL,
      "provider tool_calls are rejected",
    );
  }
  if (message.function_call) {
    throw createModelError(
      MODEL_ERROR_CODES.UNAUTHORIZED_TOOL,
      "provider function_call is rejected",
    );
  }
  const content = message.content;
  const parsed = parseAndValidateModelOutput({ text: content });
  return {
    parsed,
    usage: payload.usage || {},
    finishReason: payload?.choices?.[0]?.finish_reason || null,
  };
}
