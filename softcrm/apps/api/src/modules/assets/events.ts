/**
 * Asset Management module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * polls for unpublished rows, projects them into full `DomainEvent` objects
 * and publishes them to the event bus (BullMQ). This guarantees at-least-once
 * delivery even if the process crashes between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Event constants ────────────────────────────────────────────────────────────

export const ASSETS_EVENTS = {
  ASSET_CREATED: 'assets.asset.created',
  ASSET_DEPRECIATED: 'assets.asset.depreciated',
  ASSET_DISPOSED: 'assets.asset.disposed',
  MAINTENANCE_SCHEDULED: 'assets.maintenance.scheduled',
} as const;

export type AssetsEventType = (typeof ASSETS_EVENTS)[keyof typeof ASSETS_EVENTS];

// ── Outbox helper ──────────────────────────────────────────────────────────────

interface OutboxPayload {
  tenantId: string;
  actorId: string;
  aggregateType: string;
  correlationId: string;
  data: unknown;
}

async function writeToOutbox(
  eventType: string,
  aggregateId: string,
  payload: OutboxPayload,
): Promise<void> {
  const db = getPrismaClient();
  await db.outbox.create({
    data: {
      id: generateId(),
      eventType,
      aggregateId,
      payload: payload as never,
      publishedAt: null,
    },
  });
}

// ── Asset events ───────────────────────────────────────────────────────────────

export async function publishAssetCreated(
  tenantId: string,
  actorId: string,
  asset: {
    id: string;
    assetNumber: string;
    name: string;
    categoryId: string;
    purchasePrice: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_CREATED, asset.id, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      categoryId: asset.categoryId,
      purchasePrice: asset.purchasePrice,
    },
  });
}

export async function publishAssetDepreciated(
  tenantId: string,
  actorId: string,
  depreciation: {
    assetId: string;
    assetNumber: string;
    period: string;
    depreciationCharge: number;
    newBookValue: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_DEPRECIATED, depreciation.assetId, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: depreciation.assetId,
      assetNumber: depreciation.assetNumber,
      period: depreciation.period,
      depreciationCharge: depreciation.depreciationCharge,
      newBookValue: depreciation.newBookValue,
    },
  });
}

export async function publishAssetDisposed(
  tenantId: string,
  actorId: string,
  disposal: {
    assetId: string;
    assetNumber: string;
    disposalDate: string;
    disposalMethod: string;
    proceedsAmount: number;
    gainLoss: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_DISPOSED, disposal.assetId, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: disposal.assetId,
      assetNumber: disposal.assetNumber,
      disposalDate: disposal.disposalDate,
      disposalMethod: disposal.disposalMethod,
      proceedsAmount: disposal.proceedsAmount,
      gainLoss: disposal.gainLoss,
    },
  });
}

export async function publishMaintenanceScheduled(
  tenantId: string,
  actorId: string,
  maintenance: {
    id: string;
    assetId: string;
    type: string;
    scheduledDate: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.MAINTENANCE_SCHEDULED, maintenance.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetMaintenance',
    correlationId: generateId(),
    data: {
      maintenanceId: maintenance.id,
      assetId: maintenance.assetId,
      type: maintenance.type,
      scheduledDate: maintenance.scheduledDate,
    },
  });
}
