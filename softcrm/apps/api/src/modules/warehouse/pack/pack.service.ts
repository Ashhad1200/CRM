/**
 * Pack Order service — manages packing workflow for warehouse shipments.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, generateId } from '@softcrm/shared-kernel';

// ── List pack orders ────────────────────────────────────────────────────────

export async function getPackOrders(
  tenantId: string,
  warehouseId?: string,
  status?: string,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (warehouseId) where['warehouseId'] = warehouseId;
  if (status) where['status'] = status;

  return db.wHPackOrder.findMany({
    where,
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });
}

// ── Get single pack order ───────────────────────────────────────────────────

export async function getPackOrder(tenantId: string, packOrderId: string) {
  const db = getPrismaClient();
  const order = await db.wHPackOrder.findFirst({
    where: { id: packOrderId, tenantId },
    include: { lines: true },
  });
  if (!order) throw new NotFoundError('Pack order not found');
  return order;
}

// ── Create pack order with lines ────────────────────────────────────────────

export async function createPackOrder(
  tenantId: string,
  data: {
    warehouseId: string;
    pickListId?: string;
    shipmentId?: string;
    lines: { productId: string; quantity: number; boxNumber?: number }[];
  },
  actorId: string,
) {
  const db = getPrismaClient();
  const id = generateId();

  return db.wHPackOrder.create({
    data: {
      id,
      tenantId,
      warehouseId: data.warehouseId,
      pickListId: data.pickListId,
      shipmentId: data.shipmentId,
      createdBy: actorId,
      lines: {
        create: data.lines.map((l) => ({
          id: generateId(),
          productId: l.productId,
          quantity: l.quantity,
          boxNumber: l.boxNumber ?? 1,
        })),
      },
    },
    include: { lines: true },
  });
}

// ── Start packing ───────────────────────────────────────────────────────────

export async function startPacking(
  tenantId: string,
  packOrderId: string,
  actorId: string,
) {
  const db = getPrismaClient();
  const order = await db.wHPackOrder.findFirst({
    where: { id: packOrderId, tenantId },
  });
  if (!order) throw new NotFoundError('Pack order not found');

  return db.wHPackOrder.update({
    where: { id: packOrderId },
    data: { status: 'IN_PROGRESS', packedBy: actorId },
    include: { lines: true },
  });
}

// ── Complete packing ────────────────────────────────────────────────────────

export async function completePacking(
  tenantId: string,
  packOrderId: string,
  data: { totalWeight?: number; boxCount?: number },
) {
  const db = getPrismaClient();
  const order = await db.wHPackOrder.findFirst({
    where: { id: packOrderId, tenantId },
  });
  if (!order) throw new NotFoundError('Pack order not found');

  return db.wHPackOrder.update({
    where: { id: packOrderId },
    data: {
      status: 'PACKED',
      packedAt: new Date(),
      totalWeight: data.totalWeight,
      boxCount: data.boxCount,
    },
    include: { lines: true },
  });
}

// ── Get pack orders by shipment ─────────────────────────────────────────────

export async function getPackOrdersByShipment(
  tenantId: string,
  shipmentId: string,
) {
  const db = getPrismaClient();
  return db.wHPackOrder.findMany({
    where: { tenantId, shipmentId },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });
}
