import {
  getValidSupabaseSession,
  supabaseRequest,
} from "@/lib/supabase";

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

  return supabaseRequest<MaintenanceLogRow[]>(
    `/rest/v1/maintenance_logs?select=*,vehicles(make,model,nickname,odometer_km)&user_id=eq.${encodeURIComponent(
      userId,
    )}${vehicleFilter}&order=done_at.desc`,
    {
      method: "GET",
    },
    accessToken,
  );
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
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    serviceType: row.service_type,
    serviceTypeAr:
      MAINTENANCE_LABELS[row.service_type] ||
      row.service_type,
    intervalKm: null,
    intervalDays: null,
    lastDoneKm: row.done_at_km ?? null,
    lastDoneAt: row.done_at ?? null,
    nextDueKm: null,
    nextDueAt: null,
    status: "done" as const,
    estimatedCost:
      row.cost_sar !== null &&
      row.cost_sar !== undefined
        ? Number(row.cost_sar)
        : null,
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
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    kind: row.kind ?? "maintenance_due",
    severity: row.severity ?? "info",
    titleAr: row.title_ar,
    descriptionAr: row.description_ar ?? "",
    confidencePct: row.confidence_pct ?? undefined,
    suggestedAction: row.suggested_action ?? null,
    suggestedCostSar: row.suggested_cost_sar ?? null,
    createdAt: row.created_at ?? undefined,
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
      payload.odometer_km = Number(
        body.odometerKm,
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

  if (
    logMatch &&
    method === "POST"
  ) {
    const vehicleId = decodeURIComponent(
      logMatch[1],
    );

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

    const body = await readJsonBody(
      input,
      init,
    );

    const serviceType = String(
      body.serviceType ?? "",
    ).trim();

    const doneAt = String(
      body.doneAt ??
        new Date().toISOString(),
    ).trim();

    const doneAtKm = Number(
      body.doneAtKm,
    );

    if (!serviceType) {
      throw new ApiBridgeError(
        "نوع الصيانة مطلوب.",
        400,
      );
    }

    if (
      !Number.isFinite(doneAtKm) ||
      doneAtKm < 0
    ) {
      throw new ApiBridgeError(
        "قراءة العداد غير صحيحة.",
        400,
      );
    }

    const rows =
      await supabaseRequest<
        MaintenanceLogRow[]
      >(
        "/rest/v1/maintenance_logs?select=*",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Prefer:
              "return=representation",
          },
          body: JSON.stringify({
            vehicle_id: vehicleId,
            user_id: session.user.id,
            service_type: serviceType,
            done_at: doneAt,
            done_at_km: doneAtKm,
            cost_sar:
              body.cost !== undefined &&
              body.cost !== null &&
              body.cost !== ""
                ? Number(body.cost)
                : null,
            notes:
              typeof body.notes === "string" &&
              body.notes.trim()
                ? body.notes.trim()
                : null,
          }),
        },
        session.access_token,
      );

    if (!rows[0]) {
      throw new ApiBridgeError(
        "تعذر تسجيل الصيانة.",
        500,
      );
    }

    return {
      handled: true,
      data: completedMaintenanceItem(
        rows[0],
      ),
      status: 201,
    };
  }

  return { handled: false };
}

async function handleSubscriptions(
  path: string,
  method: string,
): Promise<ApiBridgeResult> {
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
      data: rows.map(toSubscriptionPlan),
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
    const endsAt = row?.subscription_ends_at ?? null;
    const isExpired = endsAt ? new Date(endsAt) < new Date() : false;

    return {
      handled: true,
      data: {
        tier: row?.subscription_tier ?? "free",
        status:
          row?.is_active === false
            ? "cancelled"
            : isExpired
              ? "expired"
              : "active",
        startedAt: row?.subscription_started_at ?? null,
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

    const rows = await supabaseRequest<RecommendationRow[]>(
      `/rest/v1/recommendations?select=*&user_id=eq.${encodeURIComponent(
        session.user.id,
      )}&vehicle_id=eq.${encodeURIComponent(vehicleId)}&order=created_at.desc`,
      {
        method: "GET",
      },
      session.access_token,
    );

    if (!rows.length) {
      const maintenanceRows = await listMaintenanceLogs(
        session.access_token,
        session.user.id,
        vehicleId,
      );

      const recommendations = buildMaintenanceRecommendations(
        maintenanceRows,
      )
        .slice(0, 5)
        .map((item) => ({
          id: `maintenance-${item.id}`,
          vehicleId,
          kind: "maintenance_due",
          severity:
            item.status === "overdue"
              ? "critical"
              : item.status === "upcoming"
                ? "warning"
                : "info",
          titleAr: item.serviceTypeAr
            ? `${item.serviceTypeAr} تحتاج متابعة`
            : "صيانة تحتاج متابعة",
          descriptionAr:
            item.status === "overdue"
              ? "يوجد بند صيانة متأخر حسب آخر سجل محفوظ للمركبة."
              : "هذه توصية مبنية على سجل الصيانة المحفوظ للمركبة.",
          confidencePct: item.status === "scheduled" ? 72 : 88,
          suggestedAction: "راجع جدول الصيانة وسجل آخر قراءة للعداد.",
          suggestedCostSar: item.estimatedCost ?? null,
          createdAt: new Date().toISOString(),
        }));

      return {
        handled: true,
        data: recommendations,
      };
    }

    return {
      handled: true,
      data: rows.map(toRecommendation),
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
    await handleSubscriptions(path, method);

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

  if (
    liveMatch &&
    method === "GET"
  ) {
    await requireSession();

    return {
      handled: true,
      data: liveTelemetry(
        decodeURIComponent(
          liveMatch[1],
        ),
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

  if (
    path.startsWith("/api/dtc") &&
    method === "GET"
  ) {
    await requireSession();

    return {
      handled: true,
      data: [],
    };
  }

  if (
    path === "/api/recommendations" &&
    method === "GET"
  ) {
    await requireSession();

    return {
      handled: true,
      data: [],
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
