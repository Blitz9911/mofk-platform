import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, vehiclesTable, maintenanceTable, maintenanceLogsTable } from "@workspace/db";
import {
  GetMaintenanceScheduleParams,
  GetMaintenanceScheduleResponse,
  LogMaintenanceParams,
  LogMaintenanceBody,
  GetUpcomingMaintenanceResponse,
} from "@workspace/api-zod";
import { logCompletedMaintenance } from "../services/recommendation-store";

const router: IRouter = Router();

async function ownedVehicle(vehicleId: string, userId: string) {
  const [v] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId)));
  return v ?? null;
}

async function scheduleForVehicle(vehicleId: string) {
  const rows = await db
    .select()
    .from(maintenanceTable)
    .where(eq(maintenanceTable.vehicleId, vehicleId))
    .orderBy(asc(maintenanceTable.nextDueAt));
  return GetMaintenanceScheduleResponse.parse(rows);
}

router.get("/vehicles/:vehicleId/maintenance", async (req, res): Promise<void> => {
  const params = GetMaintenanceScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const vehicle = await ownedVehicle(params.data.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(await scheduleForVehicle(params.data.vehicleId));
});

router.get("/maintenance/:vehicleId/schedule", async (req, res): Promise<void> => {
  const params = GetMaintenanceScheduleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const vehicle = await ownedVehicle(params.data.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(await scheduleForVehicle(params.data.vehicleId));
});

router.get("/maintenance/logs", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(maintenanceLogsTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, maintenanceLogsTable.vehicleId))
    .where(eq(vehiclesTable.userId, req.userId))
    .orderBy(desc(maintenanceLogsTable.doneAt));
  res.json(
    rows.map((row) => {
      const log = (row as { maintenance_logs?: typeof maintenanceLogsTable.$inferSelect }).maintenance_logs
        ?? (row as { maintenanceLogs?: typeof maintenanceLogsTable.$inferSelect }).maintenanceLogs
        ?? (row as unknown as typeof maintenanceLogsTable.$inferSelect);
      const vehicle = (row as { vehicles?: typeof vehiclesTable.$inferSelect }).vehicles;
      return {
        id: log.id,
        vehicleId: log.vehicleId,
        serviceType: log.serviceType,
        serviceTypeAr: log.serviceTypeAr,
        lastDoneAt: log.doneAt,
        lastDoneKm: log.doneAtKm,
        estimatedCost: log.costSar,
        actualCostSar: log.costSar,
        notes: log.notes,
        status: "done",
        vehicleNickname: vehicle?.nickname,
        vehicleMake: vehicle?.make,
        vehicleModel: vehicle?.model,
      };
    }),
  );
});

async function handleLog(req: import("express").Request & { userId: string }, res: import("express").Response) {
  const params = LogMaintenanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = LogMaintenanceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const extra = req.body as { recommendationId?: string; customServiceName?: string };
  const result = await logCompletedMaintenance({
    vehicleId: params.data.vehicleId,
    userId: req.userId,
    serviceType: body.data.serviceType,
    doneAt: body.data.doneAt,
    doneAtKm: body.data.doneAtKm,
    cost: body.data.cost ?? null,
    notes: body.data.notes ?? null,
    recommendationId: extra.recommendationId ?? null,
    customServiceName: extra.customServiceName ?? null,
  });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(201).json(result.schedule ?? { ok: true, id: result.log.id });
}

router.post("/vehicles/:vehicleId/maintenance/log", handleLog);
router.post("/maintenance/:vehicleId/log", handleLog);

router.get("/maintenance/upcoming", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: maintenanceTable.id,
      vehicleId: maintenanceTable.vehicleId,
      serviceType: maintenanceTable.serviceType,
      serviceTypeAr: maintenanceTable.serviceTypeAr,
      intervalKm: maintenanceTable.intervalKm,
      intervalDays: maintenanceTable.intervalDays,
      lastDoneKm: maintenanceTable.lastDoneKm,
      lastDoneAt: maintenanceTable.lastDoneAt,
      nextDueKm: maintenanceTable.nextDueKm,
      nextDueAt: maintenanceTable.nextDueAt,
      status: maintenanceTable.status,
      estimatedCost: maintenanceTable.estimatedCost,
      vehicleNickname: vehiclesTable.nickname,
      vehicleMake: vehiclesTable.make,
      vehicleModel: vehiclesTable.model,
      daysUntilDue: sql<number>`CASE WHEN ${maintenanceTable.nextDueAt} IS NULL THEN NULL ELSE EXTRACT(DAY FROM (${maintenanceTable.nextDueAt} - now()))::int END`,
    })
    .from(maintenanceTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, maintenanceTable.vehicleId))
    .where(
      and(
        eq(vehiclesTable.userId, req.userId),
        sql`${maintenanceTable.status} IN ('upcoming','overdue','scheduled')`,
      ),
    )
    .orderBy(asc(maintenanceTable.nextDueAt));
  res.json(GetUpcomingMaintenanceResponse.parse(rows));
});

export default router;
