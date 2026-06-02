import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, fuelLogsTable, vehiclesTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const CreateFuelLogBody = z.object({
  vehicleId: z.string().uuid(),
  filledAt: z.string().datetime().optional(),
  odometerKm: z.number().int().positive(),
  liters: z.number().positive(),
  pricePerLiterSar: z.number().positive(), // client sends SAR, we convert to halalas
  fuelGrade: z.enum(["91", "95", "diesel"]).default("91"),
  stationNameAr: z.string().max(120).optional(),
  isFull: z.boolean().default(true),
  notes: z.string().max(500).optional(),
});

const FuelQueryParams = z.object({
  vehicleId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sarToHalalas(sar: number) {
  return Math.round(sar * 100);
}
function halalaToSar(h: number) {
  return h / 100;
}

/** Compute consumption metrics between two consecutive logs */
function computeConsumption(prevOdometer: number, currentOdometer: number, liters: number) {
  const distanceKm = currentOdometer - prevOdometer;
  if (distanceKm <= 0) return null;
  return {
    distanceKm,
    consumptionL100km: parseFloat(((liters / distanceKm) * 100).toFixed(2)),
    kmPerLiter: parseFloat((distanceKm / liters).toFixed(2)),
  };
}

// ─── GET /api/fuel — list logs ────────────────────────────────────────────────

router.get("/fuel", async (req, res): Promise<void> => {
  const params = FuelQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { vehicleId, from, to, limit, offset } = params.data;
  const userId = req.userId;

  // Verify vehicle ownership if vehicleId specified
  let vehicleIds: string[] = [];
  if (vehicleId) {
    const v = await db.select({ id: vehiclesTable.id })
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)))
      .limit(1);
    if (v.length === 0) {
      res.status(403).json({ error: "غير مصرح" });
      return;
    }
    vehicleIds = [vehicleId];
  } else {
    const vehicles = await db.select({ id: vehiclesTable.id })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));
    vehicleIds = vehicles.map(v => v.id);
  }

  if (vehicleIds.length === 0) {
    res.json({ logs: [], total: 0 });
    return;
  }

  const conditions = [
    sql`${fuelLogsTable.vehicleId} = ANY(ARRAY[${sql.join(vehicleIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
  ];
  if (from) conditions.push(gte(fuelLogsTable.filledAt, new Date(from)));
  if (to) conditions.push(lte(fuelLogsTable.filledAt, new Date(to)));

  const [logs, countResult] = await Promise.all([
    db.select().from(fuelLogsTable)
      .where(and(...conditions))
      .orderBy(desc(fuelLogsTable.filledAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(fuelLogsTable)
      .where(and(...conditions)),
  ]);

  // Enrich logs with consumption metrics
  // We need the previous log (next in desc order = previous chronologically)
  const enriched = logs.map((log, i) => {
    const prevLog = logs[i + 1]; // next in descending = previous fill-up
    const consumption = prevLog && log.vehicleId === prevLog.vehicleId
      ? computeConsumption(prevLog.odometerKm, log.odometerKm, parseFloat(log.liters as string))
      : null;

    return {
      id: log.id,
      vehicleId: log.vehicleId,
      filledAt: log.filledAt,
      odometerKm: log.odometerKm,
      liters: parseFloat(log.liters as string),
      pricePerLiterSar: halalaToSar(log.pricePerLiterHalalas),
      totalCostSar: halalaToSar(log.totalCostHalalas),
      fuelGrade: log.fuelGrade,
      stationNameAr: log.stationNameAr,
      isFull: log.isFull,
      notes: log.notes,
      consumption,
      createdAt: log.createdAt,
    };
  });

  res.json({ logs: enriched, total: countResult[0]?.count ?? 0 });
});

// ─── GET /api/fuel/stats — aggregated analytics ───────────────────────────────

router.get("/fuel/stats", async (req, res): Promise<void> => {
  const vehicleIdParam = req.query.vehicleId as string | undefined;
  const period = (req.query.period as string) || "month"; // week | month | year | all
  const userId = req.userId;

  const now = new Date();
  let since: Date;
  switch (period) {
    case "week":  since = new Date(now.getTime() - 7 * 86400000); break;
    case "year":  since = new Date(now.getFullYear(), 0, 1); break;
    case "all":   since = new Date(0); break;
    default:      since = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Get vehicles
  let vehicleIds: string[] = [];
  if (vehicleIdParam) {
    const v = await db.select({ id: vehiclesTable.id })
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, vehicleIdParam), eq(vehiclesTable.userId, userId)))
      .limit(1);
    if (v.length === 0) { res.status(403).json({ error: "غير مصرح" }); return; }
    vehicleIds = [vehicleIdParam];
  } else {
    const vehicles = await db.select({ id: vehiclesTable.id })
      .from(vehiclesTable).where(eq(vehiclesTable.userId, userId));
    vehicleIds = vehicles.map(v => v.id);
  }

  if (vehicleIds.length === 0) {
    res.json({ totalLiters: 0, totalCostSar: 0, avgConsumptionL100km: null, avgKmPerLiter: null, fillCount: 0, trendByDay: [] });
    return;
  }

  const logs = await db.select().from(fuelLogsTable)
    .where(and(
      sql`${fuelLogsTable.vehicleId} = ANY(ARRAY[${sql.join(vehicleIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
      gte(fuelLogsTable.filledAt, since),
    ))
    .orderBy(fuelLogsTable.vehicleId, fuelLogsTable.filledAt);

  // Compute aggregates
  let totalLiters = 0;
  let totalCostHalalas = 0;
  const consumptions: number[] = [];

  // Group by vehicle for per-vehicle consumption
  const byVehicle = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!byVehicle.has(log.vehicleId)) byVehicle.set(log.vehicleId, []);
    byVehicle.get(log.vehicleId)!.push(log);
    totalLiters += parseFloat(log.liters as string);
    totalCostHalalas += log.totalCostHalalas;
  }

  for (const [, vLogs] of byVehicle) {
    for (let i = 1; i < vLogs.length; i++) {
      const dist = vLogs[i].odometerKm - vLogs[i - 1].odometerKm;
      const liters = parseFloat(vLogs[i].liters as string);
      if (dist > 0 && liters > 0) {
        consumptions.push((liters / dist) * 100);
      }
    }
  }

  const avgConsumption = consumptions.length
    ? parseFloat((consumptions.reduce((a, b) => a + b, 0) / consumptions.length).toFixed(2))
    : null;

  // Build daily trend
  const dayMap = new Map<string, { liters: number; costSar: number; fills: number }>();
  for (const log of logs) {
    const day = log.filledAt.toISOString().slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { liters: 0, costSar: 0, fills: 0 });
    const d = dayMap.get(day)!;
    d.liters += parseFloat(log.liters as string);
    d.costSar += halalaToSar(log.totalCostHalalas);
    d.fills++;
  }

  const trendByDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({ date, ...val, costSar: parseFloat(val.costSar.toFixed(2)) }));

  res.json({
    totalLiters: parseFloat(totalLiters.toFixed(2)),
    totalCostSar: parseFloat(halalaToSar(totalCostHalalas).toFixed(2)),
    avgConsumptionL100km: avgConsumption,
    avgKmPerLiter: avgConsumption ? parseFloat((100 / avgConsumption).toFixed(2)) : null,
    fillCount: logs.length,
    trendByDay,
  });
});

// ─── POST /api/fuel — create log ──────────────────────────────────────────────

router.post("/fuel", async (req, res): Promise<void> => {
  const body = CreateFuelLogBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { vehicleId, filledAt, odometerKm, liters, pricePerLiterSar, fuelGrade, stationNameAr, isFull, notes } = body.data;

  // Verify ownership
  const v = await db.select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, req.userId)))
    .limit(1);
  if (v.length === 0) {
    res.status(403).json({ error: "غير مصرح" });
    return;
  }

  const pricePerLiterHalalas = sarToHalalas(pricePerLiterSar);
  const totalCostHalalas = Math.round(pricePerLiterHalalas * liters);

  const [log] = await db.insert(fuelLogsTable).values({
    vehicleId,
    userId: req.userId,
    filledAt: filledAt ? new Date(filledAt) : new Date(),
    odometerKm,
    liters: liters.toString(),
    pricePerLiterHalalas,
    totalCostHalalas,
    fuelGrade: fuelGrade ?? "91",
    stationNameAr: stationNameAr ?? null,
    isFull: isFull ?? true,
    notes: notes ?? null,
  }).returning();

  // Update vehicle odometer if this reading is higher
  await db.update(vehiclesTable)
    .set({ odometerKm })
    .where(and(eq(vehiclesTable.id, vehicleId), sql`odometer_km < ${odometerKm}`));

  res.status(201).json({
    id: log.id,
    vehicleId: log.vehicleId,
    filledAt: log.filledAt,
    odometerKm: log.odometerKm,
    liters: parseFloat(log.liters as string),
    pricePerLiterSar: halalaToSar(log.pricePerLiterHalalas),
    totalCostSar: halalaToSar(log.totalCostHalalas),
    fuelGrade: log.fuelGrade,
    stationNameAr: log.stationNameAr,
    isFull: log.isFull,
    notes: log.notes,
    createdAt: log.createdAt,
  });
});

// ─── DELETE /api/fuel/:id ─────────────────────────────────────────────────────

router.delete("/fuel/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const deleted = await db.delete(fuelLogsTable)
    .where(and(eq(fuelLogsTable.id, id), eq(fuelLogsTable.userId, req.userId)))
    .returning({ id: fuelLogsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "السجل غير موجود" });
    return;
  }
  res.json({ success: true });
});

export default router;
