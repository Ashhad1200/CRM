import { Router, type Request, type Response, type NextFunction } from 'express';
import { UnauthorizedError } from '@softcrm/shared-kernel';
import { validate } from '../../../middleware/validate.js';
import { searchQuerySchema } from './search.validators.js';
import { SearchService } from './search.service.prisma.js';

export const searchRouter: Router = Router();

const searchService = new SearchService();

// ── GET /search ────────────────────────────────────────────────────────────────

searchRouter.get(
  '/',
  validate({ query: searchQuerySchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { q, modules, limit } = req.query as unknown as {
        q: string;
        modules?: string[];
        limit: number;
      };

      const tenantId = req.user.tid;

      const result = await searchService.search(tenantId, q, modules, limit);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);
