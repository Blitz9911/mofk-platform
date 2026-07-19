import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  vehiclesTable,
  diagnosticSessionsTable,
  dtcCodesTable,
  revenueTable,
  ordersTable,
  orderItemsTable,
  paymentsTable,
  shipmentsTable,
  devicesTable,
  subscriptionsTable,
  fleetAccountsTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import {
  GetAdminOverviewResponse,
  ListAdminUsersQueryParams,
  ListAdminUsersResponse,
  ListAdminVehiclesResponse,
  ListLiveDiagnosticsResponse,
  GetCommonIssuesResponse,
  GetRevenueBreakdownResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use("/admin", requireAdmin);

router.get("/admin/overview", async (_req, res): Promise<void> => {
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)::int` })
    .from(usersTable);

  const since1d = new Date();
  since1d.setHours(since1d.getHours() - 24);

  const [{ activeVehiclesToday }] = await db
    .select({
      activeVehiclesToday: sql<number>`count(distinct ${diagnosticSessionsTable.vehicleId})::int`,
    })
    .from(diagnosticSessionsTable)
    .where(gte(diagnosticSessionsTable.startedAt, since1d));

  const [{ dtcsLast24h }] = await db
    .select({ dtcsLast24h: sql<number>`count(*)::int` })
    .from(dtcCodesTable)
    .where(gte(dtcCodesTable.detectedAt, since1d));

  const [{ criticalDtcsLast24h }] = await db
    .select({ criticalDtcsLast24h: sql<number>`count(*)::int` })
    .from(dtcCodesTable)
    .where(
      and(
        gte(dtcCodesTable.detectedAt, since1d),
        sql`${dtcCodesTable.severity} IN ('critical','high')`,
      ),
    );

  const ym = new Date().toISOString().slice(0, 7);
  const [thisMonth] = await db
    .select()
    .from(revenueTable)
    .where(eq(revenueTable.month, ym));

  const [{ premiumSubscribers }] = await db
    .select({ premiumSubscribers: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(sql`${usersTable.subscriptionTier} IN ('premium','fleet')`);

  const [{ avgHealthScore }] = await db
    .select({
      avgHealthScore: sql<number>`coalesce(avg(${vehiclesTable.healthScore}),0)::int`,
    })
    .from(vehiclesTable);

  const revenueMtd = thisMonth?.subscriptionRevenue ?? 0;

  res.json(
    GetAdminOverviewResponse.parse({
      totalUsers,
      usersTrendPct: 12,
      activeVehiclesToday,
      dtcsLast24h,
      criticalDtcsLast24h,
      revenueMtd,
      revenueTrendPct: 18,
      nps: 67,
      premiumSubscribers,
      avgHealthScore,
    }),
  );
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const params = ListAdminUsersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const where = params.data.search
    ? or(
        ilike(usersTable.name, `%${params.data.search}%`),
        ilike(usersTable.phone, `%${params.data.search}%`),
        ilike(usersTable.email, `%${params.data.search}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      phone: usersTable.phone,
      email: usersTable.email,
      subscriptionTier: usersTable.subscriptionTier,
      lastActiveAt: usersTable.lastActiveAt,
      createdAt: usersTable.createdAt,
      isActive: usersTable.isActive,
      city: usersTable.city,
      vehicleCount: sql<number>`(select count(*)::int from ${vehiclesTable} where ${vehiclesTable.userId} = ${usersTable.id})`,
      sessionsCount: sql<number>`(select count(*)::int from ${diagnosticSessionsTable} where ${diagnosticSessionsTable.userId} = ${usersTable.id})`,
    })
    .from(usersTable)
    .where(where)
    .orderBy(desc(usersTable.createdAt));

  res.json(ListAdminUsersResponse.parse(rows));
});

router.get("/admin/vehicles", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: vehiclesTable.id,
      ownerName: usersTable.name,
      ownerPhone: usersTable.phone,
      make: vehiclesTable.make,
      model: vehiclesTable.model,
      year: vehiclesTable.year,
      plateNumber: vehiclesTable.plateNumber,
      odometerKm: vehiclesTable.odometerKm,
      healthScore: vehiclesTable.healthScore,
      activeDtcCount: sql<number>`(select count(*)::int from ${dtcCodesTable} where ${dtcCodesTable.vehicleId} = ${vehiclesTable.id} and ${dtcCodesTable.status} = 'active')`,
      lastSeenAt: sql<Date | null>`(select max(${diagnosticSessionsTable.startedAt}) from ${diagnosticSessionsTable} where ${diagnosticSessionsTable.vehicleId} = ${vehiclesTable.id})`,
    })
    .from(vehiclesTable)
    .innerJoin(usersTable, eq(usersTable.id, vehiclesTable.userId))
    .orderBy(asc(vehiclesTable.healthScore));
  res.json(ListAdminVehiclesResponse.parse(rows));
});

router.get("/admin/diagnostics/live", async (_req, res): Promise<void> => {
  const since = new Date();
  since.setHours(since.getHours() - 6);
  const rows = await db
    .select({
      id: diagnosticSessionsTable.id,
      vehicleMake: vehiclesTable.make,
      vehicleModel: vehiclesTable.model,
      vehicleYear: vehiclesTable.year,
      plateNumber: vehiclesTable.plateNumber,
      ownerName: usersTable.name,
      city: usersTable.city,
      startedAt: diagnosticSessionsTable.startedAt,
      dtcCount: diagnosticSessionsTable.dtcCount,
      criticalDtcCount: sql<number>`(select count(*)::int from ${dtcCodesTable} where ${dtcCodesTable.sessionId} = ${diagnosticSessionsTable.id} and ${dtcCodesTable.severity} IN ('critical','high'))`,
      status: diagnosticSessionsTable.status,
    })
    .from(diagnosticSessionsTable)
    .innerJoin(
      vehiclesTable,
      eq(vehiclesTable.id, diagnosticSessionsTable.vehicleId),
    )
    .innerJoin(usersTable, eq(usersTable.id, diagnosticSessionsTable.userId))
    .where(gte(diagnosticSessionsTable.startedAt, since))
    .orderBy(desc(diagnosticSessionsTable.startedAt))
    .limit(50);
  res.json(ListLiveDiagnosticsResponse.parse(rows));
});

router.get("/admin/issues/common", async (_req, res): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await db
    .select({
      code: dtcCodesTable.code,
      descriptionAr: sql<string>`max(${dtcCodesTable.descriptionAr})`,
      severity: sql<"low" | "medium" | "high" | "critical">`max(${dtcCodesTable.severity})`,
      count: sql<number>`count(*)::int`,
      affectedVehicles: sql<number>`count(distinct ${dtcCodesTable.vehicleId})::int`,
      avgEstimatedCost: sql<number>`coalesce(avg((${dtcCodesTable.estimatedCostMin} + ${dtcCodesTable.estimatedCostMax}) / 2),0)::int`,
    })
    .from(dtcCodesTable)
    .where(gte(dtcCodesTable.detectedAt, since))
    .groupBy(dtcCodesTable.code)
    .orderBy(desc(sql`count(*)`))
    .limit(20);

  // Add topMakeModel and trendPct mock
  const enriched = await Promise.all(
    rows.map(async (r, i) => {
      const [top] = await db
        .select({
          mm: sql<string>`${vehiclesTable.make} || ' ' || ${vehiclesTable.model}`,
          c: sql<number>`count(*)::int`,
        })
        .from(dtcCodesTable)
        .innerJoin(
          vehiclesTable,
          eq(vehiclesTable.id, dtcCodesTable.vehicleId),
        )
        .where(eq(dtcCodesTable.code, r.code))
        .groupBy(vehiclesTable.make, vehiclesTable.model)
        .orderBy(desc(sql`count(*)`))
        .limit(1);
      return {
        ...r,
        topMakeModel: top?.mm ?? null,
        trendPct: [12, -5, 28, 4, -8, 17, 2, -11, 6, 3, -2, 9, 14, -7, 1, 5, 8, -4, 11, 0][i] ?? 0,
      };
    }),
  );
  res.json(GetCommonIssuesResponse.parse(enriched));
});

router.get("/admin/revenue", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(revenueTable)
    .orderBy(asc(revenueTable.month));
  res.json(GetRevenueBreakdownResponse.parse(rows));
});

router.get("/admin/orders", async (_req, res): Promise<void> => {
  const rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  res.json(rows);
});

router.get("/admin/orders/:id", async (req, res): Promise<void> => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, req.params.id)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, order.id));
  const shipments = await db.select().from(shipmentsTable).where(eq(shipmentsTable.orderId, order.id));
  res.json({ order, items, payments, shipments });
});

router.patch("/admin/orders/:id/status", async (req, res): Promise<void> => {
  const status = String(req.body?.status ?? "");
  const allowed = ["created", "pending_payment", "paid", "preparing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "Invalid order status" });
    return;
  }
  const [order] = await db.update(ordersTable).set({ status, updatedAt: new Date() }).where(eq(ordersTable.id, req.params.id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.get("/admin/devices", async (_req, res): Promise<void> => {
  res.json(await db.select().from(devicesTable).orderBy(desc(devicesTable.createdAt)));
});

router.get("/admin/subscriptions", async (_req, res): Promise<void> => {
  res.json(await db.select().from(subscriptionsTable).orderBy(desc(subscriptionsTable.createdAt)));
});

router.get("/admin/fleet-accounts", async (_req, res): Promise<void> => {
  res.json(await db.select().from(fleetAccountsTable).orderBy(desc(fleetAccountsTable.createdAt)));
});

router.get("/admin/reports", async (_req, res): Promise<void> => {
  const [{ orders }] = await db.select({ orders: sql<number>`count(*)::int` }).from(ordersTable);
  const [{ revenue }] = await db.select({ revenue: sql<number>`coalesce(sum(${paymentsTable.amount}),0)::int` }).from(paymentsTable).where(eq(paymentsTable.status, "paid"));
  res.json({ orders, paidRevenueSar: revenue });
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable).orderBy(asc(subscriptionPlansTable.sortOrder));
  res.json({ plans, moyasarWebhookConfigured: Boolean(process.env.MOYASAR_WEBHOOK_SECRET) });
});

export default router;
