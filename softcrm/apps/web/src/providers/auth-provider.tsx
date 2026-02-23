import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react';
import { create } from 'zustand';

interface AuthUser {
  userId: string;
  tenantId: string;
  roles: string[];
  email: string;
  name: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (token, user) =>
    set({ accessToken: token, user, isAuthenticated: true, isLoading: false }),
  clearAuth: () =>
    set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// Auth endpoints use raw fetch (not apiClient) to prevent circular 401 refresh loops.
async function authFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((body['message'] as string) ?? `Auth request failed: ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading } =
    useAuthStore();

  const login = useCallback(
    async (email: string, password: string, tenantSlug = 'default') => {
      const res = await authFetch<AuthResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, tenantSlug }),
      });
      setAuth(res.accessToken, res.user);
    },
    [setAuth],
  );

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await authFetch<AuthResponse>('/api/v1/auth/refresh', {
        method: 'POST',
      });
      setAuth(res.accessToken, res.user);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [setAuth, clearAuth]);

  const logout = useCallback(async () => {
    try {
      await authFetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  // Attempt silent refresh on mount
  useEffect(() => {
    void refreshToken().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
