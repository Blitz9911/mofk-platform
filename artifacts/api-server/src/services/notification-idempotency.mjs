import { notificationDedupeKey as engineDedupeKey } from "./vehicle-health-engine.mjs";

export function buildNotificationDedupeKey({ type, vehicleId, sourceKey }) {
  return engineDedupeKey({ type, vehicleId: vehicleId || "na", sourceKey });
}

export function isUniqueViolation(error) {
  const code = error?.code || error?.cause?.code;
  if (code === "23505") return true;
  return /duplicate key|unique constraint|idx_notifications_active_dedupe/i.test(String(error?.message || ""));
}

/** Keep the oldest active row per (userId, dedupeKey); later rows become superseded. */
export function collapseDuplicateInboxRows(rows = [], now = new Date()) {
  const groups = new Map();
  for (const row of rows) {
    if (!row?.dedupeKey || row.supersededAt) continue;
    const key = `${row.userId}::${row.dedupeKey}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const keepIds = new Set();
  const supersedeIds = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => {
      const at = new Date(a.createdAt || 0).getTime();
      const bt = new Date(b.createdAt || 0).getTime();
      if (at !== bt) return at - bt;
      return String(a.id).localeCompare(String(b.id));
    });
    keepIds.add(sorted[0].id);
    for (const extra of sorted.slice(1)) supersedeIds.push(extra.id);
  }
  return {
    keepIds: [...keepIds],
    superseded: supersedeIds.map((id) => ({ id, supersededAt: now, isRead: true })),
  };
}

export function createActiveDedupeIndex() {
  const held = new Map();
  return {
    has(userId, dedupeKey) {
      return held.has(`${userId}::${dedupeKey}`);
    },
    insert(userId, dedupeKey, id) {
      const key = `${userId}::${dedupeKey}`;
      if (held.has(key)) {
        const error = new Error("duplicate key value violates unique constraint idx_notifications_active_dedupe");
        error.code = "23505";
        throw error;
      }
      held.set(key, id);
      return id;
    },
    release(userId, dedupeKey) {
      held.delete(`${userId}::${dedupeKey}`);
    },
    get(userId, dedupeKey) {
      return held.get(`${userId}::${dedupeKey}`) ?? null;
    },
  };
}

export async function enqueueWithActiveIndex(index, input, { yieldBeforeInsert = false } = {}) {
  const dedupeKey = buildNotificationDedupeKey(input);
  const existing = index.get(input.userId, dedupeKey);
  if (existing) return { created: false, id: existing, reason: "duplicate", dedupeKey };
  if (yieldBeforeInsert) await Promise.resolve();
  try {
    const id = input.id || `n-${Math.random().toString(16).slice(2)}`;
    index.insert(input.userId, dedupeKey, id);
    return { created: true, id, reason: "created", dedupeKey };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { created: false, id: index.get(input.userId, dedupeKey), reason: "duplicate", dedupeKey };
    }
    throw error;
  }
}

export async function runConcurrentEnqueue(index, input, workers = 12) {
  const results = await Promise.all(
    Array.from({ length: workers }, () => enqueueWithActiveIndex(index, input, { yieldBeforeInsert: true })),
  );
  const created = results.filter((row) => row.created);
  const ids = [...new Set(results.map((row) => row.id))];
  return { created: created.length, duplicate: results.length - created.length, ids, results };
}
