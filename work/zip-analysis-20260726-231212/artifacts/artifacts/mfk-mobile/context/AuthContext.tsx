import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AuthUser {
  userId: string;
  name: string;
  email?: string;
  phone: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

const STORAGE_KEY = "mfk-auth-user";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function apiPost<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "حدث خطأ");
  return data as T;
}

export const authApi = {
  register: (name: string, phone: string, email: string, password: string) =>
    apiPost<AuthUser>("/api/auth/register", { name, phone, email, password }),

  login: (email: string, password: string) =>
    apiPost<AuthUser>("/api/auth/login", { email, password }),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AuthUser;
          setUser(parsed);
          setAuthTokenGetter(() => parsed.userId);
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (u: AuthUser) => {
    setUser(u);
    setAuthTokenGetter(() => u.userId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAuthTokenGetter(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
