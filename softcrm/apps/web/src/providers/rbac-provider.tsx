import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { create } from 'zustand';
import { useAuth } from './auth-provider';
import { apiClient } from '../lib/api-client';

type Action = 'create' | 'read' | 'update' | 'delete';
type Scope = 'all' | 'team' | 'own' | 'none';

interface EntityPermission {
  actions: Record<Action, boolean>;
  scope: Scope;
  fields?: Record<string, { visible: boolean; editable: boolean }>;
}

interface ModulePermission {
  access: 'none' | 'read' | 'write' | 'admin';
  entities: Record<string, EntityPermission>;
}

export type Permissions = Record<string, ModulePermission>;

interface RbacState {
  permissions: Permissions;
  loaded: boolean;
  setPermissions: (p: Permissions) => void;
  clear: () => void;
}

export const useRbacStore = create<RbacState>((set) => ({
  permissions: {},
  loaded: false,
  setPermissions: (permissions) => set({ permissions, loaded: true }),
  clear: () => set({ permissions: {}, loaded: false }),
}));

interface RbacContextValue {
  permissions: Permissions;
  loaded: boolean;
  hasPermission: (module: string, entity: string, action: Action) => boolean;
  getFieldPermission: (
    module: string,
    entity: string,
    field: string,
  ) => { visible: boolean; editable: boolean };
}

const RbacContext = createContext<RbacContextValue | null>(null);

export function RbacProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { permissions, loaded, setPermissions, clear } = useRbacStore();

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }
    void (async () => {
      try {
        interface RawPerms {
          data: {
            modules: Record<string, string>;
            entities: Record<string, { scope: string; canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }>;
            fields: Record<string, { visible: boolean; editable: boolean }>;
          };
        }
        const res = await apiClient<RawPerms>(
          '/api/v1/platform/roles/me/permissions',
        );
        const raw = res.data;

        // Transform flat API shape → nested Permissions shape expected by UI
        const result: Permissions = {};
        for (const [mod, access] of Object.entries(raw.modules)) {
          result[mod] = {
            access: access.toLowerCase() as ModulePermission['access'],
            entities: {},
          };
        }
        for (const [key, ep] of Object.entries(raw.entities)) {
          const [mod, entity] = key.split(':');
          if (mod && entity && result[mod]) {
            result[mod].entities[entity] = {
              actions: {
                create: ep.canCreate,
                read: ep.canRead,
                update: ep.canUpdate,
                delete: ep.canDelete,
              },
              scope: ep.scope.toLowerCase() as Scope,
            };
          }
        }
        for (const [key, fp] of Object.entries(raw.fields)) {
          const parts = key.split(':');
          const mod = parts[0];
          const entity = parts[1];
          const field = parts[2];
          if (mod && entity && field && result[mod]) {
            const ent = result[mod].entities[entity];
            if (ent) {
              if (!ent.fields) ent.fields = {};
              ent.fields[field] = fp;
            }
          }
        }
        setPermissions(result);
      } catch {
        clear();
      }
    })();
  }, [isAuthenticated, setPermissions, clear]);

  const value = useMemo<RbacContextValue>(() => {
    const hasPermission = (module: string, entity: string, action: Action): boolean => {
      const mod = permissions[module];
      if (!mod || mod.access === 'none') return false;
      const ent = mod.entities[entity];
      if (!ent) return mod.access === 'admin';
      return ent.actions[action] ?? false;
    };

    const getFieldPermission = (
      module: string,
      entity: string,
      field: string,
    ): { visible: boolean; editable: boolean } => {
      const mod = permissions[module];
      if (!mod) return { visible: false, editable: false };
      const ent = mod.entities[entity];
      if (!ent) return { visible: false, editable: false };
      const fp = ent.fields?.[field];
      return fp ?? { visible: true, editable: true };
    };

    return { permissions, loaded, hasPermission, getFieldPermission };
  }, [permissions, loaded]);

  return (
    <RbacContext.Provider value={value}>
      {children}
    </RbacContext.Provider>
  );
}

export function useRbac(): RbacContextValue {
  const ctx = useContext(RbacContext);
  if (!ctx) throw new Error('useRbac must be used within RbacProvider');
  return ctx;
}

export function Can({
  module,
  entity,
  action,
  children,
  fallback = null,
}: {
  module: string;
  entity: string;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useRbac();
  return hasPermission(module, entity, action) ? <>{children}</> : <>{fallback}</>;
}
