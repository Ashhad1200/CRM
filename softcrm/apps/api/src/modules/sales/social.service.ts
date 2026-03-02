/**
 * Sales module — social selling service.
 *
 * LinkedIn profile enrichment, social activity tracking, and social touch scoring.
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Social Profiles ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function upsertSocialProfile(
  tenantId: string,
  contactId: string,
  platform: string,
  profileUrl: string,
  profileData?: Record<string, unknown>,
) {
  const db = getPrismaClient();
  return db.socialProfile.upsert({
    where: {
      tenantId_contactId_platform: { tenantId, contactId, platform },
    },
    create: {
      id: generateId(),
      tenantId,
      contactId,
      platform,
      profileUrl,
      profileData: (profileData ?? null) as never,
      enrichedAt: profileData ? new Date() : null,
    },
    update: {
      profileUrl,
      ...(profileData ? { profileData: profileData as never, enrichedAt: new Date() } : {}),
    },
  });
}

export async function getContactSocialProfiles(
  tenantId: string,
  contactId: string,
) {
  const db = getPrismaClient();
  return db.socialProfile.findMany({
    where: { tenantId, contactId },
    include: { activities: { orderBy: { occurredAt: 'desc' }, take: 10 } },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Enrichment ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface EnrichmentResult {
  headline?: string;
  industry?: string;
  location?: string;
  connections?: number;
  summary?: string;
}

export async function enrichProfile(
  tenantId: string,
  socialProfileId: string,
  enrichmentData: EnrichmentResult,
) {
  const db = getPrismaClient();
  return db.socialProfile.update({
    where: { id: socialProfileId, tenantId },
    data: {
      profileData: enrichmentData as any,
      enrichedAt: new Date(),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Activity Tracking ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function trackSocialActivity(
  tenantId: string,
  socialProfileId: string,
  data: {
    type: string;
    content?: string;
    engagementScore?: number;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
  },
) {
  const db = getPrismaClient();
  return db.socialActivity.create({
    data: {
      id: generateId(),
      tenantId,
      socialProfileId,
      type: data.type,
      content: data.content,
      engagementScore: data.engagementScore ?? 0,
      metadata: (data.metadata ?? null) as never,
      occurredAt: data.occurredAt ?? new Date(),
    },
  });
}

export async function getSocialTouchScore(
  tenantId: string,
  contactId: string,
) {
  const db = getPrismaClient();
  const profiles = await db.socialProfile.findMany({
    where: { tenantId, contactId },
    include: {
      activities: {
        where: {
          occurredAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
      },
    },
  });

  let totalScore = 0;
  const platformScores: Record<string, number> = {};

  for (const profile of profiles) {
    const score = profile.activities.reduce((sum, a) => sum + a.engagementScore, 0);
    platformScores[profile.platform] = score;
    totalScore += score;
  }

  return { totalScore, platformScores, profileCount: profiles.length };
}
