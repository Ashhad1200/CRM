/**
 * Asset Management module — event listeners (V2 Enhanced).
 *
 * Registers handlers for domain events published by other modules
 * that the Asset Management module needs to react to.
 *
 * NOTE: Most handlers are stubbed pending repository implementation.
 * The corresponding repository functions need to be implemented before
 * these handlers can be fully functional.
 */

import type { DomainEvent } from '@softcrm/shared-kernel';
import { logger } from '../../logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Invoice paid listener ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle accounting.invoice.paid event.
 *
 * When an invoice is paid, check if it was a purchase invoice linked to
 * a fixed asset. If so, confirm the asset's purchaseInvoiceId is set and
 * auto-activate any DRAFT assets tied to that invoice.
 *
 * TODO: Implement repo.findAssetsByInvoice and repo.updateAssetStatus
 */
export async function handleInvoicePaid(
  event: DomainEvent<{
    invoiceId: string;
    dealId: string;
    amount: { amount: string; currency: string };
    paymentMethod: string;
  }>,
): Promise<void> {
  try {
    const { invoiceId } = event.payload;

    // TODO: Implement when repository functions are available
    // const assets = await repo.findAssetsByInvoice(event.tenantId, invoiceId);
    // for (const asset of assets) {
    //   if (asset.status === 'DRAFT') {
    //     await repo.updateAssetStatus(asset.id, 'ACTIVE');
    //   }
    // }

    logger.debug(
      { invoiceId, tenantId: event.tenantId },
      '[assets] invoice.paid received — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle invoice.paid event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase order received listener ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle procurement.purchase_order.received event.
 *
 * When a purchase order is received (goods delivered), check if any line items
 * are marked as fixed assets and auto-create draft assets if configured.
 *
 * TODO: Implement repo.createAssetFromPO
 */
export async function handlePurchaseOrderReceived(
  event: DomainEvent<{
    purchaseOrderId: string;
    purchaseOrderNumber: string;
    vendorId: string;
    vendorName: string;
    lineItems: Array<{
      id: string;
      productId: string | null;
      description: string;
      quantity: number;
      unitPrice: number;
      isAsset: boolean;
      assetCategoryId: string | null;
    }>;
    receivedDate: string;
    receivedBy: string;
  }>,
): Promise<void> {
  try {
    const { purchaseOrderId, lineItems } = event.payload;

    // Filter line items marked as assets
    const assetLineItems = lineItems.filter(
      (item) => item.isAsset && item.assetCategoryId,
    );

    if (assetLineItems.length === 0) {
      logger.debug(
        { purchaseOrderId, tenantId: event.tenantId },
        '[assets] purchase_order.received — no asset line items',
      );
      return;
    }

    // TODO: Implement when repository functions are available
    // for (const item of assetLineItems) {
    //   for (let i = 0; i < item.quantity; i++) {
    //     const assetNumber = await repo.generateNextAssetNumber(event.tenantId);
    //     await repo.createAssetFromPO(event.tenantId, { ... });
    //   }
    // }

    logger.debug(
      { purchaseOrderId, assetLineItemCount: assetLineItems.length, tenantId: event.tenantId },
      '[assets] purchase_order.received — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle purchase_order.received event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Vendor updated listener ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle procurement.vendor.updated event.
 *
 * When vendor information changes, update warranty/insurance provider names
 * on assets linked to that vendor.
 *
 * TODO: Implement repo.updateAssetVendorReferences
 */
export async function handleVendorUpdated(
  event: DomainEvent<{
    vendorId: string;
    oldName: string;
    newName: string;
  }>,
): Promise<void> {
  try {
    const { vendorId, oldName, newName } = event.payload;

    // TODO: Implement when repository functions are available
    // const updatedCount = await repo.updateAssetVendorReferences(
    //   event.tenantId,
    //   vendorId,
    //   { warrantyProvider: oldName },
    //   { warrantyProvider: newName },
    // );

    logger.debug(
      { vendorId, oldName, newName, tenantId: event.tenantId },
      '[assets] vendor.updated — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle vendor.updated event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Department deleted listener ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle platform.department.deleted event.
 *
 * When a department is deleted, clear the departmentId on assets
 * assigned to that department.
 *
 * TODO: Implement repo.clearAssetDepartment
 */
export async function handleDepartmentDeleted(
  event: DomainEvent<{
    departmentId: string;
    departmentName: string;
  }>,
): Promise<void> {
  try {
    const { departmentId, departmentName } = event.payload;

    // TODO: Implement when repository functions are available
    // const updatedCount = await repo.clearAssetDepartment(
    //   event.tenantId,
    //   departmentId,
    // );

    logger.debug(
      { departmentId, departmentName, tenantId: event.tenantId },
      '[assets] department.deleted — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle department.deleted event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Location deleted listener ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle platform.location.deleted event.
 *
 * When a location is deleted, clear the locationId on assets
 * at that location and cancel pending transfers to/from that location.
 *
 * TODO: Implement repo.clearAssetLocation and repo.cancelTransfersForLocation
 */
export async function handleLocationDeleted(
  event: DomainEvent<{
    locationId: string;
    locationName: string;
  }>,
): Promise<void> {
  try {
    const { locationId, locationName } = event.payload;

    // TODO: Implement when repository functions are available
    // const assetsUpdated = await repo.clearAssetLocation(
    //   event.tenantId,
    //   locationId,
    // );
    // const transfersCancelled = await repo.cancelTransfersForLocation(
    //   event.tenantId,
    //   locationId,
    //   `Location "${locationName}" was deleted`,
    // );

    logger.debug(
      { locationId, locationName, tenantId: event.tenantId },
      '[assets] location.deleted — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle location.deleted event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── User deactivated listener ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle platform.user.deactivated event.
 *
 * When a user is deactivated, unassign assets from that user
 * and optionally create a task for asset reassignment.
 *
 * TODO: Implement repo.unassignAssetsFromUser
 */
export async function handleUserDeactivated(
  event: DomainEvent<{
    userId: string;
    userName: string;
    email: string;
  }>,
): Promise<void> {
  try {
    const { userId, userName } = event.payload;

    // TODO: Implement when repository functions are available
    // const assetsUnassigned = await repo.unassignAssetsFromUser(
    //   event.tenantId,
    //   userId,
    // );

    logger.debug(
      { userId, userName, tenantId: event.tenantId },
      '[assets] user.deactivated — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle user.deactivated event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Project completed listener ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle projects.project.completed event.
 *
 * When a project is completed, assets assigned to that project should be
 * flagged for reallocation or return to pool.
 *
 * TODO: Implement repo.findAssetsByProject and repo.markAssetsForReallocation
 */
export async function handleProjectCompleted(
  event: DomainEvent<{
    projectId: string;
    projectName: string;
    completedAt: string;
  }>,
): Promise<void> {
  try {
    const { projectId, projectName } = event.payload;

    // TODO: Implement when repository functions are available
    // const assets = await repo.findAssetsByProject(event.tenantId, projectId);
    // if (assets.length > 0) {
    //   await repo.markAssetsForReallocation(
    //     event.tenantId,
    //     assets.map((a) => a.id),
    //     `Project "${projectName}" completed`,
    //   );
    // }

    logger.debug(
      { projectId, projectName, tenantId: event.tenantId },
      '[assets] project.completed — handler stubbed pending repository implementation',
    );
  } catch (error) {
    logger.error(
      { error, eventId: event.id },
      '[assets] Failed to handle project.completed event',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Register listeners ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register all asset management event listeners.
 * Called during module initialisation (e.g. from server.ts or a bootstrap file).
 *
 * Usage:
 *   import { eventBus } from '../../infra/event-bus.js';
 *   import { registerListeners } from './modules/assets/listeners.js';
 *   registerListeners(eventBus);
 */
export function registerListeners(eventBus: {
  subscribe: <T>(type: string, handler: (event: DomainEvent<T>) => Promise<void>) => void;
}): void {
  // Accounting events
  eventBus.subscribe('accounting.invoice.paid', handleInvoicePaid);

  // Procurement events
  eventBus.subscribe('procurement.purchase_order.received', handlePurchaseOrderReceived);
  eventBus.subscribe('procurement.vendor.updated', handleVendorUpdated);

  // Platform events
  eventBus.subscribe('platform.department.deleted', handleDepartmentDeleted);
  eventBus.subscribe('platform.location.deleted', handleLocationDeleted);
  eventBus.subscribe('platform.user.deactivated', handleUserDeactivated);

  // Project events
  eventBus.subscribe('projects.project.completed', handleProjectCompleted);

  logger.debug('[assets] Event listeners registered (v2 enhanced - handlers stubbed)');
}
