import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  usersTable,
  subscriptionPlansTable,
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

const router: IRouter = Router();

function planAliases(tier?: string | null) {
  switch (tier) {
    case "plus":
    case "mofk":
    case "individual-basic":
      return ["plus", "mofk", "individual-basic"];
    case "family":
    case "pro":
    case "premium":
    case "individual-advanced":
      return ["family", "pro", "premium", "individual-advanced"];
    case "fleet":
      return ["fleet"];
    case "free":
    default:
      return ["free"];
  }
}

function fallbackMaxVehicles(tier?: string | null) {
  switch (tier) {
    case "fleet":
      return null;
    case "family":
    case "pro":
    case "premium":
    case "individual-advanced":
      return 3;
    case "plus":
    case "mofk":
    case "individual-basic":
    case "free":
    default:
      return 1;
  }
}

function planLabel(tier?: string | null) {
  switch (tier) {
    case "plus":
    case "mofk":
    case "individual-basic":
      return "باقة مفك";
    case "family":
    case "pro":
    case "premium":
    case "individual-advanced":
      return "باقة العائلة";
    case "fleet":
      return "باقة الاسطول";
    case "free":
    default:
      return "الباقة المجانية";
  }
}

async function getVehicleLimitForUser(userId: string) {
  const [user] = await db
    .select({ subscriptionTier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const tier = user?.subscriptionTier ?? "free";
  const aliases = planAliases(tier);
  const [plan] = await db
    .select({ maxVehicles: subscriptionPlansTable.maxVehicles })
    .from(subscriptionPlansTable)
    .where(inArray(subscriptionPlansTable.id, aliases))
    .limit(1);

  return {
    tier,
    maxVehicles: plan?.maxVehicles ?? fallbackMaxVehicles(tier),
  };
}

async function assertCanCreateVehicle(userId: string, res: Response) {
  const { tier, maxVehicles } = await getVehicleLimitForUser(userId);
  if (maxVehicles === null) return true;

  const [{ vehicleCount }] = await db
    .select({ vehicleCount: sql<number>`count(*)::int` })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.userId, userId));

  if (vehicleCount < maxVehicles) return true;

  res.status(403).json({
    code: "VEHICLE_LIMIT_REACHED",
    error: `لا يمكن إضافة مركبة جديدة. ${planLabel(tier)} تسمح بـ ${maxVehicles} مركبة فقط، وتحتاج ترقية الباقة لإضافة مركبة أخرى.`,
  });
  return false;
}

router.get("/vehicles", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.userId, req.userId))
    .orderBy(desc(vehiclesTable.createdAt));
  res.json(ListVehiclesResponse.parse(rows));
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!(await assertCanCreateVehicle(req.userId, res))) return;

  // Prevent duplicate plate number for this user
  if (parsed.data.plateNumber) {
    const [existing] = await db
      .select({ id: vehiclesTable.id })
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.userId, req.userId),
          eq(vehiclesTable.plateNumber, parsed.data.plateNumber),
        ),
      )
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "لوحة الترخيص هذه مسجلة مسبقاً في حسابك" });
      return;
    }
  }

  // Prevent duplicate VIN for this user
  if (parsed.data.vin) {
    const [existingVin] = await db
      .select({ id: vehiclesTable.id })
      .from(vehiclesTable)
      .where(
        and(
          eq(vehiclesTable.userId, req.userId),
          eq(vehiclesTable.vin, parsed.data.vin),
        ),
      )
      .limit(1);
    if (existingVin) {
      res.status(409).json({ error: "هذه السيارة مسجلة مسبقاً في حسابك" });
      return;
    }
  }

  const [v] = await db
    .insert(vehiclesTable)
    .values({
      userId: req.userId,
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
        eq(vehiclesTable.userId, req.userId),
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
        eq(vehiclesTable.userId, req.userId),
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
        eq(vehiclesTable.userId, req.userId),
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
          eq(vehiclesTable.userId, req.userId),
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
