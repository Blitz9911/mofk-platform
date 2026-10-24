import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, notificationsTable, vehiclesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import {
  disablePushToken,
  getNotificationPreferences,
  getNotificationRules,
  getPushDiagnostics,
  refreshPushReceipts,
  saveNotificationPreferences,
  sendSelfTestPush,
  upsertPushToken,
} from "../services/notification-orchestrator";
import { cronSecretFromRequest, runDueNotificationScan } from "../services/notification-due-job";
import { verifyCronSecret } from "../services/notification-policy.mjs";
import { categoryForType, sanitizeActionUrl } from "../services/notification-destinations.mjs";
import { authorizeNotificationDestination } from "../services/push-registration-policy.mjs";

const router: IRouter = Router();

function boolField(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function intField(value: unknown) {
  if (value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23) return value;
  return undefined;
}

router.get("/notifications", async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const unreadOnly = req.query.unread === "true";
  const category = typeof req.query.category === "string" ? req.query.category : null;

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, req.userId), isNull(notificationsTable.supersededAt)))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(200);

  const filtered = rows.filter((row) => {
    if (unreadOnly && row.isRead) return false;
    if (category && categoryForType(row.type) !== category) return false;
    return true;
  });
  const page = filtered.slice(offset, offset + limit);
  res.json({
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      category: categoryForType(row.type),
      severity: row.severity,
      titleAr: row.titleAr,
      bodyAr: row.bodyAr,
      actionUrl: sanitizeActionUrl(row.actionUrl, row.type),
      isRead: row.isRead,
      createdAt: row.createdAt,
      vehicleId: row.vehicleId,
    })),
    total: filtered.length,
    unreadCount: filtered.filter((row) => !row.isRead).length,
    limit,
    offset,
  });
});

router.post("/notifications", requireAuth, async (_req, res): Promise<void> => {
  res.status(403).json({ error: "client_notification_insert_forbidden" });
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notificationsTable.userId, req.userId));
  res.json({ ok: true });
});

router.post("/devices/push-token", requireAuth, async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const result = await upsertPushToken({
    userId: req.userId,
    token,
    platform: typeof req.body?.platform === "string" ? req.body.platform : undefined,
    deviceLabel: typeof req.body?.deviceLabel === "string" ? req.body.deviceLabel : null,
  });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.status(201).json({ ok: true, id: result.id });
});

router.delete("/devices/push-token", requireAuth, async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  if (!token) {
    res.status(400).json({ error: "token required" });
    return;
  }
  await disablePushToken(req.userId, token);
  res.json({ ok: true });
});

router.get("/notifications/push-status", requireAuth, async (req, res): Promise<void> => {
  res.json(await getPushDiagnostics(req.userId));
});

router.post("/notifications/push-receipts", requireAuth, async (req, res): Promise<void> => {
  const result = await refreshPushReceipts(req.userId);
  if (!result.ok) {
    res.status(503).json({ error: result.reason });
    return;
  }
  res.json(result);
});

router.post("/notifications/self-test", requireAuth, async (req, res): Promise<void> => {
  const result = await sendSelfTestPush(req.userId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json(result);
});

router.get("/notifications/preferences", requireAuth, async (req, res): Promise<void> => {
  const [prefs, rules] = await Promise.all([
    getNotificationPreferences(req.userId),
    getNotificationRules(req.userId),
  ]);
  res.json({ ...prefs, rules });
});

router.patch("/notifications/preferences", requireAuth, async (req, res): Promise<void> => {
  const saved = await saveNotificationPreferences(req.userId, {
    pushEnabled: boolField(req.body?.pushEnabled),
    maintenanceEnabled: boolField(req.body?.maintenanceEnabled),
    recommendationsEnabled: boolField(req.body?.recommendationsEnabled),
    diagnosticsEnabled: boolField(req.body?.diagnosticsEnabled),
    documentsEnabled: boolField(req.body?.documentsEnabled),
    deviceEnabled: boolField(req.body?.deviceEnabled),
    subscriptionsEnabled: boolField(req.body?.subscriptionsEnabled),
    quietHoursStart: intField(req.body?.quietHoursStart),
    quietHoursEnd: intField(req.body?.quietHoursEnd),
  });
  res.json(saved);
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [row] = await db
    .update(notificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId)))
    .returning({ id: notificationsTable.id });
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ ok: true });
});

router.get("/notifications/:id/destination", requireAuth, async (req, res): Promise<void> => {
  const id = String(req.params.id);
  const [row] = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  let ownerUserId: string | null = null;
  let vehicleDeleted = false;
  if (row.vehicleId) {
    const [vehicle] = await db
      .select({ id: vehiclesTable.id, userId: vehiclesTable.userId })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, row.vehicleId))
      .limit(1);
    vehicleDeleted = !vehicle;
    ownerUserId = vehicle?.userId ?? null;
  }
  const dest = authorizeNotificationDestination({
    authenticated: true,
    viewerUserId: req.userId,
    ownerUserId,
    vehicleDeleted,
    actionUrl: row.actionUrl,
    sanitize: (url: string | null | undefined) => sanitizeActionUrl(url, row.type),
  });
  res.json({ actionUrl: dest.actionUrl, fallback: dest.ok ? undefined : dest.reason });
});

router.post("/jobs/notifications-due", async (req, res): Promise<void> => {
  const expected = process.env.MFK_CRON_SECRET || process.env.CRON_SECRET;
  const provided = cronSecretFromRequest(req.headers["x-mfk-cron-secret"]);
  const auth = verifyCronSecret(provided, expected);
  if (!auth.ok) {
    res.status(auth.reason === "cron_secret_unconfigured" ? 503 : 401).json({ error: auth.reason });
    return;
  }
  const result = await runDueNotificationScan();
  res.json({
    ok: true,
    ...result,
    note: "created counts inbox+dispatch attempts; Expo accepted tickets are not device receipts",
  });
});

export default router;
