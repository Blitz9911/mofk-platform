export const MODEL_ERROR_CODES = Object.freeze({
  ADAPTER_CONTRACT: "ADAPTER_CONTRACT",
  LIVE_PROVIDER_DISABLED: "LIVE_PROVIDER_DISABLED",
  UNKNOWN_PROVIDER: "UNKNOWN_PROVIDER",
  PROVIDER_FAILURE: "PROVIDER_FAILURE",
  INPUT_BUDGET: "INPUT_BUDGET",
  OUTPUT_BUDGET: "OUTPUT_BUDGET",
  TOKEN_BUDGET: "TOKEN_BUDGET",
  ATTEMPT_BUDGET: "ATTEMPT_BUDGET",
  TIME_BUDGET: "TIME_BUDGET",
  SCHEMA_INVALID: "SCHEMA_INVALID",
  UNAUTHORIZED_TOOL: "UNAUTHORIZED_TOOL",
  MODEL_REFUSAL: "MODEL_REFUSAL",
  PROMPT_CHANNEL_VIOLATION: "PROMPT_CHANNEL_VIOLATION",
});

export function createModelError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  error.failClosed = true;
  Object.assign(error, extra);
  return error;
}

export function asFailClosedResult(error) {
  return {
    ok: false,
    failClosed: true,
    code: error.code || "PROVIDER_FAILURE",
    reason: error.message,
  };
}
