import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  applyMaintenanceToRecommendations,
  lifecycleEvent,
  mergeLifecycleOntoRecommendation,
} from "./maintenance-engine.mjs";

const STORAGE_KEY = "mfk-recommendation-lifecycle";

let cachedRecommendations: any[] = [];

export function cacheRecommendations(rows: any[]) {
  cachedRecommendations = rows ?? [];
}

export function getCachedRecommendation(id: string) {
  return cachedRecommendations.find((row) => row.id === id) ?? null;
}

export type LifecycleEvent = {
  action: string;
  at: string;
  note?: string | null;
  maintenanceLogId?: string | null;
};

export type LifecycleOverlay = {
  status?: string;
  deferredUntil?: string | null;
  linkedMaintenanceLogId?: string | null;
  linkedMaintenanceItemId?: string | null;
  events?: LifecycleEvent[];
  updatedAt?: string;
};

async function readAll(): Promise<Record<string, LifecycleOverlay>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, LifecycleOverlay>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAll(value: Record<string, LifecycleOverlay>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export async function getLifecycleOverlay() {
  return readAll();
}

export function recStorageKey(rec: { vehicleId: string; kind: string; sourceKey?: string | null; id?: string }) {
  return rec.sourceKey ? `${rec.vehicleId}|${rec.kind}|${rec.sourceKey}` : rec.id || "";
}

export function applyOverlay<T extends Record<string, unknown>>(rec: T, overlay: Record<string, LifecycleOverlay>): T {
  const key = recStorageKey(rec as any);
  const row = overlay[key] || (rec.id ? overlay[String(rec.id)] : undefined);
  if (!row) return rec;
  return mergeLifecycleOntoRecommendation(rec, row) as T;
}

export async function recordRecommendationAction(
  rec: { id?: string; vehicleId: string; kind: string; sourceKey?: string | null; status?: string },
  action: string,
  extra: Partial<LifecycleOverlay> & { note?: string | null } = {},
) {
  const all = await readAll();
  const key = recStorageKey(rec) || String(rec.id);
  const current = all[key] ?? { events: [] };
  const nextStatus =
    extra.status ||
    (action === "defer"
      ? "deferred"
      : action === "dismiss"
        ? "dismissed"
        : action === "in_progress" || action === "link"
          ? "in_progress"
          : current.status || rec.status || "active");
  const event = lifecycleEvent(action, {
    note: extra.note,
    maintenanceLogId: extra.linkedMaintenanceLogId,
  });
  all[key] = {
    ...current,
    ...extra,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    events: [...(current.events ?? []), event],
  };
  if (rec.id) all[rec.id] = all[key];
  await writeAll(all);
  return all[key];
}

export async function applyMaintenanceLogToLifecycle(input: {
  vehicleId: string;
  serviceType: string;
  logId?: string;
  recommendationId?: string | null;
}) {
  const all = await readAll();
  const recs = Object.entries(all).map(([id, overlay]) => ({
    id,
    vehicleId: input.vehicleId,
    kind: "maintenance_due",
    sourceKey: `maintenance:${input.serviceType}`,
    status: overlay.status || "active",
    ...overlay,
  }));
  const next = applyMaintenanceToRecommendations(recs, {
    id: input.logId,
    vehicleId: input.vehicleId,
    serviceType: input.serviceType,
  });
  for (const rec of next) {
    if (rec.status !== "resolved") continue;
    all[rec.id] = {
      ...(all[rec.id] ?? {}),
      status: "resolved",
      linkedMaintenanceLogId: input.logId ?? null,
      updatedAt: new Date().toISOString(),
      events: [
        ...((all[rec.id]?.events as LifecycleEvent[]) ?? []),
        lifecycleEvent("resolved_by_maintenance", { maintenanceLogId: input.logId }),
      ],
    };
  }
  if (input.recommendationId) {
    const overlay = all[input.recommendationId];
    const isDtc = overlay && String((overlay as any).sourceKey || "").startsWith("dtc:");
    if (isDtc) {
      all[input.recommendationId] = {
        ...overlay,
        events: [
          ...(overlay.events ?? []),
          lifecycleEvent("maintenance_logged_dtc_kept_open", { maintenanceLogId: input.logId }),
        ],
        updatedAt: new Date().toISOString(),
      };
    }
  }
  await writeAll(all);
}
