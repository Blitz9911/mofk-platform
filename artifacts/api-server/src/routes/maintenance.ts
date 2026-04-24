import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, vehiclesTable, maintenanceTable } from "@workspace/db";
import {
  GetMaintenanceScheduleParams,
  GetMaintenanceScheduleResponse,
  LogMaintenanceParams,
  LogMaintenanceBody,
  GetUpcomingMaintenanceResponse,
} from "@workspace/api-zod";
import { DEMO_USER_ID } from "../lib/demo";

const router: IRouter = Router();

router.get(
  "/vehicles/:vehicleId/maintenance",
  async (req, res): Promise<void> => {
    const params = GetMaintenanceScheduleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(maintenanceTable)
      .where(eq(maintenanceTable.vehicleId, params.data.vehicleId))
      .orderBy(asc(maintenanceTable.nextDueAt));
    res.json(GetMaintenanceScheduleResponse.parse(rows));
  },
);

router.post(
  "/vehicles/:vehicleId/maintenance/log",
  async (req, res): Promise<void> => {
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
    // mark matching service type as done
    const [v] = await db
      .select()
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.id, params.data.vehicleId),
          eq(vehiclesTable.userId, DEMO_USER_ID),
        ),
      );
    if (!v) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    const [updated] = await db
      .update(maintenanceTable)
      .set({
        lastDoneAt: body.data.doneAt,
        lastDoneKm: body.data.doneAtKm,
        status: "done",
      })
      .where(
        and(
          eq(maintenanceTable.vehicleId, params.data.vehicleId),
          eq(maintenanceTable.serviceType, body.data.serviceType),
        ),
      )
      .returning();
    res
      .status(201)
      .json({ ok: true, id: updated?.id ?? null });
  },
);

router.get("/maintenance/upcoming", async (_req, res): Promise<void> => {
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
        eq(vehiclesTable.userId, DEMO_USER_ID),
        sql`${maintenanceTable.status} IN ('upcoming','overdue','scheduled')`,
      ),
    )
    .orderBy(asc(maintenanceTable.nextDueAt));
  res.json(GetUpcomingMaintenanceResponse.parse(rows));
});

export default router;
