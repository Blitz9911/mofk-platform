import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  dtcCodesTable,
  maintenanceTable,
  diagnosticSessionsTable,
  healthHistoryTable,
} from "@workspace/db";
import {
  ListVehiclesResponse,
  CreateVehicleBody,
  GetVehicleParams,
  GetVehicleResponse,
  UpdateVehicleParams,
  UpdateVehicleBody,
  UpdateVehicleResponse,
  DeleteVehicleParams,
  GetVehicleHealthHistoryParams,
  GetVehicleHealthHistoryResponse,
  PairAdapterParams,
  PairAdapterBody,
  PairAdapterResponse,
} from "@workspace/api-zod";
import { DEMO_USER_ID } from "../lib/demo";

const router: IRouter = Router();

router.get("/vehicles", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.userId, DEMO_USER_ID))
    .orderBy(desc(vehiclesTable.createdAt));
  res.json(ListVehiclesResponse.parse(rows));
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [v] = await db
    .insert(vehiclesTable)
    .values({
      userId: DEMO_USER_ID,
      vin: parsed.data.vin,
      make: parsed.data.make,
      model: parsed.data.model,
      year: parsed.data.year,
      plateNumber: parsed.data.plateNumber,
      nickname: parsed.data.nickname,
      odometerKm: parsed.data.odometerKm ?? 0,
      fuelType: parsed.data.fuelType,
      engineCc: parsed.data.engineCc,
      healthScore: 95,
    })
    .returning();
  res.status(201).json(
    GetVehicleResponse.parse({
      ...v,
      activeDtcCount: 0,
      upcomingMaintenanceCount: 0,
      lastSessionAt: null,
      totalSessions: 0,
      isPaired: !!v.adapterMac,
    }),
  );
});

router.get("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
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

  const [{ activeDtcCount }] = await db
    .select({
      activeDtcCount: sql<number>`count(*)::int`,
    })
    .from(dtcCodesTable)
    .where(
      and(
        eq(dtcCodesTable.vehicleId, v.id),
        eq(dtcCodesTable.status, "active"),
      ),
    );

  const [{ upcomingMaintenanceCount }] = await db
    .select({
      upcomingMaintenanceCount: sql<number>`count(*)::int`,
    })
    .from(maintenanceTable)
    .where(
      and(
        eq(maintenanceTable.vehicleId, v.id),
        sql`${maintenanceTable.status} IN ('upcoming','overdue','scheduled')`,
      ),
    );

  const [last] = await db
    .select()
    .from(diagnosticSessionsTable)
    .where(eq(diagnosticSessionsTable.vehicleId, v.id))
    .orderBy(desc(diagnosticSessionsTable.startedAt))
    .limit(1);

  const [{ totalSessions }] = await db
    .select({ totalSessions: sql<number>`count(*)::int` })
    .from(diagnosticSessionsTable)
    .where(eq(diagnosticSessionsTable.vehicleId, v.id));

  res.json(
    GetVehicleResponse.parse({
      ...v,
      activeDtcCount,
      upcomingMaintenanceCount,
      lastSessionAt: last?.startedAt ?? null,
      totalSessions,
      isPaired: !!v.adapterMac,
    }),
  );
});

router.patch("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateVehicleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [v] = await db
    .update(vehiclesTable)
    .set(body.data)
    .where(
      and(
        eq(vehiclesTable.id, params.data.vehicleId),
        eq(vehiclesTable.userId, DEMO_USER_ID),
      ),
    )
    .returning();
  if (!v) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(UpdateVehicleResponse.parse(v));
});

router.delete("/vehicles/:vehicleId", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [v] = await db
    .delete(vehiclesTable)
    .where(
      and(
        eq(vehiclesTable.id, params.data.vehicleId),
        eq(vehiclesTable.userId, DEMO_USER_ID),
      ),
    )
    .returning();
  if (!v) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.sendStatus(204);
});

router.get(
  "/vehicles/:vehicleId/health-history",
  async (req, res): Promise<void> => {
    const params = GetVehicleHealthHistoryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(healthHistoryTable)
      .where(eq(healthHistoryTable.vehicleId, params.data.vehicleId))
      .orderBy(healthHistoryTable.date);
    res.json(
      GetVehicleHealthHistoryResponse.parse(
        rows.map((r) => ({ date: new Date(r.date), score: r.score })),
      ),
    );
  },
);

router.post(
  "/vehicles/:vehicleId/pair-adapter",
  async (req, res): Promise<void> => {
    const params = PairAdapterParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = PairAdapterBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [v] = await db
      .update(vehiclesTable)
      .set({ adapterMac: body.data.adapterMac })
      .where(
        and(
          eq(vehiclesTable.id, params.data.vehicleId),
          eq(vehiclesTable.userId, DEMO_USER_ID),
        ),
      )
      .returning();
    if (!v) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(PairAdapterResponse.parse(v));
  },
);

export default router;
