import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  devicePushTokensTable,
  notificationDeliveriesTable,
  notificationEventsTable,
  notificationPreferencesTable,
  notificationRulesTable,
  notificationsTable,
  vehiclesTable,
} from "@workspace/db";
import { buildNotificationDedupeKey, isUniqueViolation } from "./notification-idempotency.mjs";
import { isExpoPushToken } from "./push-registration-policy.mjs";
import {
  PUSH_TYPES,
  isUatPushProbeEnabled,
  lockScreenCopy,
  parseExpoReceipts,
  parseExpoTickets,
  preferenceAllowsType,
  shouldSkipOptionalPushForQuietHours,
  ticketIdPrefix,
} from "./notification-policy.mjs";
import { sanitizeActionUrl } from "./notification-destinations.mjs";
import { mergeNotificationRules } from "./notification-rules.mjs";
import { buildExpoMessage, fetchExpoReceipts, sendExpoPushMessages } from "./expo-push.mjs";
import { logger } from "../lib/logger";

const defaultPrefs = {
  pushEnabled: true,
  maintenanceEnabled: true,
  recommendationsEnabled: true,
  diagnosticsEnabled: true,
  documentsEnabled: true,
  deviceEnabled: true,
  subscriptionsEnabled: true,
  quietHoursStart: null as number | null,
  quietHoursEnd: null as number | null,
};

export async function assertVehicleOwned(vehicleId: string | null | undefined, userId: string) {
  if (!vehicleId) return true;
  const [row] = await db
    .select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function enqueueNotification(input: {
  userId: string;
  vehicleId?: string | null;
  type: string;
  severity?: string;
  titleAr: string;
  bodyAr?: string | null;
  actionUrl?: string | null;
  sourceKey?: string | null;
  awaitDispatch?: boolean;
}) {
  if (input.vehicleId) {
    const owned = await assertVehicleOwned(input.vehicleId, input.userId);
    if (!owned) {
      logger.warn({ userId: input.userId, vehicleId: input.vehicleId }, "notification skipped: vehicle not owned");
      return { created: false, id: null, reason: "not_owned" as const };
    }
  }

  const dedupeKey = buildNotificationDedupeKey({
    type: input.type,
    vehicleId: input.vehicleId || "na",
    sourceKey: input.sourceKey,
  });
  const [existing] = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, input.userId),
        eq(notificationsTable.dedupeKey, dedupeKey),
        isNull(notificationsTable.supersededAt),
      ),
    )
    .limit(1);
  if (existing) return { created: false, id: existing.id, reason: "duplicate" as const };

  try {
    await db.insert(notificationEventsTable).values({
      userId: input.userId,
      vehicleId: input.vehicleId ?? null,
      eventType: input.type,
      source: "system",
      sourceId: input.sourceKey ?? null,
      payload: { titlePresent: Boolean(input.titleAr) },
    });
  } catch {
    /* events table is additive; inbox insert remains authoritative */
  }

  let row;
  try {
    [row] = await db
      .insert(notificationsTable)
      .values({
        userId: input.userId,
        vehicleId: input.vehicleId ?? null,
        type: input.type,
        severity: input.severity ?? "info",
        titleAr: input.titleAr,
        bodyAr: input.bodyAr ?? null,
        actionUrl: sanitizeActionUrl(input.actionUrl, input.type),
        dedupeKey,
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      const [raced] = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, input.userId),
            eq(notificationsTable.dedupeKey, dedupeKey),
            isNull(notificationsTable.supersededAt),
          ),
        )
        .limit(1);
      return { created: false, id: raced?.id ?? null, reason: "duplicate" as const };
    }
    throw error;
  }

  if (input.awaitDispatch) {
    const dispatch = await dispatchPush(row.id);
    return { created: true, id: row.id, reason: "created" as const, dispatch };
  }

  void dispatchPush(row.id).catch((err) => {
    logger.error({ err, notificationId: row.id }, "push dispatch failed");
  });

  return { created: true, id: row.id, reason: "created" as const };
}

export async function dispatchPush(notificationId: string) {
  const [row] = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.id, notificationId))
    .limit(1);
  if (!row) return { sent: 0, reason: "missing" };

  if (!PUSH_TYPES.has(row.type)) {
    return { sent: 0, reason: "not_push_type" };
  }

  const [prefsRow] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, row.userId))
    .limit(1);
  const prefs = prefsRow ?? defaultPrefs;
  if (!preferenceAllowsType(prefs, row.type)) {
    await db.insert(notificationDeliveriesTable).values({
      notificationId: row.id,
      provider: "expo",
      status: "skipped_unsubscribed",
      attempt: 1,
    });
    return { sent: 0, reason: "unsubscribed" };
  }

  if (shouldSkipOptionalPushForQuietHours(prefs, row.type)) {
    await db.insert(notificationDeliveriesTable).values({
      notificationId: row.id,
      provider: "expo",
      status: "skipped_quiet_hours",
      attempt: 1,
    });
    return { sent: 0, reason: "quiet_hours" };
  }

  const tokens = await db
    .select()
    .from(devicePushTokensTable)
    .where(and(eq(devicePushTokensTable.userId, row.userId), isNull(devicePushTokensTable.disabledAt)));

  if (!tokens.length) {
    await db.insert(notificationDeliveriesTable).values({
      notificationId: row.id,
      provider: "expo",
      status: "skipped_no_device",
      attempt: 1,
    });
    return { sent: 0, reason: "no_device" };
  }

  const messages = tokens.map((tokenRow) =>
    buildExpoMessage({
      token: tokenRow.token,
      type: row.type,
      notificationId: row.id,
      actionUrl: row.actionUrl,
    }),
  );

  const result = await sendExpoPushMessages(messages);
  if (result.skipped) {
    await db.insert(notificationDeliveriesTable).values({
      notificationId: row.id,
      provider: "expo",
      status: "skipped_no_provider",
      errorMessage: result.reason,
      attempt: 1,
    });
    logger.warn({ reason: result.reason }, "expo push skipped");
    return {
      sent: 0,
      reason: result.reason,
      providerAccepted: false,
      tickets: [] as Array<{ status: string; ticketIdPrefix: string | null; error: unknown }>,
    };
  }

  const parsed = parseExpoTickets(result.tickets);
  for (let i = 0; i < tokens.length; i += 1) {
    const ticket = parsed[i] ?? { status: "error", ticketId: null, errorMessage: "missing_ticket", invalid: false };
    await db.insert(notificationDeliveriesTable).values({
      notificationId: row.id,
      tokenId: tokens[i].id,
      provider: "expo",
      ticketId: ticket.ticketId ? String(ticket.ticketId) : null,
      status: String(ticket.status),
      errorMessage: ticket.errorMessage == null ? null : String(ticket.errorMessage),
      attempt: 1,
    });
    if (ticket.invalid) {
      await db
        .update(devicePushTokensTable)
        .set({
          disabledAt: new Date(),
          lastError: ticket.errorMessage == null ? "invalid_token" : String(ticket.errorMessage),
          updatedAt: new Date(),
        })
        .where(eq(devicePushTokensTable.id, tokens[i].id));
    }
  }

  const accepted = parsed.filter((item) => item.status === "accepted").length;
  if (accepted > 0) {
    await db
      .update(notificationsTable)
      .set({ sentAt: new Date() })
      .where(eq(notificationsTable.id, row.id));
  }

  logger.info(
    {
      notificationId: row.id,
      accepted,
      tokens: tokens.length,
      lockScreen: lockScreenCopy(row.type).title,
    },
    "expo push tickets recorded (accepted != device receipt)",
  );

  return {
    sent: accepted,
    reason: "dispatched",
    providerAccepted: accepted > 0,
    tickets: parsed.map((item) => ({
      status: item.status,
      ticketIdPrefix: ticketIdPrefix(item.ticketId),
      error: item.errorMessage ?? null,
    })),
    note: "providerAccepted means Expo accepted the ticket, not that the iPhone displayed it",
  };
}

function summarizeToken(row: typeof devicePushTokensTable.$inferSelect) {
  return {
    platform: row.platform,
    disabled: Boolean(row.disabledAt),
    lastSeenAt: row.lastSeenAt,
    lastError: row.lastError,
  };
}

export async function getPushDiagnostics(userId: string) {
  const tokens = await db
    .select()
    .from(devicePushTokensTable)
    .where(eq(devicePushTokensTable.userId, userId));
  const deliveries = await db
    .select({
      status: notificationDeliveriesTable.status,
      errorMessage: notificationDeliveriesTable.errorMessage,
      ticketId: notificationDeliveriesTable.ticketId,
      receiptStatus: notificationDeliveriesTable.receiptStatus,
      receiptError: notificationDeliveriesTable.receiptError,
      receiptCheckedAt: notificationDeliveriesTable.receiptCheckedAt,
      createdAt: notificationDeliveriesTable.createdAt,
      notificationId: notificationDeliveriesTable.notificationId,
    })
    .from(notificationDeliveriesTable)
    .innerJoin(notificationsTable, eq(notificationsTable.id, notificationDeliveriesTable.notificationId))
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationDeliveriesTable.createdAt))
    .limit(12);

  return {
    probeEnabled: isUatPushProbeEnabled(),
    providerConfigured: Boolean(process.env.EXPO_ACCESS_TOKEN),
    deviceCount: tokens.length,
    activeDeviceCount: tokens.filter((row) => !row.disabledAt).length,
    devices: tokens.map(summarizeToken),
    deliveries: deliveries.map((row) => ({
      notificationId: row.notificationId,
      ticketStatus: row.status,
      ticketIdPrefix: ticketIdPrefix(row.ticketId),
      ticketError: row.errorMessage,
      receiptStatus: row.receiptStatus,
      receiptError: row.receiptError,
      receiptCheckedAt: row.receiptCheckedAt,
      createdAt: row.createdAt,
    })),
    note: "ticket accepted ≠ iPhone receipt. Check receiptStatus after a short wait.",
  };
}

export async function refreshPushReceipts(userId: string) {
  const rows = await db
    .select({
      id: notificationDeliveriesTable.id,
      ticketId: notificationDeliveriesTable.ticketId,
    })
    .from(notificationDeliveriesTable)
    .innerJoin(notificationsTable, eq(notificationsTable.id, notificationDeliveriesTable.notificationId))
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationDeliveriesTable.createdAt))
    .limit(20);
  const ticketIds = rows.map((row) => row.ticketId).filter((id): id is string => Boolean(id));
  const result = await fetchExpoReceipts(ticketIds);
  if (result.skipped) {
    return { ok: false as const, reason: result.reason, receipts: [] as Array<Record<string, unknown>> };
  }
  const parsed = parseExpoReceipts(result.receipts);
  const byTicket = new Map(parsed.map((item) => [item.ticketId, item]));
  for (const row of rows) {
    if (!row.ticketId) continue;
    const receipt = byTicket.get(row.ticketId);
    if (!receipt) continue;
    await db
      .update(notificationDeliveriesTable)
      .set({
        receiptStatus: receipt.status,
        receiptError: receipt.errorMessage ? String(receipt.errorMessage) : null,
        receiptCheckedAt: new Date(),
      })
      .where(eq(notificationDeliveriesTable.id, row.id));
  }
  return {
    ok: true as const,
    receipts: parsed.map((item) => ({
      ticketIdPrefix: ticketIdPrefix(item.ticketId),
      status: item.status,
      error: item.errorMessage ?? null,
    })),
  };
}

export async function sendSelfTestPush(userId: string) {
  if (!isUatPushProbeEnabled()) {
    return { ok: false as const, status: 403 as const, error: "uat_probe_disabled" };
  }
  const result = await enqueueNotification({
    userId,
    type: "push_probe",
    severity: "info",
    titleAr: "إشعار تجريبي",
    bodyAr: "هذا اختبار UAT للمستخدم الحالي فقط. لا يحتوي بيانات مركبة.",
    actionUrl: "/(tabs)",
    sourceKey: `probe:${Date.now()}`,
    awaitDispatch: true,
  });
  return {
    ok: true as const,
    inboxId: result.id,
    created: result.created,
    dispatch: result.dispatch ?? null,
    note: "If the iPhone did not show a banner, treat this as a failed device test even when ticket status is accepted.",
  };
}

export async function upsertPushToken(input: {
  userId: string;
  token: string;
  platform?: string;
  deviceLabel?: string | null;
}) {
  const token = input.token.trim();
  if (!isExpoPushToken(token)) {
    return { ok: false as const, error: "invalid_expo_push_token" };
  }
  const [existing] = await db
    .select()
    .from(devicePushTokensTable)
    .where(and(eq(devicePushTokensTable.userId, input.userId), eq(devicePushTokensTable.token, token)))
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(devicePushTokensTable)
      .set({
        platform: input.platform || existing.platform,
        deviceLabel: input.deviceLabel ?? existing.deviceLabel,
        disabledAt: null,
        lastError: null,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devicePushTokensTable.id, existing.id))
      .returning();
    return { ok: true as const, id: row.id };
  }
  const [row] = await db
    .insert(devicePushTokensTable)
    .values({
      userId: input.userId,
      token,
      platform: input.platform || "unknown",
      deviceLabel: input.deviceLabel ?? null,
    })
    .returning();
  return { ok: true as const, id: row.id };
}

export async function supersedeNotifications(userId: string, types: string[], sourcePrefix?: string) {
  const rows = await db
    .select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      dedupeKey: notificationsTable.dedupeKey,
    })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.supersededAt)));
  const ids = rows
    .filter((row) => types.includes(row.type))
    .filter((row) => (sourcePrefix ? String(row.dedupeKey || "").includes(sourcePrefix) : true))
    .map((row) => row.id);
  for (const id of ids) {
    await db
      .update(notificationsTable)
      .set({ supersededAt: new Date(), isRead: true, readAt: new Date() })
      .where(eq(notificationsTable.id, id));
  }
  return { superseded: ids.length };
}

export async function disablePushToken(userId: string, token: string) {
  await db
    .update(devicePushTokensTable)
    .set({ disabledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(devicePushTokensTable.userId, userId), eq(devicePushTokensTable.token, token)));
}

export async function getNotificationPreferences(userId: string) {
  const [row] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  return row ?? { userId, ...defaultPrefs, unsubscribedAt: null };
}

export async function getNotificationRules(userId: string) {
  try {
    const [row] = await db
      .select()
      .from(notificationRulesTable)
      .where(eq(notificationRulesTable.userId, userId))
      .limit(1);
    return mergeNotificationRules(row?.config ?? {});
  } catch {
    return mergeNotificationRules();
  }
}

export async function saveNotificationPreferences(
  userId: string,
  patch: Partial<{
    pushEnabled: boolean;
    maintenanceEnabled: boolean;
    recommendationsEnabled: boolean;
    diagnosticsEnabled: boolean;
    documentsEnabled: boolean;
    deviceEnabled: boolean;
    subscriptionsEnabled: boolean;
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
  }>,
) {
  const current = await getNotificationPreferences(userId);
  const next = {
    pushEnabled: patch.pushEnabled ?? current.pushEnabled,
    maintenanceEnabled: patch.maintenanceEnabled ?? current.maintenanceEnabled,
    recommendationsEnabled: patch.recommendationsEnabled ?? current.recommendationsEnabled,
    diagnosticsEnabled: patch.diagnosticsEnabled ?? current.diagnosticsEnabled,
    documentsEnabled: patch.documentsEnabled ?? current.documentsEnabled ?? true,
    deviceEnabled: patch.deviceEnabled ?? current.deviceEnabled ?? true,
    subscriptionsEnabled: patch.subscriptionsEnabled ?? current.subscriptionsEnabled ?? true,
    quietHoursStart: patch.quietHoursStart === undefined ? current.quietHoursStart ?? null : patch.quietHoursStart,
    quietHoursEnd: patch.quietHoursEnd === undefined ? current.quietHoursEnd ?? null : patch.quietHoursEnd,
    unsubscribedAt: (patch.pushEnabled === false ? new Date() : null) as Date | null,
    updatedAt: new Date(),
  };
  const [existing] = await db
    .select({ userId: notificationPreferencesTable.userId })
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, userId))
    .limit(1);
  if (existing) {
    await db
      .update(notificationPreferencesTable)
      .set(next)
      .where(eq(notificationPreferencesTable.userId, userId));
  } else {
    await db.insert(notificationPreferencesTable).values({ userId, ...next });
  }
  return { userId, ...next };
}
