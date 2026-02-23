/**
 * API client for mobile — wraps fetch with auth token injection.
 */
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/auth-store';

export const apiBaseUrl: string =
  (Constants.expoConfig?.extra?.['apiBaseUrl'] as string | undefined) ?? 'http://localhost:3000/api/v1';

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body['message'] ?? `API error (${res.status})`);
  }

  return (await res.json()) as T;
}
