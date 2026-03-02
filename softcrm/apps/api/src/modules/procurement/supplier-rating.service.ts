/**
 * Supplier Rating service — manages supplier performance scoring.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, generateId } from '@softcrm/shared-kernel';

// ── Helper to round to 2 decimal places ─────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Rate a supplier ─────────────────────────────────────────────────────────

export async function rateSupplier(
  tenantId: string,
  data: {
    supplierId: string;
    poId?: string;
    qualityScore: number;
    deliveryScore: number;
    priceScore: number;
    comments?: string;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  const supplier = await db.supplier.findFirst({
    where: { id: data.supplierId, tenantId },
  });
  if (!supplier) throw new NotFoundError('Supplier not found');

  const overallScore = round2(
    (data.qualityScore + data.deliveryScore + data.priceScore) / 3
  );

  const rating = await db.supplierRating.create({
    data: {
      id: generateId(),
      tenantId,
      supplierId: data.supplierId,
      poId: data.poId,
      qualityScore: data.qualityScore,
      deliveryScore: data.deliveryScore,
      priceScore: data.priceScore,
      overallScore,
      comments: data.comments,
      ratedBy: actorId,
    },
  });

  // Update supplier rolling average
  const agg = await db.supplierRating.aggregate({
    where: { tenantId, supplierId: data.supplierId },
    _avg: { overallScore: true },
  });

  if (agg._avg.overallScore != null) {
    await db.supplier.update({
      where: { id: data.supplierId },
      data: { rating: round2(Number(agg._avg.overallScore)) },
    });
  }

  return rating;
}

// ── List ratings for a supplier ─────────────────────────────────────────────

export async function getSupplierRatings(tenantId: string, supplierId: string) {
  const db = getPrismaClient();
  return db.supplierRating.findMany({
    where: { tenantId, supplierId },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Get supplier scorecard ──────────────────────────────────────────────────

export async function getSupplierScorecard(tenantId: string, supplierId: string) {
  const db = getPrismaClient();

  const agg = await db.supplierRating.aggregate({
    where: { tenantId, supplierId },
    _avg: {
      qualityScore: true,
      deliveryScore: true,
      priceScore: true,
      overallScore: true,
    },
    _count: { id: true },
  });

  return {
    avgQuality: agg._avg.qualityScore,
    avgDelivery: agg._avg.deliveryScore,
    avgPrice: agg._avg.priceScore,
    avgOverall: agg._avg.overallScore,
    totalRatings: agg._count.id,
  };
}
