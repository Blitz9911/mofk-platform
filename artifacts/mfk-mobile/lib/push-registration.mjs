export function shouldPersistPushToken({ status, payload } = {}) {
  if (!Number.isInteger(status) || status < 200 || status >= 300) return false;
  if (!payload || payload.ok !== true) return false;
  return payload.persisted !== false;
}
