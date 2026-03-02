import { Router, type Request, type Response, type NextFunction } from 'express';
import { UnauthorizedError } from '@softcrm/shared-kernel';
import { validate } from '../../../middleware/validate.js';
import { z } from 'zod';
import { NotificationPreferenceService } from './notification-preference.service.js';
import type { NotificationCategory } from '@softcrm/db';

export const notificationPreferenceRouter: Router = Router();

const preferenceService = new NotificationPreferenceService();

// ── Validators ────────────────────────────────────────────────────────────────

const notificationCategoryEnum = z.enum([
  'SALES',
  'SUPPORT',
  'BILLING',
  'HR',
  'GENERAL',
]);

const preferenceSchema = z.object({
  category: notificationCategoryEnum,
  inApp: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
});

const bulkPreferencesSchema = z.object({
  preferences: z.array(preferenceSchema).min(1).max(5),
});

const categoryParamSchema = z.object({
  category: notificationCategoryEnum,
});

// ── GET /notification-preferences ─────────────────────────────────────────────

notificationPreferenceRouter.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const preferences = await preferenceService.getPreferences(
        req.user.tid,
        req.user.sub,
      );

      res.status(200).json({ data: preferences });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /notification-preferences/:category ───────────────────────────────────

notificationPreferenceRouter.get(
  '/:category',
  validate({ params: categoryParamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { category } = req.params as { category: NotificationCategory };

      const preference = await preferenceService.getPreferenceByCategory(
        req.user.tid,
        req.user.sub,
        category,
      );

      if (!preference) {
        res.status(404).json({ error: 'Preference not found' });
        return;
      }

      res.status(200).json({ data: preference });
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /notification-preferences/:category ───────────────────────────────────

notificationPreferenceRouter.put(
  '/:category',
  validate({ params: categoryParamSchema, body: preferenceSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const dto = req.body as {
        category: NotificationCategory;
        inApp: boolean;
        email: boolean;
        push: boolean;
      };

      const preference = await preferenceService.upsertPreference(
        req.user.tid,
        req.user.sub,
        dto,
      );

      res.status(200).json({ data: preference });
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /notification-preferences (bulk update) ───────────────────────────────

notificationPreferenceRouter.put(
  '/',
  validate({ body: bulkPreferencesSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { preferences } = req.body as {
        preferences: Array<{
          category: NotificationCategory;
          inApp: boolean;
          email: boolean;
          push: boolean;
        }>;
      };

      const updated = await preferenceService.bulkUpdatePreferences(
        req.user.tid,
        req.user.sub,
        preferences,
      );

      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /notification-preferences/reset ──────────────────────────────────────

notificationPreferenceRouter.post(
  '/reset',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      await preferenceService.resetToDefaults(req.user.tid, req.user.sub);

      res.status(200).json({ message: 'Preferences reset to defaults' });
    } catch (err) {
      next(err);
    }
  },
);
