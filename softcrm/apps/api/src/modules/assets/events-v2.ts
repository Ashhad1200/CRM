/**
 * Asset Management module — domain event publishers (V2 Enhanced).
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * polls for unpublished rows, projects them into full `DomainEvent` objects
 * and publishes them to the event bus (BullMQ). This guarantees at-least-once
 * delivery even if the process crashes between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Event constants ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const ASSETS_EVENTS = {
  // Asset lifecycle events
  ASSET_CREATED: 'assets.asset.created',
  ASSET_UPDATED: 'assets.asset.updated',
  ASSET_ACTIVATED: 'assets.asset.activated',
  ASSET_DEPRECIATED: 'assets.asset.depreciated',
  ASSET_FULLY_DEPRECIATED: 'assets.asset.fully_depreciated',
  ASSET_DISPOSED: 'assets.asset.disposed',
  ASSET_WRITTEN_OFF: 'assets.asset.written_off',

  // Transfer events
  TRANSFER_REQUESTED: 'assets.transfer.requested',
  TRANSFER_APPROVED: 'assets.transfer.approved',
  TRANSFER_REJECTED: 'assets.transfer.rejected',
  TRANSFER_COMPLETED: 'assets.transfer.completed',
  TRANSFER_CANCELLED: 'assets.transfer.cancelled',

  // Maintenance events
  MAINTENANCE_SCHEDULED: 'assets.maintenance.scheduled',
  MAINTENANCE_STARTED: 'assets.maintenance.started',
  MAINTENANCE_COMPLETED: 'assets.maintenance.completed',
  MAINTENANCE_CANCELLED: 'assets.maintenance.cancelled',
  MAINTENANCE_OVERDUE: 'assets.maintenance.overdue',

  // Audit events
  AUDIT_SCHEDULED: 'assets.audit.scheduled',
  AUDIT_STARTED: 'assets.audit.started',
  AUDIT_COMPLETED: 'assets.audit.completed',
  AUDIT_CANCELLED: 'assets.audit.cancelled',

  // Disposal events
  DISPOSAL_REQUESTED: 'assets.disposal.requested',
  DISPOSAL_APPROVED: 'assets.disposal.approved',
  DISPOSAL_REJECTED: 'assets.disposal.rejected',
  DISPOSAL_COMPLETED: 'assets.disposal.completed',

  // Category events
  CATEGORY_CREATED: 'assets.category.created',
  CATEGORY_UPDATED: 'assets.category.updated',

  // Image events
  IMAGE_UPLOADED: 'assets.image.uploaded',
  IMAGE_DELETED: 'assets.image.deleted',
} as const;

export type AssetsEventType = (typeof ASSETS_EVENTS)[keyof typeof ASSETS_EVENTS];

// ═══════════════════════════════════════════════════════════════════════════════
// ── Outbox helper ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// ── Asset lifecycle events ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishAssetCreated(
  tenantId: string,
  actorId: string,
  asset: {
    id: string;
    assetNumber: string;
    name: string;
    categoryId: string;
    purchasePrice: number;
    condition: string;
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
      condition: asset.condition,
    },
  });
}

export async function publishAssetUpdated(
  tenantId: string,
  actorId: string,
  asset: {
    id: string;
    assetNumber: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_UPDATED, asset.id, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      changes: asset.changes,
    },
  });
}

export async function publishAssetActivated(
  tenantId: string,
  actorId: string,
  asset: {
    id: string;
    assetNumber: string;
    name: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_ACTIVATED, asset.id, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
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

export async function publishAssetFullyDepreciated(
  tenantId: string,
  actorId: string,
  asset: {
    id: string;
    assetNumber: string;
    salvageValue: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_FULLY_DEPRECIATED, asset.id, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      salvageValue: asset.salvageValue,
    },
  });
}

export async function publishAssetDisposed(
  tenantId: string,
  actorId: string,
  disposal: {
    assetId: string;
    assetNumber: string;
    disposalId: string;
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
      disposalId: disposal.disposalId,
      disposalDate: disposal.disposalDate,
      disposalMethod: disposal.disposalMethod,
      proceedsAmount: disposal.proceedsAmount,
      gainLoss: disposal.gainLoss,
    },
  });
}

export async function publishAssetWrittenOff(
  tenantId: string,
  actorId: string,
  asset: {
    id: string;
    assetNumber: string;
    bookValueWrittenOff: number;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.ASSET_WRITTEN_OFF, asset.id, {
    tenantId,
    actorId,
    aggregateType: 'FixedAsset',
    correlationId: generateId(),
    data: {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      bookValueWrittenOff: asset.bookValueWrittenOff,
      reason: asset.reason,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Transfer events ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishTransferRequested(
  tenantId: string,
  actorId: string,
  transfer: {
    id: string;
    transferNumber: string;
    assetId: string;
    assetNumber: string;
    fromLocation: string | null;
    toLocation: string | null;
    transferDate: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.TRANSFER_REQUESTED, transfer.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetTransfer',
    correlationId: generateId(),
    data: transfer,
  });
}

export async function publishTransferApproved(
  tenantId: string,
  actorId: string,
  transfer: {
    id: string;
    transferNumber: string;
    assetId: string;
    approvedBy: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.TRANSFER_APPROVED, transfer.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetTransfer',
    correlationId: generateId(),
    data: transfer,
  });
}

export async function publishTransferRejected(
  tenantId: string,
  actorId: string,
  transfer: {
    id: string;
    transferNumber: string;
    assetId: string;
    rejectedBy: string;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.TRANSFER_REJECTED, transfer.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetTransfer',
    correlationId: generateId(),
    data: transfer,
  });
}

export async function publishTransferCompleted(
  tenantId: string,
  actorId: string,
  transfer: {
    id: string;
    transferNumber: string;
    assetId: string;
    assetNumber: string;
    completedAt: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.TRANSFER_COMPLETED, transfer.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetTransfer',
    correlationId: generateId(),
    data: transfer,
  });
}

export async function publishTransferCancelled(
  tenantId: string,
  actorId: string,
  transfer: {
    id: string;
    transferNumber: string;
    assetId: string;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.TRANSFER_CANCELLED, transfer.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetTransfer',
    correlationId: generateId(),
    data: transfer,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Maintenance events ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishMaintenanceScheduled(
  tenantId: string,
  actorId: string,
  maintenance: {
    id: string;
    assetId: string;
    assetNumber: string;
    type: string;
    scheduledDate: string;
    description: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.MAINTENANCE_SCHEDULED, maintenance.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetMaintenance',
    correlationId: generateId(),
    data: maintenance,
  });
}

export async function publishMaintenanceStarted(
  tenantId: string,
  actorId: string,
  maintenance: {
    id: string;
    assetId: string;
    assetNumber: string;
    type: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.MAINTENANCE_STARTED, maintenance.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetMaintenance',
    correlationId: generateId(),
    data: maintenance,
  });
}

export async function publishMaintenanceCompleted(
  tenantId: string,
  actorId: string,
  maintenance: {
    id: string;
    assetId: string;
    assetNumber: string;
    type: string;
    completedDate: string;
    cost: number | null;
    notes: string | null;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.MAINTENANCE_COMPLETED, maintenance.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetMaintenance',
    correlationId: generateId(),
    data: maintenance,
  });
}

export async function publishMaintenanceCancelled(
  tenantId: string,
  actorId: string,
  maintenance: {
    id: string;
    assetId: string;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.MAINTENANCE_CANCELLED, maintenance.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetMaintenance',
    correlationId: generateId(),
    data: maintenance,
  });
}

export async function publishMaintenanceOverdue(
  tenantId: string,
  actorId: string,
  maintenance: {
    id: string;
    assetId: string;
    assetNumber: string;
    type: string;
    scheduledDate: string;
    daysOverdue: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.MAINTENANCE_OVERDUE, maintenance.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetMaintenance',
    correlationId: generateId(),
    data: maintenance,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Audit events ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishAuditScheduled(
  tenantId: string,
  actorId: string,
  audit: {
    id: string;
    auditNumber: string;
    name: string;
    scope: string;
    scheduledDate: string;
    totalAssets: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.AUDIT_SCHEDULED, audit.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetAudit',
    correlationId: generateId(),
    data: audit,
  });
}

export async function publishAuditStarted(
  tenantId: string,
  actorId: string,
  audit: {
    id: string;
    auditNumber: string;
    startedAt: string;
    conductedBy: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.AUDIT_STARTED, audit.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetAudit',
    correlationId: generateId(),
    data: audit,
  });
}

export async function publishAuditCompleted(
  tenantId: string,
  actorId: string,
  audit: {
    id: string;
    auditNumber: string;
    completedAt: string;
    totalAssets: number;
    assetsVerified: number;
    assetsMissing: number;
    discrepancies: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.AUDIT_COMPLETED, audit.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetAudit',
    correlationId: generateId(),
    data: audit,
  });
}

export async function publishAuditCancelled(
  tenantId: string,
  actorId: string,
  audit: {
    id: string;
    auditNumber: string;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.AUDIT_CANCELLED, audit.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetAudit',
    correlationId: generateId(),
    data: audit,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Disposal events ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishDisposalRequested(
  tenantId: string,
  actorId: string,
  disposal: {
    id: string;
    disposalNumber: string;
    assetId: string;
    assetNumber: string;
    disposalMethod: string;
    bookValue: number;
    estimatedProceeds: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.DISPOSAL_REQUESTED, disposal.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetDisposal',
    correlationId: generateId(),
    data: disposal,
  });
}

export async function publishDisposalApproved(
  tenantId: string,
  actorId: string,
  disposal: {
    id: string;
    disposalNumber: string;
    assetId: string;
    approvedBy: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.DISPOSAL_APPROVED, disposal.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetDisposal',
    correlationId: generateId(),
    data: disposal,
  });
}

export async function publishDisposalRejected(
  tenantId: string,
  actorId: string,
  disposal: {
    id: string;
    disposalNumber: string;
    assetId: string;
    rejectedBy: string;
    reason: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.DISPOSAL_REJECTED, disposal.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetDisposal',
    correlationId: generateId(),
    data: disposal,
  });
}

export async function publishDisposalCompleted(
  tenantId: string,
  actorId: string,
  disposal: {
    id: string;
    disposalNumber: string;
    assetId: string;
    assetNumber: string;
    disposalDate: string;
    proceedsAmount: number;
    gainLoss: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.DISPOSAL_COMPLETED, disposal.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetDisposal',
    correlationId: generateId(),
    data: disposal,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Category events ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishCategoryCreated(
  tenantId: string,
  actorId: string,
  category: {
    id: string;
    name: string;
    depreciationMethod: string;
    usefulLifeYears: number;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.CATEGORY_CREATED, category.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetCategory',
    correlationId: generateId(),
    data: category,
  });
}

export async function publishCategoryUpdated(
  tenantId: string,
  actorId: string,
  category: {
    id: string;
    name: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.CATEGORY_UPDATED, category.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetCategory',
    correlationId: generateId(),
    data: category,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Image events ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function publishImageUploaded(
  tenantId: string,
  actorId: string,
  image: {
    id: string;
    assetId: string;
    assetNumber: string;
    fileName: string;
    isPrimary: boolean;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.IMAGE_UPLOADED, image.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetImage',
    correlationId: generateId(),
    data: image,
  });
}

export async function publishImageDeleted(
  tenantId: string,
  actorId: string,
  image: {
    id: string;
    assetId: string;
    fileName: string;
  },
): Promise<void> {
  await writeToOutbox(ASSETS_EVENTS.IMAGE_DELETED, image.id, {
    tenantId,
    actorId,
    aggregateType: 'AssetImage',
    correlationId: generateId(),
    data: image,
  });
}
