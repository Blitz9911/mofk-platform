import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  authApi,
  type AuthUser,
} from "@/lib/supabase";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => Promise<void>;
  updateProfile: (input: {
    name: string;
    phone: string;
    city?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: async () => {},
  updateProfile: async () => {
    throw new Error("AuthProvider is not ready.");
  },
  logout: async () => {},
});

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setAuthTokenGetter(() => authApi.getAccessToken());

    async function restoreSession() {
      try {
        const currentUser = await authApi.getCurrentUser();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (nextUser: AuthUser) => {
    setUser(nextUser);

    setAuthTokenGetter(() => authApi.getAccessToken());
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAuthTokenGetter(null);

    await authApi.logout();
  }, []);

  const updateProfile = useCallback(
    async (input: { name: string; phone: string; city?: string }) => {
      const nextUser = await authApi.updateProfile(input);
      setUser(nextUser);
      return nextUser;
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export type { AuthUser };
export { authApi };
