import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_STORAGE_KEY = "mfk-supabase-session";

type JsonRecord = Record<string, unknown>;

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: JsonRecord;
};

export type SupabaseSession = {
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
  message?: string;
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
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "").replace(/\/(?:rest|auth)\/v1$/, "");
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "إعدادات Supabase ناقصة. أضف EXPO_PUBLIC_SUPABASE_URL وEXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url,
    anonKey,
  };
}

function buildSupabaseUrl(baseUrl: string, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath.replace(/^\/rest\/v1\/auth\/v1\//, "/auth/v1/")}`;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") {
    if (typeof data === "string" && data.trim()) {
      return data;
    }

    return fallback;
  }

  const value = data as Record<string, unknown>;

  const candidates = [
    value.error_description,
    value.msg,
    value.message,
    value.error,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
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

  let data: unknown = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, "تعذر الاتصال بخدمة Supabase."),
    );
  }

  return data as T;
}

export async function getStoredSupabaseSession(): Promise<SupabaseSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SupabaseSession;

    if (!parsed?.access_token || !parsed?.user?.id) {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function saveSupabaseSession(
  session: SupabaseSession,
): Promise<void> {
  await AsyncStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export async function clearSupabaseSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

function normalizeSession(
  payload: SupabaseAuthResponse,
): SupabaseSession | null {
  const rawSession = payload.session ?? payload;
  const user = rawSession.user ?? payload.user;

  if (!rawSession.access_token || !user?.id) {
    return null;
  }

  return {
    access_token: rawSession.access_token,
    refresh_token: rawSession.refresh_token,
    expires_at:
      rawSession.expires_at ??
      Math.floor(Date.now() / 1000) +
        (rawSession.expires_in ?? 3600),
    expires_in: rawSession.expires_in,
    user,
  };
}

async function refreshSession(
  session: SupabaseSession,
): Promise<SupabaseSession> {
  const now = Math.floor(Date.now() / 1000);

  if (!session.expires_at || session.expires_at > now + 60) {
    return session;
  }

  if (!session.refresh_token) {
    return session;
  }

  const payload = await supabaseRequest<SupabaseAuthResponse>(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token,
      }),
    },
  );

  const refreshedSession = normalizeSession(payload);

  if (!refreshedSession) {
    throw new Error("انتهت جلسة تسجيل الدخول.");
  }

  await saveSupabaseSession(refreshedSession);

  return refreshedSession;
}

export async function getValidSupabaseSession(): Promise<SupabaseSession | null> {
  const session = await getStoredSupabaseSession();

  if (!session) {
    return null;
  }

  try {
    return await refreshSession(session);
  } catch {
    await clearSupabaseSession();
    return null;
  }
}

function metadataValue(
  user: SupabaseAuthUser,
  key: string,
): string {
  const value = user.user_metadata?.[key];

  return typeof value === "string" ? value.trim() : "";
}

function fallbackName(user: SupabaseAuthUser): string {
  return (
    metadataValue(user, "name") ||
    metadataValue(user, "full_name") ||
    user.email?.split("@")[0] ||
    "مستخدم مفك"
  );
}

function fallbackPhone(user: SupabaseAuthUser): string {
  return (
    metadataValue(user, "phone") ||
    `user-${user.id.slice(0, 12)}`
  );
}

function normalizeSaudiPhone(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("966")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0")) {
    return `+966${cleaned.slice(1)}`;
  }

  return `+966${cleaned}`;
}

function toAuthUser(
  user: SupabaseAuthUser,
  row?: UserRow | null,
): AuthUser {
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

async function upsertUserRow(
  user: SupabaseAuthUser,
  accessToken: string,
): Promise<UserRow | null> {
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

async function getUserRow(
  userId: string,
  accessToken: string,
): Promise<UserRow | null> {
  const rows = await supabaseRequest<UserRow[]>(
    `/rest/v1/users?select=id,name,email,phone,role,subscription_tier,subscription_started_at,subscription_ends_at,subscription_auto_renew,is_active&id=eq.${encodeURIComponent(
      userId,
    )}&limit=1`,
    {
      method: "GET",
    },
    accessToken,
  );

  return rows?.[0] ?? null;
}

async function getProfileRow(
  user: SupabaseAuthUser,
  accessToken: string,
): Promise<UserRow | null> {
  try {
    return (
      (await getUserRow(user.id, accessToken)) ??
      (await upsertUserRow(user, accessToken))
    );
  } catch {
    return null;
  }
}

async function touchLastActiveAt(
  userId: string,
  accessToken: string,
): Promise<void> {
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
  async register(
    name: string,
    phone: string,
    email: string,
    password: string,
  ): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizeSaudiPhone(phone);

    const payload = await supabaseRequest<SupabaseAuthResponse>(
      "/auth/v1/signup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          data: {
            name: name.trim(),
            full_name: name.trim(),
            phone: normalizedPhone,
          },
        }),
      },
    );

    const session = normalizeSession(payload);

    if (!session) {
      throw new Error(
        "تم إنشاء الحساب، لكن يلزم تأكيد البريد الإلكتروني قبل تسجيل الدخول.",
      );
    }

    await saveSupabaseSession(session);

    const row = await getProfileRow(session.user, session.access_token);
    await touchLastActiveAt(session.user.id, session.access_token);

    return toAuthUser(session.user, row);
  },

  async login(
    email: string,
    password: string,
  ): Promise<AuthUser> {
    const payload = await supabaseRequest<SupabaseAuthResponse>(
      "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      },
    );

    const session = normalizeSession(payload);

    if (!session) {
      throw new Error(
        "تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.",
      );
    }

    await saveSupabaseSession(session);

    const row = await getProfileRow(session.user, session.access_token);
    await touchLastActiveAt(session.user.id, session.access_token);

    return toAuthUser(session.user, row);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await getValidSupabaseSession();

    if (!session) {
      return null;
    }

    try {
      const authUser = await supabaseRequest<SupabaseAuthUser>(
        "/auth/v1/user",
        {
          method: "GET",
        },
        session.access_token,
      );

      const row = await getProfileRow(authUser, session.access_token);
      await touchLastActiveAt(authUser.id, session.access_token);

      return toAuthUser(authUser, row);
    } catch {
      await clearSupabaseSession();
      return null;
    }
  },

  async getAccessToken(): Promise<string | null> {
    const session = await getValidSupabaseSession();

    return session?.access_token ?? null;
  },

  async logout(): Promise<void> {
    const session = await getStoredSupabaseSession();

    await clearSupabaseSession();

    if (!session?.access_token) {
      return;
    }

    try {
      await supabaseRequest(
        "/auth/v1/logout",
        {
          method: "POST",
        },
        session.access_token,
      );
    } catch {
      // حذف الجلسة من الجهاز يكفي عند تعذر الاتصال.
    }
  },
};
