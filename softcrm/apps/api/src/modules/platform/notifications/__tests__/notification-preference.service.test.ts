import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(),
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
import { NotificationPreferenceService } from '../notification-preference.service.js';

const mockGetPrismaClient = vi.mocked(getPrismaClient);

// ── Helpers ────────────────────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000002';

function buildPreference(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pref-1',
    tenantId: TENANT_ID,
    userId: USER_ID,
    category: 'GENERAL' as const,
    inApp: true,
    email: true,
    push: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function buildPrismaClient(overrides: Record<string, unknown> = {}) {
  return {
    notificationPreference: {
      findMany: vi.fn().mockResolvedValue([buildPreference()]),
      findUnique: vi.fn().mockResolvedValue(buildPreference()),
      upsert: vi.fn().mockResolvedValue(buildPreference()),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let mockDb: ReturnType<typeof buildPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = buildPrismaClient();
    mockGetPrismaClient.mockReturnValue(mockDb as never);
    service = new NotificationPreferenceService();
  });

  // ── getPreferences ─────────────────────────────────────────────────────────

  describe('getPreferences()', () => {
    it('returns all preferences for a user', async () => {
      const allPrefs = [
        buildPreference({ category: 'SALES' }),
        buildPreference({ category: 'SUPPORT' }),
        buildPreference({ category: 'BILLING' }),
        buildPreference({ category: 'HR' }),
        buildPreference({ category: 'GENERAL' }),
      ];
      mockDb.notificationPreference.findMany.mockResolvedValue(allPrefs);

      const result = await service.getPreferences(TENANT_ID, USER_ID);

      expect(result).toHaveLength(5);
      expect(mockDb.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID },
        orderBy: { category: 'asc' },
      });
    });

    it('creates default preferences for missing categories', async () => {
      // Only 2 preferences exist
      mockDb.notificationPreference.findMany
        .mockResolvedValueOnce([
          buildPreference({ category: 'SALES' }),
          buildPreference({ category: 'GENERAL' }),
        ])
        .mockResolvedValueOnce([
          buildPreference({ category: 'SALES' }),
          buildPreference({ category: 'SUPPORT' }),
          buildPreference({ category: 'BILLING' }),
          buildPreference({ category: 'HR' }),
          buildPreference({ category: 'GENERAL' }),
        ]);

      await service.getPreferences(TENANT_ID, USER_ID);

      expect(mockDb.notificationPreference.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ category: 'SUPPORT' }),
          expect.objectContaining({ category: 'BILLING' }),
          expect.objectContaining({ category: 'HR' }),
        ]),
      });
    });
  });

  // ── getPreferenceByCategory ────────────────────────────────────────────────

  describe('getPreferenceByCategory()', () => {
    it('returns preference for a specific category', async () => {
      mockDb.notificationPreference.findUnique.mockResolvedValue(
        buildPreference({ category: 'SALES' }),
      );

      const result = await service.getPreferenceByCategory(
        TENANT_ID,
        USER_ID,
        'SALES',
      );

      expect(result).toMatchObject({
        category: 'SALES',
        inApp: true,
        email: true,
        push: false,
      });
    });

    it('returns null when preference does not exist', async () => {
      mockDb.notificationPreference.findUnique.mockResolvedValue(null);

      const result = await service.getPreferenceByCategory(
        TENANT_ID,
        USER_ID,
        'BILLING',
      );

      expect(result).toBeNull();
    });
  });

  // ── upsertPreference ───────────────────────────────────────────────────────

  describe('upsertPreference()', () => {
    it('creates or updates a preference', async () => {
      const updatedPref = buildPreference({
        category: 'SALES',
        email: false,
        push: true,
      });
      mockDb.notificationPreference.upsert.mockResolvedValue(updatedPref);

      const result = await service.upsertPreference(TENANT_ID, USER_ID, {
        category: 'SALES',
        inApp: true,
        email: false,
        push: true,
      });

      expect(result).toMatchObject({
        category: 'SALES',
        email: false,
        push: true,
      });

      expect(mockDb.notificationPreference.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_userId_category: {
            tenantId: TENANT_ID,
            userId: USER_ID,
            category: 'SALES',
          },
        },
        create: expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          category: 'SALES',
        }),
        update: expect.objectContaining({
          inApp: true,
          email: false,
          push: true,
        }),
      });
    });
  });

  // ── bulkUpdatePreferences ──────────────────────────────────────────────────

  describe('bulkUpdatePreferences()', () => {
    it('updates multiple preferences at once', async () => {
      mockDb.notificationPreference.upsert
        .mockResolvedValueOnce(buildPreference({ category: 'SALES' }))
        .mockResolvedValueOnce(buildPreference({ category: 'SUPPORT' }));

      const result = await service.bulkUpdatePreferences(TENANT_ID, USER_ID, [
        { category: 'SALES', inApp: true, email: true, push: false },
        { category: 'SUPPORT', inApp: true, email: false, push: true },
      ]);

      expect(result).toHaveLength(2);
      expect(mockDb.notificationPreference.upsert).toHaveBeenCalledTimes(2);
    });
  });

  // ── shouldNotify ───────────────────────────────────────────────────────────

  describe('shouldNotify()', () => {
    it('returns true when channel is enabled', async () => {
      mockDb.notificationPreference.findUnique.mockResolvedValue({
        inApp: true,
        email: true,
        push: false,
      });

      expect(
        await service.shouldNotify(TENANT_ID, USER_ID, 'SALES', 'email'),
      ).toBe(true);
    });

    it('returns false when channel is disabled', async () => {
      mockDb.notificationPreference.findUnique.mockResolvedValue({
        inApp: true,
        email: true,
        push: false,
      });

      expect(
        await service.shouldNotify(TENANT_ID, USER_ID, 'SALES', 'push'),
      ).toBe(false);
    });

    it('defaults to true for inApp when no preference exists', async () => {
      mockDb.notificationPreference.findUnique.mockResolvedValue(null);

      expect(
        await service.shouldNotify(TENANT_ID, USER_ID, 'GENERAL', 'inApp'),
      ).toBe(true);
    });

    it('defaults to false for email/push when no preference exists', async () => {
      mockDb.notificationPreference.findUnique.mockResolvedValue(null);

      expect(
        await service.shouldNotify(TENANT_ID, USER_ID, 'GENERAL', 'email'),
      ).toBe(false);
      expect(
        await service.shouldNotify(TENANT_ID, USER_ID, 'GENERAL', 'push'),
      ).toBe(false);
    });
  });

  // ── resetToDefaults ────────────────────────────────────────────────────────

  describe('resetToDefaults()', () => {
    it('deletes all preferences for the user', async () => {
      await service.resetToDefaults(TENANT_ID, USER_ID);

      expect(mockDb.notificationPreference.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID },
      });
    });
  });
});
