/**
 * Procurement module — domain event publishers.
 *
 * Each function writes a row to the `outbox` table. The outbox relay
 * polls for unpublished rows, projects them into full `DomainEvent` objects
 * and publishes them to the event bus (BullMQ). This guarantees at-least-once
 * delivery even if the process crashes between commit and publish.
 */

import { generateId } from '@softcrm/shared-kernel';
import { getPrismaClient } from '@softcrm/db';

// ── Event type constants ───────────────────────────────────────────────────────

export const PROCUREMENT_EVENTS = {
  PO_CREATED: 'procurement.po.created',
  PO_CONFIRMED: 'procurement.po.confirmed',
  GOODS_RECEIVED: 'procurement.goods_received',
  SUPPLIER_CREATED: 'procurement.supplier.created',
} as const;

export type ProcurementEventType =
  (typeof PROCUREMENT_EVENTS)[keyof typeof PROCUREMENT_EVENTS];

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Procurement event publishers ───────────────────────────────────────────────

export async function publishPOCreated(
  tenantId: string,
  actorId: string,
  po: {
    id: string;
    poNumber: string;
    supplierId: string;
    total: unknown;
  },
): Promise<void> {
  await writeToOutbox(PROCUREMENT_EVENTS.PO_CREATED, po.id, {
    tenantId,
    actorId,
    aggregateType: 'ProcurementPO',
    correlationId: generateId(),
    data: {
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      total: Number(po.total),
    },
  });
}

export async function publishPOConfirmed(
  tenantId: string,
  actorId: string,
  po: {
    id: string;
    poNumber: string;
    supplierId: string;
    total: unknown;
    currency: string;
  },
): Promise<void> {
  await writeToOutbox(PROCUREMENT_EVENTS.PO_CONFIRMED, po.id, {
    tenantId,
    actorId,
    aggregateType: 'ProcurementPO',
    correlationId: generateId(),
    data: {
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      total: Number(po.total),
      currency: po.currency,
    },
  });
}

export async function publishGoodsReceived(
  tenantId: string,
  actorId: string,
  receipt: {
    id: string;
    receiptNumber: string;
    poId: string;
    warehouseId: string | null;
    receivedAt: Date;
    lines: Array<{
      productId: string;
      receivedQty: unknown;
      lotNumber: string | null;
    }>;
  },
): Promise<void> {
  await writeToOutbox(PROCUREMENT_EVENTS.GOODS_RECEIVED, receipt.id, {
    tenantId,
    actorId,
    aggregateType: 'GoodsReceipt',
    correlationId: generateId(),
    data: {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      poId: receipt.poId,
      warehouseId: receipt.warehouseId,
      receivedAt: receipt.receivedAt.toISOString(),
      lines: receipt.lines.map((l) => ({
        productId: l.productId,
        receivedQty: Number(l.receivedQty),
        lotNumber: l.lotNumber,
      })),
    },
  });
}

export async function publishSupplierCreated(
  tenantId: string,
  actorId: string,
  supplier: {
    id: string;
    name: string;
    code: string;
  },
): Promise<void> {
  await writeToOutbox(PROCUREMENT_EVENTS.SUPPLIER_CREATED, supplier.id, {
    tenantId,
    actorId,
    aggregateType: 'Supplier',
    correlationId: generateId(),
    data: {
      supplierId: supplier.id,
      name: supplier.name,
      code: supplier.code,
    },
  });
}
