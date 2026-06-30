import { getValidSupabaseSession, supabaseRequest } from "./supabase";

type VehicleRow = {
  id: string;
  vin?: string | null;
  make: string;
  model: string;
  year: number;
  plate_number?: string | null;
  nickname?: string | null;
  odometer_km?: number | null;
  fuel_type?: "petrol" | "diesel" | "hybrid" | "ev" | null;
  engine_cc?: number | null;
  adapter_mac?: string | null;
  health_score?: number | null;
  image_url?: string | null;
  created_at?: string;
};

type MaintenanceLogRow = {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_type: string;
  done_at: string;
  done_at_km?: number | null;
  cost_sar?: number | string | null;
  notes?: string | null;
  created_at?: string;
  vehicles?: {
    make?: string | null;
    model?: string | null;
    nickname?: string | null;
    odometer_km?: number | null;
  } | null;
};

type FuelLogRow = {
  id: string;
  vehicle_id: string;
  user_id: string;
  filled_at: string;
  odometer_km: number;
  liters: number | string;
  price_per_liter_halalas: number;
  total_cost_halalas: number;
  fuel_grade: string;
  station_name_ar?: string | null;
  is_full: boolean;
  notes?: string | null;
  created_at?: string;
};

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  role?: string | null;
};

type NotificationRow = {
  id: string;
  user_id: string;
  vehicle_id?: string | null;
  type: string;
  severity: string;
  title_ar: string;
  body_ar?: string | null;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  dedupe_key?: string | null;
  created_at?: string;
};

type ApiBridgeResult =
  | { handled: true; data?: unknown; status?: number }
  | { handled: false };

let installed = false;

class ApiBridgeError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function toVehicle(row: VehicleRow) {
  return {
    id: row.id,
    vin: row.vin ?? null,
    make: row.make,
    model: row.model,
    year: row.year,
    plateNumber: row.plate_number ?? null,
    nickname: row.nickname ?? null,
    odometerKm: row.odometer_km ?? 0,
    fuelType: row.fuel_type ?? "petrol",
    engineCc: row.engine_cc ?? null,
    adapterMac: row.adapter_mac ?? null,
    healthScore: row.health_score ?? 100,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    activeDtcCount: 0,
    upcomingMaintenanceCount: 0,
    lastSessionAt: null,
    totalSessions: 0,
    isPaired: Boolean(row.adapter_mac),
  };
}

async function requireSession() {
  const session = await getValidSupabaseSession();

  if (!session?.access_token || !session.user?.id) {
    throw new ApiBridgeError("يلزم تسجيل الدخول أولًا.", 401);
  }

  return session;
}

async function readJsonBody(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const body = init?.body;

  if (typeof body === "string" && body.trim()) {
    return JSON.parse(body) as Record<string, unknown>;
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    const text = await input.clone().text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  }

  return {};
}

function vehiclePayloadFromBody(body: Record<string, unknown>, userId: string) {
  return {
    user_id: userId,
    vin: typeof body.vin === "string" && body.vin.trim() ? body.vin.trim() : null,
    make: String(body.make ?? "").trim(),
    model: String(body.model ?? "").trim(),
    year: Number(body.year),
    plate_number:
      typeof body.plateNumber === "string" && body.plateNumber.trim()
        ? body.plateNumber.trim()
        : null,
    nickname:
      typeof body.nickname === "string" && body.nickname.trim()
        ? body.nickname.trim()
        : null,
    odometer_km: Number(body.odometerKm ?? 0) || 0,
    fuel_type: String(body.fuelType ?? "petrol"),
    engine_cc: body.engineCc ? Number(body.engineCc) : null,
  };
}

async function listVehicleRows(accessToken: string) {
  return supabaseRequest<VehicleRow[]>(
    "/rest/v1/vehicles?select=*&order=created_at.desc",
    { method: "GET" },
    accessToken,
  );
}

async function getVehicleRow(vehicleId: string, accessToken: string) {
  const rows = await supabaseRequest<VehicleRow[]>(
    `/rest/v1/vehicles?select=*&id=eq.${encodeURIComponent(vehicleId)}&limit=1`,
    { method: "GET" },
    accessToken,
  );

  return rows?.[0] ?? null;
}

function healthTrend(score: number) {
  const today = new Date();

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));

    return {
      date: date.toISOString(),
      score,
    };
  });
}

function liveTelemetry(vehicleId: string) {
  return {
    vehicleId,
    isConnected: false,
    latest: {
      time: new Date().toISOString(),
      rpm: 0,
      speedKmh: 0,
      coolantTemp: 0,
      intakeTemp: 0,
      batteryV: 0,
      fuelLevelPct: 0,
      engineLoad: 0,
      throttlePos: 0,
    },
    recent: [],
  };
}

const MAINTENANCE_LABELS: Record<string, string> = {
  oil_change: "تغيير الزيت",
  tire_rotation: "تدوير الإطارات",
  brake_inspection: "فحص الفرامل",
  battery_check: "فحص البطارية",
  air_filter: "تغيير فلتر الهواء",
  transmission_fluid: "سائل ناقل الحركة",
  coolant_flush: "تغيير سائل التبريد",
  spark_plugs: "تغيير شمعات الإشعال",
  timing_belt: "سير التوقيت",
  wheel_alignment: "ضبط زوايا الإطارات",
  ac_service: "صيانة التكييف",
};

type MaintenanceRule = {
  intervalKm?: number;
  intervalDays?: number;
  soonKm?: number;
  soonDays?: number;
  estimatedCost?: number;
};

const MAINTENANCE_RULES: Record<string, MaintenanceRule> = {
  oil_change: {
    intervalKm: 10000,
    intervalDays: 180,
    soonKm: 1500,
    soonDays: 30,
    estimatedCost: 250,
  },
  tire_rotation: {
    intervalKm: 10000,
    intervalDays: 180,
    soonKm: 1500,
    soonDays: 30,
    estimatedCost: 120,
  },
  brake_inspection: {
    intervalKm: 20000,
    intervalDays: 365,
    soonKm: 2500,
    soonDays: 45,
    estimatedCost: 180,
  },
  battery_check: {
    intervalDays: 365,
    soonDays: 45,
    estimatedCost: 80,
  },
  air_filter: {
    intervalKm: 15000,
    intervalDays: 365,
    soonKm: 2000,
    soonDays: 45,
    estimatedCost: 90,
  },
  transmission_fluid: {
    intervalKm: 60000,
    intervalDays: 1095,
    soonKm: 5000,
    soonDays: 60,
    estimatedCost: 450,
  },
  coolant_flush: {
    intervalKm: 40000,
    intervalDays: 730,
    soonKm: 4000,
    soonDays: 60,
    estimatedCost: 250,
  },
  spark_plugs: {
    intervalKm: 40000,
    intervalDays: 730,
    soonKm: 4000,
    soonDays: 60,
    estimatedCost: 300,
  },
  timing_belt: {
    intervalKm: 100000,
    intervalDays: 1825,
    soonKm: 8000,
    soonDays: 90,
    estimatedCost: 900,
  },
  wheel_alignment: {
    intervalKm: 20000,
    intervalDays: 365,
    soonKm: 2500,
    soonDays: 45,
    estimatedCost: 180,
  },
  ac_service: {
    intervalDays: 365,
    soonDays: 45,
    estimatedCost: 220,
  },
};

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function daysUntil(dateString: string) {
  const target = new Date(dateString);
  const targetStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );

  return Math.ceil(
    (targetStart.getTime() - todayStart().getTime()) / (1000 * 60 * 60 * 24),
  );
}

function vehicleName(row: MaintenanceLogRow) {
  return (
    row.vehicles?.nickname ||
    [row.vehicles?.make, row.vehicles?.model].filter(Boolean).join(" ") ||
    "مركبة"
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return value.toLocaleString("ar-SA");
}

function statusRank(status: string) {
  if (status === "overdue") return 1;
  if (status === "upcoming") return 2;
  if (status === "scheduled") return 3;
  return 4;
}

function completedMaintenanceItem(row: MaintenanceLogRow) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr: MAINTENANCE_LABELS[row.service_type] || row.service_type,
    intervalKm: null,
    intervalDays: null,
    lastDoneKm: row.done_at_km ?? null,
    lastDoneAt: row.done_at ?? null,
    currentOdometerKm: row.done_at_km ?? null,
    kmSinceLast: null,
    nextDueKm: null,
    nextDueAt: null,
    remainingKm: null,
    daysUntilDue: null,
    progressPct: null,
    status: "done",
    estimatedCost:
      row.cost_sar !== null && row.cost_sar !== undefined
        ? Number(row.cost_sar)
        : null,
    vehicleNickname: row.vehicles?.nickname ?? null,
    vehicleMake: row.vehicles?.make ?? "",
    vehicleModel: row.vehicles?.model ?? "",
    notes: row.notes ?? null,
    recommendationReason: null,
    isRecommendation: false,
  };
}

function recommendationFromLastLog(row: MaintenanceLogRow) {
  const rule = MAINTENANCE_RULES[row.service_type];
  if (!rule) return null;

  const currentOdometerKm =
    row.vehicles?.odometer_km !== null && row.vehicles?.odometer_km !== undefined
      ? Number(row.vehicles.odometer_km)
      : Number(row.done_at_km ?? 0);

  const lastDoneKm =
    row.done_at_km !== null && row.done_at_km !== undefined
      ? Number(row.done_at_km)
      : null;

  const kmSinceLast =
    lastDoneKm !== null && currentOdometerKm >= lastDoneKm
      ? currentOdometerKm - lastDoneKm
      : null;

  const nextDueKm =
    rule.intervalKm && lastDoneKm !== null
      ? lastDoneKm + rule.intervalKm
      : null;

  const remainingKm =
    nextDueKm !== null ? nextDueKm - currentOdometerKm : null;

  const nextDueAt =
    rule.intervalDays && row.done_at
      ? addDays(row.done_at, rule.intervalDays)
      : null;

  const remainingDays = nextDueAt ? daysUntil(nextDueAt) : null;

  const progressPct =
    rule.intervalKm && kmSinceLast !== null
      ? Math.min(100, Math.max(0, Math.round((kmSinceLast / rule.intervalKm) * 100)))
      : null;

  const isKmOverdue = remainingKm !== null && remainingKm < 0;
  const isDayOverdue = remainingDays !== null && remainingDays < 0;

  const isKmSoon =
    remainingKm !== null &&
    rule.soonKm !== undefined &&
    remainingKm >= 0 &&
    remainingKm <= rule.soonKm;

  const isDaySoon =
    remainingDays !== null &&
    rule.soonDays !== undefined &&
    remainingDays >= 0 &&
    remainingDays <= rule.soonDays;

  let status = "scheduled";

  if (isKmOverdue || isDayOverdue) {
    status = "overdue";
  } else if (isKmSoon || isDaySoon) {
    status = "upcoming";
  }

  const label = MAINTENANCE_LABELS[row.service_type] || row.service_type;
  const vehicle = vehicleName(row);

  let recommendationReason = `تم احتساب ${label} لـ ${vehicle} بناءً على آخر صيانة مسجلة.`;

  if (rule.intervalKm && lastDoneKm !== null && nextDueKm !== null) {
    recommendationReason = `آخر ${label} كان عند ${formatNumber(lastDoneKm)} كم. الفاصل الموصى به ${formatNumber(rule.intervalKm)} كم، لذلك الصيانة القادمة عند ${formatNumber(nextDueKm)} كم. العداد الحالي ${formatNumber(currentOdometerKm)} كم.`;

    if (remainingKm !== null && remainingKm < 0) {
      recommendationReason += ` الصيانة متأخرة بمقدار ${formatNumber(Math.abs(remainingKm))} كم.`;
    } else if (remainingKm !== null) {
      recommendationReason += ` المتبقي تقريبًا ${formatNumber(remainingKm)} كم.`;
    }
  } else if (rule.intervalDays && nextDueAt) {
    recommendationReason = `آخر ${label} كان بتاريخ ${row.done_at}. الفاصل الموصى به ${rule.intervalDays} يوم، لذلك تاريخ الاستحقاق القادم هو ${nextDueAt.slice(0, 10)}.`;

    if (remainingDays !== null && remainingDays < 0) {
      recommendationReason += ` الصيانة متأخرة ${Math.abs(remainingDays)} يوم.`;
    } else if (remainingDays !== null) {
      recommendationReason += ` المتبقي ${remainingDays} يوم.`;
    }
  }

  return {
    id: `rec-${row.vehicle_id}-${row.service_type}`,
    sourceLogId: row.id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr: label,
    intervalKm: rule.intervalKm ?? null,
    intervalDays: rule.intervalDays ?? null,
    lastDoneKm,
    lastDoneAt: row.done_at ?? null,
    currentOdometerKm,
    kmSinceLast,
    nextDueKm,
    nextDueAt,
    remainingKm,
    daysUntilDue: remainingDays,
    progressPct,
    status,
    estimatedCost:
      row.cost_sar !== null && row.cost_sar !== undefined
        ? Number(row.cost_sar)
        : rule.estimatedCost ?? null,
    vehicleNickname: row.vehicles?.nickname ?? null,
    vehicleMake: row.vehicles?.make ?? "",
    vehicleModel: row.vehicles?.model ?? "",
    notes: row.notes ?? null,
    recommendationReason,
    isRecommendation: true,
  };
}

function latestMaintenanceRows(rows: MaintenanceLogRow[]) {
  const latestByVehicleAndService = new Map<string, MaintenanceLogRow>();

  for (const row of rows) {
    if (!MAINTENANCE_RULES[row.service_type]) continue;

    const key = `${row.vehicle_id}:${row.service_type}`;
    const existing = latestByVehicleAndService.get(key);

    if (!existing) {
      latestByVehicleAndService.set(key, row);
      continue;
    }

    const currentTime = new Date(row.done_at || row.created_at || 0).getTime();
    const existingTime = new Date(existing.done_at || existing.created_at || 0).getTime();

    if (currentTime > existingTime) {
      latestByVehicleAndService.set(key, row);
    }
  }

  return Array.from(latestByVehicleAndService.values());
}

function buildMaintenanceRecommendations(rows: MaintenanceLogRow[]) {
  const recommendations = latestMaintenanceRows(rows)
    .map(recommendationFromLastLog)
    .filter(
      (item): item is NonNullable<ReturnType<typeof recommendationFromLastLog>> =>
        Boolean(item),
    );

  return recommendations.sort((a: any, b: any) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;

    const aDate = new Date(a.nextDueAt || a.lastDoneAt || 0).getTime();
    const bDate = new Date(b.nextDueAt || b.lastDoneAt || 0).getTime();
    return aDate - bDate;
  });
}

function buildMaintenanceItems(rows: MaintenanceLogRow[]) {
  return rows.map(completedMaintenanceItem).sort((a: any, b: any) => {
    const aDate = new Date(a.lastDoneAt || 0).getTime();
    const bDate = new Date(b.lastDoneAt || 0).getTime();
    return bDate - aDate;
  });
}

function maintenanceCounts(items: any[]) {
  return {
    overdue: items.filter((item) => item.status === "overdue").length,
    upcoming: items.filter((item) => item.status === "upcoming").length,
    scheduled: items.filter((item) => item.status === "scheduled").length,
    done: items.filter((item) => item.status === "done").length,
  };
}

function toAiRecommendation(item: any) {
  const isOverdue = item.status === "overdue";
  const isUpcoming = item.status === "upcoming";

  const titlePrefix = isOverdue ? "صيانة متأخرة" : isUpcoming ? "صيانة قريبة" : "متابعة صيانة";
  const label = item.serviceTypeAr || item.serviceType;

  const descriptionParts = [
    item.recommendationReason,
    item.intervalKm
      ? `المعادلة: آخر صيانة (${formatNumber(item.lastDoneKm)} كم) + الفاصل (${formatNumber(item.intervalKm)} كم) = الاستحقاق (${formatNumber(item.nextDueKm)} كم).`
      : null,
    item.intervalDays && item.nextDueAt
      ? `المعادلة الزمنية: تاريخ آخر صيانة (${item.lastDoneAt?.slice(0, 10) || "-"}) + ${item.intervalDays} يوم = ${item.nextDueAt.slice(0, 10)}.`
      : null,
    item.remainingKm !== null && item.remainingKm !== undefined
      ? item.remainingKm < 0
        ? `متأخرة بمقدار ${formatNumber(Math.abs(item.remainingKm))} كم.`
        : `المتبقي تقريبًا ${formatNumber(item.remainingKm)} كم.`
      : null,
    item.daysUntilDue !== null && item.daysUntilDue !== undefined
      ? item.daysUntilDue < 0
        ? `متأخرة ${Math.abs(item.daysUntilDue)} يوم.`
        : `المتبقي زمنيًا ${item.daysUntilDue} يوم.`
      : null,
  ].filter(Boolean);

  return {
    id: item.id,
    vehicleId: item.vehicleId,
    kind: "maintenance_due",
    severity: isOverdue ? "critical" : isUpcoming ? "warning" : "info",
    titleAr: `${titlePrefix}: ${label}`,
    descriptionAr: descriptionParts.join(" "),
    confidencePct: item.progressPct !== null && item.progressPct !== undefined
      ? Math.min(99, Math.max(60, Number(item.progressPct)))
      : isOverdue
        ? 95
        : isUpcoming
          ? 85
          : 70,
    suggestedAction: isOverdue
      ? `احجز أو سجل ${label} الآن.`
      : isUpcoming
        ? `خطط لتنفيذ ${label} قريبًا.`
        : `تابع ${label} حسب العداد أو التاريخ القادم.`,
    suggestedCostSar: item.estimatedCost ?? undefined,
    createdAt: new Date().toISOString(),
    metadata: {
      serviceType: item.serviceType,
      status: item.status,
      lastDoneKm: item.lastDoneKm,
      currentOdometerKm: item.currentOdometerKm,
      kmSinceLast: item.kmSinceLast,
      nextDueKm: item.nextDueKm,
      remainingKm: item.remainingKm,
      lastDoneAt: item.lastDoneAt,
      nextDueAt: item.nextDueAt,
      daysUntilDue: item.daysUntilDue,
      progressPct: item.progressPct,
    },
  };
}

function toMaintenanceItem(row: MaintenanceLogRow) {
  return completedMaintenanceItem(row);
}

async function listMaintenanceLogs(accessToken: string, vehicleId?: string) {
  const vehicleFilter = vehicleId
    ? `&vehicle_id=eq.${encodeURIComponent(vehicleId)}`
    : "";

  return supabaseRequest<MaintenanceLogRow[]>(
    `/rest/v1/maintenance_logs?select=*,vehicles(make,model,nickname,odometer_km)${vehicleFilter}&order=done_at.desc&limit=200`,
    { method: "GET" },
    accessToken,
  );
}

async function handleMaintenance(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const session = await requireSession();

  if (path === "/api/maintenance/upcoming" && method === "GET") {
    const rows = await listMaintenanceLogs(session.access_token);
    return { handled: true, data: buildMaintenanceItems(rows) };
  }

  const scheduleMatch = path.match(/^\/api\/maintenance\/([^/]+)\/schedule$/);
  if (scheduleMatch && method === "GET") {
    const vehicleId = decodeURIComponent(scheduleMatch[1]);
    const rows = await listMaintenanceLogs(session.access_token, vehicleId);
    return { handled: true, data: buildMaintenanceItems(rows) };
  }

  const logMatch = path.match(/^\/api\/maintenance\/([^/]+)\/log$/);
  if (logMatch && method === "POST") {
    const vehicleId = decodeURIComponent(logMatch[1]);
    const body = await readJsonBody(input, init);

    const serviceType = String(body.serviceType ?? "").trim();
    const doneAt = String(body.doneAt ?? "").trim();
    const doneAtKm = Number(body.doneAtKm ?? 0) || 0;
    const cost =
      body.cost !== undefined && body.cost !== null && body.cost !== ""
        ? Number(body.cost)
        : null;
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    if (!serviceType) {
      throw new ApiBridgeError("نوع الصيانة مطلوب.", 400);
    }

    if (!doneAt) {
      throw new ApiBridgeError("تاريخ الصيانة مطلوب.", 400);
    }

    const vehicle = await getVehicleRow(vehicleId, session.access_token);
    if (!vehicle) {
      throw new ApiBridgeError("المركبة غير موجودة.", 404);
    }

    const rows = await supabaseRequest<MaintenanceLogRow[]>(
      "/rest/v1/maintenance_logs?select=*,vehicles(make,model,nickname,odometer_km)",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          user_id: session.user.id,
          service_type: serviceType,
          done_at: doneAt,
          done_at_km: doneAtKm,
          cost_sar: cost,
          notes,
        }),
      },
      session.access_token,
    );

    return { handled: true, data: toMaintenanceItem(rows[0]), status: 201 };
  }

  return { handled: false };
}

async function handleRecommendations(
  path: string,
  method: string,
): Promise<ApiBridgeResult> {
  const match = path.match(/^\/api\/ai\/recommendations\/([^/]+)$/);
  if (!match || method !== "GET") {
    return { handled: false };
  }

  const session = await requireSession();
  const vehicleId = decodeURIComponent(match[1]);

  const vehicle = await getVehicleRow(vehicleId, session.access_token);
  if (!vehicle) {
    throw new ApiBridgeError("المركبة غير موجودة.", 404);
  }

  const rows = await listMaintenanceLogs(session.access_token, vehicleId);
  const maintenanceRecommendations = buildMaintenanceRecommendations(rows).map(toAiRecommendation);

  return {
    handled: true,
    data: maintenanceRecommendations,
  };
}

function toFuelLog(row: FuelLogRow, consumption: unknown = null) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    filledAt: row.filled_at,
    odometerKm: row.odometer_km,
    liters: Number(row.liters),
    pricePerLiterSar: row.price_per_liter_halalas / 100,
    totalCostSar: row.total_cost_halalas / 100,
    fuelGrade: row.fuel_grade,
    stationNameAr: row.station_name_ar ?? undefined,
    isFull: row.is_full,
    notes: row.notes ?? undefined,
    consumption,
  };
}

function withFuelConsumption(rows: FuelLogRow[]) {
  const asc = [...rows].sort((a, b) => a.odometer_km - b.odometer_km);
  const map = new Map<string, unknown>();

  asc.forEach((row, index) => {
    const prev = asc[index - 1];

    if (!prev) {
      map.set(row.id, null);
      return;
    }

    const distanceKm = row.odometer_km - prev.odometer_km;
    const liters = Number(row.liters);

    if (distanceKm <= 0 || liters <= 0) {
      map.set(row.id, null);
      return;
    }

    map.set(row.id, {
      distanceKm,
      consumptionL100km: Number(((liters / distanceKm) * 100).toFixed(2)),
      kmPerLiter: Number((distanceKm / liters).toFixed(2)),
    });
  });

  return rows.map((row) => toFuelLog(row, map.get(row.id) ?? null));
}

async function listFuelRows(accessToken: string, vehicleId?: string | null) {
  const vehicleFilter = vehicleId
    ? `&vehicle_id=eq.${encodeURIComponent(vehicleId)}`
    : "";

  return supabaseRequest<FuelLogRow[]>(
    `/rest/v1/fuel_logs?select=*${vehicleFilter}&order=filled_at.desc`,
    { method: "GET" },
    accessToken,
  );
}

function filterFuelRowsByPeriod(rows: FuelLogRow[], period: string) {
  if (period === "all") return rows;

  const now = new Date();
  const from = new Date(now);

  if (period === "week") {
    from.setDate(now.getDate() - 7);
  } else if (period === "month") {
    from.setMonth(now.getMonth() - 1);
  } else if (period === "year") {
    from.setFullYear(now.getFullYear() - 1);
  } else {
    return rows;
  }

  return rows.filter((row) => new Date(row.filled_at) >= from);
}

function buildFuelStats(rows: FuelLogRow[], period: string) {
  const filtered = filterFuelRowsByPeriod(rows, period);
  const logs = withFuelConsumption(filtered);

  const totalLiters = logs.reduce(
    (sum, log) => sum + Number(log.liters || 0),
    0,
  );

  const totalCostSar = logs.reduce(
    (sum, log) => sum + Number(log.totalCostSar || 0),
    0,
  );

  const validConsumption = logs
    .map((log) => log.consumption as any)
    .filter(Boolean);

  const avgConsumptionL100km = validConsumption.length
    ? Number(
        (
          validConsumption.reduce(
            (sum: number, item: any) => sum + item.consumptionL100km,
            0,
          ) / validConsumption.length
        ).toFixed(2),
      )
    : null;

  const avgKmPerLiter = validConsumption.length
    ? Number(
        (
          validConsumption.reduce(
            (sum: number, item: any) => sum + item.kmPerLiter,
            0,
          ) / validConsumption.length
        ).toFixed(2),
      )
    : null;

  const byDay = new Map<
    string,
    { date: string; liters: number; costSar: number; fills: number }
  >();

  filtered.forEach((row) => {
    const date = row.filled_at.slice(0, 10);
    const current = byDay.get(date) ?? {
      date,
      liters: 0,
      costSar: 0,
      fills: 0,
    };

    current.liters += Number(row.liters || 0);
    current.costSar += row.total_cost_halalas / 100;
    current.fills += 1;

    byDay.set(date, current);
  });

  const trendByDay = Array.from(byDay.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      liters: Number(item.liters.toFixed(2)),
      costSar: Number(item.costSar.toFixed(2)),
    }));

  return {
    totalLiters: Number(totalLiters.toFixed(2)),
    totalCostSar: Number(totalCostSar.toFixed(2)),
    avgConsumptionL100km,
    avgKmPerLiter,
    fillCount: filtered.length,
    trendByDay,
  };
}

async function handleFuel(
  url: URL,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const path = url.pathname;
  const session = await requireSession();

  if (path === "/api/fuel" && method === "GET") {
    const vehicleId = url.searchParams.get("vehicleId");
    const rows = await listFuelRows(session.access_token, vehicleId);

    return {
      handled: true,
      data: {
        logs: withFuelConsumption(rows),
      },
    };
  }

  if (path === "/api/fuel/stats" && method === "GET") {
    const vehicleId = url.searchParams.get("vehicleId");
    const period = url.searchParams.get("period") ?? "month";
    const rows = await listFuelRows(session.access_token, vehicleId);

    return {
      handled: true,
      data: buildFuelStats(rows, period),
    };
  }

  if (path === "/api/fuel" && method === "POST") {
    const body = await readJsonBody(input, init);

    const vehicleId = String(body.vehicleId ?? "").trim();
    const odometerKm = Number(body.odometerKm);
    const liters = Number(body.liters);
    const pricePerLiterSar = Number(body.pricePerLiterSar);
    const fuelGrade = String(body.fuelGrade ?? "91").trim();
    const filledAt = String(body.filledAt ?? new Date().toISOString()).trim();

    if (!vehicleId) {
      throw new ApiBridgeError("اختر المركبة أولًا.", 400);
    }

    if (!odometerKm || odometerKm <= 0) {
      throw new ApiBridgeError("قراءة العداد غير صحيحة.", 400);
    }

    if (!liters || liters <= 0) {
      throw new ApiBridgeError("كمية الوقود غير صحيحة.", 400);
    }

    if (!pricePerLiterSar || pricePerLiterSar <= 0) {
      throw new ApiBridgeError("سعر اللتر غير صحيح.", 400);
    }

    const vehicle = await getVehicleRow(vehicleId, session.access_token);
    if (!vehicle) {
      throw new ApiBridgeError("المركبة غير موجودة.", 404);
    }

    const pricePerLiterHalalas = Math.round(pricePerLiterSar * 100);
    const totalCostHalalas = Math.round(liters * pricePerLiterSar * 100);

    const rows = await supabaseRequest<FuelLogRow[]>(
      "/rest/v1/fuel_logs?select=*",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          user_id: session.user.id,
          filled_at: filledAt,
          odometer_km: odometerKm,
          liters,
          price_per_liter_halalas: pricePerLiterHalalas,
          total_cost_halalas: totalCostHalalas,
          fuel_grade: fuelGrade,
          station_name_ar:
            typeof body.stationNameAr === "string" && body.stationNameAr.trim()
              ? body.stationNameAr.trim()
              : null,
          is_full: Boolean(body.isFull ?? true),
          notes:
            typeof body.notes === "string" && body.notes.trim()
              ? body.notes.trim()
              : null,
        }),
      },
      session.access_token,
    );

    if (rows[0]) {
      await createNotificationIfMissing(session.access_token, {
        userId: session.user.id,
        vehicleId,
        type: "fuel",
        severity: "success",
        titleAr: "تم تسجيل تعبئة بنزين",
        bodyAr: `تم تسجيل ${Number(rows[0].liters).toFixed(2)} لتر بقيمة ${(rows[0].total_cost_halalas / 100).toFixed(2)} ر.س`,
        actionUrl: "/app/fuel",
        dedupeKey: `fuel:${rows[0].id}`,
      });
    }

    return { handled: true, data: toFuelLog(rows[0]), status: 201 };
  }

  const deleteMatch = path.match(/^\/api\/fuel\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const fuelLogId = decodeURIComponent(deleteMatch[1]);

    await supabaseRequest(
      `/rest/v1/fuel_logs?id=eq.${encodeURIComponent(fuelLogId)}`,
      { method: "DELETE" },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  return { handled: false };
}

async function handleVehicles(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  if (path === "/api/vehicles") {
    const session = await requireSession();

    if (method === "GET") {
      const rows = await listVehicleRows(session.access_token);
      return { handled: true, data: rows.map(toVehicle) };
    }

    if (method === "POST") {
      const body = await readJsonBody(input, init);
      const payload = vehiclePayloadFromBody(body, session.user.id);

      if (!payload.make || !payload.model || !payload.year) {
        throw new ApiBridgeError("بيانات المركبة ناقصة.", 400);
      }

      const rows = await supabaseRequest<VehicleRow[]>(
        "/rest/v1/vehicles?select=*",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        },
        session.access_token,
      );

      return { handled: true, data: toVehicle(rows[0]), status: 201 };
    }
  }

  const vehicleMatch = path.match(/^\/api\/vehicles\/([^/]+)(?:\/([^/]+))?$/);
  if (!vehicleMatch) return { handled: false };

  const [, vehicleId, action] = vehicleMatch;
  const session = await requireSession();

  if (action === "health-history" && method === "GET") {
    const row = await getVehicleRow(vehicleId, session.access_token);
    return { handled: true, data: healthTrend(row?.health_score ?? 100) };
  }

  if (action === "pair" && method === "POST") {
    const body = await readJsonBody(input, init);
    const adapterMac = String(body.adapterMac ?? "").trim();

    if (!adapterMac) {
      throw new ApiBridgeError("عنوان MAC مطلوب.", 400);
    }

    const rows = await supabaseRequest<VehicleRow[]>(
      `/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}&select=*`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ adapter_mac: adapterMac }),
      },
      session.access_token,
    );

    return { handled: true, data: toVehicle(rows[0]) };
  }

  if (!action && method === "GET") {
    const row = await getVehicleRow(vehicleId, session.access_token);
    if (!row) throw new ApiBridgeError("المركبة غير موجودة.", 404);
    return { handled: true, data: toVehicle(row) };
  }

  if (!action && method === "PATCH") {
    const body = await readJsonBody(input, init);
    const payload = {
      nickname: typeof body.nickname === "string" ? body.nickname : undefined,
      plate_number:
        typeof body.plateNumber === "string" ? body.plateNumber : undefined,
      odometer_km:
        body.odometerKm !== undefined ? Number(body.odometerKm) : undefined,
    };

    const rows = await supabaseRequest<VehicleRow[]>(
      `/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}&select=*`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      },
      session.access_token,
    );

    return { handled: true, data: toVehicle(rows[0]) };
  }

  if (!action && method === "DELETE") {
    await supabaseRequest(
      `/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}`,
      { method: "DELETE" },
      session.access_token,
    );

    return { handled: true, status: 204 };
  }

  return { handled: false };
}

async function handleDashboard(path: string): Promise<ApiBridgeResult> {
  const session = await requireSession();

  if (path === "/api/dashboard/overview") {
    const rows = await listVehicleRows(session.access_token);
    const maintenanceRows = await listMaintenanceLogs(session.access_token);
    const completedMaintenance = buildMaintenanceItems(maintenanceRows);
    const maintenanceRecommendations = buildMaintenanceRecommendations(maintenanceRows);
    const recommendationCounts = maintenanceCounts(maintenanceRecommendations);

    const avgHealthScore = rows.length
      ? Math.round(
          rows.reduce((sum, row) => sum + (row.health_score ?? 100), 0) /
            rows.length,
        )
      : 0;

    return {
      handled: true,
      data: {
        vehicleCount: rows.length,
        activeDtcCount: 0,
        criticalDtcCount: 0,
        upcomingMaintenanceCount: recommendationCounts.upcoming,
        overdueMaintenanceCount: recommendationCounts.overdue,
        scheduledMaintenanceCount: recommendationCounts.scheduled,
        completedMaintenanceCount: completedMaintenance.length,
        activeRecommendationsCount: maintenanceRecommendations.length,
        avgHealthScore,
        upcomingBookingCount: 0,
        totalSessionsLast30d: 0,
        kmDrivenLast30d: 0,
        estimatedSavingsSar: 0,
      },
    };
  }

  if (path === "/api/dashboard/health-trend") {
    const rows = await listVehicleRows(session.access_token);
    const avgHealthScore = rows.length
      ? Math.round(
          rows.reduce((sum, row) => sum + (row.health_score ?? 100), 0) /
            rows.length,
        )
      : 0;

    return { handled: true, data: healthTrend(avgHealthScore) };
  }

  if (path === "/api/dashboard/recent-activity") {
    const rows = await listVehicleRows(session.access_token);

    return {
      handled: true,
      data: rows.slice(0, 6).map((row) => ({
        id: `vehicle-${row.id}`,
        kind: "diagnostic_session",
        titleAr: `تمت إضافة ${row.make} ${row.model}`,
        subtitleAr: row.plate_number
          ? `لوحة ${row.plate_number}`
          : "مركبة مسجلة في مفك",
        vehicleId: row.id,
        severity: "info",
        occurredAt: row.created_at ?? new Date().toISOString(),
      })),
    };
  }

  return { handled: false };
}

function toNotification(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id ?? null,
    type: row.type,
    severity: row.severity,
    titleAr: row.title_ar,
    bodyAr: row.body_ar ?? null,
    actionUrl: row.action_url ?? null,
    isRead: row.is_read,
    readAt: row.read_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    dedupeKey: row.dedupe_key ?? null,
    createdAt: row.created_at,
  };
}

async function listNotificationRows(accessToken: string) {
  return supabaseRequest<NotificationRow[]>(
    "/rest/v1/notifications?select=*&order=created_at.desc&limit=50",
    { method: "GET" },
    accessToken,
  );
}

async function createNotificationIfMissing(
  accessToken: string,
  payload: {
    userId: string;
    vehicleId?: string | null;
    type: string;
    severity: string;
    titleAr: string;
    bodyAr?: string | null;
    actionUrl?: string | null;
    dedupeKey?: string | null;
    scheduledAt?: string | null;
  },
) {
  if (payload.dedupeKey) {
    const existing = await supabaseRequest<Pick<NotificationRow, "id">[]>(
      `/rest/v1/notifications?select=id&dedupe_key=eq.${encodeURIComponent(payload.dedupeKey)}&limit=1`,
      { method: "GET" },
      accessToken,
    );

    if (existing.length > 0) return null;
  }

  const rows = await supabaseRequest<NotificationRow[]>(
    "/rest/v1/notifications?select=*",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: payload.userId,
        vehicle_id: payload.vehicleId ?? null,
        type: payload.type,
        severity: payload.severity,
        title_ar: payload.titleAr,
        body_ar: payload.bodyAr ?? null,
        action_url: payload.actionUrl ?? null,
        dedupe_key: payload.dedupeKey ?? null,
        scheduled_at: payload.scheduledAt ?? null,
      }),
    },
    accessToken,
  );

  return rows[0] ?? null;
}

async function generateMaintenanceNotifications(accessToken: string, userId: string) {
  const rows = await listMaintenanceLogs(accessToken);
  const items = buildMaintenanceRecommendations(rows).filter((item: any) => {
    return item.status === "overdue" || item.status === "upcoming";
  });

  for (const item of items) {
    const isOverdue = item.status === "overdue";
    const label = item.serviceTypeAr || item.serviceType;

    const title = isOverdue
      ? `${label} متأخرة`
      : `${label} قريبة`;

    const dedupeKey = [
      "maintenance",
      item.vehicleId,
      item.serviceType,
      item.status,
      item.nextDueKm ?? item.nextDueAt ?? "na",
    ].join(":");

    await createNotificationIfMissing(accessToken, {
      userId,
      vehicleId: item.vehicleId,
      type: "recommendation",
      severity: isOverdue ? "critical" : "warning",
      titleAr: title,
      bodyAr: item.recommendationReason || "توجد توصية صيانة تحتاج مراجعتك.",
      actionUrl: "/app/recommendations",
      dedupeKey,
    });
  }
}

async function handleNotifications(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const session = await requireSession();

  if (path === "/api/notifications" && method === "GET") {
    await generateMaintenanceNotifications(session.access_token, session.user.id);
    const rows = await listNotificationRows(session.access_token);
    return { handled: true, data: rows.map(toNotification) };
  }

  if (path === "/api/notifications" && method === "POST") {
    const body = await readJsonBody(input, init);

    const row = await createNotificationIfMissing(session.access_token, {
      userId: session.user.id,
      vehicleId: typeof body.vehicleId === "string" ? body.vehicleId : null,
      type: String(body.type ?? "system"),
      severity: String(body.severity ?? "info"),
      titleAr: String(body.titleAr ?? "تنبيه"),
      bodyAr: typeof body.bodyAr === "string" ? body.bodyAr : null,
      actionUrl: typeof body.actionUrl === "string" ? body.actionUrl : null,
      dedupeKey: typeof body.dedupeKey === "string" ? body.dedupeKey : null,
      scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
    });

    return { handled: true, data: row ? toNotification(row) : { ok: true }, status: 201 };
  }

  if (path === "/api/notifications/read-all" && method === "PATCH") {
    await supabaseRequest(
      "/rest/v1/notifications?is_read=eq.false",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_read: true,
          read_at: new Date().toISOString(),
        }),
      },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  const readMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (readMatch && method === "PATCH") {
    const id = decodeURIComponent(readMatch[1]);

    await supabaseRequest(
      `/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_read: true,
          read_at: new Date().toISOString(),
        }),
      },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  const deleteMatch = path.match(/^\/api\/notifications\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const id = decodeURIComponent(deleteMatch[1]);

    await supabaseRequest(
      `/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE" },
      session.access_token,
    );

    return { handled: true, data: { ok: true } };
  }

  return { handled: false };
}

async function handleRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  if (typeof window === "undefined") return { handled: false };

  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const url = new URL(rawUrl, window.location.origin);
  const path = url.pathname;
  const method = (
    init?.method ||
    (input instanceof Request ? input.method : "GET")
  ).toUpperCase();

  if (!path.startsWith("/api")) return { handled: false };

  if (path === "/api/healthz") {
    return { handled: true, data: { status: "ok" } };
  }

  const profileResult = await handleProfile(path, method, input, init);
  if (profileResult.handled) return profileResult;

  const notificationResult = await handleNotifications(path, method, input, init);
  if (notificationResult.handled) return notificationResult;

  const vehicleResult = await handleVehicles(path, method, input, init);
  if (vehicleResult.handled) return vehicleResult;

  const dashboardResult = await handleDashboard(path);
  if (dashboardResult.handled) return dashboardResult;

  const maintenanceResult = await handleMaintenance(path, method, input, init);
  if (maintenanceResult.handled) return maintenanceResult;

  const fuelResult = await handleFuel(url, method, input, init);
  if (fuelResult.handled) return fuelResult;

  const recommendationResult = await handleRecommendations(path, method);
  if (recommendationResult.handled) return recommendationResult;

  const liveMatch = path.match(/^\/api\/diagnostics\/live\/([^/]+)$/);
  if (liveMatch && method === "GET") {
    await requireSession();
    return { handled: true, data: liveTelemetry(liveMatch[1]) };
  }

  if (path === "/api/dtc/trending" && method === "GET") {
    return { handled: true, data: [] };
  }

  if (path.startsWith("/api/dtc") && method === "GET") {
    await requireSession();
    return { handled: true, data: [] };
  }

  if (path.startsWith("/api/diagnostics/sessions") && method === "GET") {
    await requireSession();
    return { handled: true, data: [] };
  }

  if (path === "/api/workshops" && method === "GET") {
    return { handled: true, data: [] };
  }

  if (path === "/api/bookings" && method === "GET") {
    await requireSession();
    return { handled: true, data: [] };
  }

  if (path === "/api/ai/chat" && method === "POST") {
    await requireSession();
    return {
      handled: true,
      data: {
        reply:
          "المساعد الذكي جاهز مبدئيًا. اربط قاعدة المعرفة أو مزود الذكاء لاحقًا لتفسير الأعطال بشكل كامل.",
        suggestedActions: [],
      },
    };
  }

  return { handled: false };
}

function toProfile(row: UserRow) {
  return {
    userId: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone,
    role: row.role || "user",
  };
}

async function handleProfile(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  if (path !== "/api/profile") return { handled: false };

  const session = await requireSession();

  if (method === "GET") {
    const rows = await supabaseRequest<UserRow[]>(
      `/rest/v1/users?select=id,name,email,phone,role&id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
      { method: "GET" },
      session.access_token,
    );

    const row = rows[0];

    if (!row) {
      throw new ApiBridgeError("لم يتم العثور على الملف الشخصي.", 404);
    }

    return { handled: true, data: toProfile(row) };
  }

  if (method === "PATCH") {
    const body = await readJsonBody(input, init);

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    if (!name) throw new ApiBridgeError("الاسم مطلوب.", 400);
    if (!phone) throw new ApiBridgeError("رقم الجوال مطلوب.", 400);

    const rows = await supabaseRequest<UserRow[]>(
      `/rest/v1/users?id=eq.${encodeURIComponent(session.user.id)}&select=id,name,email,phone,role`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ name, phone }),
      },
      session.access_token,
    );

    const row = rows[0];

    if (!row) {
      throw new ApiBridgeError("تعذر تحديث الملف الشخصي.", 500);
    }

    return { handled: true, data: toProfile(row) };
  }

  return { handled: false };
}


function jsonResponse(data: unknown, status = 200) {
  if (status === 204) {
    return new Response(null, { status });
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function installSupabaseApiBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    try {
      const result = await handleRequest(input, init);
      if (result.handled) {
        return jsonResponse(result.data ?? null, result.status ?? 200);
      }
    } catch (error) {
      const status = error instanceof ApiBridgeError ? error.status : 500;
      const message =
        error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      return jsonResponse({ error: message }, status);
    }

    return originalFetch(input, init);
  };
}

installSupabaseApiBridge();
