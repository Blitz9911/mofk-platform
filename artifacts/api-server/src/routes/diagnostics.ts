import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  vehiclesTable,
  diagnosticSessionsTable,
  dtcCodesTable,
  telemetryTable,
} from "@workspace/db";
import {
  ListDiagnosticSessionsQueryParams,
  ListDiagnosticSessionsResponse,
  StartDiagnosticSessionBody,
  GetDiagnosticSessionParams,
  GetDiagnosticSessionResponse,
  CloseDiagnosticSessionParams,
  CloseDiagnosticSessionResponse,
  GetSessionTelemetryParams,
  GetSessionTelemetryResponse,
  GetLiveTelemetryParams,
  GetLiveTelemetryResponse,
} from "@workspace/api-zod";
import { DEMO_USER_ID } from "../lib/demo";

const router: IRouter = Router();

router.get("/diagnostics/sessions", async (req, res): Promise<void> => {
  const params = ListDiagnosticSessionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conditions = [eq(diagnosticSessionsTable.userId, DEMO_USER_ID)];
  if (params.data.vehicleId) {
    conditions.push(eq(diagnosticSessionsTable.vehicleId, params.data.vehicleId));
  }
  const rows = await db
    .select({
      id: diagnosticSessionsTable.id,
      vehicleId: diagnosticSessionsTable.vehicleId,
      vehicleNickname: vehiclesTable.nickname,
      vehicleMake: vehiclesTable.make,
      vehicleModel: vehiclesTable.model,
      startedAt: diagnosticSessionsTable.startedAt,
      endedAt: diagnosticSessionsTable.endedAt,
      durationSec: diagnosticSessionsTable.durationSec,
      odometerKm: diagnosticSessionsTable.odometerKm,
      dtcCount: diagnosticSessionsTable.dtcCount,
      healthBefore: diagnosticSessionsTable.healthBefore,
      healthAfter: diagnosticSessionsTable.healthAfter,
      status: diagnosticSessionsTable.status,
    })
    .from(diagnosticSessionsTable)
    .innerJoin(
      vehiclesTable,
      eq(vehiclesTable.id, diagnosticSessionsTable.vehicleId),
    )
    .where(and(...conditions))
    .orderBy(desc(diagnosticSessionsTable.startedAt))
    .limit(params.data.limit);
  res.json(ListDiagnosticSessionsResponse.parse(rows));
});

router.post("/diagnostics/sessions", async (req, res): Promise<void> => {
  const body = StartDiagnosticSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [v] = await db
    .select()
    .from(vehiclesTable)
    .where(
      and(
        eq(vehiclesTable.id, body.data.vehicleId),
        eq(vehiclesTable.userId, DEMO_USER_ID),
      ),
    );
  if (!v) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [s] = await db
    .insert(diagnosticSessionsTable)
    .values({
      vehicleId: body.data.vehicleId,
      userId: DEMO_USER_ID,
      odometerKm: body.data.odometerKm ?? v.odometerKm,
      healthBefore: v.healthScore,
      status: "active",
    })
    .returning();
  res.status(201).json({
    id: s.id,
    vehicleId: s.vehicleId,
    vehicleNickname: v.nickname,
    vehicleMake: v.make,
    vehicleModel: v.model,
    startedAt: s.startedAt,
    endedAt: null,
    durationSec: null,
    odometerKm: s.odometerKm,
    dtcCount: 0,
    healthBefore: s.healthBefore,
    healthAfter: null,
    status: "active",
  });
});

router.get(
  "/diagnostics/sessions/:sessionId",
  async (req, res): Promise<void> => {
    const params = GetDiagnosticSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [s] = await db
      .select({
        id: diagnosticSessionsTable.id,
        vehicleId: diagnosticSessionsTable.vehicleId,
        vehicleNickname: vehiclesTable.nickname,
        vehicleMake: vehiclesTable.make,
        vehicleModel: vehiclesTable.model,
        startedAt: diagnosticSessionsTable.startedAt,
        endedAt: diagnosticSessionsTable.endedAt,
        durationSec: diagnosticSessionsTable.durationSec,
        odometerKm: diagnosticSessionsTable.odometerKm,
        dtcCount: diagnosticSessionsTable.dtcCount,
        healthBefore: diagnosticSessionsTable.healthBefore,
        healthAfter: diagnosticSessionsTable.healthAfter,
        status: diagnosticSessionsTable.status,
      })
      .from(diagnosticSessionsTable)
      .innerJoin(
        vehiclesTable,
        eq(vehiclesTable.id, diagnosticSessionsTable.vehicleId),
      )
      .where(
        and(
          eq(diagnosticSessionsTable.id, params.data.sessionId),
          eq(diagnosticSessionsTable.userId, DEMO_USER_ID),
        ),
      );
    if (!s) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const dtcs = await db
      .select()
      .from(dtcCodesTable)
      .where(eq(dtcCodesTable.sessionId, s.id));

    const [telSummary] = await db
      .select({
        avgRpm: sql<number>`avg(${telemetryTable.rpm})::int`,
        maxSpeed: sql<number>`max(${telemetryTable.speedKmh})::int`,
        avgCoolantTemp: sql<number>`avg(${telemetryTable.coolantTemp})::int`,
        minBatteryV: sql<number>`min(${telemetryTable.batteryV})::float`,
        sampleCount: sql<number>`count(*)::int`,
      })
      .from(telemetryTable)
      .where(eq(telemetryTable.sessionId, s.id));

    res.json(
      GetDiagnosticSessionResponse.parse({
        ...s,
        dtcCodes: dtcs.map((d) => ({
          ...d,
          vehicleMake: s.vehicleMake,
          vehicleModel: s.vehicleModel,
        })),
        telemetrySummary: telSummary ?? {
          sampleCount: 0,
        },
      }),
    );
  },
);

router.post(
  "/diagnostics/sessions/:sessionId/close",
  async (req, res): Promise<void> => {
    const params = CloseDiagnosticSessionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [existing] = await db
      .select()
      .from(diagnosticSessionsTable)
      .where(
        and(
          eq(diagnosticSessionsTable.id, params.data.sessionId),
          eq(diagnosticSessionsTable.userId, DEMO_USER_ID),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const endedAt = new Date();
    const duration = Math.round(
      (endedAt.getTime() - existing.startedAt.getTime()) / 1000,
    );
    const [s] = await db
      .update(diagnosticSessionsTable)
      .set({
        endedAt,
        durationSec: duration,
        status: "completed",
      })
      .where(eq(diagnosticSessionsTable.id, existing.id))
      .returning();
    const [v] = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, s.vehicleId));
    res.json(
      CloseDiagnosticSessionResponse.parse({
        ...s,
        vehicleNickname: v?.nickname,
        vehicleMake: v?.make,
        vehicleModel: v?.model,
      }),
    );
  },
);

router.get(
  "/diagnostics/sessions/:sessionId/telemetry",
  async (req, res): Promise<void> => {
    const params = GetSessionTelemetryParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const rows = await db
      .select()
      .from(telemetryTable)
      .where(eq(telemetryTable.sessionId, params.data.sessionId))
      .orderBy(asc(telemetryTable.time));
    res.json(
      GetSessionTelemetryResponse.parse(
        rows.map((r) => ({
          ...r,
          batteryV: r.batteryV != null ? Number(r.batteryV) : null,
        })),
      ),
    );
  },
);

router.get(
  "/diagnostics/live/:vehicleId",
  async (req, res): Promise<void> => {
    const params = GetLiveTelemetryParams.safeParse(req.params);
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

    const since = new Date();
    since.setMinutes(since.getMinutes() - 30);
    const recent = await db
      .select()
      .from(telemetryTable)
      .where(
        and(
          eq(telemetryTable.vehicleId, params.data.vehicleId),
          gte(telemetryTable.time, since),
        ),
      )
      .orderBy(desc(telemetryTable.time))
      .limit(60);

    const latestRow = recent[0];
    // synthesize a live snapshot if the seed didn't include one
    const now = new Date();
    const synth = {
      time: now,
      rpm: 1850 + Math.floor(Math.sin(now.getMinutes() / 3) * 250),
      speedKmh: 78,
      coolantTemp: 92,
      intakeTemp: 38,
      batteryV: 14.1,
      fuelLevelPct: 64,
      engineLoad: 42,
      throttlePos: 18,
    };
    const latest = latestRow
      ? {
          time: latestRow.time,
          rpm: latestRow.rpm,
          speedKmh: latestRow.speedKmh,
          coolantTemp: latestRow.coolantTemp,
          intakeTemp: latestRow.intakeTemp,
          batteryV:
            latestRow.batteryV != null ? Number(latestRow.batteryV) : null,
          fuelLevelPct: latestRow.fuelLevelPct,
          engineLoad: latestRow.engineLoad,
          throttlePos: latestRow.throttlePos,
        }
      : synth;
    res.json(
      GetLiveTelemetryResponse.parse({
        vehicleId: v.id,
        isConnected: !!v.adapterMac,
        latest,
        recent: recent
          .slice()
          .reverse()
          .map((r) => ({
            time: r.time,
            rpm: r.rpm,
            speedKmh: r.speedKmh,
            coolantTemp: r.coolantTemp,
            intakeTemp: r.intakeTemp,
            batteryV: r.batteryV != null ? Number(r.batteryV) : null,
            fuelLevelPct: r.fuelLevelPct,
            engineLoad: r.engineLoad,
            throttlePos: r.throttlePos,
          })),
      }),
    );
  },
);

export default router;
