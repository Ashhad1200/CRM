import { Router, type Request, type Response, type NextFunction } from 'express';
import { UnauthorizedError, NotFoundError } from '@softcrm/shared-kernel';
import { validate } from '../../../middleware/validate.js';
import {
  listNotificationsSchema,
  markReadSchema,
  notificationIdParamSchema,
} from './notification.validators.js';
import { NotificationService } from './notification.service.js';
import type { NotificationType, NotificationCategory } from '@softcrm/db';

export const notificationRouter: Router = Router();

const notificationService = new NotificationService();

// ── GET /notifications ─────────────────────────────────────────────────────────

notificationRouter.get(
  '/',
  validate({ query: listNotificationsSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const query = req.query as unknown as {
        page: number;
        limit: number;
        isRead?: boolean;
        type?: NotificationType;
        category?: NotificationCategory;
      };

      const result = await notificationService.listNotifications(
        req.user.tid,
        req.user.sub,
        {
          page: query.page,
          limit: query.limit,
          isRead: query.isRead,
          type: query.type,
          category: query.category,
        },
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /notifications/unread-count ───────────────────────────────────────────

notificationRouter.get(
  '/unread-count',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const count = await notificationService.getUnreadCount(req.user.tid, req.user.sub);

      res.status(200).json({ count });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /notifications/mark-read ─────────────────────────────────────────────

notificationRouter.post(
  '/mark-read',
  validate({ body: markReadSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { notificationIds } = req.body as { notificationIds: string[] };

      await notificationService.markAsRead(req.user.tid, req.user.sub, notificationIds);

      res.status(200).json({ message: 'Notifications marked as read' });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /notifications/mark-all-read ─────────────────────────────────────────

notificationRouter.post(
  '/mark-all-read',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      await notificationService.markAllAsRead(req.user.tid, req.user.sub);

      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /notifications/:id ─────────────────────────────────────────────────

notificationRouter.delete(
  '/:id',
  validate({ params: notificationIdParamSchema }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { id } = req.params as { id: string };

      await notificationService.deleteNotification(req.user.tid, req.user.sub, id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
