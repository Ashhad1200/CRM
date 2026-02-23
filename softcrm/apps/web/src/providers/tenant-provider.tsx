import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './auth-provider';

interface TenantContextValue {
  tenantId: string | null;
  isReady: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenantId: null,
  isReady: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const value = useMemo<TenantContextValue>(
    () => ({
      tenantId: user?.tenantId ?? null,
      isReady: isAuthenticated && user?.tenantId != null,
    }),
    [user?.tenantId, isAuthenticated],
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
