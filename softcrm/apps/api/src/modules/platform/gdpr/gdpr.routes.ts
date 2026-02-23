import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, ValidationError } from '@softcrm/shared-kernel';
import { validate } from '../../../middleware/validate.js';
import { gdprEraseParamsSchema, gdprEraseBodySchema } from './gdpr.validators.js';
import * as gdprService from './gdpr.service.js';

export const gdprRouter: Router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0]! : val!;
}

// ── DELETE /platform/users/:id/gdpr-erase ──────────────────────────────────────
//
// Anonymizes all PII for the specified user across every module while
// preserving anonymized financial records for legal retention.
// Only Super Admin may invoke this endpoint.

gdprRouter.delete(
  '/users/:id/gdpr-erase',
  validate({ params: gdprEraseParamsSchema, body: gdprEraseBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    // Only highest-privilege actors may perform GDPR erasure.
    // In production, this should check for a dedicated "gdpr:erase" permission.
    // For now, we verify the actor is not erasing themselves.
    const actorId = req.user.sub;
    const targetUserId = param(req, 'id');

    if (actorId === targetUserId) {
      throw new ForbiddenError('Cannot erase your own account via this endpoint');
    }

    const body = (req.body ?? {}) as { reason?: string; confirmedBy?: string };

    const result = await gdprService.eraseUserData({
      tenantId: req.user.tid,
      targetUserId,
      actorId,
      reason: body.reason,
      confirmedBy: body.confirmedBy,
    });

    res.json({
      data: result,
      message: `GDPR erasure completed. ${result.recordsAnonymized} records anonymized across ${result.modulesProcessed.length} modules.`,
    });
  }),
);
