import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Tenant Context — AsyncLocalStorage wrapper for per-request tenant isolation.
 *
 * Usage:
 *   tenantContext.run(tenantId, async () => { ... });
 *   const tid = tenantContext.getTenantId(); // within the callback
 */

interface TenantStore {
  tenantId: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

export const tenantContext = {
  /**
   * Run a callback within a tenant context.
   */
  run<T>(tenantId: string, fn: () => T): T {
    return storage.run({ tenantId }, fn);
  },

  /**
   * Get the current tenant ID (throws if not in a tenant context).
   */
  getTenantId(): string {
    const store = storage.getStore();
    if (!store) {
      throw new Error('tenantContext.getTenantId() called outside of a tenant context');
    }
    return store.tenantId;
  },

  /**
   * Get the current tenant ID (returns undefined if not in a tenant context).
   */
  getTenantIdOrNull(): string | undefined {
    return storage.getStore()?.tenantId;
  },
};
