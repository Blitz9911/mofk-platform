const SESSION_STORAGE_KEY = "mfk-supabase-session";

type JsonRecord = Record<string, unknown>;

type SupabaseAuthUser = {
  id: string;
  email?: string;
  phone?: string;
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
  subscription_tier?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  subscription_auto_renew?: boolean | null;
  is_active?: boolean | null;
};

export interface AuthUser {
  userId: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
  subscriptionTier: string;
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
  subscriptionAutoRenew?: boolean | null;
  isActive?: boolean | null;
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
  return metadataValue(user, "phone") || user.phone || `user-${user.id.slice(0, 12)}`;
}

function normalizeSaudiPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("9665") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("05") && digits.length === 10) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `+966${digits}`;

  throw new Error("أدخل رقم جوال سعودي صحيح.");
}

function consumeHashSession(): SupabaseSession | null {
  if (typeof window === "undefined" || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token") ?? undefined;

  if (!accessToken) return null;

  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at:
      Math.floor(Date.now() / 1000) + Number(params.get("expires_in") ?? 3600),
    expires_in: Number(params.get("expires_in") ?? 3600),
    user: { id: "" },
  };

  window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  return session;
}

function toAuthUser(user: SupabaseAuthUser, row?: UserRow | null): AuthUser {
  return {
    userId: row?.id ?? user.id,
    name: row?.name || fallbackName(user),
    email: row?.email || user.email || undefined,
    phone: row?.phone || fallbackPhone(user),
    role: row?.role || "user",
    subscriptionTier: row?.subscription_tier || "free",
    subscriptionStartedAt: row?.subscription_started_at ?? null,
    subscriptionEndsAt: row?.subscription_ends_at ?? null,
    subscriptionAutoRenew: row?.subscription_auto_renew ?? true,
    isActive: row?.is_active ?? true,
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
    "/rest/v1/users?on_conflict=id&select=id,name,email,phone,role,subscription_tier,subscription_started_at,subscription_ends_at,subscription_auto_renew,is_active",
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
    `/rest/v1/users?select=id,name,email,phone,role,subscription_tier,subscription_started_at,subscription_ends_at,subscription_auto_renew,is_active&id=eq.${encodeURIComponent(userId)}&limit=1`,
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

async function touchLastActiveAt(userId: string, accessToken: string) {
  try {
    await supabaseRequest(
      `/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          last_active_at: new Date().toISOString(),
        }),
      },
      accessToken,
    );
  } catch {
    // Last activity should never block login.
  }
}

export const authApi = {
  normalizePhone(phone: string) {
    return normalizeSaudiPhone(phone);
  },

  async requestPhoneOtp(phone: string): Promise<string> {
    const normalizedPhone = normalizeSaudiPhone(phone);

    await supabaseRequest("/auth/v1/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizedPhone,
        create_user: true,
      }),
    });

    return normalizedPhone;
  },

  async verifyPhoneOtp(phone: string, token: string): Promise<AuthUser> {
    const normalizedPhone = normalizeSaudiPhone(phone);
    const cleanToken = token.replace(/\D/g, "");

    if (cleanToken.length !== 6) {
      throw new Error("أدخل رمز التحقق المكون من 6 أرقام.");
    }

    const payload = await supabaseRequest<SupabaseAuthResponse>("/auth/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: normalizedPhone,
        token: cleanToken,
        type: "sms",
      }),
    });

    const session = normalizeSession(payload);
    if (!session) throw new Error("تعذر تأكيد رقم الجوال. حاول مرة أخرى.");

    saveSupabaseSession(session);
    const row = await getProfileRow(session.user, session.access_token);
    await touchLastActiveAt(session.user.id, session.access_token);
    return toAuthUser(session.user, row);
  },

  signInWithGoogle(nextPath = "/app") {
    const { url } = getSupabaseConfig();
    const redirectTo = new URL("/login", window.location.origin);
    redirectTo.searchParams.set("next", nextPath);

    const authorizeUrl = new URL(`${url}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", redirectTo.toString());
    window.location.href = authorizeUrl.toString();
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    let session = await getValidSupabaseSession();
    const hashSession = consumeHashSession();

    if (!session && hashSession) {
      try {
        const authUser = await supabaseRequest<SupabaseAuthUser>(
          "/auth/v1/user",
          { method: "GET" },
          hashSession.access_token,
        );
        session = { ...hashSession, user: authUser };
        saveSupabaseSession(session);
      } catch {
        clearSupabaseSession();
        return null;
      }
    }

    if (!session) return null;

    try {
      const authUser = await supabaseRequest<SupabaseAuthUser>(
        "/auth/v1/user",
        { method: "GET" },
        session.access_token,
      );
      const row = await getProfileRow(authUser, session.access_token);
      await touchLastActiveAt(authUser.id, session.access_token);
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
