import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock function declarations (BEFORE vi.mock calls) ──────────────────────

const mockListWorkflows = vi.fn();
const mockGetWorkflow = vi.fn();
const mockCreateWorkflow = vi.fn();
const mockUpdateWorkflow = vi.fn();
const mockDeleteWorkflow = vi.fn();
const mockActivateWorkflow = vi.fn();
const mockDeactivateWorkflow = vi.fn();
const mockGetExecutions = vi.fn();

// ── vi.mock calls ──────────────────────────────────────────────────────────

vi.mock('../workflow.service.js', () => ({
  listWorkflows: (...a: unknown[]) => mockListWorkflows(...a),
  getWorkflow: (...a: unknown[]) => mockGetWorkflow(...a),
  createWorkflow: (...a: unknown[]) => mockCreateWorkflow(...a),
  updateWorkflow: (...a: unknown[]) => mockUpdateWorkflow(...a),
  deleteWorkflow: (...a: unknown[]) => mockDeleteWorkflow(...a),
  activateWorkflow: (...a: unknown[]) => mockActivateWorkflow(...a),
  deactivateWorkflow: (...a: unknown[]) => mockDeactivateWorkflow(...a),
  getExecutions: (...a: unknown[]) => mockGetExecutions(...a),
}));

vi.mock('../../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Imports AFTER mocks ────────────────────────────────────────────────────

import express from 'express';
import request from 'supertest';
import { workflowRouter } from '../workflow.routes.js';

// ── App setup ──────────────────────────────────────────────────────────────

const T = 'tenant-1';
const ACTOR = 'actor-1';
const ID = '00000000-0000-4000-a000-000000000001';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).user = { tid: T, sub: ACTOR };
  next();
});
app.use('/workflows', workflowRouter);

// ════════════════════════════════════════════════════════════════════════════

describe('Workflow Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /workflows ──────────────────────────────────────────────────────

  it('GET /workflows → 200 with paginated result', async () => {
    const paginated = { data: [{ id: ID, name: 'WF' }], total: 1, page: 1, pageSize: 20 };
    mockListWorkflows.mockResolvedValue(paginated);

    const res = await request(app).get('/workflows');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(paginated);
    expect(mockListWorkflows).toHaveBeenCalled();
  });

  // ─── POST /workflows ─────────────────────────────────────────────────────

  it('POST /workflows → 201 with created workflow', async () => {
    const created = { id: ID, name: 'New WF' };
    mockCreateWorkflow.mockResolvedValue(created);

    const res = await request(app)
      .post('/workflows')
      .send({
        name: 'New WF',
        trigger: { type: 'event', event: 'DEAL_WON' },
        conditions: [],
        actions: [],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: created });
    expect(mockCreateWorkflow).toHaveBeenCalled();
  });

  // ─── GET /workflows/:id ──────────────────────────────────────────────────

  it('GET /workflows/:id → 200 with workflow', async () => {
    const workflow = { id: ID, name: 'WF' };
    mockGetWorkflow.mockResolvedValue(workflow);

    const res = await request(app).get(`/workflows/${ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: workflow });
    expect(mockGetWorkflow).toHaveBeenCalledWith(T, ID);
  });

  // ─── PATCH /workflows/:id ────────────────────────────────────────────────

  it('PATCH /workflows/:id → 200 with updated workflow', async () => {
    const updated = { id: ID, name: 'Updated' };
    mockUpdateWorkflow.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/workflows/${ID}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: updated });
    expect(mockUpdateWorkflow).toHaveBeenCalled();
  });

  // ─── DELETE /workflows/:id ───────────────────────────────────────────────

  it('DELETE /workflows/:id → 204', async () => {
    mockDeleteWorkflow.mockResolvedValue(undefined);

    const res = await request(app).delete(`/workflows/${ID}`);

    expect(res.status).toBe(204);
    expect(mockDeleteWorkflow).toHaveBeenCalledWith(T, ID);
  });

  // ─── POST /workflows/:id/activate ────────────────────────────────────────

  it('POST /workflows/:id/activate → 200', async () => {
    const activated = { id: ID, status: 'ACTIVE' };
    mockActivateWorkflow.mockResolvedValue(activated);

    const res = await request(app).post(`/workflows/${ID}/activate`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: activated });
    expect(mockActivateWorkflow).toHaveBeenCalledWith(T, ID);
  });

  // ─── POST /workflows/:id/deactivate ──────────────────────────────────────

  it('POST /workflows/:id/deactivate → 200', async () => {
    const deactivated = { id: ID, status: 'INACTIVE' };
    mockDeactivateWorkflow.mockResolvedValue(deactivated);

    const res = await request(app).post(`/workflows/${ID}/deactivate`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: deactivated });
    expect(mockDeactivateWorkflow).toHaveBeenCalledWith(T, ID);
  });

  // ─── GET /workflows/:id/executions ───────────────────────────────────────

  it('GET /workflows/:id/executions → 200 with paginated executions', async () => {
    const paginated = { data: [], total: 0, page: 1, pageSize: 20 };
    mockGetExecutions.mockResolvedValue(paginated);

    const res = await request(app).get(`/workflows/${ID}/executions`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(paginated);
    expect(mockGetExecutions).toHaveBeenCalled();
  });
});
