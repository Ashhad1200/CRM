/**
 * Sales module — AI lead scoring engine.
 *
 * Rule-based scoring with demographic + behavioral signals.
 * Supports score recalculation, decay, and breakdown tracking.
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Scoring Rules ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ScoringRule {
  name: string;
  category: 'demographic' | 'behavioral' | 'firmographic';
  evaluate: (lead: LeadData) => number;
  maxPoints: number;
}

interface LeadData {
  email: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string | null;
}

const DEFAULT_RULES: ScoringRule[] = [
  {
    name: 'Has business email',
    category: 'demographic',
    maxPoints: 15,
    evaluate: (lead) => {
      const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      const domain = lead.email.split('@')[1]?.toLowerCase() ?? '';
      return freeProviders.includes(domain) ? 0 : 15;
    },
  },
  {
    name: 'Has phone number',
    category: 'demographic',
    maxPoints: 10,
    evaluate: (lead) => lead.phone ? 10 : 0,
  },
  {
    name: 'Has company name',
    category: 'firmographic',
    maxPoints: 10,
    evaluate: (lead) => lead.company ? 10 : 0,
  },
  {
    name: 'Has job title',
    category: 'demographic',
    maxPoints: 10,
    evaluate: (lead) => lead.jobTitle ? 10 : 0,
  },
  {
    name: 'Decision maker title',
    category: 'demographic',
    maxPoints: 20,
    evaluate: (lead) => {
      if (!lead.jobTitle) return 0;
      const title = lead.jobTitle.toLowerCase();
      if (/\b(ceo|cto|cfo|coo|vp|president|director|head)\b/.test(title)) return 20;
      if (/\b(manager|lead|senior)\b/.test(title)) return 10;
      return 0;
    },
  },
  {
    name: 'Source quality',
    category: 'behavioral',
    maxPoints: 15,
    evaluate: (lead) => {
      const scores: Record<string, number> = {
        REFERRAL: 15, PARTNER: 12, WEB_FORM: 10, LANDING_PAGE: 10,
        TRADE_SHOW: 8, EMAIL: 6, SOCIAL: 5, COLD_CALL: 3, API: 2, OTHER: 1,
      };
      return scores[lead.source] ?? 1;
    },
  },
  {
    name: 'Recency',
    category: 'behavioral',
    maxPoints: 20,
    evaluate: (lead) => {
      const daysSinceUpdate = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 1) return 20;
      if (daysSinceUpdate < 7) return 15;
      if (daysSinceUpdate < 30) return 10;
      if (daysSinceUpdate < 90) return 5;
      return 0;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ── Public API ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScoreBreakdown {
  total: number;
  rules: { name: string; category: string; points: number; maxPoints: number }[];
  scoredAt: string;
}

export async function scoreLead(
  tenantId: string,
  leadId: string,
): Promise<ScoreBreakdown> {
  const db = getPrismaClient();
  const lead = await db.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw new Error('Lead not found');

  const breakdown = evaluateRules(lead as unknown as LeadData);

  await db.lead.update({
    where: { id: leadId },
    data: {
      score: breakdown.total,
      scoreBreakdown: breakdown as any,
      lastScoredAt: new Date(),
    },
  });

  return breakdown;
}

export function evaluateRules(lead: LeadData): ScoreBreakdown {
  const results = DEFAULT_RULES.map((rule) => ({
    name: rule.name,
    category: rule.category,
    points: rule.evaluate(lead),
    maxPoints: rule.maxPoints,
  }));

  return {
    total: results.reduce((sum, r) => sum + r.points, 0),
    rules: results,
    scoredAt: new Date().toISOString(),
  };
}

export async function rescoreAllLeads(tenantId: string): Promise<number> {
  const db = getPrismaClient();
  const leads = await db.lead.findMany({
    where: { tenantId, status: { not: 'CONVERTED' } },
  });

  let updated = 0;
  for (const lead of leads) {
    const breakdown = evaluateRules(lead as unknown as LeadData);
    await db.lead.update({
      where: { id: lead.id },
      data: {
        score: breakdown.total,
        scoreBreakdown: breakdown as any,
        lastScoredAt: new Date(),
      },
    });
    updated++;
  }

  return updated;
}

export async function applyScoreDecay(
  tenantId: string,
  decayPercent = 5,
  inactiveDays = 30,
): Promise<number> {
  const db = getPrismaClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - inactiveDays);

  const staleLeads = await db.lead.findMany({
    where: {
      tenantId,
      status: { not: 'CONVERTED' },
      updatedAt: { lt: cutoff },
      score: { gt: 0 },
    },
  });

  let decayed = 0;
  for (const lead of staleLeads) {
    const newScore = Math.max(0, Math.floor(lead.score * (1 - decayPercent / 100)));
    if (newScore !== lead.score) {
      await db.lead.update({
        where: { id: lead.id },
        data: { score: newScore },
      });
      decayed++;
    }
  }

  return decayed;
}

export async function getLeadScoreDistribution(tenantId: string) {
  const db = getPrismaClient();
  const leads = await db.lead.findMany({
    where: { tenantId, status: { not: 'CONVERTED' } },
    select: { score: true },
  });

  const buckets = { hot: 0, warm: 0, cool: 0, cold: 0 };
  for (const lead of leads) {
    if (lead.score >= 70) buckets.hot++;
    else if (lead.score >= 40) buckets.warm++;
    else if (lead.score >= 20) buckets.cool++;
    else buckets.cold++;
  }

  return buckets;
}
