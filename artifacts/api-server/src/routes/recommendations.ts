import { Router, type IRouter } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { evaluateVehicleRecommendations, type RecommendationCandidate } from "../recommendations/engine";

const router: IRouter = Router();

const VehicleParams = z.object({ vehicleId: z.string().uuid() });
const RecommendationParams = z.object({ id: z.string().uuid() });
const ListQuery = z.object({
  vehicleId: z.string().uuid().optional(),
  status: z.enum(["active", "completed", "dismissed", "expired", "all"]).default("active"),
  priority: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
  category: z.enum(["maintenance", "diagnostic", "battery", "fuel", "safety", "data_quality", "general"]).optional(),
});

type RecommendationRow = {
  id: string;
  vehicle_id: string;
  user_id: string | null;
  category: string | null;
  kind: string;
  priority: string | null;
  severity: string;
  status: string;
  source: string | null;
  source_reference_id: string | null;
  rule_code: string | null;
  dedupe_key: string | null;
  title_ar: string;
  summary_ar: string | null;
  reason_ar: string | null;
  description_ar: string;
  recommended_action_ar: string | null;
  confidence_pct: number;
  suggested_action: string | null;
  suggested_cost_sar: number | null;
  due_date: Date | string | null;
  due_mileage: number | null;
  dismissed_at: Date | string | null;
  completed_at: Date | string | null;
  expires_at: Date | string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string | null;
};

function toDto(row: RecommendationRow) {
  const priority = row.priority ?? row.severity;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    category: row.category ?? row.kind,
    kind: row.kind,
    priority,
    severity: row.severity,
    status: row.status,
    source: row.source,
    sourceReferenceId: row.source_reference_id,
    ruleCode: row.rule_code,
    title: row.title_ar,
    titleAr: row.title_ar,
    summary: row.summary_ar ?? row.description_ar,
    summaryAr: row.summary_ar ?? row.description_ar,
    reason: row.reason_ar ?? row.description_ar,
    reasonAr: row.reason_ar ?? row.description_ar,
    descriptionAr: row.description_ar,
    recommendedAction: row.recommended_action_ar ?? row.suggested_action,
    recommendedActionAr: row.recommended_action_ar ?? row.suggested_action,
    confidencePct: row.confidence_pct,
    suggestedAction: row.suggested_action,
    suggestedCostSar: row.suggested_cost_sar,
    dueDate: row.due_date,
    dueMileage: row.due_mileage,
    dismissedAt: row.dismissed_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

async function getOwnedVehicle(vehicleId: string, userId: string) {
  const { rows } = await pool.query(
    `
      select
        id,
        user_id as "userId",
        make,
        model,
        year,
        nickname,
        odometer_km as "odometerKm",
        adapter_mac as "adapterMac",
        health_score as "healthScore"
      from vehicles
      where id = $1 and user_id = $2
      limit 1
    `,
    [vehicleId, userId],
  );
  return rows[0] ?? null;
}

async function getOwnedVehicleIds(userId: string, vehicleId?: string) {
  if (vehicleId) {
    const vehicle = await getOwnedVehicle(vehicleId, userId);
    return vehicle ? [vehicle.id] : null;
  }

  const { rows } = await pool.query<{ id: string }>("select id from vehicles where user_id = $1", [userId]);
  return rows.map((vehicle) => vehicle.id);
}

async function loadRecommendationInput(vehicleId: string, userId: string) {
  const vehicle = await getOwnedVehicle(vehicleId, userId);
  if (!vehicle) return null;

  const [maintenance, dtcs, telemetry, fuelLogs] = await Promise.all([
    pool.query(
      `
        select
          id,
          vehicle_id as "vehicleId",
          service_type as "serviceType",
          service_type_ar as "serviceTypeAr",
          last_done_km as "lastDoneKm",
          last_done_at as "lastDoneAt",
          next_due_km as "nextDueKm",
          next_due_at as "nextDueAt",
          status,
          estimated_cost as "estimatedCost"
        from maintenance_schedule
        where vehicle_id = $1
      `,
      [vehicleId],
    ),
    pool.query(
      `
        select
          id,
          vehicle_id as "vehicleId",
          code,
          status,
          severity,
          description_ar as "descriptionAr",
          recommended_action as "recommendedAction",
          detected_at as "detectedAt",
          cleared_at as "clearedAt"
        from dtc_codes
        where vehicle_id = $1
        order by detected_at desc
        limit 50
      `,
      [vehicleId],
    ),
    pool.query(
      `
        select
          id,
          vehicle_id as "vehicleId",
          time,
          battery_v as "batteryV"
        from telemetry
        where vehicle_id = $1
        order by time desc
        limit 30
      `,
      [vehicleId],
    ),
    pool.query(
      `
        select
          id,
          vehicle_id as "vehicleId",
          filled_at as "filledAt",
          odometer_km as "odometerKm",
          liters,
          is_full as "isFull"
        from fuel_logs
        where vehicle_id = $1
        order by filled_at desc
        limit 20
      `,
      [vehicleId],
    ),
  ]);

  return {
    vehicle,
    maintenance: maintenance.rows,
    dtcs: dtcs.rows,
    telemetry: telemetry.rows,
    fuelLogs: fuelLogs.rows,
  };
}

function rowValues(candidate: RecommendationCandidate) {
  return [
    candidate.vehicleId,
    candidate.userId,
    candidate.category,
    candidate.kind,
    candidate.priority,
    candidate.severity,
    candidate.status,
    candidate.source,
    candidate.sourceReferenceId ?? null,
    candidate.ruleCode,
    candidate.dedupeKey,
    candidate.titleAr,
    candidate.summaryAr,
    candidate.reasonAr,
    candidate.descriptionAr,
    candidate.recommendedActionAr,
    candidate.confidencePct,
    candidate.suggestedAction ?? null,
    candidate.suggestedCostSar ?? null,
    candidate.dueDate ?? null,
    candidate.dueMileage ?? null,
    candidate.expiresAt ?? null,
    JSON.stringify(candidate.metadata),
  ];
}

async function insertRecommendation(candidate: RecommendationCandidate) {
  const { rows } = await pool.query<RecommendationRow>(
    `
      insert into recommendations (
        vehicle_id, user_id, category, kind, priority, severity, status, source,
        source_reference_id, rule_code, dedupe_key, title_ar, summary_ar, reason_ar,
        description_ar, recommended_action_ar, confidence_pct, suggested_action,
        suggested_cost_sar, due_date, due_mileage, expires_at, metadata, updated_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23::jsonb, now()
      )
      returning *
    `,
    rowValues(candidate),
  );
  return rows[0];
}

async function updateRecommendation(id: string, candidate: RecommendationCandidate, status: RecommendationCandidate["status"]) {
  const values = rowValues({ ...candidate, status });
  const { rows } = await pool.query<RecommendationRow>(
    `
      update recommendations
      set
        vehicle_id = $1,
        user_id = $2,
        category = $3,
        kind = $4,
        priority = $5,
        severity = $6,
        status = $7,
        source = $8,
        source_reference_id = $9,
        rule_code = $10,
        dedupe_key = $11,
        title_ar = $12,
        summary_ar = $13,
        reason_ar = $14,
        description_ar = $15,
        recommended_action_ar = $16,
        confidence_pct = $17,
        suggested_action = $18,
        suggested_cost_sar = $19,
        due_date = $20,
        due_mileage = $21,
        expires_at = $22,
        metadata = $23::jsonb,
        updated_at = now()
      where id = $24
      returning *
    `,
    [...values, id],
  );
  return rows[0];
}

export async function persistEvaluation(vehicleId: string, userId: string) {
  const input = await loadRecommendationInput(vehicleId, userId);
  if (!input) return null;

  const candidates = evaluateVehicleRecommendations(input);
  const activeKeys = new Set(candidates.map((item) => item.dedupeKey));
  const { rows: existing } = await pool.query<RecommendationRow>(
    "select * from recommendations where vehicle_id = $1",
    [vehicleId],
  );

  for (const candidate of candidates) {
    const match = existing.find((row) => row.dedupe_key === candidate.dedupeKey);
    if (match) {
      const nextStatus = match.status === "dismissed" || match.status === "completed" ? match.status : "active";
      await updateRecommendation(match.id, candidate, nextStatus as RecommendationCandidate["status"]);
      continue;
    }

    await insertRecommendation(candidate);
  }

  const toExpire = existing.filter(
    (row) => row.dedupe_key && !activeKeys.has(row.dedupe_key) && row.status === "active",
  );

  for (const row of toExpire) {
    await pool.query(
      "update recommendations set status = 'expired', expires_at = now(), updated_at = now() where id = $1",
      [row.id],
    );
  }

  const { rows } = await pool.query<RecommendationRow>(
    `
      select *
      from recommendations
      where vehicle_id = $1 and status = 'active'
      order by updated_at desc nulls last, created_at desc
    `,
    [vehicleId],
  );

  return rows.map(toDto);
}

router.get("/recommendations", async (req, res): Promise<void> => {
  const query = ListQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const vehicleIds = await getOwnedVehicleIds(req.userId, query.data.vehicleId);
  if (vehicleIds === null) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  if (vehicleIds.length === 0) {
    res.json([]);
    return;
  }

  const params: unknown[] = [vehicleIds];
  const conditions = ["vehicle_id = any($1::uuid[])"];
  if (query.data.status !== "all") {
    params.push(query.data.status);
    conditions.push(`status = $${params.length}`);
  }
  if (query.data.priority) {
    params.push(query.data.priority);
    conditions.push(`coalesce(priority, severity) = $${params.length}`);
  }
  if (query.data.category) {
    params.push(query.data.category);
    conditions.push(`coalesce(category, kind) = $${params.length}`);
  }

  const { rows } = await pool.query<RecommendationRow>(
    `
      select *
      from recommendations
      where ${conditions.join(" and ")}
      order by updated_at desc nulls last, created_at desc
    `,
    params,
  );

  res.json(rows.map(toDto));
});

router.get("/recommendations/counts", async (req, res): Promise<void> => {
  const vehicleIds = await getOwnedVehicleIds(req.userId);
  if (!vehicleIds?.length) {
    res.json({ total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 });
    return;
  }

  const { rows } = await pool.query<{ priority: string | null; count: number }>(
    `
      select coalesce(priority, severity, 'info') as priority, count(*)::int as count
      from recommendations
      where vehicle_id = any($1::uuid[]) and status = 'active'
      group by coalesce(priority, severity, 'info')
    `,
    [vehicleIds],
  );

  const counts = { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const row of rows) {
    const key = (row.priority ?? "info") as keyof typeof counts;
    if (key in counts) counts[key] = row.count;
    counts.total += row.count;
  }
  res.json(counts);
});

router.get("/vehicles/:vehicleId/recommendations", async (req, res): Promise<void> => {
  const params = VehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const evaluated = await persistEvaluation(params.data.vehicleId, req.userId);
  if (!evaluated) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(evaluated);
});

router.post("/vehicles/:vehicleId/recommendations/evaluate", async (req, res): Promise<void> => {
  const params = VehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const evaluated = await persistEvaluation(params.data.vehicleId, req.userId);
  if (!evaluated) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json({ ok: true, recommendations: evaluated });
});

async function mutateRecommendation(
  recommendationId: string,
  userId: string,
  patch: { status: string; dismissedAt?: Date | null; completedAt?: Date | null; expiresAt?: Date | null },
) {
  const { rows: existing } = await pool.query<{ id: string }>(
    `
      select r.id
      from recommendations r
      inner join vehicles v on v.id = r.vehicle_id
      where r.id = $1 and v.user_id = $2
      limit 1
    `,
    [recommendationId, userId],
  );

  if (!existing[0]) return null;

  const { rows } = await pool.query<RecommendationRow>(
    `
      update recommendations
      set
        status = $2,
        dismissed_at = $3,
        completed_at = $4,
        expires_at = $5,
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      recommendationId,
      patch.status,
      patch.dismissedAt ?? null,
      patch.completedAt ?? null,
      patch.expiresAt ?? null,
    ],
  );

  return rows[0] ? toDto(rows[0]) : null;
}

router.post("/recommendations/:id/complete", async (req, res): Promise<void> => {
  const params = RecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const updated = await mutateRecommendation(params.data.id, req.userId, {
    status: "completed",
    completedAt: new Date(),
  });
  if (!updated) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }
  res.json(updated);
});

router.post("/recommendations/:id/dismiss", async (req, res): Promise<void> => {
  const params = RecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const updated = await mutateRecommendation(params.data.id, req.userId, {
    status: "dismissed",
    dismissedAt: new Date(),
  });
  if (!updated) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }
  res.json(updated);
});

router.post("/recommendations/:id/reactivate", async (req, res): Promise<void> => {
  const params = RecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const updated = await mutateRecommendation(params.data.id, req.userId, {
    status: "active",
  });
  if (!updated) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }
  res.json(updated);
});

export default router;
