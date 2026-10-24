export function isExpoPushToken(token) {
  return typeof token === "string" && (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
}

export function evaluatePushRegistration({
  osAvailable = false,
  permissionGranted = false,
  projectId,
  token,
} = {}) {
  if (!osAvailable) return { ok: false, reason: "unavailable" };
  if (!permissionGranted) return { ok: false, reason: "denied" };
  if (!projectId) return { ok: false, reason: "missing_project_id" };
  if (!token) return { ok: false, reason: "empty_token" };
  if (!isExpoPushToken(token)) return { ok: false, reason: "invalid_expo_push_token" };
  return { ok: true, reason: "ready" };
}

export function accountSwitchTokenAction({ previousUserId, nextUserId, hasToken }) {
  if (!nextUserId) {
    return { unregister: Boolean(hasToken), register: false, reason: "logged_out" };
  }
  if (previousUserId && previousUserId !== nextUserId) {
    return { unregister: Boolean(hasToken), register: true, reason: "account_switch" };
  }
  return { unregister: false, register: true, reason: "same_account" };
}

export function authorizeNotificationDestination({
  authenticated,
  viewerUserId,
  ownerUserId,
  vehicleDeleted,
  actionUrl,
  sanitize,
} = {}) {
  if (!authenticated || !viewerUserId) {
    return { ok: false, actionUrl: "/welcome", reason: "unauthenticated" };
  }
  if (vehicleDeleted) {
    return { ok: false, actionUrl: "/notifications", reason: "deleted_vehicle" };
  }
  if (ownerUserId && ownerUserId !== viewerUserId) {
    return { ok: false, actionUrl: "/notifications", reason: "not_owned" };
  }
  const next = typeof sanitize === "function" ? sanitize(actionUrl) : actionUrl || "/notifications";
  return { ok: true, actionUrl: next, reason: "authorized" };
}
