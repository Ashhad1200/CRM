import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(),
}));

vi.mock('../../../../infra/websocket.js', () => ({
  sendToUser: vi.fn(),
}));

vi.mock('../../../../infra/event-bus.js', () => ({
  eventBus: {
    subscribe: vi.fn(),
    publish: vi.fn(),
  },
}));

vi.mock('../../../../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getPrismaClient } from '@softcrm/db';
import { sendToUser } from '../../../../infra/websocket.js';
import { eventBus } from '../../../../infra/event-bus.js';
import { NotificationService } from '../notification.service.js';
import { registerNotificationListeners } from '../notification.listeners.js';

const mockGetPrismaClient = vi.mocked(getPrismaClient);
const mockSendToUser = vi.mocked(sendToUser);
const mockEventBus = vi.mocked(eventBus);

// ── Helpers ────────────────────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const NOTIF_ID = 'cccccccc-0000-0000-0000-000000000003';

function buildNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: NOTIF_ID,
    tenantId: TENANT_ID,
    userId: USER_ID,
    type: 'DEAL_WON',
    title: 'Deal Won',
    body: 'Deal Won: Big Deal',
    entityType: 'deal',
    entityId: 'dddddddd-0000-0000-0000-000000000004',
    actionUrl: '/sales/deals/dddddddd-0000-0000-0000-000000000004',
    isRead: false,
    readAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildPrismaClient(overrides: Record<string, unknown> = {}) {
  return {
    notification: {
      create: vi.fn().mockResolvedValue(buildNotification()),
      findMany: vi.fn().mockResolvedValue([buildNotification()]),
      count: vi.fn().mockResolvedValue(1),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('NotificationService', () => {
  let service: NotificationService;
  let mockDb: ReturnType<typeof buildPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = buildPrismaClient();
    mockGetPrismaClient.mockReturnValue(mockDb as never);
    service = new NotificationService();
  });

  // ── createNotification ─────────────────────────────────────────────────────

  describe('createNotification()', () => {
    it('persists the notification in the database', async () => {
      const dto = {
        type: 'DEAL_WON' as const,
        title: 'Deal Won',
        body: 'Deal Won: Big Deal',
        entityType: 'deal',
        entityId: 'dddddddd-0000-0000-0000-000000000004',
        actionUrl: '/sales/deals/dddddddd-0000-0000-0000-000000000004',
      };

      const result = await service.createNotification(TENANT_ID, USER_ID, dto);

      expect(mockDb.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          type: 'DEAL_WON',
          title: 'Deal Won',
          body: 'Deal Won: Big Deal',
        }),
      });

      expect(result.id).toBe(NOTIF_ID);
    });

    it('delivers notification via Socket.IO to user room', async () => {
      await service.createNotification(TENANT_ID, USER_ID, {
        type: 'DEAL_WON' as const,
        title: 'Deal Won',
        body: 'Deal Won: Big Deal',
      });

      expect(mockSendToUser).toHaveBeenCalledWith(USER_ID, {
        type: 'notification:new',
        payload: expect.objectContaining({ id: NOTIF_ID }),
      });
    });

    it('returns the created notification record', async () => {
      const notification = await service.createNotification(TENANT_ID, USER_ID, {
        type: 'SYSTEM' as const,
        title: 'Test',
        body: 'Test body',
      });

      expect(notification).toMatchObject({
        id: NOTIF_ID,
        tenantId: TENANT_ID,
        userId: USER_ID,
        isRead: false,
      });
    });

    it('does not throw if Socket.IO delivery fails', async () => {
      mockSendToUser.mockImplementationOnce(() => {
        throw new Error('Socket unavailable');
      });

      // Should not throw
      await expect(
        service.createNotification(TENANT_ID, USER_ID, {
          type: 'SYSTEM' as const,
          title: 'Test',
          body: 'Body',
        }),
      ).resolves.not.toThrow();
    });
  });

  // ── getUnreadCount ─────────────────────────────────────────────────────────

  describe('getUnreadCount()', () => {
    it('returns the unread notification count', async () => {
      mockDb.notification.count.mockResolvedValue(5);

      const count = await service.getUnreadCount(TENANT_ID, USER_ID);

      expect(count).toBe(5);
      expect(mockDb.notification.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID, isRead: false },
      });
    });

    it('returns 0 when there are no unread notifications', async () => {
      mockDb.notification.count.mockResolvedValue(0);

      const count = await service.getUnreadCount(TENANT_ID, USER_ID);

      expect(count).toBe(0);
    });
  });

  // ── markAsRead ─────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('updates isRead and readAt for the specified notification IDs', async () => {
      const ids = [NOTIF_ID];

      await service.markAsRead(TENANT_ID, USER_ID, ids);

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          tenantId: TENANT_ID,
          userId: USER_ID,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('scopes the update to the correct tenant and user', async () => {
      await service.markAsRead(TENANT_ID, USER_ID, [NOTIF_ID]);

      const callArg = mockDb.notification.updateMany.mock.calls[0]?.[0];
      expect(callArg?.where?.tenantId).toBe(TENANT_ID);
      expect(callArg?.where?.userId).toBe(USER_ID);
    });
  });

  // ── markAllAsRead ──────────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('marks all unread notifications as read for the user', async () => {
      await service.markAllAsRead(TENANT_ID, USER_ID);

      expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID, isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  // ── listNotifications ──────────────────────────────────────────────────────

  describe('listNotifications()', () => {
    it('returns paginated notifications', async () => {
      mockDb.notification.findMany.mockResolvedValue([buildNotification()]);
      mockDb.notification.count.mockResolvedValue(1);

      const result = await service.listNotifications(TENANT_ID, USER_ID, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('filters by isRead when provided', async () => {
      mockDb.notification.findMany.mockResolvedValue([]);
      mockDb.notification.count.mockResolvedValue(0);

      await service.listNotifications(TENANT_ID, USER_ID, {
        page: 1,
        limit: 10,
        isRead: false,
      });

      expect(mockDb.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });

    it('filters by type when provided', async () => {
      mockDb.notification.findMany.mockResolvedValue([]);
      mockDb.notification.count.mockResolvedValue(0);

      await service.listNotifications(TENANT_ID, USER_ID, {
        page: 1,
        limit: 10,
        type: 'DEAL_WON' as const,
      });

      expect(mockDb.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'DEAL_WON' }),
        }),
      );
    });

    it('calculates correct skip for page 2', async () => {
      mockDb.notification.findMany.mockResolvedValue([]);
      mockDb.notification.count.mockResolvedValue(0);

      await service.listNotifications(TENANT_ID, USER_ID, { page: 2, limit: 10 });

      expect(mockDb.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ── deleteOldNotifications ─────────────────────────────────────────────────

  describe('deleteOldNotifications()', () => {
    it('deletes notifications older than 90 days', async () => {
      mockDb.notification.deleteMany.mockResolvedValue({ count: 42 });

      const count = await service.deleteOldNotifications(TENANT_ID);

      expect(count).toBe(42);
      expect(mockDb.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  // ── Listeners ─────────────────────────────────────────────────────────────

  describe('registerNotificationListeners()', () => {
    it('registers handlers for all expected event types', () => {
      registerNotificationListeners();

      const registeredEventTypes = mockEventBus.subscribe.mock.calls.map(
        (call) => call[0],
      );

      expect(registeredEventTypes).toContain('sales.deal.won');
      expect(registeredEventTypes).toContain('sales.deal.lost');
      expect(registeredEventTypes).toContain('support.ticket.assigned');
      expect(registeredEventTypes).toContain('accounting.invoice.overdue');
      expect(registeredEventTypes).toContain('hr.leave_request.created');
      expect(registeredEventTypes).toContain('hr.payroll_run.approved');
    });

    it('creates a DEAL_WON notification when sales.deal.won fires', async () => {
      registerNotificationListeners();

      // Find the handler registered for sales.deal.won
      const dealWonCall = mockEventBus.subscribe.mock.calls.find(
        (call) => call[0] === 'sales.deal.won',
      );
      expect(dealWonCall).toBeDefined();

      const handler = dealWonCall![1] as (event: unknown) => Promise<void>;

      await handler({
        id: 'evt-1',
        type: 'sales.deal.won',
        payload: {
          tenantId: TENANT_ID,
          dealId: 'deal-123',
          dealName: 'Mega Deal',
          ownerId: USER_ID,
        },
      });

      expect(mockDb.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DEAL_WON',
            title: 'Deal Won',
            body: 'Deal Won: Mega Deal',
            userId: USER_ID,
            tenantId: TENANT_ID,
          }),
        }),
      );
    });
  });
});
