import { useAuthStore } from '../providers/auth-provider';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | null = null;

export async function apiClient<T>(
  url: string,
  init: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const { accessToken, clearAuth } = useAuthStore.getState();

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('x-request-id', crypto.randomUUID());

  const res = await fetch(url, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && !_isRetry) {
    // Attempt token refresh (deduplicate concurrent refreshes)
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          if (!refreshRes.ok) return false;
          const data = (await refreshRes.json()) as {
            accessToken: string;
            user: { userId: string; tenantId: string; roles: string[]; email: string; name: string };
          };
          useAuthStore.getState().setAuth(data.accessToken, data.user);
          return true;
        } catch {
          return false;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      return apiClient<T>(url, init, true);
    }
    clearAuth();
    throw new ApiError('Session expired', 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(
      (body['message'] as string) ?? res.statusText,
      res.status,
      body['code'] as string | undefined,
      body['details'],
    );
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
