/**
 * Auth provider — initializes auth state from secure storage on mount.
 */
import React, { useEffect, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore, type AuthUser } from '../stores/auth-store';

const TOKEN_KEY = 'softcrm_access_token';
const REFRESH_KEY = 'softcrm_refresh_token';
const USER_KEY = 'softcrm_user';

export async function persistAuth(user: AuthUser, accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearPersistedAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuth, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
        const userJSON = await SecureStore.getItemAsync(USER_KEY);

        if (accessToken && refreshToken && userJSON) {
          const user = JSON.parse(userJSON) as AuthUser;
          setAuth(user, accessToken, refreshToken);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    };

    void loadAuth();
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
}
