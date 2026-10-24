const ROUTINE = new Set(["disconnect", "reconnect", "scan_timeout"]);
const LOCAL = new Set(["pair_error", "permission", "incompatible"]);
const SERVER = new Set(["pair_success", "binding_error"]);

export function evaluateObdConnectionEvent(eventType) {
  if (ROUTINE.has(eventType)) {
    return { inbox: false, local: false, serverPush: false, reason: "routine_ble" };
  }
  return {
    inbox: LOCAL.has(eventType) || SERVER.has(eventType),
    local: LOCAL.has(eventType),
    serverPush: SERVER.has(eventType),
    reason: eventType,
  };
}
