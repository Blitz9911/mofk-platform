const SESSION_STORAGE_KEY = "mfk-supabase-session";

type JsonRecord = Record<string, unknown>;

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: JsonRecord;
};

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user: SupabaseAuthUser;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: SupabaseAuthUser | null;
  session?: SupabaseSession | null;
  error?: string;
  error_description?: string;
  msg?: string;
};

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  role?: string | null;
};

export interface AuthUser {
  userId: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
}

export function getSupabaseConfig() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, "").replace(/\/(?:rest|auth)\/v1$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "إعدادات Supabase ناقصة. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في Vercel و .env.local",
    );
  }

  return { url, anonKey };
}

function buildSupabaseUrl(baseUrl: string, path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath.replace(/^\/rest\/v1\/auth\/v1\//, "/auth/v1/")}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

export function getStoredSupabaseSession(): SupabaseSession | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SupabaseSession;
    if (!parsed?.access_token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    storage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSupabaseSession(session: SupabaseSession) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSupabaseSession() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SESSION_STORAGE_KEY);
}

function normalizeSession(payload: SupabaseAuthResponse): SupabaseSession | null {
  const rawSession = payload.session ?? payload;
  const user = rawSession.user ?? payload.user;

  if (!rawSession.access_token || !user?.id) return null;

  return {
    access_token: rawSession.access_token,
    refresh_token: rawSession.refresh_token,
    expires_at:
      rawSession.expires_at ??
      Math.floor(Date.now() / 1000) + (rawSession.expires_in ?? 3600),
    expires_in: rawSession.expires_in,
    user,
  };
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as Record<string, unknown>;
  return (
    (typeof data.error_description === "string" && data.error_description) ||
    (typeof data.msg === "string" && data.msg) ||
    (typeof data.message === "string" && data.message) ||
    (typeof data.error === "string" && data.error) ||
    fallback
  );
}

export async function supabaseRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const { url, anonKey } = getSupabaseConfig();
  const headers = new Headers(options.headers);

  headers.set("apikey", anonKey);
  headers.set("Authorization", `Bearer ${accessToken || anonKey}`);

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(buildSupabaseUrl(url, path), {
    ...options,
    headers,
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "تعذر الاتصال بـ Supabase"));
  }

  return data as T;
}

async function refreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || session.expires_at > now + 60) return session;
  if (!session.refresh_token) return session;

  const payload = await supabaseRequest<SupabaseAuthResponse>(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    },
  );

  const nextSession = normalizeSession(payload);
  if (!nextSession) return session;

  saveSupabaseSession(nextSession);
  return nextSession;
}

export async function getValidSupabaseSession(): Promise<SupabaseSession | null> {
  const session = getStoredSupabaseSession();
  if (!session) return null;

  try {
    return await refreshSession(session);
  } catch {
    clearSupabaseSession();
    return null;
  }
}

function metadataValue(user: SupabaseAuthUser, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function fallbackName(user: SupabaseAuthUser) {
  return (
    metadataValue(user, "name") ||
    metadataValue(user, "full_name") ||
    user.email?.split("@")[0] ||
    "مستخدم مفك"
  );
}

function fallbackPhone(user: SupabaseAuthUser) {
  return metadataValue(user, "phone") || `user-${user.id.slice(0, 12)}`;
}

function toAuthUser(user: SupabaseAuthUser, row?: UserRow | null): AuthUser {
  return {
    userId: row?.id ?? user.id,
    name: row?.name || fallbackName(user),
    email: row?.email || user.email || undefined,
    phone: row?.phone || fallbackPhone(user),
    role: row?.role || "user",
  };
}

async function upsertUserRow(user: SupabaseAuthUser, accessToken: string): Promise<UserRow | null> {
  const profile = {
    id: user.id,
    name: fallbackName(user),
    phone: fallbackPhone(user),
    email: user.email ?? null,
    role: "user",
  };

  const rows = await supabaseRequest<UserRow[]>(
    "/rest/v1/users?on_conflict=id&select=id,name,email,phone,role",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(profile),
    },
    accessToken,
  );

  return rows?.[0] ?? null;
}

async function getUserRow(userId: string, accessToken: string): Promise<UserRow | null> {
  const rows = await supabaseRequest<UserRow[]>(
    `/rest/v1/users?select=id,name,email,phone,role&id=eq.${encodeURIComponent(userId)}&limit=1`,
    { method: "GET" },
    accessToken,
  );

  return rows?.[0] ?? null;
}

async function getProfileRow(user: SupabaseAuthUser, accessToken: string): Promise<UserRow | null> {
  try {
    return (await getUserRow(user.id, accessToken)) ?? (await upsertUserRow(user, accessToken));
  } catch {
    return null;
  }
}

export const authApi = {
  async register(name: string, phone: string, email: string, password: string): Promise<AuthUser> {
    const payload = await supabaseRequest<SupabaseAuthResponse>("/auth/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        data: { name, phone },
      }),
    });

    const session = normalizeSession(payload);
    if (!session) {
      throw new Error(
        "تم إنشاء الحساب، لكن Supabase يطلب تأكيد البريد قبل الدخول. عطّل Email confirmations مؤقتًا من Supabase Auth للتجربة الأولى.",
      );
    }

    saveSupabaseSession(session);
    const row = await getProfileRow(session.user, session.access_token);
    return toAuthUser(session.user, row);
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const payload = await supabaseRequest<SupabaseAuthResponse>(
      "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );

    const session = normalizeSession(payload);
    if (!session) throw new Error("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.");

    saveSupabaseSession(session);
    const row = await getProfileRow(session.user, session.access_token);
    return toAuthUser(session.user, row);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await getValidSupabaseSession();
    if (!session) return null;

    try {
      const authUser = await supabaseRequest<SupabaseAuthUser>(
        "/auth/v1/user",
        { method: "GET" },
        session.access_token,
      );
      const row = await getProfileRow(authUser, session.access_token);
      return toAuthUser(authUser, row);
    } catch {
      clearSupabaseSession();
      return null;
    }
  },

  async logout(): Promise<void> {
    const session = getStoredSupabaseSession();
    clearSupabaseSession();

    if (!session?.access_token) return;

    try {
      await supabaseRequest("/auth/v1/logout", { method: "POST" }, session.access_token);
    } catch {
      // Local logout is enough for the MVP.
    }
  },

  async getAccessToken(): Promise<string | null> {
    const session = await getValidSupabaseSession();
    return session?.access_token ?? null;
  },
};
