import { getPrismaClient, type NotificationCategory } from '@softcrm/db';
import { logger } from '../../../logger.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NotificationPreferenceDto {
  category: NotificationCategory;
  inApp: boolean;
  email: boolean;
  push: boolean;
}

export interface NotificationPreferenceResponse {
  id: string;
  category: NotificationCategory;
  inApp: boolean;
  email: boolean;
  push: boolean;
}

// ── NotificationPreferenceService ─────────────────────────────────────────────

export class NotificationPreferenceService {
  private db = getPrismaClient();

  /**
   * Get all notification preferences for a user.
   * Creates default preferences for missing categories.
   */
  async getPreferences(
    tenantId: string,
    userId: string,
  ): Promise<NotificationPreferenceResponse[]> {
    const existing = await this.db.notificationPreference.findMany({
      where: { tenantId, userId },
      orderBy: { category: 'asc' },
    });

    // Ensure all categories have preferences
    const categories: NotificationCategory[] = [
      'SALES',
      'SUPPORT',
      'BILLING',
      'HR',
      'GENERAL',
    ];

    const existingCategories = new Set(existing.map((p) => p.category));
    const missing = categories.filter((c) => !existingCategories.has(c));

    if (missing.length > 0) {
      // Create default preferences for missing categories
      await this.db.notificationPreference.createMany({
        data: missing.map((category) => ({
          tenantId,
          userId,
          category,
          inApp: true,
          email: true,
          push: false,
        })),
      });

      // Refetch to include newly created
      const all = await this.db.notificationPreference.findMany({
        where: { tenantId, userId },
        orderBy: { category: 'asc' },
      });

      return all.map(this.mapToResponse);
    }

    return existing.map(this.mapToResponse);
  }

  /**
   * Get preference for a specific category.
   */
  async getPreferenceByCategory(
    tenantId: string,
    userId: string,
    category: NotificationCategory,
  ): Promise<NotificationPreferenceResponse | null> {
    const preference = await this.db.notificationPreference.findUnique({
      where: {
        tenantId_userId_category: {
          tenantId,
          userId,
          category,
        },
      },
    });

    return preference ? this.mapToResponse(preference) : null;
  }

  /**
   * Update or create a notification preference.
   */
  async upsertPreference(
    tenantId: string,
    userId: string,
    dto: NotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponse> {
    const preference = await this.db.notificationPreference.upsert({
      where: {
        tenantId_userId_category: {
          tenantId,
          userId,
          category: dto.category,
        },
      },
      create: {
        tenantId,
        userId,
        category: dto.category,
        inApp: dto.inApp,
        email: dto.email,
        push: dto.push,
      },
      update: {
        inApp: dto.inApp,
        email: dto.email,
        push: dto.push,
      },
    });

    logger.debug(
      { tenantId, userId, category: dto.category },
      'Notification preference updated',
    );

    return this.mapToResponse(preference);
  }

  /**
   * Bulk update multiple preferences at once.
   */
  async bulkUpdatePreferences(
    tenantId: string,
    userId: string,
    preferences: NotificationPreferenceDto[],
  ): Promise<NotificationPreferenceResponse[]> {
    const results: NotificationPreferenceResponse[] = [];

    for (const dto of preferences) {
      const result = await this.upsertPreference(tenantId, userId, dto);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if user wants to receive notification for a category via specific channel.
   */
  async shouldNotify(
    tenantId: string,
    userId: string,
    category: NotificationCategory,
    channel: 'inApp' | 'email' | 'push',
  ): Promise<boolean> {
    const preference = await this.db.notificationPreference.findUnique({
      where: {
        tenantId_userId_category: {
          tenantId,
          userId,
          category,
        },
      },
      select: { [channel]: true },
    });

    // Default to true for inApp if no preference exists
    if (!preference) {
      return channel === 'inApp';
    }

    return (preference as Record<string, boolean>)[channel] ?? false;
  }

  /**
   * Reset all preferences to defaults.
   */
  async resetToDefaults(tenantId: string, userId: string): Promise<void> {
    await this.db.notificationPreference.deleteMany({
      where: { tenantId, userId },
    });

    logger.info({ tenantId, userId }, 'Notification preferences reset to defaults');
  }

  private mapToResponse(
    preference: {
      id: string;
      category: NotificationCategory;
      inApp: boolean;
      email: boolean;
      push: boolean;
    },
  ): NotificationPreferenceResponse {
    return {
      id: preference.id,
      category: preference.category,
      inApp: preference.inApp,
      email: preference.email,
      push: preference.push,
    };
  }
}
