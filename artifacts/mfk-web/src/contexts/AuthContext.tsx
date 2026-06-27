import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { authApi, type AuthUser } from "@/lib/supabase";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setAuthTokenGetter(() => authApi.getAccessToken());

    authApi
      .getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((u: AuthUser) => {
    setUser(u);
    setAuthTokenGetter(() => authApi.getAccessToken());
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthTokenGetter(null);
    void authApi.logout();
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

export type { AuthUser };
export { authApi };
