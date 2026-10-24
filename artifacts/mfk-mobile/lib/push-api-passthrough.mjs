import { clientApiOrigin, resolvePushPassthrough } from "./api-environment.mjs";

export const PUSH_API_PATHS = [
  "/api/devices/push-token",
  "/api/notifications/self-test",
  "/api/notifications/push-status",
  "/api/notifications/push-receipts",
  "/api/notifications/preferences",
];

export function publicApiBaseUrl(env = process.env) {
  return clientApiOrigin(env);
}

export function shouldPassthroughPushApi(path, apiBase, env = process.env) {
  const nextEnv = {
    ...env,
    EXPO_PUBLIC_API_BASE_URL: apiBase === undefined ? env.EXPO_PUBLIC_API_BASE_URL : apiBase,
  };
  return Boolean(resolvePushPassthrough(path, nextEnv).passthrough);
}
