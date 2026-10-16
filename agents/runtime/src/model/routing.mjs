import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

const DEFAULT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../contracts/model-routing.json",
);

export function loadModelRouting(routingPath) {
  const raw = JSON.parse(readFileSync(routingPath || DEFAULT_PATH, "utf8"));
  if (raw.liveProvidersEnabled === true) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      "liveProvidersEnabled must remain false in Phase 4A",
    );
  }
  if (!raw.providers?.mock || raw.providers.mock.enabled !== true || raw.providers.mock.live === true) {
    throw createModelError(
      MODEL_ERROR_CODES.ADAPTER_CONTRACT,
      "mock provider must be the only enabled offline provider",
    );
  }
  for (const [name, provider] of Object.entries(raw.providers || {})) {
    if (name === "mock") continue;
    if (provider.enabled === true || provider.live !== true) {
      throw createModelError(
        MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
        `provider ${name} must stay live and disabled`,
      );
    }
  }
  return raw;
}

export function resolveRoute(routing, agentId) {
  const route = routing.roleRoutes?.[agentId] || {
    provider: routing.defaultProvider || "mock",
    modelId: `mock-${agentId}`,
  };
  const provider = routing.providers?.[route.provider];
  if (!provider) {
    throw createModelError(
      MODEL_ERROR_CODES.UNKNOWN_PROVIDER,
      `unknown model provider ${route.provider}`,
    );
  }
  if (provider.live === true || route.provider !== "mock" || routing.liveProvidersEnabled === true) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      `provider ${route.provider} is not permitted (live disabled by default)`,
    );
  }
  if (provider.enabled !== true) {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      `provider ${route.provider} is disabled`,
    );
  }
  return {
    agentId,
    provider: route.provider,
    modelId: route.modelId,
    kind: provider.kind,
    live: false,
    enabled: true,
  };
}
