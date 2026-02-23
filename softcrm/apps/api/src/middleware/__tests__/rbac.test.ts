import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetCachedPermissions = vi.fn();
const mockSetCachedPermissions = vi.fn();

vi.mock('../../modules/platform/rbac/rbac.cache.js', () => ({
  getCachedPermissions: (...args: unknown[]) => mockGetCachedPermissions(...args),
  setCachedPermissions: (...args: unknown[]) => mockSetCachedPermissions(...args),
}));

vi.mock('../../modules/platform/rbac/rbac.service.js', () => ({
  resolvePermissions: vi.fn(),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    userRole: { findMany: vi.fn().mockResolvedValue([]) },
  }),
}));

import { requirePermission } from '../rbac.js';
import { ForbiddenError } from '@softcrm/shared-kernel';

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/api/test',
    user: undefined as unknown,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('requirePermission middleware', () => {
  it('calls next with ForbiddenError when no user on request', async () => {
    const middleware = requirePermission({ module: 'SALES' });
    const req = mockReq({ user: undefined });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('passes when user has ADMIN module access', async () => {
    mockGetCachedPermissions.mockResolvedValue({
      modules: { SALES: 'ADMIN' },
      entities: {},
      fields: {},
    });

    const middleware = requirePermission({ module: 'SALES' });
    const req = mockReq({ user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with ForbiddenError when user has NONE module access', async () => {
    mockGetCachedPermissions.mockResolvedValue({
      modules: { SALES: 'NONE' },
      entities: {},
      fields: {},
    });

    const middleware = requirePermission({ module: 'SALES' });
    const req = mockReq({ user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('passes when entity permission allows create action', async () => {
    mockGetCachedPermissions.mockResolvedValue({
      modules: { SALES: 'WRITE' },
      entities: {
        'SALES:Lead': {
          scope: 'ALL',
          canCreate: true,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
      },
      fields: {},
    });

    const middleware = requirePermission({ module: 'SALES', entity: 'Lead', action: 'create' });
    const req = mockReq({ user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with ForbiddenError when entity create is denied', async () => {
    mockGetCachedPermissions.mockResolvedValue({
      modules: { SALES: 'READ' },
      entities: {
        'SALES:Lead': {
          scope: 'OWN',
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
      },
      fields: {},
    });

    const middleware = requirePermission({ module: 'SALES', entity: 'Lead', action: 'create' });
    const req = mockReq({ user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('sets ownershipScope on request from entity permission', async () => {
    mockGetCachedPermissions.mockResolvedValue({
      modules: { SALES: 'WRITE' },
      entities: {
        'SALES:Lead': {
          scope: 'TEAM',
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: false,
        },
      },
      fields: {},
    });

    const middleware = requirePermission({ module: 'SALES', entity: 'Lead', action: 'read' });
    const req = mockReq({ user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(req.ownershipScope).toBe('TEAM');
    expect(next).toHaveBeenCalledWith();
  });

  it('loads fieldPermissions onto request for the entity', async () => {
    mockGetCachedPermissions.mockResolvedValue({
      modules: { SALES: 'WRITE' },
      entities: {
        'SALES:Lead': {
          scope: 'ALL',
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        },
      },
      fields: {
        'SALES:Lead:revenue': { visible: true, editable: false },
        'SALES:Lead:name': { visible: true, editable: true },
        'ACCOUNTING:Invoice:total': { visible: true, editable: true }, // different entity
      },
    });

    const middleware = requirePermission({ module: 'SALES', entity: 'Lead', action: 'read' });
    const req = mockReq({ user: { sub: 'u1', tenantId: 't1', email: 'a@b.com', role: 'user' } });
    const res = mockRes();
    const next = mockNext();

    await middleware(req, res, next);

    expect(req.fieldPermissions).toEqual({
      revenue: { visible: true, editable: false },
      name: { visible: true, editable: true },
    });
    // Should NOT include the ACCOUNTING field
    expect(req.fieldPermissions).not.toHaveProperty('total');
    expect(next).toHaveBeenCalledWith();
  });
});
