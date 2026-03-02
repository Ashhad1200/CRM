import {
  getPrismaClient,
  type NotificationType,
  type NotificationCategory,
  type JsonValue,
  type InputJsonValue,
} from '@softcrm/db';
import { sendToUser } from '../../../infra/websocket.js';
import { logger } from '../../../logger.js';
import { NotificationPreferenceService } from './notification-preference.service.js';

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface CreateNotificationDto {
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

export interface ListNotificationsOptions {
  page: number;
  limit: number;
  isRead?: boolean;
  type?: NotificationType;
  category?: NotificationCategory;
}

export interface PaginatedNotifications {
  data: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  category: string;
  title: string;
  body: string;
  metadata: JsonValue;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

// ── NotificationService ────────────────────────────────────────────────────────

export class NotificationService {
  private preferenceService = new NotificationPreferenceService();

  /**
   * Create and persist a notification, then deliver it via Socket.IO.
   * Respects user notification preferences for delivery channels.
   */
  async createNotification(
    tenantId: string,
    userId: string,
    data: CreateNotificationDto,
  ): Promise<NotificationRecord> {
    const db = getPrismaClient();
    const category = data.category ?? 'GENERAL';

    const notification = await db.notification.create({
      data: {
        tenantId,
        userId,
        type: data.type,
        category,
        title: data.title,
        body: data.body,
        metadata: (data.metadata ?? {}) as InputJsonValue,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        actionUrl: data.actionUrl ?? null,
      },
    });

    // Check user preferences before delivering via each channel
    const shouldDeliverInApp = await this.preferenceService.shouldNotify(
      tenantId,
      userId,
      category,
      'inApp',
    );

    if (shouldDeliverInApp) {
      this.deliverRealtime(userId, notification as NotificationRecord);
    }

    logger.debug(
      { notificationId: notification.id, userId, type: data.type, category },
      'Notification created',
    );

    return notification as NotificationRecord;
  }

  /**
   * Deliver a notification to the user over Socket.IO.
   */
  private deliverRealtime(userId: string, notification: NotificationRecord): void {
    try {
      sendToUser(userId, {
        type: 'notification:new',
        payload: notification,
      });
    } catch (err) {
      logger.warn({ err, userId }, 'Failed to deliver realtime notification');
    }
  }

  /**
   * List a user's notifications with pagination and optional filters.
   */
  async listNotifications(
    tenantId: string,
    userId: string,
    opts: ListNotificationsOptions,
  ): Promise<PaginatedNotifications> {
    const db = getPrismaClient();
    const { page, limit, isRead, type, category } = opts;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      userId,
      ...(isRead !== undefined ? { isRead } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(category !== undefined ? { category } : {}),
    };

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Return the number of unread notifications for a user.
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const db = getPrismaClient();
    return db.notification.count({
      where: { tenantId, userId, isRead: false },
    });
  }

  /**
   * Mark specific notifications as read (scoped to the user for safety).
   */
  async markAsRead(
    tenantId: string,
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    const db = getPrismaClient();
    const now = new Date();

    await db.notification.updateMany({
      where: {
        id: { in: notificationIds },
        tenantId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });
  }

  /**
   * Mark all of a user's notifications as read.
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    const db = getPrismaClient();
    const now = new Date();

    await db.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: now },
    });
  }

  /**
   * Delete a single notification belonging to the user.
   */
  async deleteNotification(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<void> {
    const db = getPrismaClient();

    await db.notification.deleteMany({
      where: { id: notificationId, tenantId, userId },
    });
  }

  /**
   * Delete notifications older than 90 days for a tenant (used by cleanup jobs).
   * Returns the number of deleted records.
   */
  async deleteOldNotifications(tenantId: string): Promise<number> {
    const db = getPrismaClient();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await db.notification.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: cutoff },
      },
    });

    logger.info(
      { tenantId, count: result.count },
      'Deleted old notifications',
    );

    return result.count;
  }
}
