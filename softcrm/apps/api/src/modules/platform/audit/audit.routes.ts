import { Router, type Request, type Response, type NextFunction, type Router as RouterType } from 'express';
import { ValidationError } from '@softcrm/shared-kernel';
import * as auditService from './audit.service.js';

// ── Router ─────────────────────────────────────────────────────────────────────

export const auditRouter: RouterType = Router();

// ── GET / — list audit logs ────────────────────────────────────────────────────

auditRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const query = req.query as Record<string, string | undefined>;
    const page = parseInt(query['page'] ?? '1', 10);
    const limit = Math.min(parseInt(query['limit'] ?? '50', 10), 200);

    const filters: {
      module?: string;
      entity?: string;
      recordId?: string;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (query['module']) {
      filters.module = query['module'];
    }
    if (query['entity']) {
      filters.entity = query['entity'];
    }
    if (query['recordId']) {
      filters.recordId = query['recordId'];
    }
    if (query['actorId']) {
      filters.actorId = query['actorId'];
    }
    if (query['startDate']) {
      filters.startDate = new Date(query['startDate']);
    }
    if (query['endDate']) {
      filters.endDate = new Date(query['endDate']);
    }

    const result = await auditService.getAuditLog(req.user.tid, filters, { page, limit });

    res.json({
      data: result.data,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /verify — verify chain integrity ───────────────────────────────────────

auditRouter.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const query = req.query as Record<string, string | undefined>;
    const startId = query['startId'];
    const endId = query['endId'];

    const result = await auditService.verifyChain(req.user.tid, startId, endId);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /export — export CSV ───────────────────────────────────────────────────

auditRouter.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const query = req.query as Record<string, string | undefined>;

    const filters: {
      module?: string;
      entity?: string;
      recordId?: string;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (query['module']) {
      filters.module = query['module'];
    }
    if (query['entity']) {
      filters.entity = query['entity'];
    }
    if (query['recordId']) {
      filters.recordId = query['recordId'];
    }
    if (query['actorId']) {
      filters.actorId = query['actorId'];
    }
    if (query['startDate']) {
      filters.startDate = new Date(query['startDate']);
    }
    if (query['endDate']) {
      filters.endDate = new Date(query['endDate']);
    }

    const csv = await auditService.exportAuditLogCsv(req.user.tid, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
