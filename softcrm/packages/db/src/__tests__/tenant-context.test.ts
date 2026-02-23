import { describe, it, expect } from 'vitest';
import { tenantContext } from '../tenant-context.js';

describe('tenant-context', () => {
  it('getTenantIdOrNull returns undefined outside context', () => {
    expect(tenantContext.getTenantIdOrNull()).toBeUndefined();
  });

  it('getTenantId throws outside context', () => {
    expect(() => tenantContext.getTenantId()).toThrow('outside of a tenant context');
  });

  it('run provides tenant id within callback', () => {
    let captured: string | undefined;
    tenantContext.run('tenant-abc', () => {
      captured = tenantContext.getTenantId();
    });
    expect(captured).toBe('tenant-abc');
  });

  it('getTenantIdOrNull resolves within context', () => {
    let captured: string | undefined;
    tenantContext.run('tenant-xyz', () => {
      captured = tenantContext.getTenantIdOrNull();
    });
    expect(captured).toBe('tenant-xyz');
  });
});
