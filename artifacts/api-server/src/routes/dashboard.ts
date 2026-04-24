import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  dtcCodesTable,
  maintenanceTable,
  bookingsTable,
  diagnosticSessionsTable,
  activityTable,
  healthHistoryTable,
} from "@workspace/db";
import {
  GetDashboardOverviewResponse,
  GetRecentActivityResponse,
  GetRecentActivityQueryParams,
  GetHealthTrendResponse,
} from "@workspace/api-zod";
import { DEMO_USER_ID } from "../lib/demo";

const router: IRouter = Router();

router.get("/dashboard/overview", async (_req, res): Promise<void> => {
  const userId = DEMO_USER_ID;
  const vehicles = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.userId, userId));

  const vehicleIds = vehicles.map((v) => v.id);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  let activeDtcs: { id: string; severity: string }[] = [];
  let upcomingMaint: { id: string; status: string }[] = [];
  let upcomingBookings: { id: string }[] = [];
  let recentSessions: { id: string; odometerKm: number | null }[] = [];

  if (vehicleIds.length > 0) {
    activeDtcs = await db
      .select({ id: dtcCodesTable.id, severity: dtcCodesTable.severity })
      .from(dtcCodesTable)
      .where(
        and(
          inArray(dtcCodesTable.vehicleId, vehicleIds),
          eq(dtcCodesTable.status, "active"),
        ),
      );
    upcomingMaint = await db
      .select({
        id: maintenanceTable.id,
        status: maintenanceTable.status,
      })
      .from(maintenanceTable)
      .where(
        and(
          inArray(maintenanceTable.vehicleId, vehicleIds),
          inArray(maintenanceTable.status, ["upcoming", "overdue", "scheduled"]),
        ),
      );
    upcomingBookings = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.userId, userId),
          inArray(bookingsTable.status, ["pending", "confirmed"]),
          gte(bookingsTable.scheduledAt, new Date()),
        ),
      );
    recentSessions = await db
      .select({
        id: diagnosticSessionsTable.id,
        odometerKm: diagnosticSessionsTable.odometerKm,
      })
      .from(diagnosticSessionsTable)
      .where(
        and(
          eq(diagnosticSessionsTable.userId, userId),
          gte(diagnosticSessionsTable.startedAt, since30),
        ),
      );
  }

  const avgHealth =
    vehicles.length > 0
      ? Math.round(
          vehicles.reduce((s, v) => s + (v.healthScore ?? 0), 0) /
            vehicles.length,
        )
      : 0;

  const overdue = upcomingMaint.filter((m) => m.status === "overdue").length;
  const critical = activeDtcs.filter(
    (d) => d.severity === "critical" || d.severity === "high",
  ).length;

  const odoSum = recentSessions.reduce(
    (s, r) => s + (r.odometerKm ?? 0),
    0,
  );

  res.json(
    GetDashboardOverviewResponse.parse({
      vehicleCount: vehicles.length,
      activeDtcCount: activeDtcs.length,
      criticalDtcCount: critical,
      upcomingMaintenanceCount: upcomingMaint.length,
      overdueMaintenanceCount: overdue,
      avgHealthScore: avgHealth,
      upcomingBookingCount: upcomingBookings.length,
      totalSessionsLast30d: recentSessions.length,
      kmDrivenLast30d: Math.max(0, odoSum > 0 ? 850 : 0),
      estimatedSavingsSar: 1240,
    }),
  );
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.userId, DEMO_USER_ID))
    .orderBy(desc(activityTable.occurredAt))
    .limit(params.data.limit);

  res.json(
    GetRecentActivityResponse.parse(
      rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        titleAr: r.titleAr,
        subtitleAr: r.subtitleAr,
        vehicleId: r.vehicleId,
        severity: r.severity,
        occurredAt: r.occurredAt,
      })),
    ),
  );
});

router.get("/dashboard/health-trend", async (_req, res): Promise<void> => {
  const userId = DEMO_USER_ID;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const rows = await db
    .select({
      date: healthHistoryTable.date,
      score: sql<number>`avg(${healthHistoryTable.score})::int`,
    })
    .from(healthHistoryTable)
    .innerJoin(
      vehiclesTable,
      eq(vehiclesTable.id, healthHistoryTable.vehicleId),
    )
    .where(
      and(
        eq(vehiclesTable.userId, userId),
        gte(healthHistoryTable.date, since.toISOString().slice(0, 10)),
      ),
    )
    .groupBy(healthHistoryTable.date)
    .orderBy(healthHistoryTable.date);

  res.json(
    GetHealthTrendResponse.parse(
      rows.map((r) => ({ date: new Date(r.date), score: r.score })),
    ),
  );
});

export default router;
