const CLIENT_PUSH_PATHS = [
  "/api/devices/push-token",
  "/api/notifications/self-test",
  "/api/notifications/push-status",
  "/api/notifications/push-receipts",
  "/api/notifications/preferences",
];

/** Confirmed production Supabase project. Never a UAT target. */
export const PRODUCTION_SUPABASE_PROJECT_REF = "tnkcmoqzcvtsaqwsghet";
/** Confirmed independent UAT project (eu-west-1). Never interchangeable with production. */
export const UAT_SUPABASE_PROJECT_REF = "nbuqxtasvqdnallukbyx";
export const UAT_SUPABASE_DB_HOST = "db.nbuqxtasvqdnallukbyx.supabase.co";
export const UAT_SUPABASE_URL = "https://nbuqxtasvqdnallukbyx.supabase.co";

export function extractSupabaseProjectRef(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const hosted = text.match(/(?:https?:\/\/|@db\.)([a-z0-9]{20})\.supabase\.co/i);
  if (hosted) return hosted[1].toLowerCase();
  if (/^[a-z0-9]{20}$/i.test(text)) return text.toLowerCase();
  return "";
}

function collectedSupabaseRefs(env = process.env) {
  return [
    env.MFK_UAT_SUPABASE_REF,
    env.EXPO_PUBLIC_MFK_UAT_SUPABASE_REF,
    env.EXPO_PUBLIC_SUPABASE_URL,
    env.SUPABASE_URL,
    env.DATABASE_URL,
  ]
    .map((value) => extractSupabaseProjectRef(value))
    .filter(Boolean);
}

export function normalizeOrigin(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

export function parseAllowedOrigins(env = process.env) {
  return String(env.MFK_ALLOWED_API_ORIGINS || env.EXPO_PUBLIC_ALLOWED_API_ORIGINS || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
}

export function clientApiOrigin(env = process.env) {
  const direct = normalizeOrigin(env.EXPO_PUBLIC_API_BASE_URL);
  if (direct) return direct;
  return normalizeOrigin(env.EXPO_PUBLIC_DOMAIN);
}

export function validateApiEnvironment(env = process.env) {
  const mfkEnv = String(env.MFK_ENV || env.EXPO_PUBLIC_MFK_ENV || "").toLowerCase();
  const publicEnv = String(env.EXPO_PUBLIC_MFK_ENV || "").toLowerCase();
  const serverEnv = String(env.MFK_ENV || "").toLowerCase();
  if (publicEnv && serverEnv && publicEnv !== serverEnv) {
    return { ok: false, reason: "mfk_env_mismatch", mfkEnv };
  }
  if (mfkEnv === "production" && (env.MFK_UAT_PUSH_PROBE === "true" || env.MFK_UAT_PUSH_PROBE === "1")) {
    return { ok: false, reason: "uat_probe_forbidden_in_production", mfkEnv };
  }

  const refs = collectedSupabaseRefs(env);
  if (mfkEnv === "uat" && refs.includes(PRODUCTION_SUPABASE_PROJECT_REF)) {
    return { ok: false, reason: "production_project_forbidden", mfkEnv };
  }

  if (mfkEnv === "uat") {
    const declared = extractSupabaseProjectRef(
      env.MFK_UAT_SUPABASE_REF || env.EXPO_PUBLIC_MFK_UAT_SUPABASE_REF || env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    );
    if (!declared) {
      return { ok: false, reason: "uat_project_ref_required", mfkEnv };
    }
    if (declared === PRODUCTION_SUPABASE_PROJECT_REF) {
      return { ok: false, reason: "production_project_forbidden", mfkEnv };
    }
    if (declared !== UAT_SUPABASE_PROJECT_REF) {
      return { ok: false, reason: "uat_project_ref_mismatch", mfkEnv };
    }
    const dbRef = extractSupabaseProjectRef(env.DATABASE_URL);
    if (dbRef && dbRef !== declared) {
      return { ok: false, reason: "uat_database_ref_mismatch", mfkEnv };
    }
    const supabaseRef = extractSupabaseProjectRef(env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL);
    if (supabaseRef && supabaseRef !== declared) {
      return { ok: false, reason: "uat_supabase_ref_mismatch", mfkEnv };
    }
    const origin = clientApiOrigin(env);
    if (!origin) {
      return { ok: false, reason: "uat_requires_api_base", mfkEnv };
    }
    const allowed = parseAllowedOrigins(env);
    if (!allowed.length) {
      return { ok: false, reason: "api_origin_allowlist_required", mfkEnv };
    }
    if (!allowed.includes(origin)) {
      return { ok: false, reason: "api_origin_not_allowlisted", mfkEnv };
    }
    if (env.MFK_PUSH_SEND_ENABLED === "true" || env.MFK_PUSH_SEND_ENABLED === "1") {
      if (env.MFK_UAT_PUSH_PROBE !== "true" && env.MFK_UAT_PUSH_PROBE !== "1") {
        return { ok: false, reason: "uat_push_requires_probe_flag", mfkEnv };
      }
    }
    return { ok: true, reason: "uat_isolated", origin, mfkEnv, projectRef: declared };
  }

  const origin = clientApiOrigin(env);
  const allowed = parseAllowedOrigins(env);
  if (origin && allowed.length && !allowed.includes(origin)) {
    return { ok: false, reason: "api_origin_not_allowlisted", mfkEnv };
  }
  if (mfkEnv === "production" && origin && allowed.length === 0) {
    return { ok: false, reason: "api_origin_allowlist_required", mfkEnv };
  }
  return { ok: true, reason: origin ? "origin_ok" : "bridge_local", origin, mfkEnv: mfkEnv || "local" };
}

export function assertEnvironmentIsolation(env = process.env) {
  const isolation = validateApiEnvironment(env);
  if (!isolation.ok) {
    throw new Error(`MFK environment isolation failed: ${isolation.reason}`);
  }
  return isolation;
}

export function isClientPushPath(path) {
  if (CLIENT_PUSH_PATHS.includes(path)) return true;
  return /^\/api\/notifications\/[^/]+\/destination$/.test(path);
}

export function resolvePushPassthrough(path, env = process.env) {
  if (path === "/api/jobs/notifications-due") {
    return { passthrough: false, reason: "cron_not_a_client_path" };
  }
  if (!isClientPushPath(path)) {
    return { passthrough: false, reason: "not_push_path" };
  }
  const isolation = validateApiEnvironment(env);
  if (!isolation.ok) {
    return { passthrough: false, blocked: true, reason: isolation.reason };
  }
  if (!isolation.origin) {
    return { passthrough: false, reason: "api_base_unconfigured" };
  }
  return { passthrough: true, origin: isolation.origin, reason: "allowlisted_or_local_ok" };
}
