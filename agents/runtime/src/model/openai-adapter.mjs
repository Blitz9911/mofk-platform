import { assertAdapter } from "./adapter.mjs";
import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";
import { parseProviderHttpResult } from "./provider-response.mjs";
import { readApiKey, redactSecretsInText } from "./secrets.mjs";

function mapMessages(messages) {
  return (messages || []).map((row) => ({
    role: row.role,
    content: row.content,
  }));
}

/**
 * OpenAI Chat Completions adapter. Network is injected via `transport`.
 * The default constructor does not call fetch.
 */
export class OpenAIChatAdapter {
  constructor({
    transport = null,
    env = process.env,
    providerConfig,
    requestTimeoutMs = 8000,
    maxResponseBytes = 16384,
  } = {}) {
    this.id = "openai";
    this.live = true;
    this.transport = transport;
    this.env = env;
    this.providerConfig = providerConfig;
    this.requestTimeoutMs = requestTimeoutMs;
    this.maxResponseBytes = maxResponseBytes;
    assertAdapter(this);
  }

  complete(request) {
    if (request?.sandboxAuthorized !== true) {
      throw createModelError(
        MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
        "OpenAI adapter refused: sandbox is not authorized",
      );
    }
    const allowed = this.providerConfig?.allowedModels || [];
    if (!allowed.includes(request.modelId)) {
      throw createModelError(
        MODEL_ERROR_CODES.UNKNOWN_MODEL,
        `model ${request.modelId} is not on the OpenAI allow-list`,
      );
    }
    if (this.providerConfig?.enabled !== true) {
      throw createModelError(
        MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
        "OpenAI provider is disabled in sandbox policy",
      );
    }
    const apiKey = readApiKey(this.env, this.providerConfig.apiKeyEnv);
    if (!apiKey) {
      throw createModelError(
        MODEL_ERROR_CODES.MISSING_CREDENTIALS,
        `missing environment secret ${this.providerConfig.apiKeyEnv}`,
      );
    }
    if (typeof this.transport !== "function") {
      throw createModelError(
        MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
        "no transport configured; Phase 4B does not call fetch by default",
      );
    }
    let result;
    try {
      result = this.transport({
        url: this.providerConfig.baseUrl,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: request.modelId,
          temperature: 0,
          max_tokens: 800,
          messages: mapMessages(request.messages),
        }),
        timeoutMs: this.requestTimeoutMs,
      });
    } catch (error) {
      const safe = redactSecretsInText(error.message, [apiKey]);
      if (error.code === MODEL_ERROR_CODES.TIMEOUT || error.timedOut) {
        throw createModelError(MODEL_ERROR_CODES.TIMEOUT, "provider request timed out");
      }
      throw createModelError(MODEL_ERROR_CODES.PROVIDER_FAILURE, safe || "provider transport failed");
    }
    if (result && typeof result.then === "function") {
      throw createModelError(
        MODEL_ERROR_CODES.ADAPTER_CONTRACT,
        "async provider transports are not enabled in the default Phase 4B path",
      );
    }
    return parseProviderHttpResult(result, { maxResponseBytes: this.maxResponseBytes });
  }
}

/**
 * Real fetch is not constructed unless the isolated runner sets both the option
 * and MFK_SANDBOX_ALLOW_REAL_NETWORK=1. Tests must never set that flag.
 */
export function createRealFetchTransport({ allowRealNetwork = false, env = process.env } = {}) {
  if (allowRealNetwork !== true || env.MFK_SANDBOX_ALLOW_REAL_NETWORK !== "1") {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      "real fetch transport is not constructed without host-isolated founder authorization",
    );
  }
  return function forbiddenUntilIsolatedRunner() {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      "this checkout still refuses to invoke global fetch; use a host-isolated runner after founder approval",
    );
  };
}
