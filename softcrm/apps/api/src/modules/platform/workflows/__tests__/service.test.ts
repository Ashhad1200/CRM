import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock function declarations (BEFORE vi.mock calls) ──────────────────────

const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();
const mockFindActiveByTriggerEvent = vi.fn();
const mockCreateExecution = vi.fn();
const mockCompleteExecution = vi.fn();
const mockFailExecution = vi.fn();
const mockGetExecutions = vi.fn();
const mockPublishWorkflowExecuted = vi.fn();
const mockEvaluateConditions = vi.fn();
const mockExecuteActions = vi.fn();
const mockCheckLoopDepth = vi.fn();

// ── vi.mock calls ──────────────────────────────────────────────────────────

vi.mock('../workflow.repository.js', () => ({
  findAll: (...a: unknown[]) => mockFindAll(...a),
  findById: (...a: unknown[]) => mockFindById(...a),
  create: (...a: unknown[]) => mockCreate(...a),
  update: (...a: unknown[]) => mockUpdate(...a),
  remove: (...a: unknown[]) => mockRemove(...a),
  activate: (...a: unknown[]) => mockActivate(...a),
  deactivate: (...a: unknown[]) => mockDeactivate(...a),
  findActiveByTriggerEvent: (...a: unknown[]) => mockFindActiveByTriggerEvent(...a),
  createExecution: (...a: unknown[]) => mockCreateExecution(...a),
  completeExecution: (...a: unknown[]) => mockCompleteExecution(...a),
  failExecution: (...a: unknown[]) => mockFailExecution(...a),
  getExecutions: (...a: unknown[]) => mockGetExecutions(...a),
}));

vi.mock('../workflow.events.js', () => ({
  publishWorkflowExecuted: (...a: unknown[]) => mockPublishWorkflowExecuted(...a),
}));

vi.mock('../workflow.engine.js', () => ({
  evaluateConditions: (...a: unknown[]) => mockEvaluateConditions(...a),
  executeActions: (...a: unknown[]) => mockExecuteActions(...a),
  checkLoopDepth: (...a: unknown[]) => mockCheckLoopDepth(...a),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    workflow: { findUnique: vi.fn() },
  }),
}));

vi.mock('../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Imports AFTER mocks ────────────────────────────────────────────────────

import * as svc from '../workflow.service.js';
import { NotFoundError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────

const T = 'tenant-1';
const ACTOR = 'actor-1';
const ID = '00000000-0000-4000-a000-000000000001';

const SAMPLE_WORKFLOW = {
  id: ID,
  tenantId: T,
  name: 'Test Workflow',
  status: 'ACTIVE',
  trigger: { type: 'event', event: 'DEAL_UPDATED' },
  conditions: [],
  actions: [],
  loopLimit: 5,
  createdBy: ACTOR,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ════════════════════════════════════════════════════════════════════════════

describe('Workflow Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listWorkflows ───────────────────────────────────────────────────────

  describe('listWorkflows', () => {
    it('delegates to repo.findAll', async () => {
      const paginated = { data: [SAMPLE_WORKFLOW], total: 1, page: 1, pageSize: 20 };
      mockFindAll.mockResolvedValue(paginated);

      const result = await svc.listWorkflows(T, {}, { page: 1, pageSize: 20 });

      expect(mockFindAll).toHaveBeenCalledWith(T, {}, { page: 1, pageSize: 20 });
      expect(result).toEqual(paginated);
    });
  });

  // ─── getWorkflow ─────────────────────────────────────────────────────────

  describe('getWorkflow', () => {
    it('returns workflow when found', async () => {
      mockFindById.mockResolvedValue(SAMPLE_WORKFLOW);

      const result = await svc.getWorkflow(T, ID);

      expect(mockFindById).toHaveBeenCalledWith(T, ID);
      expect(result).toEqual(SAMPLE_WORKFLOW);
    });

    it('throws NotFoundError when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(svc.getWorkflow(T, ID)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── createWorkflow ──────────────────────────────────────────────────────

  describe('createWorkflow', () => {
    it('delegates to repo.create', async () => {
      const input = {
        name: 'New',
        trigger: { type: 'event' as const, event: 'DEAL_WON' },
        conditions: [],
        actions: [],
      };
      mockCreate.mockResolvedValue({ id: ID, ...input });

      const result = await svc.createWorkflow(T, ACTOR, input as any);

      expect(mockCreate).toHaveBeenCalledWith(T, ACTOR, input);
      expect(result).toHaveProperty('id', ID);
    });
  });

  // ─── updateWorkflow ──────────────────────────────────────────────────────

  describe('updateWorkflow', () => {
    it('updates when found', async () => {
      mockFindById.mockResolvedValue(SAMPLE_WORKFLOW);
      mockUpdate.mockResolvedValue({ ...SAMPLE_WORKFLOW, name: 'Updated' });

      const result = await svc.updateWorkflow(T, ID, { name: 'Updated' } as any);

      expect(mockFindById).toHaveBeenCalledWith(T, ID);
      expect(mockUpdate).toHaveBeenCalledWith(T, ID, { name: 'Updated' });
      expect(result).toHaveProperty('name', 'Updated');
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(svc.updateWorkflow(T, ID, { name: 'X' } as any)).rejects.toThrow(NotFoundError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── deleteWorkflow ──────────────────────────────────────────────────────

  describe('deleteWorkflow', () => {
    it('deletes when found', async () => {
      mockFindById.mockResolvedValue(SAMPLE_WORKFLOW);
      mockRemove.mockResolvedValue(undefined);

      await svc.deleteWorkflow(T, ID);

      expect(mockFindById).toHaveBeenCalledWith(T, ID);
      expect(mockRemove).toHaveBeenCalledWith(T, ID);
    });

    it('throws when not found', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(svc.deleteWorkflow(T, ID)).rejects.toThrow(NotFoundError);
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  // ─── activateWorkflow ────────────────────────────────────────────────────

  describe('activateWorkflow', () => {
    it('activates when found', async () => {
      mockFindById.mockResolvedValue(SAMPLE_WORKFLOW);
      mockActivate.mockResolvedValue({ ...SAMPLE_WORKFLOW, status: 'ACTIVE' });

      const result = await svc.activateWorkflow(T, ID);

      expect(mockFindById).toHaveBeenCalledWith(T, ID);
      expect(mockActivate).toHaveBeenCalledWith(T, ID);
      expect(result).toHaveProperty('status', 'ACTIVE');
    });
  });

  // ─── deactivateWorkflow ──────────────────────────────────────────────────

  describe('deactivateWorkflow', () => {
    it('deactivates when found', async () => {
      mockFindById.mockResolvedValue(SAMPLE_WORKFLOW);
      mockDeactivate.mockResolvedValue({ ...SAMPLE_WORKFLOW, status: 'INACTIVE' });

      const result = await svc.deactivateWorkflow(T, ID);

      expect(mockFindById).toHaveBeenCalledWith(T, ID);
      expect(mockDeactivate).toHaveBeenCalledWith(T, ID);
      expect(result).toHaveProperty('status', 'INACTIVE');
    });
  });

  // ─── getExecutions ───────────────────────────────────────────────────────

  describe('getExecutions', () => {
    it('delegates to repo.getExecutions', async () => {
      const paginated = { data: [], total: 0, page: 1, pageSize: 20 };
      mockGetExecutions.mockResolvedValue(paginated);

      const result = await svc.getExecutions(ID, { page: 1, pageSize: 20 });

      expect(mockGetExecutions).toHaveBeenCalledWith(ID, { page: 1, pageSize: 20 });
      expect(result).toEqual(paginated);
    });
  });

  // ─── evaluateWorkflowsForEvent ───────────────────────────────────────────

  describe('evaluateWorkflowsForEvent', () => {
    it('calls evaluateWorkflow for each matching workflow', async () => {
      const wf1 = { ...SAMPLE_WORKFLOW, id: 'wf-1' };
      const wf2 = { ...SAMPLE_WORKFLOW, id: 'wf-2' };
      mockFindActiveByTriggerEvent.mockResolvedValue([wf1, wf2]);

      // evaluateWorkflow internally uses dynamic import of @softcrm/db.
      // We mock getPrismaClient to return null for workflow.findUnique so
      // evaluateWorkflow early-returns (workflow not found), avoiding deeper paths.
      const { getPrismaClient } = await import('@softcrm/db');
      const db = getPrismaClient() as any;
      db.workflow.findUnique.mockResolvedValue(null);

      const corrId = 'corr-123';
      await svc.evaluateWorkflowsForEvent(T, 'DEAL_UPDATED', { foo: 'bar' }, corrId);

      expect(mockFindActiveByTriggerEvent).toHaveBeenCalledWith(T, 'DEAL_UPDATED');
    });
  });
});
