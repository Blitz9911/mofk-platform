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

async function readJsonBody(input: RequestInfo | URL, init?: RequestInit): Promise<Record<string, unknown>> {
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

async function handleVehicles(path: string, method: string, input: RequestInfo | URL, init?: RequestInit): Promise<ApiBridgeResult> {
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
      plate_number: typeof body.plateNumber === "string" ? body.plateNumber : undefined,
      odometer_km: body.odometerKm !== undefined ? Number(body.odometerKm) : undefined,
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
    const avgHealthScore = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + (row.health_score ?? 100), 0) / rows.length)
      : 0;

    return {
      handled: true,
      data: {
        vehicleCount: rows.length,
        activeDtcCount: 0,
        criticalDtcCount: 0,
        upcomingMaintenanceCount: 0,
        overdueMaintenanceCount: 0,
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
      ? Math.round(rows.reduce((sum, row) => sum + (row.health_score ?? 100), 0) / rows.length)
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
        subtitleAr: row.plate_number ? `لوحة ${row.plate_number}` : "مركبة مسجلة في مفك",
        vehicleId: row.id,
        severity: "info",
        occurredAt: row.created_at ?? new Date().toISOString(),
      })),
    };
  }

  return { handled: false };
}

async function handleRequest(input: RequestInfo | URL, init?: RequestInit): Promise<ApiBridgeResult> {
  if (typeof window === "undefined") return { handled: false };

  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const url = new URL(rawUrl, window.location.origin);
  const path = url.pathname;
  const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (!path.startsWith("/api")) return { handled: false };

  if (path === "/api/healthz") {
    return { handled: true, data: { status: "ok" } };
  }

  const vehicleResult = await handleVehicles(path, method, input, init);
  if (vehicleResult.handled) return vehicleResult;

  const dashboardResult = await handleDashboard(path);
  if (dashboardResult.handled) return dashboardResult;

  const liveMatch = path.match(/^\/api\/diagnostics\/live\/([^/]+)$/);
  if (liveMatch && method === "GET") {
    await requireSession();
    return { handled: true, data: liveTelemetry(liveMatch[1]) };
  }

  if (path === "/api/maintenance/upcoming" && method === "GET") {
    await requireSession();
    return { handled: true, data: [] };
  }

  if (/^\/api\/maintenance\/[^/]+\/schedule$/.test(path) && method === "GET") {
    await requireSession();
    return { handled: true, data: [] };
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
      const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      return jsonResponse({ error: message }, status);
    }

    return originalFetch(input, init);
  };
}

installSupabaseApiBridge();
