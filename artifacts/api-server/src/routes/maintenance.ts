import { Router, type IRouter } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { maintenanceRules, maintenanceServiceLabels } from "../maintenance/service-types";
import { persistEvaluation } from "./recommendations";

const router: IRouter = Router();

const VehicleParams = z.object({ vehicleId: z.string().uuid() });
const LogParams = z.object({ logId: z.string().uuid() });
const LogsQuery = z.object({
  vehicleId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}, z.number().int().min(0).nullable());

const CreateLogBody = z.object({
  vehicleId: z.string().uuid().optional(),
  serviceType: z.string().trim().min(1),
  customServiceName: z.string().trim().optional().nullable(),
  doneAt: z.coerce.date(),
  doneAtKm: optionalNumber.default(null),
  actualCostSar: optionalNumber.optional(),
  cost: optionalNumber.optional(),
  notes: z.string().trim().optional().nullable(),
  source: z.enum(["manual", "recommendation", "workshop"]).default("manual"),
});

const PatchLogBody = CreateLogBody.partial().omit({ vehicleId: true });

type MaintenanceLogRow = {
  id: string;
  user_id: string;
  vehicle_id: string;
  service_type: string;
  custom_service_name: string | null;
  done_at: Date | string;
  done_at_km: number | null;
  actual_cost_sar: number | null;
  cost_sar: number | null;
  notes: string | null;
  source: string | null;
  created_at: Date | string;
  updated_at: Date | string | null;
  vehicle_nickname?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
};

type ScheduleRow = {
  id: string;
  vehicle_id: string;
  service_type: string;
  service_type_ar: string;
  interval_km: number | null;
  interval_days: number | null;
  last_done_km: number | null;
  last_done_at: Date | string | null;
  next_due_km: number | null;
  next_due_at: Date | string | null;
  status: string;
  estimated_cost: number | null;
  vehicle_nickname?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  current_odometer_km?: number | null;
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysUntil(value: Date | string | null) {
  if (!value) return null;
  const due = new Date(value);
  const today = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((dueDay.getTime() - todayDay.getTime()) / 86400000);
}

function serviceLabel(serviceType: string, customServiceName?: string | null) {
  if (serviceType === "other" && customServiceName) return customServiceName;
  return maintenanceServiceLabels[serviceType] ?? customServiceName ?? serviceType;
}

function toLogDto(row: MaintenanceLogRow) {
  const actualCostSar = row.actual_cost_sar ?? row.cost_sar ?? null;
  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr: serviceLabel(row.service_type, row.custom_service_name),
    customServiceName: row.custom_service_name,
    doneAt: row.done_at,
    doneAtKm: row.done_at_km,
    actualCostSar,
    cost: actualCostSar,
    notes: row.notes,
    source: row.source ?? "manual",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    vehicleNickname: row.vehicle_nickname ?? null,
    vehicleMake: row.vehicle_make ?? "",
    vehicleModel: row.vehicle_model ?? "",
  };
}

function toScheduleDto(row: ScheduleRow) {
  const currentOdometerKm = row.current_odometer_km ?? null;
  const remainingKm =
    row.next_due_km !== null && currentOdometerKm !== null
      ? row.next_due_km - currentOdometerKm
      : null;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr: row.service_type_ar,
    intervalKm: row.interval_km,
    intervalDays: row.interval_days,
    lastDoneKm: row.last_done_km,
    lastDoneAt: row.last_done_at,
    nextDueKm: row.next_due_km,
    nextDueAt: row.next_due_at,
    status: row.status,
    estimatedCost: row.estimated_cost,
    estimatedCostSar: row.estimated_cost,
    vehicleNickname: row.vehicle_nickname ?? null,
    vehicleMake: row.vehicle_make ?? "",
    vehicleModel: row.vehicle_model ?? "",
    currentOdometerKm,
    remainingKm,
    daysUntilDue: daysUntil(row.next_due_at),
  };
}

async function getOwnedVehicle(vehicleId: string, userId: string) {
  const { rows } = await pool.query<{ id: string; odometer_km: number | null }>(
    "select id, odometer_km from vehicles where id = $1 and user_id = $2 limit 1",
    [vehicleId, userId],
  );
  return rows[0] ?? null;
}

async function recalculateScheduleForLog(log: MaintenanceLogRow) {
  if (log.service_type === "other") return;

  const rule = maintenanceRules[log.service_type];
  if (!rule?.intervalKm && !rule?.intervalDays) return;

  const nextDueKm =
    rule.intervalKm && log.done_at_km !== null ? log.done_at_km + rule.intervalKm : null;
  const nextDueAt = rule.intervalDays ? addDays(new Date(log.done_at), rule.intervalDays) : null;
  const label = maintenanceServiceLabels[log.service_type] ?? log.service_type;

  await pool.query(
    `
      insert into maintenance_schedule (
        vehicle_id, service_type, service_type_ar, interval_km, interval_days,
        last_done_km, last_done_at, next_due_km, next_due_at, status, estimated_cost
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10)
      on conflict (id) do nothing
    `,
    [
      log.vehicle_id,
      log.service_type,
      label,
      rule.intervalKm ?? null,
      rule.intervalDays ?? null,
      log.done_at_km,
      log.done_at,
      nextDueKm,
      nextDueAt,
      rule.estimatedCostSar ?? null,
    ],
  );

  await pool.query(
    `
      update maintenance_schedule
      set
        service_type_ar = $3,
        interval_km = coalesce(interval_km, $4),
        interval_days = coalesce(interval_days, $5),
        last_done_km = $6,
        last_done_at = $7,
        next_due_km = $8,
        next_due_at = $9,
        status = 'scheduled',
        estimated_cost = coalesce(estimated_cost, $10)
      where vehicle_id = $1 and service_type = $2
    `,
    [
      log.vehicle_id,
      log.service_type,
      label,
      rule.intervalKm ?? null,
      rule.intervalDays ?? null,
      log.done_at_km,
      log.done_at,
      nextDueKm,
      nextDueAt,
      rule.estimatedCostSar ?? null,
    ],
  );
}

async function refreshVehicleRecommendations(vehicleId: string, userId: string) {
  await persistEvaluation(vehicleId, userId).catch(() => null);
}

async function readLog(logId: string, userId: string) {
  const { rows } = await pool.query<MaintenanceLogRow>(
    `
      select
        ml.*,
        v.nickname as vehicle_nickname,
        v.make as vehicle_make,
        v.model as vehicle_model
      from maintenance_logs ml
      inner join vehicles v on v.id = ml.vehicle_id
      where ml.id = $1 and ml.user_id = $2
      limit 1
    `,
    [logId, userId],
  );
  return rows[0] ?? null;
}

router.get("/maintenance/logs", async (req, res): Promise<void> => {
  const query = LogsQuery.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const params: unknown[] = [req.userId, query.data.limit, query.data.offset];
  const vehicleFilter = query.data.vehicleId ? "and ml.vehicle_id = $4" : "";
  if (query.data.vehicleId) params.push(query.data.vehicleId);

  const { rows } = await pool.query<MaintenanceLogRow>(
    `
      select
        ml.*,
        v.nickname as vehicle_nickname,
        v.make as vehicle_make,
        v.model as vehicle_model
      from maintenance_logs ml
      inner join vehicles v on v.id = ml.vehicle_id
      where ml.user_id = $1 ${vehicleFilter}
      order by ml.done_at desc, ml.created_at desc
      limit $2 offset $3
    `,
    params,
  );

  res.json(rows.map(toLogDto));
});

router.post("/maintenance/logs", async (req, res): Promise<void> => {
  const body = CreateLogBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const vehicleId = body.data.vehicleId;
  if (!vehicleId) {
    res.status(400).json({ error: "المركبة مطلوبة." });
    return;
  }

  if (body.data.serviceType === "other" && !body.data.customServiceName?.trim()) {
    res.status(400).json({ error: "اسم الصيانة المخصصة مطلوب." });
    return;
  }

  const vehicle = await getOwnedVehicle(vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const actualCostSar = body.data.actualCostSar ?? body.data.cost ?? null;
  const { rows } = await pool.query<MaintenanceLogRow>(
    `
      insert into maintenance_logs (
        vehicle_id, user_id, service_type, custom_service_name, done_at,
        done_at_km, actual_cost_sar, cost_sar, notes, source, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, now())
      returning *
    `,
    [
      vehicleId,
      req.userId,
      body.data.serviceType,
      body.data.customServiceName?.trim() || null,
      body.data.doneAt,
      body.data.doneAtKm,
      actualCostSar,
      body.data.notes?.trim() || null,
      body.data.source,
    ],
  );

  const saved = rows[0];
  if (!saved) {
    res.status(500).json({ error: "تعذر حفظ الصيانة. تحقق من البيانات وحاول مرة أخرى." });
    return;
  }

  await recalculateScheduleForLog(saved);
  await refreshVehicleRecommendations(vehicleId, req.userId);
  const log = await readLog(saved.id, req.userId);
  res.status(201).json(toLogDto(log ?? saved));
});

router.patch("/maintenance/logs/:logId", async (req, res): Promise<void> => {
  const params = LogParams.safeParse(req.params);
  const body = PatchLogBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const existing = await readLog(params.data.logId, req.userId);
  if (!existing) {
    res.status(404).json({ error: "Maintenance log not found" });
    return;
  }

  const nextServiceType = body.data.serviceType ?? existing.service_type;
  const nextCustomName = body.data.customServiceName ?? existing.custom_service_name;
  if (nextServiceType === "other" && !nextCustomName?.trim()) {
    res.status(400).json({ error: "اسم الصيانة المخصصة مطلوب." });
    return;
  }

  const nextActualCost =
    body.data.actualCostSar !== undefined
      ? body.data.actualCostSar
      : body.data.cost !== undefined
        ? body.data.cost
        : existing.actual_cost_sar ?? existing.cost_sar ?? null;

  const { rows } = await pool.query<MaintenanceLogRow>(
    `
      update maintenance_logs
      set
        service_type = $3,
        custom_service_name = $4,
        done_at = $5,
        done_at_km = $6,
        actual_cost_sar = $7,
        cost_sar = $7,
        notes = $8,
        source = $9,
        updated_at = now()
      where id = $1 and user_id = $2
      returning *
    `,
    [
      params.data.logId,
      req.userId,
      nextServiceType,
      nextCustomName?.trim() || null,
      body.data.doneAt ?? existing.done_at,
      body.data.doneAtKm !== undefined ? body.data.doneAtKm : existing.done_at_km,
      nextActualCost,
      body.data.notes !== undefined ? body.data.notes?.trim() || null : existing.notes,
      body.data.source ?? existing.source ?? "manual",
    ],
  );

  const updated = rows[0];
  if (!updated) {
    res.status(404).json({ error: "Maintenance log not found" });
    return;
  }

  await recalculateScheduleForLog(updated);
  await refreshVehicleRecommendations(updated.vehicle_id, req.userId);
  const log = await readLog(updated.id, req.userId);
  res.json(toLogDto(log ?? updated));
});

router.delete("/maintenance/logs/:logId", async (req, res): Promise<void> => {
  const params = LogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const existing = await readLog(params.data.logId, req.userId);
  if (!existing) {
    res.status(404).json({ error: "Maintenance log not found" });
    return;
  }

  await pool.query("delete from maintenance_logs where id = $1 and user_id = $2", [
    params.data.logId,
    req.userId,
  ]);
  await refreshVehicleRecommendations(existing.vehicle_id, req.userId);
  res.status(204).end();
});

router.get("/maintenance/:vehicleId/schedule", async (req, res): Promise<void> => {
  const params = VehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const vehicle = await getOwnedVehicle(params.data.vehicleId, req.userId);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const { rows } = await pool.query<ScheduleRow>(
    `
      select
        ms.*,
        v.nickname as vehicle_nickname,
        v.make as vehicle_make,
        v.model as vehicle_model,
        v.odometer_km as current_odometer_km
      from maintenance_schedule ms
      inner join vehicles v on v.id = ms.vehicle_id
      where ms.vehicle_id = $1 and v.user_id = $2
      order by ms.next_due_at asc nulls last, ms.service_type asc
    `,
    [params.data.vehicleId, req.userId],
  );

  res.json(rows.map(toScheduleDto));
});

router.get("/vehicles/:vehicleId/maintenance", async (req, res): Promise<void> => {
  req.url = `/maintenance/${req.params.vehicleId}/schedule`;
  (router as unknown as { handle: typeof Router.prototype.handle }).handle(req, res);
});

router.post("/vehicles/:vehicleId/maintenance/log", async (req, res): Promise<void> => {
  req.body = { ...req.body, vehicleId: req.params.vehicleId };
  req.url = "/maintenance/logs";
  (router as unknown as { handle: typeof Router.prototype.handle }).handle(req, res);
});

router.get("/maintenance/upcoming", async (req, res): Promise<void> => {
  const { rows } = await pool.query<ScheduleRow>(
    `
      select
        ms.*,
        v.nickname as vehicle_nickname,
        v.make as vehicle_make,
        v.model as vehicle_model,
        v.odometer_km as current_odometer_km
      from maintenance_schedule ms
      inner join vehicles v on v.id = ms.vehicle_id
      where v.user_id = $1 and ms.status in ('scheduled', 'upcoming', 'overdue')
      order by
        case ms.status when 'overdue' then 0 when 'upcoming' then 1 else 2 end,
        ms.next_due_at asc nulls last
    `,
    [req.userId],
  );

  res.json(rows.map(toScheduleDto));
});

export default router;
