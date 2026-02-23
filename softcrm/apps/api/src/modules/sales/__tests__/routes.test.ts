import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ── Mock service layer ─────────────────────────────────────────────────────────

const mockGetContacts = vi.fn();
const mockGetContact = vi.fn();
const mockCreateContact = vi.fn();
const mockCaptureLead = vi.fn();
const mockConvertLead = vi.fn();
const mockMoveDealStage = vi.fn();
const mockGetDeals = vi.fn();
const mockGetDeal = vi.fn();
const mockCreateDeal = vi.fn();
const mockUpdateDeal = vi.fn();
const mockGetLeads = vi.fn();
const mockGetLead = vi.fn();
const mockUpdateContact = vi.fn();
const mockMarkDealWon = vi.fn();
const mockMarkDealLost = vi.fn();
const mockGetAccounts = vi.fn();
const mockGetAccount = vi.fn();
const mockCreateAccount = vi.fn();
const mockUpdateAccount = vi.fn();
const mockCreateQuote = vi.fn();
const mockGetQuotes = vi.fn();
const mockGetQuote = vi.fn();
const mockSubmitForApproval = vi.fn();

vi.mock('../service.js', () => ({
  getContacts: (...args: unknown[]) => mockGetContacts(...args),
  getContact: (...args: unknown[]) => mockGetContact(...args),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  updateContact: (...args: unknown[]) => mockUpdateContact(...args),
  captureLead: (...args: unknown[]) => mockCaptureLead(...args),
  convertLead: (...args: unknown[]) => mockConvertLead(...args),
  moveDealStage: (...args: unknown[]) => mockMoveDealStage(...args),
  getDeals: (...args: unknown[]) => mockGetDeals(...args),
  getDeal: (...args: unknown[]) => mockGetDeal(...args),
  createDeal: (...args: unknown[]) => mockCreateDeal(...args),
  updateDeal: (...args: unknown[]) => mockUpdateDeal(...args),
  getLeads: (...args: unknown[]) => mockGetLeads(...args),
  getLead: (...args: unknown[]) => mockGetLead(...args),
  markDealWon: (...args: unknown[]) => mockMarkDealWon(...args),
  markDealLost: (...args: unknown[]) => mockMarkDealLost(...args),
  getAccounts: (...args: unknown[]) => mockGetAccounts(...args),
  getAccount: (...args: unknown[]) => mockGetAccount(...args),
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
  updateAccount: (...args: unknown[]) => mockUpdateAccount(...args),
  createQuote: (...args: unknown[]) => mockCreateQuote(...args),
  getQuotes: (...args: unknown[]) => mockGetQuotes(...args),
  getQuote: (...args: unknown[]) => mockGetQuote(...args),
  submitForApproval: (...args: unknown[]) => mockSubmitForApproval(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: vi.fn(() => (_req: unknown, _res: unknown, next: Function) => next()),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: vi.fn(() => (_req: unknown, _res: unknown, next: Function) => next()),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
  tenantContext: { getStore: vi.fn() },
}));

// ── Import router ──────────────────────────────────────────────────────────────

import { salesRouter } from '../routes.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Walk Express router stack to find a matching layer and invoke its handler.
 * This avoids needing supertest or a real HTTP server.
 */
async function invokeRoute(
  method: string,
  path: string,
  req: Record<string, unknown>,
  res: Record<string, unknown>,
): Promise<void> {
  const layers = (salesRouter as unknown as { stack: unknown[] }).stack;

  for (const layer of layers as Array<{
    route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> };
  }>) {
    if (!layer.route) continue;

    const routePath = layer.route.path;
    const methods = layer.route.methods;

    if (!methods[method.toLowerCase()]) continue;

    // Simple param matching: convert route pattern to regex
    const paramNames: string[] = [];
    const pattern = routePath.replace(/:(\w+)/g, (_: string, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${pattern}$`);
    const match = path.match(regex);
    if (!match) continue;

    // Extract params
    const params: Record<string, string> = {};
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1]!;
    });

    // Inject params into req — merge route-extracted params with any caller overrides
    const mergedParams = { ...params, ...((req as Record<string, unknown>)['params'] as Record<string, string> | undefined) };
    const { params: _ignoreParams, ...restReq } = req as Record<string, unknown>;
    const fullReq = {
      user: { sub: 'user-1', tid: 'tenant-1', roles: ['admin'] },
      params: mergedParams,
      query: {},
      body: {},
      ownershipScope: undefined,
      ...restReq,
    };

    // Execute all handlers in the route stack in sequence
    const handlers = layer.route.stack;
    let handlerIndex = 0;

    const next: NextFunction = ((err?: unknown) => {
      if (err) throw err;
      handlerIndex++;
      if (handlerIndex < handlers.length) {
        const h = handlers[handlerIndex]!;
        const result = h.handle(fullReq, res, next);
        if (result instanceof Promise) {
          result.catch(next);
        }
      }
    }) as NextFunction;

    const firstHandler = handlers[handlerIndex]!;
    const result = firstHandler.handle(fullReq, res, next);
    if (result instanceof Promise) {
      await result;
    }
    return;
  }

  throw new Error(`No route matched ${method} ${path}`);
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res['json'] = vi.fn().mockReturnValue(res);
  res['status'] = vi.fn().mockReturnValue(res);
  res['end'] = vi.fn().mockReturnValue(res);
  return res as unknown as { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
}

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Contact routes ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /contacts', () => {
  it('calls getContacts with correct params', async () => {
    mockGetContacts.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = mockRes();
    await invokeRoute('get', '/contacts', {
      query: { page: 1, limit: 20, sortDir: 'asc' },
    }, res);

    expect(mockGetContacts).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.objectContaining({ page: 1, limit: 20 }),
      undefined,
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [],
        meta: expect.objectContaining({ total: 0 }),
      }),
    );
  });
});

describe('POST /contacts', () => {
  it('calls createContact', async () => {
    const contact = { id: 'c-1', firstName: 'Jane', lastName: 'Doe' };
    mockCreateContact.mockResolvedValue(contact);

    const res = mockRes();
    await invokeRoute('post', '/contacts', {
      body: { firstName: 'Jane', lastName: 'Doe' },
    }, res);

    expect(mockCreateContact).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }),
      'user-1',
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: contact });
  });
});

describe('GET /contacts/:id', () => {
  it('calls getContact', async () => {
    const contact = { id: 'c-1', firstName: 'Jane' };
    mockGetContact.mockResolvedValue(contact);

    const res = mockRes();
    await invokeRoute('get', '/contacts/c-1', {}, res);

    expect(mockGetContact).toHaveBeenCalledWith('tenant-1', 'c-1');
    expect(res.json).toHaveBeenCalledWith({ data: contact });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Lead routes ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /leads', () => {
  it('calls captureLead', async () => {
    const lead = { id: 'l-1', firstName: 'Bob', score: 25 };
    mockCaptureLead.mockResolvedValue(lead);

    const res = mockRes();
    await invokeRoute('post', '/leads', {
      body: {
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@example.com',
        source: 'REFERRAL',
      },
    }, res);

    expect(mockCaptureLead).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ firstName: 'Bob' }),
      'user-1',
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: lead });
  });
});

describe('POST /leads/:id/convert', () => {
  it('calls convertLead', async () => {
    const result = { leadId: 'l-1', contactId: 'c-1', accountId: 'a-1', dealId: 'd-1' };
    mockConvertLead.mockResolvedValue(result);

    const res = mockRes();
    await invokeRoute('post', '/leads/l-1/convert', {
      body: { createContact: true, createDeal: true },
    }, res);

    expect(mockConvertLead).toHaveBeenCalledWith(
      'tenant-1',
      'l-1',
      expect.objectContaining({ createContact: true, createDeal: true }),
      'user-1',
    );
    expect(res.json).toHaveBeenCalledWith({ data: result });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Deal routes ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /deals/:id/stage', () => {
  it('calls moveDealStage', async () => {
    const deal = { id: 'd-1', stageId: 'stage-new' };
    mockMoveDealStage.mockResolvedValue(deal);

    const res = mockRes();
    await invokeRoute('post', '/deals/d-1/stage', {
      body: { stageId: 'stage-new' },
    }, res);

    expect(mockMoveDealStage).toHaveBeenCalledWith(
      'tenant-1',
      'd-1',
      'stage-new',
      'user-1',
    );
    expect(res.json).toHaveBeenCalledWith({ data: deal });
  });
});
