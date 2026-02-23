/**
 * Sync routes — pull/push endpoints for mobile offline sync.
 *
 * GET  /api/v1/sync/pull?since=<timestamp>  → return records modified since timestamp
 * POST /api/v1/sync/push                     → apply changes, return conflicts
 */
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.js';
import { pullQuerySchema, pushBodySchema } from './validators.js';
import * as syncService from './sync.service.js';
import type { SyncableTable, TableChanges } from './types.js';

export const syncRouter: Router = Router();

/** Wrap an async route handler so rejected promises forward to Express error middleware. */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ── GET /pull?since=<timestamp> ────────────────────────────────────────

syncRouter.get(
  '/pull',
  validate({ query: pullQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tid;
    const since = Number(req.query['since']);

    const result = await syncService.pull(tenantId, since);

    res.json(result);
  }),
);

// ── POST /push ─────────────────────────────────────────────────────────

syncRouter.post(
  '/push',
  validate({ body: pushBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tid;
    const { changes, lastPulledAt } = req.body as {
      changes: Record<SyncableTable, TableChanges>;
      lastPulledAt: number;
    };

    const result = await syncService.push(tenantId, changes, lastPulledAt);

    res.json(result);
  }),
);
