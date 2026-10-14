import {
  getValidSupabaseSession,
  supabaseRequest,
} from "@/lib/supabase";
import {
  buildDtcRecommendation,
  buildMaintenanceRecommendation as engineBuildMaintenanceRecommendation,
  buildTelemetryRecommendations as engineTelemetryRecommendations,
  visibleRecommendations,
} from "@/lib/maintenance-engine.mjs";
import {
  buildRepeatedCoolantAnomaly,
  describeVehicleLink,
  evaluateVehicleHealth,
  isFreshTimestamp,
  maintenanceIdempotencyKey,
} from "@/lib/vehicle-health-engine.mjs";
import {
  isAnomalyDetectionEnabled,
  isApprovalLoggingEnabled,
  isHealthIntelligenceEnabled,
  isOdometerTrackingEnabled,
} from "@/lib/health-intelligence-flags";
import {
  applyMaintenanceLogToLifecycle,
  applyOverlay,
  getLifecycleOverlay,
  recStorageKey,
  recordRecommendationAction,
} from "@/lib/recommendation-lifecycle";
import {
  assertOdometerWrite,
  buildMaintenanceLogInsert,
  committedOdometerResponse,
  isMissingTableError,
  isUnknownColumnError,
  maintenanceInsertFallbacks,
} from "@/lib/qa-write-guards.mjs";
import { computeNextDue, computeScheduleStatus, serviceLabelAr } from "@/lib/maintenance-engine.mjs";

type VehicleRow = {
  id: string;
  user_id: string;
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

type UserRow = {
  id: string;
  role?: string | null;
  subscription_tier?: string | null;
  is_active?: boolean | null;
};

type SubscriptionUserRow = UserRow & {
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  subscription_auto_renew?: boolean | null;
};

type MaintenanceLogRow = {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_type: string;
  custom_service_name?: string | null;
  done_at: string;
  done_at_km?: number | null;
  actual_cost_sar?: number | string | null;
  cost_sar?: number | string | null;
  notes?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string | null;
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
  is_full?: boolean | null;
  notes?: string | null;
};

type DiagnosticCodeRow = {
  id: string;
  user_id: string;
  vehicle_id: string;
  code: string;
  title?: string | null;
  severity?: string | null;
  explanation?: string | null;
  status?: string | null;
  detected_at?: string | null;
  vehicles?: {
    make?: string | null;
    model?: string | null;
    nickname?: string | null;
  } | null;
};

type TelemetryRow = {
  time: string;
  vehicle_id: string;
  session_id?: string | null;
  rpm?: number | null;
  speed_kmh?: number | null;
  coolant_temp?: number | null;
  intake_temp?: number | null;
  battery_v?: number | string | null;
  fuel_level_pct?: number | null;
  engine_load?: number | null;
  throttle_pos?: number | null;
};

type SubscriptionPlanRow = {
  id: string;
  name: string;
  name_ar: string;
  description_ar?: string | null;
  price_monthly_sar: number;
  price_yearly_sar?: number | null;
  max_vehicles?: number | null;
  tier?: string | null;
  features?: string[] | null;
  features_ar?: string[] | null;
  is_popular?: boolean | null;
  sort_order?: number | null;
};

const FALLBACK_SUBSCRIPTION_PLANS: SubscriptionPlanRow[] = [
  {
    id: "free",
    name: "Free",
    name_ar: "باقة مجانية",
    description_ar: "إدارة مركبة واحدة بدون جهاز وبدون دفع",
    price_monthly_sar: 0,
    price_yearly_sar: 0,
    max_vehicles: 1,
    tier: "free",
    features: ["One vehicle", "Maintenance log", "Fuel log"],
    features_ar: ["مركبة واحدة", "سجل الصيانة", "سجل البنزين والصرفية"],
    is_popular: false,
    sort_order: 1,
  },
  {
    id: "mofk",
    name: "Mofk",
    name_ar: "باقة مفك",
    description_ar: "اشتراك مدفوع لمركبة واحدة مع جهاز مفك OBD",
    price_monthly_sar: 29,
    price_yearly_sar: 290,
    max_vehicles: 1,
    tier: "mofk",
    features: ["OBD diagnostics", "Unlimited AI assistant", "PDF export"],
    features_ar: ["تشخيص OBD", "رسائل المساعد الذكي غير محدودة", "تصدير PDF"],
    is_popular: true,
    sort_order: 2,
  },
  {
    id: "family",
    name: "Family",
    name_ar: "باقة العائلة",
    description_ar: "لعدة مركبات مع تقارير أعمق وتصدير PDF",
    price_monthly_sar: 59,
    price_yearly_sar: 590,
    max_vehicles: 3,
    tier: "family",
    features: ["Up to 3 vehicles", "Advanced health reports", "Priority support"],
    features_ar: ["حتى 3 مركبات", "تقارير صحة متقدمة", "دعم أولوية"],
    is_popular: false,
    sort_order: 3,
  },
  {
    id: "fleet",
    name: "Fleet",
    name_ar: "باقة الاسطول",
    description_ar: "للشركات: التفاصيل والتسعير في الموقع",
    price_monthly_sar: 0,
    price_yearly_sar: null,
    max_vehicles: null,
    tier: "fleet",
    features: [],
    features_ar: [],
    is_popular: false,
    sort_order: 4,
  },
];

type BookingRow = {
  id: string;
  vehicle_id?: string | null;
  workshop_name?: string | null;
  service_type_ar?: string | null;
  scheduled_at: string;
  status: string;
  vehicles?: {
    make?: string | null;
    model?: string | null;
  } | null;
};

type RecommendationRow = {
  id: string;
  vehicle_id: string;
  kind?: string | null;
  severity?: string | null;
  title_ar: string;
  description_ar?: string | null;
  confidence_pct?: number | null;
  suggested_action?: string | null;
  suggested_cost_sar?: number | null;
  created_at?: string | null;
};

type DeviceOrderRow = {
  id: string;
  status: string;
  created_at: string;
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
  dedupe_key?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
};

type ApiBridgeResult =
  | {
      handled: true;
      data?: unknown;
      status?: number;
    }
  | {
      handled: false;
    };

type MaintenanceRule = {
  intervalKm?: number;
  intervalDays?: number;
  soonKm?: number;
  soonDays?: number;
  estimatedCost?: number;
};

let installed = false;

class ApiBridgeError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
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

async function requireSession() {
  const session = await getValidSupabaseSession();

  if (!session?.access_token || !session.user?.id) {
    throw new ApiBridgeError("يلزم تسجيل الدخول أولًا.", 401);
  }

  return session;
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
    odometerKm: Number(row.odometer_km ?? 0),
    fuelType: row.fuel_type ?? "petrol",
    engineCc: row.engine_cc ?? null,
    adapterMac: row.adapter_mac ?? null,
    healthScore: Number(row.health_score ?? 100),
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    activeDtcCount: 0,
    upcomingMaintenanceCount: 0,
    lastSessionAt: null,
    totalSessions: 0,
    isPaired: Boolean(row.adapter_mac),
  };
}

function vehiclePayloadFromBody(
  body: Record<string, unknown>,
  userId: string,
) {
  return {
    user_id: userId,
    vin:
      typeof body.vin === "string" && body.vin.trim()
        ? body.vin.trim()
        : null,
    make: String(body.make ?? "").trim(),
    model: String(body.model ?? "").trim(),
    year: Number(body.year),
    plate_number:
      typeof body.plateNumber === "string" &&
      body.plateNumber.trim()
        ? body.plateNumber.trim()
        : null,
    nickname:
      typeof body.nickname === "string" &&
      body.nickname.trim()
        ? body.nickname.trim()
        : null,
    odometer_km: Number(body.odometerKm ?? 0) || 0,
    fuel_type: String(body.fuelType ?? "petrol"),
    engine_cc:
      body.engineCc !== undefined &&
      body.engineCc !== null &&
      body.engineCc !== ""
        ? Number(body.engineCc)
        : null,
  };
}

async function listVehicleRows(
  accessToken: string,
  userId: string,
) {
  return supabaseRequest<VehicleRow[]>(
    `/rest/v1/vehicles?select=*&user_id=eq.${encodeURIComponent(
      userId,
    )}&order=created_at.desc`,
    {
      method: "GET",
    },
    accessToken,
  );
}

async function getCurrentUserAccess(
  userId: string,
  accessToken: string,
) {
  const rows = await supabaseRequest<UserRow[]>(
    `/rest/v1/users?select=id,role,subscription_tier,is_active&id=eq.${encodeURIComponent(
      userId,
    )}&limit=1`,
    {
      method: "GET",
    },
    accessToken,
  );

  return rows[0] ?? null;
}

function vehicleLimitForTier(tier?: string | null) {
  switch (tier) {
    case "fleet":
      return null;
    case "family":
      return 3;
    case "premium":
    case "pro":
      return 3;
    case "plus":
    case "mofk":
    case "free":
    default:
      return 1;
  }
}

function upgradeRequiredMessage(tier?: string | null, limit = 1) {
  const currentPlan =
    tier === "plus" || tier === "mofk"
      ? "باقة مفك"
      : tier === "free"
        ? "الباقة المجانية"
        : "باقتك الحالية";

  return `لا يمكن إضافة مركبة جديدة. ${currentPlan} تسمح بـ ${limit} مركبة فقط، وتحتاج ترقية الباقة لإضافة مركبة أخرى.`;
}

async function assertCanCreateVehicle(
  session: Awaited<ReturnType<typeof requireSession>>,
) {
  const access = await getCurrentUserAccess(
    session.user.id,
    session.access_token,
  );

  if (access?.is_active === false) {
    throw new ApiBridgeError(
      "حسابك غير نشط حالياً. تواصل مع الدعم.",
      403,
    );
  }

  if (access?.role === "admin") {
    return;
  }

  const limit = vehicleLimitForTier(access?.subscription_tier);

  if (limit === null) {
    return;
  }

  const rows = await listVehicleRows(
    session.access_token,
    session.user.id,
  );

  if (rows.length >= limit) {
    throw new ApiBridgeError(
      upgradeRequiredMessage(access?.subscription_tier, limit),
      403,
    );
  }
}

async function getVehicleRow(
  vehicleId: string,
  accessToken: string,
  userId: string,
) {
  const rows = await supabaseRequest<VehicleRow[]>(
    `/rest/v1/vehicles?select=*&id=eq.${encodeURIComponent(
      vehicleId,
    )}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      method: "GET",
    },
    accessToken,
  );

  return rows?.[0] ?? null;
}

async function listMaintenanceLogs(
  accessToken: string,
  userId: string,
  vehicleId?: string,
) {
  const vehicleFilter = vehicleId
    ? `&vehicle_id=eq.${encodeURIComponent(vehicleId)}`
    : "";
  const query = `/rest/v1/maintenance_logs?select=*,vehicles(make,model,nickname,odometer_km)&user_id=eq.${encodeURIComponent(
    userId,
  )}${vehicleFilter}&order=done_at.desc`;
  try {
    return await supabaseRequest<MaintenanceLogRow[]>(query, { method: "GET" }, accessToken);
  } catch (error) {
    if (!isUnknownColumnError(error) && !/embed|relationship/i.test(String(error))) {
      throw error;
    }
    return supabaseRequest<MaintenanceLogRow[]>(
      `/rest/v1/maintenance_logs?select=*&user_id=eq.${encodeURIComponent(
        userId,
      )}${vehicleFilter}&order=done_at.desc`,
      { method: "GET" },
      accessToken,
    );
  }
}

async function insertWithColumnFallback<T extends { id?: string }>(
  path: string,
  bodies: Record<string, unknown>[],
  accessToken: string,
): Promise<T> {
  let lastError: unknown;
  for (const body of bodies) {
    try {
      const rows = await supabaseRequest<T[]>(
        path,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
        },
        accessToken,
      );
      if (rows?.[0]) return rows[0];
      lastError = new ApiBridgeError("تعذر حفظ السجل.", 500);
    } catch (error) {
      lastError = error;
      const message = String(error instanceof Error ? error.message : error);
      if (/duplicate|unique|23505/i.test(message) && body.idempotency_key) {
        const existing = await supabaseRequest<T[]>(
          `${path.split("?")[0]}?idempotency_key=eq.${encodeURIComponent(String(body.idempotency_key))}&user_id=eq.${encodeURIComponent(String(body.user_id))}&select=*&limit=1`,
          { method: "GET" },
          accessToken,
        );
        if (existing?.[0]) return existing[0];
      }
      if (!isUnknownColumnError(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new ApiBridgeError("تعذر حفظ السجل.", 500);
}

async function persistVehicleOdometer(
  vehicleId: string,
  userId: string,
  km: number,
  accessToken: string,
) {
  const rows = await supabaseRequest<VehicleRow[]>(
    `/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}&user_id=eq.${encodeURIComponent(userId)}&select=*`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ odometer_km: km }),
    },
    accessToken,
  );
  if (!rows[0]) {
    throw new ApiBridgeError("تعذر تحديث عداد المركبة.", 500);
  }
  return rows[0];
}

async function upsertMaintenanceSchedule(
  vehicle: VehicleRow,
  input: { serviceType: string; doneAt: string; doneAtKm: number | null; costSar: number | null },
  accessToken: string,
) {
  const rule = MAINTENANCE_RULES[input.serviceType];
  if (!rule) return;
  const due = computeNextDue({
    lastDoneKm: input.doneAtKm,
    lastDoneAt: input.doneAt,
    intervalKm: rule.intervalKm,
    intervalDays: rule.intervalDays,
  });
  const statusInfo = computeScheduleStatus({
    ...due,
    odometerKm: Math.max(Number(vehicle.odometer_km ?? 0), Number(input.doneAtKm ?? 0)),
    soonKm: rule.soonKm,
    soonDays: rule.soonDays,
  });
  const payload = {
    vehicle_id: vehicle.id,
    service_type: input.serviceType,
    service_type_ar: serviceLabelAr(input.serviceType),
    interval_km: rule.intervalKm ?? null,
    interval_days: rule.intervalDays ?? null,
    last_done_km: input.doneAtKm,
    last_done_at: input.doneAt,
    next_due_km: due.nextDueKm,
    next_due_at: due.nextDueAt,
    status: statusInfo.status,
    estimated_cost: input.costSar ?? rule.estimatedCost ?? null,
  };
  try {
    const existing = await supabaseRequest<{ id: string }[]>(
      `/rest/v1/maintenance_schedule?vehicle_id=eq.${encodeURIComponent(vehicle.id)}&service_type=eq.${encodeURIComponent(input.serviceType)}&select=id`,
      { method: "GET" },
      accessToken,
    );
    if (existing[0]) {
      await supabaseRequest(
        `/rest/v1/maintenance_schedule?id=eq.${encodeURIComponent(existing[0].id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        accessToken,
      );
      return;
    }
    await supabaseRequest("/rest/v1/maintenance_schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, accessToken);
  } catch (error) {
    if (isMissingTableError(error) || isUnknownColumnError(error)) return;
    throw error;
  }
}

async function persistRecommendationResolution(
  vehicleId: string,
  serviceType: string,
  logId: string,
  accessToken: string,
) {
  try {
    await supabaseRequest(
      `/rest/v1/recommendations?vehicle_id=eq.${encodeURIComponent(vehicleId)}&source_key=eq.${encodeURIComponent(`maintenance:${serviceType}`)}&status=in.(active,upcoming,in_progress)`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          linked_maintenance_log_id: logId,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      },
      accessToken,
    );
  } catch (error) {
    if (isMissingTableError(error) || isUnknownColumnError(error)) return;
    throw error;
  }
}

function todayStart() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
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
    (targetStart.getTime() - todayStart().getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

function latestMaintenanceRows(rows: MaintenanceLogRow[]) {
  const latest = new Map<string, MaintenanceLogRow>();

  for (const row of rows) {
    if (!MAINTENANCE_RULES[row.service_type]) {
      continue;
    }

    const key = `${row.vehicle_id}:${row.service_type}`;
    const existing = latest.get(key);

    if (!existing) {
      latest.set(key, row);
      continue;
    }

    const currentTime = new Date(
      row.done_at || row.created_at || 0,
    ).getTime();

    const existingTime = new Date(
      existing.done_at || existing.created_at || 0,
    ).getTime();

    if (currentTime > existingTime) {
      latest.set(key, row);
    }
  }

  return Array.from(latest.values());
}

function buildMaintenanceRecommendation(
  row: MaintenanceLogRow,
) {
  const rule = MAINTENANCE_RULES[row.service_type];

  if (!rule) {
    return null;
  }

  const currentOdometerKm = Number(
    row.vehicles?.odometer_km ??
      row.done_at_km ??
      0,
  );

  const lastDoneKm =
    row.done_at_km !== null &&
    row.done_at_km !== undefined
      ? Number(row.done_at_km)
      : null;

  const nextDueKm =
    rule.intervalKm && lastDoneKm !== null
      ? lastDoneKm + rule.intervalKm
      : null;

  const nextDueAt =
    rule.intervalDays && row.done_at
      ? addDays(row.done_at, rule.intervalDays)
      : null;

  const remainingKm =
    nextDueKm !== null
      ? nextDueKm - currentOdometerKm
      : null;

  const remainingDays = nextDueAt
    ? daysUntil(nextDueAt)
    : null;

  const kmOverdue =
    remainingKm !== null && remainingKm < 0;

  const dayOverdue =
    remainingDays !== null && remainingDays < 0;

  const kmUpcoming =
    remainingKm !== null &&
    rule.soonKm !== undefined &&
    remainingKm >= 0 &&
    remainingKm <= rule.soonKm;

  const dayUpcoming =
    remainingDays !== null &&
    rule.soonDays !== undefined &&
    remainingDays >= 0 &&
    remainingDays <= rule.soonDays;

  let status:
    | "scheduled"
    | "upcoming"
    | "overdue" = "scheduled";

  if (kmOverdue || dayOverdue) {
    status = "overdue";
  } else if (kmUpcoming || dayUpcoming) {
    status = "upcoming";
  }

  return {
    id: `rec-${row.vehicle_id}-${row.service_type}`,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr:
      MAINTENANCE_LABELS[row.service_type] ||
      row.service_type,
    intervalKm: rule.intervalKm ?? null,
    intervalDays: rule.intervalDays ?? null,
    lastDoneKm,
    lastDoneAt: row.done_at ?? null,
    nextDueKm,
    nextDueAt,
    status,
    estimatedCost:
      row.cost_sar !== null &&
      row.cost_sar !== undefined
        ? Number(row.cost_sar)
        : rule.estimatedCost ?? null,
    vehicleNickname:
      row.vehicles?.nickname ?? null,
    vehicleMake: row.vehicles?.make ?? "",
    vehicleModel: row.vehicles?.model ?? "",
    daysUntilDue: remainingDays,
  };
}

function buildMaintenanceRecommendations(
  rows: MaintenanceLogRow[],
) {
  const statusRank = {
    overdue: 1,
    upcoming: 2,
    scheduled: 3,
  };

  return latestMaintenanceRows(rows)
    .map(buildMaintenanceRecommendation)
    .filter(
      (
        item,
      ): item is NonNullable<
        ReturnType<
          typeof buildMaintenanceRecommendation
        >
      > => Boolean(item),
    )
    .sort((a, b) => {
      return statusRank[a.status] -
        statusRank[b.status];
    });
}

function completedMaintenanceItem(
  row: MaintenanceLogRow,
) {
  const actualCostSar =
    row.actual_cost_sar ?? row.cost_sar ?? null;

  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr:
      row.service_type === "other" &&
      row.custom_service_name
        ? row.custom_service_name
        : MAINTENANCE_LABELS[row.service_type] ||
          row.service_type,
    customServiceName:
      row.custom_service_name ?? null,
    intervalKm: null,
    intervalDays: null,
    lastDoneKm: row.done_at_km ?? null,
    lastDoneAt: row.done_at ?? null,
    nextDueKm: null,
    nextDueAt: null,
    status: "done" as const,
    estimatedCost:
      actualCostSar !== null &&
      actualCostSar !== undefined
        ? Number(actualCostSar)
        : null,
    actualCostSar:
      actualCostSar !== null &&
      actualCostSar !== undefined
        ? Number(actualCostSar)
        : null,
    cost:
      actualCostSar !== null &&
      actualCostSar !== undefined
        ? Number(actualCostSar)
        : null,
    notes: row.notes ?? null,
    source: row.source ?? "manual",
    createdAt: row.created_at,
    updatedAt:
      row.updated_at ?? row.created_at,
    vehicleMake: row.vehicles?.make ?? null,
    vehicleModel: row.vehicles?.model ?? null,
    vehicleNickname: row.vehicles?.nickname ?? null,
    vehicleOdometerKm: row.vehicles?.odometer_km ?? null,
  };
}

function healthTrend(score: number) {
  const today = new Date();

  return Array.from(
    { length: 30 },
    (_, index) => {
      const date = new Date(today);

      date.setDate(
        today.getDate() - (29 - index),
      );

      return {
        date: date.toISOString(),
        score,
      };
    },
  );
}

function telemetryPointFromRow(row: TelemetryRow) {
  return {
    time: row.time,
    rpm: row.rpm ?? null,
    speedKmh: row.speed_kmh ?? null,
    coolantTemp: row.coolant_temp ?? null,
    intakeTemp: row.intake_temp ?? null,
    batteryV:
      row.battery_v === null ||
      row.battery_v === undefined
        ? null
        : Number(row.battery_v),
    fuelLevelPct: row.fuel_level_pct ?? null,
    engineLoad: row.engine_load ?? null,
    throttlePos: row.throttle_pos ?? null,
  };
}

async function latestTelemetryPoint(
  vehicleId: string,
  accessToken: string,
) {
  try {
    const rows =
      await supabaseRequest<TelemetryRow[]>(
        `/rest/v1/telemetry?select=time,vehicle_id,session_id,rpm,speed_kmh,coolant_temp,intake_temp,battery_v,fuel_level_pct,engine_load,throttle_pos&vehicle_id=eq.${encodeURIComponent(
          vehicleId,
        )}&order=time.desc&limit=1`,
        {
          method: "GET",
        },
        accessToken,
      );

    return rows[0]
      ? telemetryPointFromRow(rows[0])
      : null;
  } catch (error) {
    if (isMissingTelemetryTableError(error)) {
      return null;
    }

    throw error;
  }
}

function buildTelemetryRecommendations(
  vehicleId: string,
  latest: ReturnType<typeof telemetryPointFromRow> | null,
) {
  if (!latest) return [];

  const recs: ReturnType<typeof toRecommendation>[] = [];

  if (
    latest.coolantTemp != null &&
    latest.coolantTemp >= 105
  ) {
    recs.push({
      id: `telemetry-coolant-${vehicleId}`,
      vehicleId,
      kind: "telemetry_anomaly",
      severity: "critical",
      titleAr: "حرارة المحرك مرتفعة",
      descriptionAr: `آخر قراءة محفوظة لحرارة سائل التبريد ${Math.round(latest.coolantTemp)}°م. راجع التبريد قبل الصيانة الدورية.`,
      confidencePct: 90,
      suggestedAction: "أوقف القيادة إذا استمر الارتفاع وراجع نظام التبريد.",
      suggestedCostSar: null,
      createdAt: latest.time,
    });
  }

  if (
    latest.fuelLevelPct != null &&
    latest.fuelLevelPct <= 15
  ) {
    recs.push({
      id: `telemetry-fuel-${vehicleId}`,
      vehicleId,
      kind: "telemetry_anomaly",
      severity: "warning",
      titleAr: "الخزان يحتاج تعبئة",
      descriptionAr: `آخر قراءة محفوظة لمستوى البنزين ${Math.round(latest.fuelLevelPct)}%. سجّل التعبئة بعد المحطة.`,
      confidencePct: 86,
      suggestedAction: "افتح صفحة البنزين وسجّل التعبئة.",
      suggestedCostSar: null,
      createdAt: latest.time,
    });
  }

  if (
    latest.batteryV != null &&
    latest.batteryV > 0 &&
    latest.batteryV < 12.2
  ) {
    recs.push({
      id: `telemetry-battery-${vehicleId}`,
      vehicleId,
      kind: "telemetry_anomaly",
      severity: "warning",
      titleAr: "جهد البطارية منخفض",
      descriptionAr: `آخر قراءة محفوظة لجهد البطارية ${latest.batteryV.toFixed(1)} فولت. راقب البطارية مع الصيانة الدورية.`,
      confidencePct: 80,
      suggestedAction: "افحص البطارية والشحن عند أقرب صيانة.",
      suggestedCostSar: null,
      createdAt: latest.time,
    });
  }

  return recs;
}

function emptyLiveTelemetry(vehicleId: string) {
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

function isMissingTelemetryTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("telemetry") &&
    (message.includes("Could not find") ||
      message.includes("does not exist") ||
      message.includes("schema cache"))
  );
}

async function liveTelemetry(
  vehicleId: string,
  accessToken: string,
  userId: string,
) {
  const vehicle = await getVehicleRow(
    vehicleId,
    accessToken,
    userId,
  );

  if (!vehicle) {
    throw new ApiBridgeError(
      "المركبة غير موجودة.",
      404,
    );
  }

  const since = new Date(
    Date.now() - 30 * 60 * 1000,
  ).toISOString();

  let rows: TelemetryRow[] = [];

  try {
    rows =
      await supabaseRequest<TelemetryRow[]>(
        `/rest/v1/telemetry?select=time,vehicle_id,session_id,rpm,speed_kmh,coolant_temp,intake_temp,battery_v,fuel_level_pct,engine_load,throttle_pos&vehicle_id=eq.${encodeURIComponent(
          vehicleId,
        )}&time=gte.${encodeURIComponent(
          since,
        )}&order=time.desc&limit=60`,
        {
          method: "GET",
        },
        accessToken,
      );
  } catch (error) {
    if (!isMissingTelemetryTableError(error)) {
      throw error;
    }
  }

  if (!rows.length) {
    return {
      ...emptyLiveTelemetry(vehicleId),
      isConnected: false,
    };
  }

  const recent = rows
    .slice()
    .reverse()
    .map(telemetryPointFromRow);
  const latest = telemetryPointFromRow(rows[0]);
  const link = describeVehicleLink({
    adapterMac: vehicle.adapter_mac,
    lastTelemetryAt: latest.time,
  });

  return {
    vehicleId,
    isConnected: link.connected,
    latest,
    recent,
  };
}

function optionalNumber(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

async function saveTelemetryPoint(
  vehicleId: string,
  body: Record<string, unknown>,
  accessToken: string,
  userId: string,
) {
  const vehicle = await getVehicleRow(
    vehicleId,
    accessToken,
    userId,
  );

  if (!vehicle) {
    throw new ApiBridgeError(
      "المركبة غير موجودة.",
      404,
    );
  }

  const sessionId =
    typeof body.sessionId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.sessionId,
    )
      ? body.sessionId
      : null;

  const payload: Record<string, unknown> = {
    vehicle_id: vehicleId,
    time:
      typeof body.time === "string"
        ? body.time
        : new Date().toISOString(),
    rpm: optionalNumber(body.rpm),
    speed_kmh: optionalNumber(
      body.speedKmh,
    ),
    coolant_temp: optionalNumber(
      body.coolantTemp,
    ),
    intake_temp: optionalNumber(
      body.intakeTemp,
    ),
    battery_v: optionalNumber(
      body.batteryV,
    ),
    fuel_level_pct: optionalNumber(
      body.fuelLevelPct,
    ),
    engine_load: optionalNumber(
      body.engineLoad,
    ),
    throttle_pos: optionalNumber(
      body.throttlePos,
    ),
  };

  if (sessionId) {
    payload.session_id = sessionId;
  }

  try {
    const rows =
      await supabaseRequest<TelemetryRow[]>(
        "/rest/v1/telemetry?select=time,vehicle_id,session_id,rpm,speed_kmh,coolant_temp,intake_temp,battery_v,fuel_level_pct,engine_load,throttle_pos",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer:
              "return=representation",
          },
          body: JSON.stringify(payload),
        },
        accessToken,
      );

    return telemetryPointFromRow(rows[0]);
  } catch (error) {
    if (!isMissingTelemetryTableError(error)) {
      throw error;
    }

    return telemetryPointFromRow(payload as TelemetryRow);
  }
}

function toSubscriptionPlan(row: SubscriptionPlanRow) {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar,
    descriptionAr: row.description_ar ?? "",
    priceMonthlySar: Number(row.price_monthly_sar ?? 0),
    priceYearlySar:
      row.price_yearly_sar === null ||
      row.price_yearly_sar === undefined
        ? undefined
        : Number(row.price_yearly_sar),
    maxVehicles:
      row.max_vehicles === undefined ? null : row.max_vehicles,
    tier: row.tier ?? row.id,
    features: row.features ?? [],
    featuresAr: row.features_ar ?? [],
    isPopular: Boolean(row.is_popular),
  };
}

function toBooking(row: BookingRow) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id ?? null,
    vehicleMake: row.vehicles?.make ?? null,
    vehicleModel: row.vehicles?.model ?? null,
    workshopName: row.workshop_name ?? null,
    serviceTypeAr: row.service_type_ar ?? null,
    scheduledAt: row.scheduled_at,
    status: row.status,
  };
}

function normalizeDtcStatus(status?: string | null) {
  return status === "cleared" || status === "resolved"
    ? "cleared"
    : "active";
}

function normalizeDtcSeverity(severity?: string | null) {
  return severity === "low" ||
    severity === "medium" ||
    severity === "high" ||
    severity === "critical"
    ? severity
    : "medium";
}

function toDtcCode(row: DiagnosticCodeRow) {
  const severity = normalizeDtcSeverity(row.severity);

  return {
    id: row.id,
    sessionId: null,
    vehicleId: row.vehicle_id,
    vehicleMake: row.vehicles?.make ?? null,
    vehicleModel: row.vehicles?.model ?? null,
    code: row.code,
    status: normalizeDtcStatus(row.status),
    severity,
    descriptionEn: null,
    descriptionAr: row.title ?? row.explanation ?? row.code,
    possibleCauses: row.explanation ? [row.explanation] : [],
    estimatedCostMin: null,
    estimatedCostMax: null,
    recommendedAction:
      severity === "critical"
        ? "drive_now"
        : severity === "high"
          ? "schedule_week"
          : "monitor",
    actionReasonAr: row.explanation ?? null,
    detectedAt: row.detected_at ?? undefined,
    clearedAt: normalizeDtcStatus(row.status) === "cleared" ? row.detected_at ?? null : null,
  };
}

function toRecommendation(row: RecommendationRow) {
  const metadata = (row as { metadata?: Record<string, unknown> }).metadata ?? {};
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    kind: row.kind ?? "maintenance_due",
    severity: row.severity ?? "info",
    titleAr: row.title_ar,
    descriptionAr: row.description_ar ?? "",
    confidencePct: metadata.confidenceSource === "measured" ? row.confidence_pct ?? undefined : undefined,
    suggestedAction: row.suggested_action ?? null,
    suggestedCostSar: row.suggested_cost_sar ?? null,
    createdAt: row.created_at ?? undefined,
    status: (row as { status?: string }).status ?? "active",
    source: (row as { source?: string }).source ?? null,
    sourceKey: (row as { source_key?: string }).source_key ?? `legacy:${row.title_ar}`,
    category: (row as { category?: string }).category ?? null,
  };
}

async function readJsonBody(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const body = init?.body;

  if (
    typeof body === "string" &&
    body.trim()
  ) {
    return JSON.parse(body) as Record<
      string,
      unknown
    >;
  }

  if (
    typeof Request !== "undefined" &&
    input instanceof Request
  ) {
    const text = await input.clone().text();

    return text
      ? (JSON.parse(text) as Record<
          string,
          unknown
        >)
      : {};
  }

  return {};
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
      const rows = await listVehicleRows(
        session.access_token,
        session.user.id,
      );

      return {
        handled: true,
        data: rows.map(toVehicle),
      };
    }

    if (method === "POST") {
      const body = await readJsonBody(
        input,
        init,
      );

      const payload = vehiclePayloadFromBody(
        body,
        session.user.id,
      );

      if (
        !payload.make ||
        !payload.model ||
        !payload.year ||
        !payload.plate_number
      ) {
        throw new ApiBridgeError(
          "بيانات المركبة ناقصة.",
          400,
        );
      }

      await assertCanCreateVehicle(session);

      const rows =
        await supabaseRequest<VehicleRow[]>(
          "/rest/v1/vehicles?select=*",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Prefer:
                "return=representation",
            },
            body: JSON.stringify(payload),
          },
          session.access_token,
        );

      return {
        handled: true,
        data: toVehicle(rows[0]),
        status: 201,
      };
    }
  }

  const match = path.match(
    /^\/api\/vehicles\/([^/]+)(?:\/([^/]+))?$/,
  );

  if (!match) {
    return { handled: false };
  }

  const vehicleId = decodeURIComponent(
    match[1],
  );

  const action = match[2];
  const session = await requireSession();

  if (
    action === "health-history" &&
    method === "GET"
  ) {
    const row = await getVehicleRow(
      vehicleId,
      session.access_token,
      session.user.id,
    );

    return {
      handled: true,
      data: healthTrend(
        Number(row?.health_score ?? 100),
      ),
    };
  }

  if (
    action === "pair" &&
    method === "POST"
  ) {
    const body = await readJsonBody(
      input,
      init,
    );

    const adapterMac = String(
      body.adapterMac ?? "",
    ).trim();

    if (!adapterMac) {
      throw new ApiBridgeError(
        "عنوان MAC مطلوب.",
        400,
      );
    }

    const rows =
      await supabaseRequest<VehicleRow[]>(
        `/rest/v1/vehicles?id=eq.${encodeURIComponent(
          vehicleId,
        )}&user_id=eq.${encodeURIComponent(
          session.user.id,
        )}&select=*`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation",
          },
          body: JSON.stringify({
            adapter_mac: adapterMac,
          }),
        },
        session.access_token,
      );

    if (!rows[0]) {
      throw new ApiBridgeError(
        "المركبة غير موجودة.",
        404,
      );
    }

    return {
      handled: true,
      data: toVehicle(rows[0]),
    };
  }

  if (!action && method === "GET") {
    const row = await getVehicleRow(
      vehicleId,
      session.access_token,
      session.user.id,
    );

    if (!row) {
      throw new ApiBridgeError(
        "المركبة غير موجودة.",
        404,
      );
    }

    return {
      handled: true,
      data: toVehicle(row),
    };
  }

  if (!action && method === "PATCH") {
    const body = await readJsonBody(
      input,
      init,
    );

    const payload: Record<
      string,
      unknown
    > = {};

    if (
      typeof body.nickname === "string"
    ) {
      payload.nickname =
        body.nickname.trim() || null;
    }

    if (
      typeof body.plateNumber === "string"
    ) {
      payload.plate_number =
        body.plateNumber.trim() || null;
    }

    if (
      body.odometerKm !== undefined
    ) {
      const valid = assertOdometerWrite({
        km: Number(body.odometerKm),
        previousKm: Number(
          (await getVehicleRow(vehicleId, session.access_token, session.user.id))
            ?.odometer_km ?? 0,
        ),
        estimated: false,
      });
      if (!valid.ok) throw new ApiBridgeError(valid.error, 400);
      payload.odometer_km = valid.km;
    }

    const rows =
      await supabaseRequest<VehicleRow[]>(
        `/rest/v1/vehicles?id=eq.${encodeURIComponent(
          vehicleId,
        )}&user_id=eq.${encodeURIComponent(
          session.user.id,
        )}&select=*`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation",
          },
          body: JSON.stringify(payload),
        },
        session.access_token,
      );

    if (!rows[0]) {
      throw new ApiBridgeError(
        "المركبة غير موجودة.",
        404,
      );
    }

    if (payload.odometer_km !== undefined) {
      const logs = await listMaintenanceLogs(
        session.access_token,
        session.user.id,
        vehicleId,
      );
      for (const row of latestMaintenanceRows(logs)) {
        await upsertMaintenanceSchedule(
          rows[0],
          {
            serviceType: row.service_type,
            doneAt: row.done_at,
            doneAtKm: row.done_at_km ?? null,
            costSar: Number(row.actual_cost_sar ?? row.cost_sar ?? 0) || null,
          },
          session.access_token,
        );
      }
    }

    return {
      handled: true,
      data: toVehicle(rows[0]),
    };
  }

  if (!action && method === "DELETE") {
    await supabaseRequest(
      `/rest/v1/vehicles?id=eq.${encodeURIComponent(
        vehicleId,
      )}&user_id=eq.${encodeURIComponent(
        session.user.id,
      )}`,
      {
        method: "DELETE",
      },
      session.access_token,
    );

    return {
      handled: true,
      status: 204,
    };
  }

  return { handled: false };
}

async function handleDashboard(
  url: URL,
  method: string,
): Promise<ApiBridgeResult> {
  if (method !== "GET") {
    return { handled: false };
  }

  const path = url.pathname;
  const session = await requireSession();

  if (
    path === "/api/dashboard/overview"
  ) {
    const vehicles = await listVehicleRows(
      session.access_token,
      session.user.id,
    );

    const maintenanceRows =
      await listMaintenanceLogs(
        session.access_token,
        session.user.id,
      );

    const recommendations =
      buildMaintenanceRecommendations(
        maintenanceRows,
      );

    const avgHealthScore = vehicles.length
      ? Math.round(
          vehicles.reduce(
            (sum, row) =>
              sum +
              Number(
                row.health_score ?? 100,
              ),
            0,
          ) / vehicles.length,
        )
      : 0;

    return {
      handled: true,
      data: {
        vehicleCount: vehicles.length,
        activeDtcCount: 0,
        criticalDtcCount: 0,
        upcomingMaintenanceCount:
          recommendations.filter(
            (item) =>
              item.status === "upcoming",
          ).length,
        overdueMaintenanceCount:
          recommendations.filter(
            (item) =>
              item.status === "overdue",
          ).length,
        avgHealthScore,
        totalSessionsLast30d: 0,
        kmDrivenLast30d: 0,
        estimatedSavingsSar: 0,
      },
    };
  }

  if (
    path ===
    "/api/dashboard/health-trend"
  ) {
    const vehicles = await listVehicleRows(
      session.access_token,
      session.user.id,
    );

    const avgHealthScore = vehicles.length
      ? Math.round(
          vehicles.reduce(
            (sum, row) =>
              sum +
              Number(
                row.health_score ?? 100,
              ),
            0,
          ) / vehicles.length,
        )
      : 0;

    return {
      handled: true,
      data: healthTrend(avgHealthScore),
    };
  }

  if (
    path ===
    "/api/dashboard/recent-activity"
  ) {
    const limit = Math.min(
      50,
      Math.max(
        1,
        Number(
          url.searchParams.get("limit") ??
            12,
        ),
      ),
    );

    const vehicles = await listVehicleRows(
      session.access_token,
      session.user.id,
    );

    const maintenanceRows =
      await listMaintenanceLogs(
        session.access_token,
        session.user.id,
      );

    const vehicleActivities = vehicles.map(
      (row) => ({
        id: `vehicle-${row.id}`,
        kind: "diagnostic_session",
        titleAr: `تمت إضافة ${row.make} ${row.model}`,
        subtitleAr: row.plate_number
          ? `لوحة ${row.plate_number}`
          : "مركبة مسجلة في مفك",
        vehicleId: row.id,
        severity: "info",
        occurredAt:
          row.created_at ??
          new Date().toISOString(),
      }),
    );

    const maintenanceActivities =
      maintenanceRows.map((row) => ({
        id: `maintenance-${row.id}`,
        kind: "maintenance_done",
        titleAr: `تم تسجيل ${
          MAINTENANCE_LABELS[
            row.service_type
          ] || row.service_type
        }`,
        subtitleAr:
          row.vehicles?.nickname ||
          [
            row.vehicles?.make,
            row.vehicles?.model,
          ]
            .filter(Boolean)
            .join(" ") ||
          "صيانة مسجلة",
        vehicleId: row.vehicle_id,
        severity: "info",
        occurredAt:
          row.created_at ??
          row.done_at ??
          new Date().toISOString(),
      }));

    const activities = [
      ...maintenanceActivities,
      ...vehicleActivities,
    ]
      .sort(
        (a, b) =>
          new Date(
            b.occurredAt,
          ).getTime() -
          new Date(
            a.occurredAt,
          ).getTime(),
      )
      .slice(0, limit);

    return {
      handled: true,
      data: activities,
    };
  }

  return { handled: false };
}

async function handleMaintenance(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const session = await requireSession();

  if (
    path === "/api/maintenance/logs" &&
    method === "GET"
  ) {
    const rows = await listMaintenanceLogs(
      session.access_token,
      session.user.id,
    );

    return {
      handled: true,
      data: rows.map(completedMaintenanceItem),
    };
  }

  if (
    path ===
      "/api/maintenance/upcoming" &&
    method === "GET"
  ) {
    const rows = await listMaintenanceLogs(
      session.access_token,
      session.user.id,
    );

    return {
      handled: true,
      data:
        buildMaintenanceRecommendations(
          rows,
        ),
    };
  }

  const scheduleMatch = path.match(
    /^\/api\/maintenance\/([^/]+)\/schedule$/,
  );

  if (
    scheduleMatch &&
    method === "GET"
  ) {
    const vehicleId = decodeURIComponent(
      scheduleMatch[1],
    );

    const rows = await listMaintenanceLogs(
      session.access_token,
      session.user.id,
      vehicleId,
    );

    return {
      handled: true,
      data:
        buildMaintenanceRecommendations(
          rows,
        ),
    };
  }

  const logMatch = path.match(
    /^\/api\/maintenance\/([^/]+)\/log$/,
  );
  const createLogMatch =
    path === "/api/maintenance/logs" &&
    method === "POST";

  if (
    (logMatch && method === "POST") ||
    createLogMatch
  ) {
    const body = await readJsonBody(
      input,
      init,
    );

    const vehicleId = logMatch
      ? decodeURIComponent(logMatch[1])
      : String(body.vehicleId ?? "");

    const vehicle = await getVehicleRow(
      vehicleId,
      session.access_token,
      session.user.id,
    );

    if (!vehicle) {
      throw new ApiBridgeError(
        "المركبة غير موجودة.",
        404,
      );
    }

    const serviceType = String(
      body.serviceType ?? "",
    ).trim();

    const doneAt = String(
      body.doneAt ??
        new Date().toISOString(),
    ).trim();

    const doneAtKm =
      body.doneAtKm !== undefined &&
      body.doneAtKm !== null &&
      body.doneAtKm !== ""
        ? Number(body.doneAtKm)
        : null;
    const actualCostSar =
      body.actualCostSar !==
        undefined &&
      body.actualCostSar !== null &&
      body.actualCostSar !== ""
        ? Number(body.actualCostSar)
        : body.cost !== undefined &&
            body.cost !== null &&
            body.cost !== ""
          ? Number(body.cost)
          : null;
    const customServiceName =
      typeof body.customServiceName ===
        "string" &&
      body.customServiceName.trim()
        ? body.customServiceName.trim()
        : null;

    if (!serviceType) {
      throw new ApiBridgeError(
        "نوع الصيانة مطلوب.",
        400,
      );
    }

    if (
      doneAtKm !== null &&
      (!Number.isFinite(doneAtKm) ||
        doneAtKm < 0)
    ) {
      throw new ApiBridgeError(
        "قراءة العداد غير صحيحة.",
        400,
      );
    }

    const insertRow = buildMaintenanceLogInsert({
      vehicleId,
      userId: session.user.id,
      serviceType,
      customServiceName,
      doneAt,
      doneAtKm,
      costSar: actualCostSar,
      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
      source: String(body.source ?? "manual"),
      recommendationId:
        typeof body.recommendationId === "string" ? body.recommendationId : null,
      idempotencyKey: maintenanceIdempotencyKey({
        userId: session.user.id,
        vehicleId,
        serviceType,
        doneAt,
        doneAtKm,
      }),
      serviceTypeAr:
        serviceType === "other" && customServiceName
          ? customServiceName
          : MAINTENANCE_LABELS[serviceType] || serviceType,
    });

    const saved = await insertWithColumnFallback<MaintenanceLogRow>(
      "/rest/v1/maintenance_logs?select=*",
      maintenanceInsertFallbacks(insertRow),
      session.access_token,
    );

    if (doneAtKm != null && doneAtKm > Number(vehicle.odometer_km ?? 0)) {
      await persistVehicleOdometer(vehicleId, session.user.id, doneAtKm, session.access_token);
    }
    await upsertMaintenanceSchedule(
      vehicle,
      { serviceType, doneAt, doneAtKm, costSar: actualCostSar },
      session.access_token,
    );
    await persistRecommendationResolution(vehicleId, serviceType, saved.id, session.access_token);
    await applyMaintenanceLogToLifecycle({
      vehicleId,
      serviceType,
      logId: saved.id,
      recommendationId:
        typeof body.recommendationId === "string"
          ? body.recommendationId
          : null,
    });

    return {
      handled: true,
      data: completedMaintenanceItem(saved),
      status: 201,
    };
  }

  const updateLogMatch = path.match(/^\/api\/maintenance\/logs\/([^/]+)$/);
  if (updateLogMatch && method === "GET") {
    const id = decodeURIComponent(updateLogMatch[1]);
    let rows: MaintenanceLogRow[] = [];
    try {
      rows = await supabaseRequest<MaintenanceLogRow[]>(
        `/rest/v1/maintenance_logs?select=*,vehicles(make,model,nickname,odometer_km)&id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.user.id)}`,
        { method: "GET" },
        session.access_token,
      );
    } catch (error) {
      if (!isUnknownColumnError(error) && !/embed|relationship/i.test(String(error))) {
        throw error;
      }
      rows = await supabaseRequest<MaintenanceLogRow[]>(
        `/rest/v1/maintenance_logs?select=*&id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.user.id)}`,
        { method: "GET" },
        session.access_token,
      );
    }
    if (!rows[0]) {
      throw new ApiBridgeError("سجل الصيانة غير موجود.", 404);
    }
    return { handled: true, data: completedMaintenanceItem(rows[0]) };
  }
  if (updateLogMatch && (method === "PATCH" || method === "DELETE")) {
    const id = decodeURIComponent(updateLogMatch[1]);

    if (method === "DELETE") {
      await supabaseRequest(
        `/rest/v1/maintenance_logs?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.user.id)}`,
        { method: "DELETE" },
        session.access_token,
      );
      return { handled: true, status: 204 };
    }

    const body = await readJsonBody(input, init);
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.serviceType === "string") {
      patch.service_type = body.serviceType.trim();
    }
    if (typeof body.customServiceName === "string") {
      patch.custom_service_name = body.customServiceName.trim() || null;
    }
    if (body.doneAt) {
      patch.done_at = String(body.doneAt);
    }
    if (body.doneAtKm !== undefined) {
      const doneAtKm =
        body.doneAtKm === "" || body.doneAtKm === null
          ? null
          : Number(body.doneAtKm);
      if (doneAtKm !== null && (!Number.isFinite(doneAtKm) || doneAtKm < 0)) {
        throw new ApiBridgeError("قراءة العداد غير صحيحة.", 400);
      }
      patch.done_at_km = doneAtKm;
    }
    if (body.actualCostSar !== undefined || body.cost !== undefined) {
      const value = body.actualCostSar ?? body.cost;
      const actualCostSar =
        value === "" || value === null ? null : Number(value);
      if (
        actualCostSar !== null &&
        (!Number.isFinite(actualCostSar) || actualCostSar < 0)
      ) {
        throw new ApiBridgeError("التكلفة غير صحيحة.", 400);
      }
      patch.cost_sar = actualCostSar;
    }
    if (typeof body.notes === "string" || body.notes === null) {
      patch.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }
    if (typeof body.source === "string") {
      patch.source = body.source;
    }

    const rows = await supabaseRequest<MaintenanceLogRow[]>(
      `/rest/v1/maintenance_logs?select=*&id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.user.id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(patch),
      },
      session.access_token,
    );

    if (!rows[0]) {
      throw new ApiBridgeError("سجل الصيانة غير موجود.", 404);
    }

    return {
      handled: true,
      data: completedMaintenanceItem(rows[0]),
    };
  }

  const invoiceMatch = path.match(/^\/api\/maintenance\/logs\/([^/]+)\/invoice$/);
  if (invoiceMatch && (method === "GET" || method === "POST")) {
    const logId = decodeURIComponent(invoiceMatch[1]);
    const logs = await supabaseRequest<MaintenanceLogRow[]>(
      `/rest/v1/maintenance_logs?select=*&id=eq.${encodeURIComponent(logId)}&user_id=eq.${encodeURIComponent(session.user.id)}`,
      { method: "GET" },
      session.access_token,
    );
    const log = logs[0];
    if (!log) throw new ApiBridgeError("سجل الصيانة غير موجود.", 404);
    if (method === "GET") {
      try {
        const rows = await supabaseRequest<
          { id: string; storage_path: string; mime_type?: string; kind?: string }[]
        >(
          `/rest/v1/maintenance_attachments?select=*&log_id=eq.${encodeURIComponent(logId)}&user_id=eq.${encodeURIComponent(session.user.id)}&order=created_at.desc&limit=1`,
          { method: "GET" },
          session.access_token,
        );
        return { handled: true, data: rows[0] ?? null };
      } catch (error) {
        if (isMissingTableError(error) || isUnknownColumnError(error)) {
          return { handled: true, data: null };
        }
        throw error;
      }
    }
    const body = await readJsonBody(input, init);
    const storagePath = String(body.storagePath || body.uri || "").trim();
    if (!storagePath) throw new ApiBridgeError("مسار الفاتورة مطلوب.", 400);
    try {
      const rows = await supabaseRequest<{ id: string }[]>(
        "/rest/v1/maintenance_attachments?select=*",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            log_id: logId,
            user_id: session.user.id,
            vehicle_id: log.vehicle_id,
            storage_path: storagePath,
            mime_type: body.mime || body.mimeType || null,
            kind: body.kind || "invoice",
          }),
        },
        session.access_token,
      );
      if (!rows[0]) throw new ApiBridgeError("تعذر ربط الفاتورة بالسجل.", 500);
      return { handled: true, status: 201, data: rows[0] };
    } catch (error) {
      if (isMissingTableError(error) || isUnknownColumnError(error)) {
        throw new ApiBridgeError(
          "جدول مرفقات الفواتير غير متاح في بيئة QA. لم يُعتبر الرفع سحابيًا ناجحًا.",
          503,
        );
      }
      throw error;
    }
  }

  return { handled: false };
}

function entitlementTier(raw?: string | null) {
  const value = String(raw || "free").toLowerCase();
  if (value === "plus" || value === "mofk" || value === "individual-basic") return "mofk";
  if (
    value === "premium" ||
    value === "pro" ||
    value === "family" ||
    value === "individual-advanced"
  ) {
    return "family";
  }
  if (value === "fleet") return "fleet";
  return value || "free";
}

function periodEnd(cycle: string) {
  const ends = new Date();
  if (cycle === "yearly" || cycle === "annual") {
    ends.setFullYear(ends.getFullYear() + 1);
  } else {
    ends.setMonth(ends.getMonth() + 1);
  }
  return ends.toISOString();
}

async function latestAccountSubscription(accessToken: string, userId: string) {
  try {
    const rows = await supabaseRequest<
      Array<{
        plan?: string | null;
        plan_id?: string | null;
        status?: string | null;
        started_at?: string | null;
        created_at?: string | null;
        ends_at?: string | null;
        current_period_end?: string | null;
      }>
    >(
      `/rest/v1/subscriptions?select=*&user_id=eq.${encodeURIComponent(
        userId,
      )}&order=created_at.desc&limit=5`,
      { method: "GET" },
      accessToken,
    );
    return (
      rows.find((row) => String(row.status || "").toLowerCase() !== "cancelled") ??
      rows[0] ??
      null
    );
  } catch {
    return null;
  }
}

async function handleSubscriptions(
  path: string,
  method: string,
  input?: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  if (path === "/api/subscriptions/activate" && method === "POST") {
    const session = await requireSession();
    const body = await readJsonBody(input as RequestInfo | URL, init);
    const planId = entitlementTier(String(body.planId ?? body.tier ?? ""));
    const billingCycle = String(body.billingCycle ?? "monthly");
    if (!planId || planId === "free") {
      throw new ApiBridgeError("اختر باقة مفك أو العائلة لتفعيلها على حسابك.", 400);
    }
    const startedAt = new Date().toISOString();
    const endsAt = periodEnd(billingCycle);

    await supabaseRequest(
      `/rest/v1/users?id=eq.${encodeURIComponent(session.user.id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          subscription_tier: planId,
          subscription_started_at: startedAt,
          subscription_ends_at: endsAt,
          subscription_auto_renew: true,
        }),
      },
      session.access_token,
    );

    const rows = await supabaseRequest<SubscriptionUserRow[]>(
      `/rest/v1/users?select=subscription_tier,subscription_started_at,subscription_ends_at,subscription_auto_renew,is_active&id=eq.${encodeURIComponent(
        session.user.id,
      )}&limit=1`,
      { method: "GET" },
      session.access_token,
    );

    if (entitlementTier(rows[0]?.subscription_tier) !== planId) {
      throw new ApiBridgeError(
        "تعذر حفظ الباقة على الحساب. حدّث صلاحيات users.subscription_tier أو أعد تسجيل الدخول بعد تطبيق المنح.",
        403,
      );
    }

    const subscriptionPayloads = [
      {
        user_id: session.user.id,
        plan_id: planId,
        billing_cycle: billingCycle === "yearly" ? "annual" : "monthly",
        status: "active",
        current_period_end: endsAt,
      },
      {
        user_id: session.user.id,
        plan: planId,
        status: "active",
        started_at: startedAt,
        ends_at: endsAt,
      },
    ];
    for (const payload of subscriptionPayloads) {
      try {
        await supabaseRequest(
          "/rest/v1/subscriptions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(payload),
          },
          session.access_token,
        );
        break;
      } catch {
        /* Try the next subscriptions table shape. */
      }
    }

    return {
      handled: true,
      data: {
        tier: entitlementTier(rows[0].subscription_tier),
        status: "active",
        startedAt: rows[0].subscription_started_at ?? startedAt,
        endsAt: rows[0].subscription_ends_at ?? endsAt,
        autoRenew: rows[0].subscription_auto_renew ?? true,
      },
    };
  }

  if (method !== "GET") {
    return { handled: false };
  }

  if (path === "/api/subscriptions/plans") {
    const rows = await supabaseRequest<SubscriptionPlanRow[]>(
      "/rest/v1/subscription_plans?select=*&order=sort_order.asc",
      {
        method: "GET",
      },
    );

    return {
      handled: true,
      data: (rows.length ? rows : FALLBACK_SUBSCRIPTION_PLANS).map(toSubscriptionPlan),
    };
  }

  if (path === "/api/subscriptions/me") {
    const session = await requireSession();
    const user = await getCurrentUserAccess(
      session.user.id,
      session.access_token,
    );

    if (!user) {
      return {
        handled: true,
        data: {
          tier: "free",
          status: "active",
          startedAt: null,
          endsAt: null,
          autoRenew: true,
        },
      };
    }

    const rows = await supabaseRequest<SubscriptionUserRow[]>(
      `/rest/v1/users?select=subscription_tier,subscription_started_at,subscription_ends_at,subscription_auto_renew,is_active&id=eq.${encodeURIComponent(
        session.user.id,
      )}&limit=1`,
      {
        method: "GET",
      },
      session.access_token,
    );

    const row = rows[0];
    const latest = await latestAccountSubscription(
      session.access_token,
      session.user.id,
    );
    const fromUser = entitlementTier(row?.subscription_tier);
    const fromSubscription = entitlementTier(latest?.plan_id ?? latest?.plan);
    const tier = fromUser !== "free" ? fromUser : fromSubscription || "free";
    const endsAt =
      row?.subscription_ends_at ??
      latest?.current_period_end ??
      latest?.ends_at ??
      null;
    const isExpired = endsAt ? new Date(endsAt) < new Date() : false;

    return {
      handled: true,
      data: {
        tier,
        status:
          row?.is_active === false
            ? "cancelled"
            : isExpired && tier !== "free"
              ? "expired"
              : "active",
        startedAt:
          row?.subscription_started_at ??
          latest?.started_at ??
          latest?.created_at ??
          null,
        endsAt,
        autoRenew: row?.subscription_auto_renew ?? true,
      },
    };
  }

  return { handled: false };
}

async function handleBookings(
  path: string,
  method: string,
): Promise<ApiBridgeResult> {
  if (path !== "/api/bookings" || method !== "GET") {
    return { handled: false };
  }

  const session = await requireSession();
  const rows = await supabaseRequest<BookingRow[]>(
    `/rest/v1/bookings?select=*,vehicles(make,model)&user_id=eq.${encodeURIComponent(
      session.user.id,
    )}&order=scheduled_at.desc`,
    {
      method: "GET",
    },
    session.access_token,
  );

  return {
    handled: true,
    data: rows.map(toBooking),
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
    isFull: row.is_full ?? false,
    notes: row.notes ?? undefined,
    consumption,
  };
}

function withFuelConsumption(rows: FuelLogRow[]) {
  const asc = [...rows].sort((a, b) => Number(a.odometer_km) - Number(b.odometer_km));
  const map = new Map<string, unknown>();

  asc.forEach((row, index) => {
    const prev = asc[index - 1];

    if (!prev) {
      map.set(row.id, null);
      return;
    }

    const distanceKm = Number(row.odometer_km) - Number(prev.odometer_km);
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

async function listFuelRows(
  accessToken: string,
  userId: string,
  vehicleId?: string | null,
) {
  const vehicleFilter = vehicleId
    ? `&vehicle_id=eq.${encodeURIComponent(vehicleId)}`
    : "";

  return supabaseRequest<FuelLogRow[]>(
    `/rest/v1/fuel_logs?select=*&user_id=eq.${encodeURIComponent(userId)}${vehicleFilter}&order=filled_at.desc`,
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

  const totalLiters = logs.reduce((sum, log) => sum + Number(log.liters || 0), 0);
  const totalCostSar = logs.reduce((sum, log) => sum + Number(log.totalCostSar || 0), 0);
  const validConsumption = logs.map((log) => log.consumption as any).filter(Boolean);

  const avgConsumptionL100km = validConsumption.length
    ? Number((validConsumption.reduce((sum: number, item: any) => sum + item.consumptionL100km, 0) / validConsumption.length).toFixed(2))
    : null;
  const avgKmPerLiter = validConsumption.length
    ? Number((validConsumption.reduce((sum: number, item: any) => sum + item.kmPerLiter, 0) / validConsumption.length).toFixed(2))
    : null;

  const byDay = new Map<string, { date: string; liters: number; costSar: number; fills: number }>();

  filtered.forEach((row) => {
    const date = row.filled_at.slice(0, 10);
    const current = byDay.get(date) ?? { date, liters: 0, costSar: 0, fills: 0 };
    current.liters += Number(row.liters || 0);
    current.costSar += Number(row.total_cost_halalas || 0) / 100;
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
    const rows = await listFuelRows(session.access_token, session.user.id, vehicleId);

    return {
      handled: true,
      data: { logs: withFuelConsumption(rows) },
    };
  }

  if (path === "/api/fuel/stats" && method === "GET") {
    const vehicleId = url.searchParams.get("vehicleId");
    const period = url.searchParams.get("period") ?? "month";
    const rows = await listFuelRows(session.access_token, session.user.id, vehicleId);

    return {
      handled: true,
      data: buildFuelStats(rows, period),
    };
  }

  if (path === "/api/fuel" && method === "POST") {
    const body = await readJsonBody(input, init);
    const vehicleId = String(body.vehicleId ?? "").trim();
    const liters = Number(body.liters);
    const pricePerLiterSar = Number(body.pricePerLiterSar);
    const fuelGrade = String(body.fuelGrade ?? "91").trim();
    const filledAt = String(body.filledAt ?? new Date().toISOString()).trim();
    const rawOdometer =
      body.odometerKm !== undefined && body.odometerKm !== null && body.odometerKm !== ""
        ? Number(body.odometerKm)
        : null;

    if (!vehicleId) {
      throw new ApiBridgeError("اختر المركبة أولًا.", 400);
    }

    if (!Number.isFinite(liters) || liters <= 0) {
      throw new ApiBridgeError("كمية الوقود غير صحيحة.", 400);
    }

    if (!Number.isFinite(pricePerLiterSar) || pricePerLiterSar <= 0) {
      throw new ApiBridgeError("سعر اللتر غير صحيح.", 400);
    }

    const vehicle = await getVehicleRow(vehicleId, session.access_token, session.user.id);

    if (!vehicle) {
      throw new ApiBridgeError("المركبة غير موجودة.", 404);
    }

    if (rawOdometer !== null && (!Number.isFinite(rawOdometer) || rawOdometer < 0)) {
      throw new ApiBridgeError("قراءة العداد غير صحيحة.", 400);
    }

    const odometerKm = rawOdometer !== null ? rawOdometer : Number(vehicle.odometer_km ?? 0);
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
          is_full: true,
          notes:
            typeof body.notes === "string" && body.notes.trim()
              ? body.notes.trim()
              : null,
        }),
      },
      session.access_token,
    );

    return {
      handled: true,
      data: toFuelLog(rows[0]),
      status: 201,
    };
  }

  const deleteMatch = path.match(/^\/api\/fuel\/([^/]+)$/);

  if (deleteMatch && method === "DELETE") {
    const fuelLogId = decodeURIComponent(deleteMatch[1]);

    await supabaseRequest(
      `/rest/v1/fuel_logs?id=eq.${encodeURIComponent(fuelLogId)}&user_id=eq.${encodeURIComponent(session.user.id)}`,
      { method: "DELETE" },
      session.access_token,
    );

    return {
      handled: true,
      data: { ok: true },
    };
  }

  return { handled: false };
}

async function handleDtc(
  url: URL,
  method: string,
): Promise<ApiBridgeResult> {
  if (url.pathname !== "/api/dtc" || method !== "GET") {
    return { handled: false };
  }

  const session = await requireSession();
  const status = url.searchParams.get("status");
  const vehicleId = url.searchParams.get("vehicleId");
  const normalizedStatus =
    status === "cleared" ? "cleared,resolved" : "open,active,pending";
  const vehicleFilter = vehicleId
    ? `&vehicle_id=eq.${encodeURIComponent(vehicleId)}`
    : "";

  const rows = await supabaseRequest<DiagnosticCodeRow[]>(
    `/rest/v1/diagnostic_codes?select=*,vehicles(make,model,nickname)&user_id=eq.${encodeURIComponent(
      session.user.id,
    )}&status=in.(${normalizedStatus})${vehicleFilter}&order=detected_at.desc`,
    {
      method: "GET",
    },
    session.access_token,
  );

  return {
    handled: true,
    data: rows.map(toDtcCode),
  };
}

async function handleAi(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  if (path === "/api/ai/chat" && method === "POST") {
    const session = await requireSession();
    const access = await getCurrentUserAccess(
      session.user.id,
      session.access_token,
    );

    if ((access?.subscription_tier ?? "free") === "free") {
      throw new ApiBridgeError(
        "المساعد الذكي متاح بعد ترقية الباقة.",
        403,
      );
    }
    const body = await readJsonBody(input, init);
    const message = String(body.message ?? "").trim();
    const lower = message.toLowerCase();
    const reply =
      lower.includes("dtc") ||
      lower.includes("كود") ||
      lower.includes("عطل")
        ? "أكواد الأعطال تساعدك تفهم سبب التحذير في السيارة. إذا كتبت لي الكود أو اخترت مركبة، أشرح لك المعنى والخطوة المناسبة."
        : lower.includes("زيت") ||
            lower.includes("صيانة") ||
            lower.includes("maintenance")
          ? "تابع سجل الصيانة داخل مفك، وسأقترح لك الموعد القادم حسب آخر قراءة عداد وتاريخ الصيانة."
          : "أنا مساعد مفك الذكي. أقدر أساعدك في فهم الأعطال، متابعة الصيانة، وقراءة حالة مركبتك من البيانات المسجلة.";

    return {
      handled: true,
      data: {
        reply,
        suggestedActions: [
          {
            labelAr: "عرض مركباتي",
            kind: "view_vehicle",
          },
          {
            labelAr: "عرض سجل الأعطال",
            kind: "view_dtc",
          },
        ],
      },
    };
  }

  const match = path.match(/^\/api\/ai\/recommendations\/([^/]+)$/);

  if (match && method === "GET") {
    const session = await requireSession();
    const vehicleId = decodeURIComponent(match[1]);
    const vehicle = await getVehicleRow(
      vehicleId,
      session.access_token,
      session.user.id,
    );
    if (!vehicle) {
      throw new ApiBridgeError("المركبة غير موجودة.", 404);
    }

    const overlay = await getLifecycleOverlay();
    const latest = await latestTelemetryPoint(
      vehicleId,
      session.access_token,
    );
    const telemetryRecs =
      latest && isFreshTimestamp(latest.time)
        ? isAnomalyDetectionEnabled()
          ? [buildRepeatedCoolantAnomaly(vehicleId, [latest])].filter(Boolean)
          : engineTelemetryRecommendations(vehicleId, latest)
        : [];

    const maintenanceRows = await listMaintenanceLogs(
      session.access_token,
      session.user.id,
      vehicleId,
    );
    const maintenanceRecs = latestMaintenanceRows(maintenanceRows)
      .map((row) =>
        engineBuildMaintenanceRecommendation({
          vehicleId,
          serviceType: row.service_type,
          lastDoneKm: row.done_at_km,
          lastDoneAt: row.done_at,
          odometerKm: vehicle.odometer_km ?? row.done_at_km,
          estimatedCost: row.actual_cost_sar ?? row.cost_sar,
        }),
      )
      .filter(Boolean)
      .map((item: any) => ({
        ...item,
        id: `maintenance-${vehicleId}-${item.serviceType}`,
        createdAt: item.lastDoneAt || new Date().toISOString(),
      }));

    let dtcRecs: ReturnType<typeof buildDtcRecommendation>[] = [];
    try {
      const dtcRows = await supabaseRequest<DiagnosticCodeRow[]>(
        `/rest/v1/diagnostic_codes?select=*&user_id=eq.${encodeURIComponent(
          session.user.id,
        )}&vehicle_id=eq.${encodeURIComponent(vehicleId)}&status=in.(open,active,pending)`,
        { method: "GET" },
        session.access_token,
      );
      dtcRecs = dtcRows
        .map((row) =>
          buildDtcRecommendation({
            vehicleId,
            code: row.code,
            descriptionAr: row.title ?? row.explanation ?? undefined,
            severity: row.severity,
          }),
        )
        .filter(Boolean)
        .map((item: any) => ({
          ...item,
          id: `dtc-${vehicleId}-${item.sourceKey}`,
          createdAt: new Date().toISOString(),
        }));
    } catch {
      dtcRecs = [];
    }

    const stored = await supabaseRequest<RecommendationRow[]>(
      `/rest/v1/recommendations?select=*&vehicle_id=eq.${encodeURIComponent(
        vehicleId,
      )}&order=created_at.desc`,
      { method: "GET" },
      session.access_token,
    ).catch(() => [] as RecommendationRow[]);

    const combined = [
      ...telemetryRecs.map((item) => ({
        ...item,
        id: `${item.sourceKey}-${vehicleId}`,
        createdAt: latest?.time || new Date().toISOString(),
      })),
      ...maintenanceRecs,
      ...dtcRecs,
      ...stored.map(toRecommendation),
    ];
    const unique = new Map<string, (typeof combined)[number]>();
    for (const rec of combined) {
      const key = recStorageKey(rec as any) || rec.id;
      if (!unique.has(key)) unique.set(key, rec);
    }
    const withLifecycle = [...unique.values()].map((rec) => applyOverlay(rec as any, overlay));
    return {
      handled: true,
      data: visibleRecommendations(withLifecycle),
    };
  }

  return { handled: false };
}

async function handleDeviceOrders(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  if (path !== "/api/device-orders" || method !== "POST") {
    return { handled: false };
  }

  const session = await requireSession();
  const body = await readJsonBody(input, init);

  const rows = await supabaseRequest<DeviceOrderRow[]>(
    "/rest/v1/device_orders?select=id,status,created_at",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: session.user.id,
        plan_tier:
          typeof body.planTier === "string" ? body.planTier : null,
        customer_name:
          typeof body.customerName === "string"
            ? body.customerName.trim()
            : null,
        phone:
          typeof body.phone === "string" ? body.phone.trim() : null,
        city:
          typeof body.city === "string" && body.city.trim()
            ? body.city.trim()
            : null,
        short_address:
          typeof body.shortAddress === "string" &&
          body.shortAddress.trim()
            ? body.shortAddress.trim()
            : null,
        notes:
          typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : null,
      }),
    },
    session.access_token,
  );

  return {
    handled: true,
    status: 201,
    data: rows[0],
  };
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
    isRead: Boolean(row.is_read),
    readAt: row.read_at ?? null,
    scheduledAt: row.scheduled_at ?? null,
    sentAt: row.sent_at ?? null,
    dedupeKey: row.dedupe_key ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function maintenanceNotificationFromItem(
  userId: string,
  item: ReturnType<typeof buildMaintenanceRecommendations>[number],
): NotificationRow {
  const isOverdue = item.status === "overdue";
  const serviceLabel = item.serviceTypeAr || item.serviceType;
  const vehicleLabel =
    item.vehicleNickname ||
    [item.vehicleMake, item.vehicleModel].filter(Boolean).join(" ") ||
    "مركبتك";
  const dueHint =
    item.nextDueKm !== null && item.nextDueKm !== undefined
      ? `الموعد عند ${Number(item.nextDueKm).toLocaleString("ar-SA")} كم.`
      : item.nextDueAt
        ? `الموعد بتاريخ ${new Date(item.nextDueAt).toLocaleDateString("ar-SA")}.`
        : "راجع جدول الصيانة.";

  return {
    id: `maintenance-${item.vehicleId}-${item.serviceType}-${item.status}`,
    user_id: userId,
    vehicle_id: item.vehicleId,
    type: "maintenance",
    severity: isOverdue ? "critical" : "warning",
    title_ar: isOverdue
      ? `${serviceLabel} متأخرة`
      : `${serviceLabel} قريبة`,
    body_ar: `${vehicleLabel}: ${dueHint}`,
    action_url: "/maintenance",
    dedupe_key: [
      "maintenance",
      item.vehicleId,
      item.serviceType,
      item.status,
      item.nextDueKm ?? item.nextDueAt ?? "na",
    ].join(":"),
    is_read: false,
    created_at: new Date().toISOString(),
  };
}

async function listGeneratedNotificationRows(
  accessToken: string,
  userId: string,
) {
  const maintenanceRows = await listMaintenanceLogs(
    accessToken,
    userId,
  );

  return buildMaintenanceRecommendations(maintenanceRows)
    .filter((item) => item.status === "overdue" || item.status === "upcoming")
    .map((item) => maintenanceNotificationFromItem(userId, item));
}

async function listNotificationRows(
  accessToken: string,
  userId: string,
) {
  return supabaseRequest<NotificationRow[]>(
    `/rest/v1/notifications?select=*&user_id=eq.${encodeURIComponent(
      userId,
    )}&order=created_at.desc&limit=50`,
    {
      method: "GET",
    },
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
      `/rest/v1/notifications?select=id&user_id=eq.${encodeURIComponent(
        payload.userId,
      )}&dedupe_key=eq.${encodeURIComponent(payload.dedupeKey)}&limit=1`,
      {
        method: "GET",
      },
      accessToken,
    );

    if (existing.length > 0) {
      return null;
    }
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

async function generateMaintenanceNotifications(
  accessToken: string,
  userId: string,
) {
  const generatedRows = await listGeneratedNotificationRows(
    accessToken,
    userId,
  );

  for (const row of generatedRows) {
    try {
      await createNotificationIfMissing(accessToken, {
        userId,
        vehicleId: row.vehicle_id ?? null,
        type: row.type,
        severity: row.severity,
        titleAr: row.title_ar,
        bodyAr: row.body_ar ?? null,
        actionUrl: row.action_url ?? null,
        dedupeKey: row.dedupe_key ?? null,
        scheduledAt: row.scheduled_at ?? null,
      });
    } catch {
      return generatedRows;
    }
  }

  return generatedRows;
}

async function handleHealthIntelligence(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const summaryMatch = path.match(/^\/api\/vehicles\/([^/]+)\/health-summary$/);
  const odoMatch = path.match(/^\/api\/vehicles\/([^/]+)\/odometer$/);
  const approvalsMatch = path.match(/^\/api\/vehicles\/([^/]+)\/maintenance\/approvals$/);
  const approvalPatch = path.match(/^\/api\/maintenance\/approvals\/([^/]+)$/);
  const ocrMatch = path === "/api/maintenance/invoice-ocr";
  const explainMatch = path.match(/^\/api\/ai\/recommendations\/([^/]+)\/explain$/);

  if (!summaryMatch && !odoMatch && !approvalsMatch && !approvalPatch && !ocrMatch && !explainMatch) {
    return { handled: false };
  }

  if (ocrMatch && method === "POST") {
    return { handled: true, status: 404, data: { error: "Feature disabled", featureDisabled: true } };
  }

  if (explainMatch && method === "POST") {
    if (!isHealthIntelligenceEnabled()) {
      return { handled: true, status: 404, data: { error: "Feature disabled", featureDisabled: true } };
    }
    const session = await requireSession();
    const vehicleId = decodeURIComponent(explainMatch[1]);
    const vehicle = await getVehicleRow(vehicleId, session.access_token, session.user.id);
    if (!vehicle) throw new ApiBridgeError("المركبة غير موجودة.", 404);
    const body = await readJsonBody(input, init);
    const recommendationId = body.recommendationId;
    if (typeof recommendationId !== "string" || !recommendationId) {
      return { handled: true, status: 400, data: { error: "recommendationId required" } };
    }
    try {
      const rows = await supabaseRequest<{ id: string; vehicle_id: string; title_ar: string; description_ar: string; suggested_action?: string | null; severity?: string | null; metadata?: Record<string, unknown> }[]>(
        `/rest/v1/recommendations?select=*&id=eq.${encodeURIComponent(recommendationId)}&vehicle_id=eq.${encodeURIComponent(vehicleId)}`,
        { method: "GET" },
        session.access_token,
      );
      const rec = rows[0];
      if (!rec) {
        return { handled: true, status: 404, data: { error: "Recommendation not found" } };
      }
      return {
        handled: true,
        data: {
          observedAr: rec.title_ar,
          whyAr: rec.description_ar,
          nextAr: rec.suggested_action,
          severity: rec.severity,
          workshop: rec.severity === "critical",
          provider: "rules",
        },
      };
    } catch {
      return { handled: true, status: 404, data: { error: "Recommendation not found" } };
    }
  }

  if (summaryMatch && method === "GET") {
    if (!isHealthIntelligenceEnabled()) {
      return { handled: true, status: 404, data: { error: "Feature disabled", featureDisabled: true } };
    }
    const session = await requireSession();
    const vehicleId = decodeURIComponent(summaryMatch[1]);
    const vehicle = await getVehicleRow(vehicleId, session.access_token, session.user.id);
    if (!vehicle) throw new ApiBridgeError("المركبة غير موجودة.", 404);
    const latest = await latestTelemetryPoint(vehicleId, session.access_token);
    const logs = await listMaintenanceLogs(session.access_token, session.user.id, vehicleId);
    const evaluation = evaluateVehicleHealth({
      vehicleId,
      vehicle: {
        id: vehicleId,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
      },
      odometerKm: vehicle.odometer_km,
      logs: logs.map((row) => ({
        serviceType: row.service_type,
        doneAtKm: row.done_at_km,
        doneAt: row.done_at,
      })),
      telemetrySamples: latest ? [{ ...latest, synthetic: false }] : [],
      anomalyEnabled: isAnomalyDetectionEnabled(),
    });
    return {
      handled: true,
      data: {
        vehicleId,
        healthScore: evaluation.healthScore,
        dataQuality: evaluation.dataQuality,
        lastReadingAt: evaluation.lastReadingAt,
        insufficientData: evaluation.insufficientData,
        odometerKm: vehicle.odometer_km,
        openRecommendations: evaluation.candidates.length,
        ...describeVehicleLink({
          adapterMac: vehicle.adapter_mac,
          lastTelemetryAt: evaluation.lastReadingAt,
        }),
      },
    };
  }

  if (odoMatch && method === "GET") {
    const session = await requireSession();
    const vehicleId = decodeURIComponent(odoMatch[1]);
    const vehicle = await getVehicleRow(vehicleId, session.access_token, session.user.id);
    if (!vehicle) throw new ApiBridgeError("المركبة غير موجودة.", 404);
    let history: { km: number; estimated: boolean; recorded_at?: string }[] = [];
    try {
      history = await supabaseRequest(
        `/rest/v1/odometer_readings?vehicle_id=eq.${encodeURIComponent(vehicleId)}&user_id=eq.${encodeURIComponent(session.user.id)}&select=km,estimated,recorded_at,source&order=recorded_at.desc&limit=20`,
        { method: "GET" },
        session.access_token,
      );
    } catch (error) {
      if (!isMissingTableError(error) && !isUnknownColumnError(error)) throw error;
    }
    const latest = history[0];
    return {
      handled: true,
      data: {
        vehicleId,
        confirmedKm: latest && latest.estimated ? null : Number(vehicle.odometer_km ?? 0),
        estimatedKm: latest?.estimated ? latest.km : null,
        odometerKm: Number(vehicle.odometer_km ?? 0),
        readings: history,
      },
    };
  }

  if (odoMatch && method === "POST") {
    const session = await requireSession();
    const vehicleId = decodeURIComponent(odoMatch[1]);
    const vehicle = await getVehicleRow(vehicleId, session.access_token, session.user.id);
    if (!vehicle) throw new ApiBridgeError("المركبة غير موجودة.", 404);
    const body = await readJsonBody(input, init);
    const estimated = Boolean(body.estimated);
    const valid = assertOdometerWrite({
      km: Number(body.km),
      previousKm: Number(vehicle.odometer_km ?? 0),
      estimated,
    });
    if (!valid.ok) throw new ApiBridgeError(valid.error, 400);
    const updated = await persistVehicleOdometer(
      vehicleId,
      session.user.id,
      valid.km,
      session.access_token,
    );
    let historyStored = false;
    if (isOdometerTrackingEnabled()) {
      try {
        const rows = await supabaseRequest<unknown[]>(
          "/rest/v1/odometer_readings?select=*",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Prefer: "return=representation" },
            body: JSON.stringify({
              vehicle_id: vehicleId,
              user_id: session.user.id,
              km: valid.km,
              source: body.source || "manual",
              estimated,
              recorded_at: body.recordedAt || new Date().toISOString(),
            }),
          },
          session.access_token,
        );
        historyStored = Boolean(rows?.[0]);
      } catch (error) {
        if (!isMissingTableError(error) && !isUnknownColumnError(error)) throw error;
      }
    }
    const committed = committedOdometerResponse({
      km: valid.km,
      estimated,
      vehicleUpdated: Boolean(updated),
      historyStored,
    });
    if (!committed.ok) throw new ApiBridgeError(committed.error, 500);
    const logs = await listMaintenanceLogs(session.access_token, session.user.id, vehicleId);
    for (const row of latestMaintenanceRows(logs)) {
      await upsertMaintenanceSchedule(
        updated,
        {
          serviceType: row.service_type,
          doneAt: row.done_at,
          doneAtKm: row.done_at_km ?? null,
          costSar: Number(row.actual_cost_sar ?? row.cost_sar ?? 0) || null,
        },
        session.access_token,
      );
    }
    return { handled: true, status: 201, data: { ...committed, odometerKm: updated.odometer_km } };
  }

  if (approvalsMatch && method === "GET") {
    if (!isApprovalLoggingEnabled()) {
      return { handled: true, status: 404, data: { error: "Feature disabled", featureDisabled: true } };
    }
    const session = await requireSession();
    const vehicleId = decodeURIComponent(approvalsMatch[1]);
    const vehicle = await getVehicleRow(vehicleId, session.access_token, session.user.id);
    if (!vehicle) throw new ApiBridgeError("المركبة غير موجودة.", 404);
    const rows = await supabaseRequest<unknown[]>(
      `/rest/v1/maintenance_approval_requests?select=*&vehicle_id=eq.${encodeURIComponent(vehicleId)}&user_id=eq.${encodeURIComponent(session.user.id)}&order=created_at.desc`,
      { method: "GET" },
      session.access_token,
    );
    return { handled: true, data: rows };
  }

  if (approvalPatch && method === "PATCH") {
    if (!isApprovalLoggingEnabled()) {
      return { handled: true, status: 404, data: { error: "Feature disabled", featureDisabled: true } };
    }
    const session = await requireSession();
    const approvalId = decodeURIComponent(approvalPatch[1]);
    const body = await readJsonBody(input, init);
    if (body.decision === "yes" && !body.serviceType) {
      return { handled: true, status: 400, data: { error: "أكمل نموذج الصيانة بعد الموافقة." } };
    }
    const status =
      body.decision === "yes" ? "confirmed" : body.decision === "no" ? "declined" : "later";
    const rows = await supabaseRequest<{ id: string; status: string }[]>(
      `/rest/v1/maintenance_approval_requests?id=eq.${encodeURIComponent(approvalId)}&user_id=eq.${encodeURIComponent(session.user.id)}&select=*`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      },
      session.access_token,
    );
    if (!rows[0]) {
      throw new ApiBridgeError("تعذر حفظ قرار الموافقة.", 500);
    }
    return { handled: true, data: { ok: true, id: rows[0].id, status: rows[0].status } };
  }

  return { handled: false };
}

async function handleNotifications(
  path: string,
  method: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const session = await requireSession();
  const userId = session.user.id;
  const accessToken = session.access_token;

  if (path === "/api/notifications" && method === "GET") {
    const generatedRows = await generateMaintenanceNotifications(
      accessToken,
      userId,
    );

    try {
      const rows = await listNotificationRows(accessToken, userId);

      return {
        handled: true,
        data: rows.map(toNotification),
      };
    } catch {
      return {
        handled: true,
        data: generatedRows.map(toNotification),
      };
    }
  }

  if (path === "/api/notifications" && method === "POST") {
    const body = await readJsonBody(input, init);

    const row = await createNotificationIfMissing(accessToken, {
      userId,
      vehicleId: typeof body.vehicleId === "string" ? body.vehicleId : null,
      type: String(body.type ?? "system"),
      severity: String(body.severity ?? "info"),
      titleAr: String(body.titleAr ?? "تنبيه"),
      bodyAr: typeof body.bodyAr === "string" ? body.bodyAr : null,
      actionUrl: typeof body.actionUrl === "string" ? body.actionUrl : null,
      dedupeKey: typeof body.dedupeKey === "string" ? body.dedupeKey : null,
      scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
    });

    return {
      handled: true,
      status: 201,
      data: row ? toNotification(row) : { ok: true },
    };
  }

  if (path === "/api/notifications/read-all" && method === "PATCH") {
    try {
      await supabaseRequest(
        `/rest/v1/notifications?user_id=eq.${encodeURIComponent(
          userId,
        )}&is_read=eq.false`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_read: true,
            read_at: new Date().toISOString(),
          }),
        },
        accessToken,
      );
    } catch {
      // Keep the in-app fallback notifications usable even before the table exists.
    }

    return {
      handled: true,
      data: { ok: true },
    };
  }

  const readMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);

  if (readMatch && method === "PATCH") {
    const id = decodeURIComponent(readMatch[1]);

    try {
      await supabaseRequest(
        `/rest/v1/notifications?id=eq.${encodeURIComponent(
          id,
        )}&user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_read: true,
            read_at: new Date().toISOString(),
          }),
        },
        accessToken,
      );
    } catch {
      // Generated maintenance notifications are read-only until persisted.
    }

    return {
      handled: true,
      data: { ok: true },
    };
  }

  const deleteMatch = path.match(/^\/api\/notifications\/([^/]+)$/);

  if (deleteMatch && method === "DELETE") {
    const id = decodeURIComponent(deleteMatch[1]);

    await supabaseRequest(
      `/rest/v1/notifications?id=eq.${encodeURIComponent(
        id,
      )}&user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
      },
      accessToken,
    );

    return {
      handled: true,
      data: { ok: true },
    };
  }

  return { handled: false };
}

function getRawUrl(
  input: RequestInfo | URL,
) {
  if (typeof input === "string") {
    return input;
  }

  if (
    typeof URL !== "undefined" &&
    input instanceof URL
  ) {
    return input.toString();
  }

  return (input as Request).url;
}

function getRequestMethod(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (
    typeof Request !== "undefined" &&
    input instanceof Request
  ) {
    return input.method.toUpperCase();
  }

  return "GET";
}

async function handleRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiBridgeResult> {
  const rawUrl = getRawUrl(input);

  const url = new URL(
    rawUrl,
    "https://mfk-mobile.local",
  );

  const path = url.pathname;
  const method = getRequestMethod(
    input,
    init,
  );

  if (!path.startsWith("/api")) {
    return { handled: false };
  }

  if (path === "/api/healthz") {
    return {
      handled: true,
      data: {
        status: "ok",
      },
    };
  }

  const subscriptionsResult =
    await handleSubscriptions(path, method, input, init);

  if (subscriptionsResult.handled) {
    return subscriptionsResult;
  }

  const bookingsResult =
    await handleBookings(path, method);

  if (bookingsResult.handled) {
    return bookingsResult;
  }

  const deviceOrdersResult = await handleDeviceOrders(
    path,
    method,
    input,
    init,
  );

  if (deviceOrdersResult.handled) {
    return deviceOrdersResult;
  }

  const healthIntelResult = await handleHealthIntelligence(path, method, input, init);
  if (healthIntelResult.handled) {
    return healthIntelResult;
  }

  const notificationsResult = await handleNotifications(
    path,
    method,
    input,
    init,
  );

  if (notificationsResult.handled) {
    return notificationsResult;
  }

  const aiResult = await handleAi(
    path,
    method,
    input,
    init,
  );

  if (aiResult.handled) {
    return aiResult;
  }

  const dtcResult = await handleDtc(url, method);

  if (dtcResult.handled) {
    return dtcResult;
  }

  const fuelResult = await handleFuel(
    url,
    method,
    input,
    init,
  );

  if (fuelResult.handled) {
    return fuelResult;
  }

  const vehiclesResult =
    await handleVehicles(
      path,
      method,
      input,
      init,
    );

  if (vehiclesResult.handled) {
    return vehiclesResult;
  }

  const dashboardResult =
    await handleDashboard(url, method);

  if (dashboardResult.handled) {
    return dashboardResult;
  }

  const maintenanceResult =
    await handleMaintenance(
      path,
      method,
      input,
      init,
    );

  if (maintenanceResult.handled) {
    return maintenanceResult;
  }

  const liveMatch = path.match(
    /^\/api\/diagnostics\/live\/([^/]+)$/,
  );

  if (liveMatch && method === "GET") {
    const session = await requireSession();

    return {
      handled: true,
      data: await liveTelemetry(
        decodeURIComponent(
          liveMatch[1],
        ),
        session.access_token,
        session.user.id,
      ),
    };
  }

  if (liveMatch && method === "POST") {
    const session = await requireSession();
    const body = await readJsonBody(
      input,
      init,
    );

    return {
      handled: true,
      status: 201,
      data: await saveTelemetryPoint(
        decodeURIComponent(
          liveMatch[1],
        ),
        body,
        session.access_token,
        session.user.id,
      ),
    };
  }

  if (
    path.startsWith(
      "/api/diagnostics/sessions",
    ) &&
    method === "GET"
  ) {
    await requireSession();

    return {
      handled: true,
      data: [],
    };
  }

  const recAction = path.match(/^\/api\/recommendations\/([^/]+)(?:\/(events))?$/);
  if (recAction) {
    await requireSession();
    const recId = decodeURIComponent(recAction[1]);
    const overlay = await getLifecycleOverlay();
    const row = overlay[recId] ?? {};
    if (recAction[2] === "events" && method === "GET") {
      return { handled: true, data: row.events ?? [] };
    }
    if (method === "PATCH") {
      const body = await readJsonBody(input, init);
      const saved = await recordRecommendationAction(
        { id: recId, vehicleId: String(body.vehicleId ?? ""), kind: String(body.kind ?? "maintenance_due"), sourceKey: body.sourceKey ? String(body.sourceKey) : recId, status: row.status },
        String(body.action ?? "in_progress"),
        {
          status: undefined,
          deferredUntil: body.deferredUntil ? String(body.deferredUntil) : null,
          linkedMaintenanceLogId: body.maintenanceLogId ? String(body.maintenanceLogId) : null,
          note: body.note ? String(body.note) : null,
        },
      );
      return { handled: true, data: { id: recId, ...saved } };
    }
  }

  if (
    path === "/api/recommendations" &&
    method === "GET"
  ) {
    const session = await requireSession();
    const vehicles = await supabaseRequest<VehicleRow[]>(
      `/rest/v1/vehicles?select=*&user_id=eq.${encodeURIComponent(session.user.id)}`,
      { method: "GET" },
      session.access_token,
    );
    const overlay = await getLifecycleOverlay();
    const logs = await listMaintenanceLogs(session.access_token, session.user.id);
    const recs = vehicles.flatMap((vehicle) => {
      const vehicleLogs = logs.filter((row) => row.vehicle_id === vehicle.id);
      return latestMaintenanceRows(vehicleLogs)
        .map((row) =>
          engineBuildMaintenanceRecommendation({
            vehicleId: vehicle.id,
            serviceType: row.service_type,
            lastDoneKm: row.done_at_km,
            lastDoneAt: row.done_at,
            odometerKm: vehicle.odometer_km ?? row.done_at_km,
            estimatedCost: row.actual_cost_sar ?? row.cost_sar,
          }),
        )
        .filter(Boolean)
        .map((item: any) => ({
          ...item,
          id: `maintenance-${vehicle.id}-${item.serviceType}`,
          createdAt: item.lastDoneAt || new Date().toISOString(),
        }));
    });
    return {
      handled: true,
      data: visibleRecommendations(recs.map((rec) => applyOverlay(rec, overlay))),
    };
  }

  return { handled: false };
}

function jsonResponse(
  data: unknown,
  status = 200,
) {
  if (status === 204) {
    return new Response(null, {
      status,
    });
  }

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    },
  );
}

export function installSupabaseApiBridge() {
  if (
    installed ||
    typeof globalThis.fetch !== "function"
  ) {
    return;
  }

  installed = true;

  const originalFetch =
    globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    try {
      const result = await handleRequest(
        input,
        init,
      );

      if (result.handled) {
        return jsonResponse(
          result.data ?? null,
          result.status ?? 200,
        );
      }
    } catch (error) {
      const status =
        error instanceof ApiBridgeError
          ? error.status
          : 500;

      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع";

      return jsonResponse(
        {
          error: message,
        },
        status,
      );
    }

    return originalFetch(input, init);
  }) as typeof fetch;
}

installSupabaseApiBridge();
