/**
 * Sales module — gamification service.
 *
 * Leaderboard calculation, badge management, and sales target tracking.
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId } from '@softcrm/shared-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Leaderboard ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function calculateLeaderboard(
  tenantId: string,
  period: string,
  periodStart: Date,
) {
  const db = getPrismaClient();

  // Get deals won in period
  const periodEnd = new Date(periodStart);
  if (period === 'WEEKLY') periodEnd.setDate(periodEnd.getDate() + 7);
  else if (period === 'MONTHLY') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else if (period === 'QUARTERLY') periodEnd.setMonth(periodEnd.getMonth() + 3);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const dealsWon = await db.deal.groupBy({
    by: ['ownerId'],
    where: {
      tenantId,
      wonAt: { gte: periodStart, lt: periodEnd },
      ownerId: { not: null },
    },
    _count: { id: true },
    _sum: { value: true },
  });

  // Build entries with scoring (deals×10 + revenue/1000)
  const entries = dealsWon.map((d, idx) => ({
    id: generateId(),
    tenantId,
    userId: d.ownerId!,
    period,
    periodStart,
    dealsWon: d._count.id,
    revenue: d._sum.value ?? 0,
    activities: 0,
    leadsConverted: 0,
    score: d._count.id * 10 + Math.floor(Number(d._sum.value ?? 0) / 1000),
    rank: 0,
  }));

  // Sort by score descending and assign ranks
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.rank = i + 1; });

  // Upsert entries
  for (const entry of entries) {
    await db.leaderboardEntry.upsert({
      where: {
        tenantId_userId_period_periodStart: {
          tenantId, userId: entry.userId, period, periodStart,
        },
      },
      create: entry,
      update: {
        dealsWon: entry.dealsWon,
        revenue: entry.revenue,
        score: entry.score,
        rank: entry.rank,
      },
    });
  }

  return entries;
}

export async function getLeaderboard(
  tenantId: string,
  period: string,
  periodStart: Date,
  limit = 20,
) {
  const db = getPrismaClient();
  return db.leaderboardEntry.findMany({
    where: { tenantId, period, periodStart },
    orderBy: { rank: 'asc' },
    take: limit,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sales Targets ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTarget(
  tenantId: string,
  data: {
    userId: string;
    period: string;
    startDate: Date;
    endDate: Date;
    metric: string;
    targetValue: number;
  },
) {
  const db = getPrismaClient();
  return db.salesTarget.create({
    data: {
      id: generateId(),
      tenantId,
      userId: data.userId,
      period: data.period as any,
      startDate: data.startDate,
      endDate: data.endDate,
      metric: data.metric as any,
      targetValue: data.targetValue,
    },
  });
}

export async function getTargets(
  tenantId: string,
  userId?: string,
) {
  const db = getPrismaClient();
  return db.salesTarget.findMany({
    where: { tenantId, ...(userId ? { userId } : {}) },
    orderBy: { startDate: 'desc' },
  });
}

export async function updateTargetProgress(
  tenantId: string,
  targetId: string,
  actualValue: number,
) {
  const db = getPrismaClient();
  return db.salesTarget.update({
    where: { id: targetId, tenantId },
    data: { actualValue },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Badges ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function seedDefaultBadges(tenantId: string) {
  const db = getPrismaClient();
  const defaults = [
    { name: 'First Deal', icon: '🏆', description: 'Won your first deal', criteria: { type: 'DEALS_WON', threshold: 1 } },
    { name: '10-Deal Streak', icon: '🔥', description: 'Won 10 deals', criteria: { type: 'DEALS_WON', threshold: 10 } },
    { name: 'Big Fish', icon: '🐋', description: 'Won a deal worth $50,000+', criteria: { type: 'DEAL_VALUE', threshold: 50000 } },
    { name: 'Closer', icon: '🎯', description: 'Won 25 deals', criteria: { type: 'DEALS_WON', threshold: 25 } },
    { name: 'Rainmaker', icon: '💰', description: 'Generated $100K+ in revenue', criteria: { type: 'REVENUE', threshold: 100000 } },
  ];

  for (const badge of defaults) {
    await db.badge.upsert({
      where: { tenantId_name: { tenantId, name: badge.name } },
      create: { id: generateId(), tenantId, ...badge },
      update: {},
    });
  }
}

export async function checkAndAwardBadges(
  tenantId: string,
  userId: string,
) {
  const db = getPrismaClient();

  const badges = await db.badge.findMany({ where: { tenantId } });
  const existing = await db.userBadge.findMany({
    where: { tenantId, userId },
    select: { badgeId: true },
  });
  const earnedIds = new Set(existing.map(e => e.badgeId));

  const dealsWon = await db.deal.count({
    where: { tenantId, ownerId: userId, wonAt: { not: null } },
  });
  const totalRevenue = await db.deal.aggregate({
    where: { tenantId, ownerId: userId, wonAt: { not: null } },
    _sum: { value: true },
  });
  const maxDealValue = await db.deal.aggregate({
    where: { tenantId, ownerId: userId, wonAt: { not: null } },
    _max: { value: true },
  });

  const newBadges: string[] = [];

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue;
    const criteria = badge.criteria as { type: string; threshold: number };
    let earned = false;

    if (criteria.type === 'DEALS_WON' && dealsWon >= criteria.threshold) earned = true;
    if (criteria.type === 'REVENUE' && Number(totalRevenue._sum.value ?? 0) >= criteria.threshold) earned = true;
    if (criteria.type === 'DEAL_VALUE' && Number(maxDealValue._max.value ?? 0) >= criteria.threshold) earned = true;

    if (earned) {
      await db.userBadge.create({
        data: { id: generateId(), tenantId, userId, badgeId: badge.id },
      });
      newBadges.push(badge.name);
    }
  }

  return newBadges;
}

export async function getUserBadges(
  tenantId: string,
  userId: string,
) {
  const db = getPrismaClient();
  return db.userBadge.findMany({
    where: { tenantId, userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });
}
