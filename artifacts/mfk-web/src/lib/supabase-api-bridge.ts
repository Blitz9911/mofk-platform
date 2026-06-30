// 1) Add this type near the other row types.
type NotificationRow = {
  id: string;
  user_id: string;
  vehicle_id?: string | null;
  type: string;
  severity: string;
  title_ar: string;
  body_ar?: string | null;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  dedupe_key?: string | null;
  created_at?: string;
};

// 2) Add these helpers before handleRequest.
function toNotification(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id ?? null,
    type: row.type,
    severity: row.severity,
    titleAr: row.title_ar,
    bodyAr: row.body_ar ?? null,
    actionUrl: row.action_url ?? null,
    isRead: row.is_read,
    readAt: row.read_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    createdAt: row.created_at,
  };
}

async function listNotificationRows(accessToken: string) {
  return supabaseRequest<NotificationRow[]>(
    "/rest/v1/notifications?select=*&order=created_at.desc&limit=50",
    { method: "GET" },
    accessToken,
  );
}

async function createNotificationIfMissing(
  accessToken: string,
  payload: {
    userId: string;
    vehicleId?: string | null;
    type: string;
    severity: string;
    titleAr: string;
    bodyAr?: string | null;
    actionUrl?: string | null;
    dedupeKey?: string | null;
  },
) {
  if (payload.dedupeKey) {
    const existing = await supabaseRequest<Pick<NotificationRow, "id">[]>(
      `/rest/v1/notifications?select=id&dedupe_key=eq.${encodeURIComponent(payload.dedupeKey)}&limit=1`,
      { method: "GET" },
      accessToken,
    );

    if (existing.length > 0) return null;
  }

  const rows = await supabaseRequest<NotificationRow[]>(
    "/rest/v1/notifications?select=*",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: payload.userId,
        vehicle_id: payload.vehicleId ?? null,
        type: payload.type,
        severity: payload.severity,
        title_ar: payload.titleAr,
        body_ar: payload.bodyAr ?? null,
        action_url: payload.actionUrl ?? null,
        dedupe_key: payload.dedupeKey ?? null,
      }),
    },
    accessToken,
  );

  return rows[0] ?? null;
}

async function generateMaintenanceNotifications(accessToken: string, userId: string) {
  const rows = await listMaintenanceLogs(accessToken);
  const items = buildMaintenanceItems(rows).filter((item: any) => {
    return item.isRecommendation && (item.status === "overdue" || item.status === "upcoming");
  });

  for (const item of items) {
    const isOverdue = item.status === "overdue";
    const title = isOverdue
      ? `${item.serviceTypeAr || item.serviceType} متأخرة`
      : `${item.serviceTypeAr || item.serviceType} قريبة`;

    const dedupeKey = [
      "maintenance",
      item.vehicleId,
      item.serviceType,
      item.status,
      item.nextDueKm ?? item.nextDueAt ?? "na",
    ].join(":");

    await createNotificationIfMissing(accessToken, {
      userId,
      vehicleId: item.vehicleId,
      type: "recommendation",
      severity: isOverdue ? "critical" : "warning",
      titleAr: title,
      bodyAr: item.recommendationReason || "توجد توصية صيانة تحتاج مراجعتك.",
      actionUrl: "/app/recommendations",
      dedupeKey,
    });
  }
}

async function handleNotifications(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const session = await requireSession();

  if (path === "/api/notifications" && method === "GET") {
    await generateMaintenanceNotifications(session.access_token, session.user.id);
    const rows = await listNotificationRows(session.access_token);
    return { handled: true, data: rows.map(toNotification) };
  }

  if (path === "/api/notifications" && method === "POST") {
    const body = await readJsonBody(input, init);

    const row = await createNotificationIfMissing(session.access_token, {
      userId: session.user.id,
      vehicleId: typeof body.vehicleId === "string" ? body.vehicleId : null,
      type: String(body.type ?? "system"),
      severity: String(body.severity ?? "info"),
      titleAr: String(body.titleAr ?? "تنبيه"),
      bodyAr: typeof body.bodyAr === "string" ? body.bodyAr : null,
      actionUrl: typeof body.actionUrl === "string" ? body.actionUrl : null,
      dedupeKey: typeof body.dedupeKey === "string" ? body.dedupeKey : null,
    });

    return { handled: true, data: row ? toNotification(row) : { ok: true }, status: 201 };
  }

  if (path === "/api/notifications/read-all" && method === "PATCH") {
    await supabaseRequest(
      "/rest/v1/notifications?is_read=eq.false",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
      },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  const readMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (readMatch && method === "PATCH") {
    const id = decodeURIComponent(readMatch[1]);

    await supabaseRequest(
      `/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
      },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  const deleteMatch = path.match(/^\/api\/notifications\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const id = decodeURIComponent(deleteMatch[1]);

    await supabaseRequest(
      `/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE" },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  return { handled: false };
}

// 3) Add this inside handleRequest after /api/healthz and before vehicles.
// const notificationResult = await handleNotifications(path, method, input, init);
// if (notificationResult.handled) return notificationResult;

// 4) Optional: after successful fuel POST, add a notification like this:
// await createNotificationIfMissing(session.access_token, {
//   userId: session.user.id,
//   vehicleId,
//   type: "fuel",
//   severity: "success",
//   titleAr: "تم تسجيل تعبئة بنزين",
//   bodyAr: `تم تسجيل ${Number(rows[0].liters).toFixed(2)} لتر بقيمة ${(rows[0].total_cost_halalas / 100).toFixed(2)} ر.س`,
//   actionUrl: "/app/fuel",
//   dedupeKey: `fuel:${rows[0].id}`,
// });
