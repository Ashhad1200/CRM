import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { evaluateConditions, executeActions, checkLoopDepth } from '../workflow.engine.js';

describe('Workflow Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── evaluateConditions ──────────────────────────────────────────────────

  describe('evaluateConditions', () => {
    it('returns true for empty conditions', () => {
      expect(evaluateConditions([], {})).toBe(true);
    });

    it('equals → true on match', () => {
      const conds = [{ field: 'status', operator: 'equals' as const, value: 'won' }];
      expect(evaluateConditions(conds, { status: 'won' })).toBe(true);
    });

    it('equals → false on mismatch', () => {
      const conds = [{ field: 'status', operator: 'equals' as const, value: 'won' }];
      expect(evaluateConditions(conds, { status: 'lost' })).toBe(false);
    });

    it('gt numeric comparison', () => {
      const conds = [{ field: 'amount', operator: 'gt' as const, value: 100 }];
      expect(evaluateConditions(conds, { amount: 200 })).toBe(true);
      expect(evaluateConditions(conds, { amount: 50 })).toBe(false);
    });

    it('lt numeric comparison', () => {
      const conds = [{ field: 'amount', operator: 'lt' as const, value: 100 }];
      expect(evaluateConditions(conds, { amount: 50 })).toBe(true);
      expect(evaluateConditions(conds, { amount: 200 })).toBe(false);
    });

    it('contains string check', () => {
      const conds = [{ field: 'name', operator: 'contains' as const, value: 'soft' }];
      expect(evaluateConditions(conds, { name: 'softcrm' })).toBe(true);
      expect(evaluateConditions(conds, { name: 'hardcrm' })).toBe(false);
    });

    it('starts_with string check', () => {
      const conds = [{ field: 'email', operator: 'starts_with' as const, value: 'admin' }];
      expect(evaluateConditions(conds, { email: 'admin@example.com' })).toBe(true);
      expect(evaluateConditions(conds, { email: 'user@example.com' })).toBe(false);
    });

    it('is_empty check (null / undefined / empty string)', () => {
      const conds = [{ field: 'note', operator: 'is_empty' as const, value: null }];
      expect(evaluateConditions(conds, { note: null })).toBe(true);
      expect(evaluateConditions(conds, { note: undefined })).toBe(true);
      expect(evaluateConditions(conds, { note: '' })).toBe(true);
      expect(evaluateConditions(conds, { note: 'something' })).toBe(false);
    });

    it('is_not_empty check', () => {
      const conds = [{ field: 'note', operator: 'is_not_empty' as const, value: null }];
      expect(evaluateConditions(conds, { note: 'hello' })).toBe(true);
      expect(evaluateConditions(conds, { note: null })).toBe(false);
      expect(evaluateConditions(conds, { note: '' })).toBe(false);
    });

    it('resolves nested fields via dot notation', () => {
      const conds = [{ field: 'deal.amount', operator: 'equals' as const, value: 500 }];
      expect(evaluateConditions(conds, { deal: { amount: 500 } })).toBe(true);
      expect(evaluateConditions(conds, { deal: { amount: 100 } })).toBe(false);
    });

    it('AND logic — both true → true', () => {
      const conds = [
        { field: 'status', operator: 'equals' as const, value: 'won' },
        { field: 'amount', operator: 'gt' as const, value: 100, logic: 'AND' as const },
      ];
      expect(evaluateConditions(conds, { status: 'won', amount: 200 })).toBe(true);
    });

    it('AND logic — one false → false', () => {
      const conds = [
        { field: 'status', operator: 'equals' as const, value: 'won' },
        { field: 'amount', operator: 'gt' as const, value: 100, logic: 'AND' as const },
      ];
      expect(evaluateConditions(conds, { status: 'won', amount: 50 })).toBe(false);
    });

    it('OR logic — one true → true', () => {
      const conds = [
        { field: 'status', operator: 'equals' as const, value: 'won' },
        { field: 'status', operator: 'equals' as const, value: 'lost', logic: 'OR' as const },
      ];
      expect(evaluateConditions(conds, { status: 'lost' })).toBe(true);
    });

    it('OR logic — both false → false', () => {
      const conds = [
        { field: 'status', operator: 'equals' as const, value: 'won' },
        { field: 'status', operator: 'equals' as const, value: 'lost', logic: 'OR' as const },
      ];
      expect(evaluateConditions(conds, { status: 'open' })).toBe(false);
    });
  });

  // ─── checkLoopDepth ──────────────────────────────────────────────────────

  describe('checkLoopDepth', () => {
    it('first call returns true', () => {
      const cid = `test-loop-${Date.now()}-${Math.random()}`;
      expect(checkLoopDepth(cid, 3)).toBe(true);
    });

    it('exceeding max depth returns false', () => {
      const cid = `test-loop-exceed-${Date.now()}-${Math.random()}`;
      checkLoopDepth(cid, 2); // 1
      checkLoopDepth(cid, 2); // 2
      expect(checkLoopDepth(cid, 2)).toBe(false); // 3 > 2
    });
  });

  // ─── executeActions ──────────────────────────────────────────────────────

  describe('executeActions', () => {
    const ctx = { tenantId: 't1', actorId: 'a1', payload: {} };

    it('field_update action returns success', async () => {
      const actions = [{ type: 'field_update' as const, config: { field: 'status', value: 'won' } }];
      const results = await executeActions(actions, ctx);
      expect(results).toHaveLength(1);
      expect(results[0]!.status).toBe('success');
      expect(results[0]!.type).toBe('field_update');
    });

    it('notification action returns success', async () => {
      const actions = [{ type: 'notification' as const, config: { message: 'hello' } }];
      const results = await executeActions(actions, ctx);
      expect(results).toHaveLength(1);
      expect(results[0]!.status).toBe('success');
      expect(results[0]!.type).toBe('notification');
    });

    it('webhook_call without url fails gracefully', async () => {
      const actions = [{ type: 'webhook_call' as const, config: {} }];
      const results = await executeActions(actions, ctx);
      expect(results).toHaveLength(1);
      expect(results[0]!.status).toBe('failed');
      expect(results[0]!.error).toMatch(/url/i);
    });

    it('multiple actions executed independently', async () => {
      const actions = [
        { type: 'field_update' as const, config: { field: 'x', value: 1 } },
        { type: 'webhook_call' as const, config: {} }, // will fail
        { type: 'notification' as const, config: { msg: 'ok' } },
      ];
      const results = await executeActions(actions, ctx);
      expect(results).toHaveLength(3);
      expect(results[0]!.status).toBe('success');
      expect(results[1]!.status).toBe('failed');
      expect(results[2]!.status).toBe('success');
    });
  });
});
