import { and, eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { notificationDedupeKey } from "./vehicle-health-engine.mjs";

export async function enqueueNotification(input: {
  userId: string;
  vehicleId?: string | null;
  type: string;
  severity?: string;
  titleAr: string;
  bodyAr?: string | null;
  actionUrl?: string | null;
  sourceKey?: string | null;
}) {
  const dedupeKey = notificationDedupeKey({
    type: input.type,
    vehicleId: input.vehicleId || "na",
    sourceKey: input.sourceKey,
  });
  const [existing] = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(eq(notificationsTable.userId, input.userId), eq(notificationsTable.dedupeKey, dedupeKey)),
    )
    .limit(1);
  if (existing) return { created: false, id: existing.id };

  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId: input.userId,
      vehicleId: input.vehicleId ?? null,
      type: input.type,
      severity: input.severity ?? "info",
      titleAr: input.titleAr,
      bodyAr: input.bodyAr ?? null,
      actionUrl: input.actionUrl ?? null,
      dedupeKey,
    })
    .returning();
  return { created: true, id: row.id };
}
