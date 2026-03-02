/**
 * Serial Number tracking service — manages individual item serial numbers.
 */

import { getPrismaClient } from '@softcrm/db';
import { NotFoundError, ConflictError, generateId } from '@softcrm/shared-kernel';

// ── Register a serial number ────────────────────────────────────────────────

export async function registerSerial(
  tenantId: string,
  data: {
    productId: string;
    serialNumber: string;
    lotId?: string;
    warehouseId: string;
    locationId?: string;
  },
) {
  const db = getPrismaClient();

  const existing = await db.wHSerialNumber.findUnique({
    where: { tenantId_serialNumber: { tenantId, serialNumber: data.serialNumber } },
  });
  if (existing) throw new ConflictError(`Serial number "${data.serialNumber}" already registered`);

  return db.wHSerialNumber.create({
    data: {
      id: generateId(),
      tenantId,
      productId: data.productId,
      serialNumber: data.serialNumber,
      lotId: data.lotId,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      receivedAt: new Date(),
    },
  });
}

// ── List serial numbers ─────────────────────────────────────────────────────

export async function getSerials(
  tenantId: string,
  productId?: string,
  warehouseId?: string,
  status?: string,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (productId) where['productId'] = productId;
  if (warehouseId) where['warehouseId'] = warehouseId;
  if (status) where['status'] = status;

  return db.wHSerialNumber.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

// ── Get by serial number ────────────────────────────────────────────────────

export async function getSerial(tenantId: string, serialNumber: string) {
  const db = getPrismaClient();
  const serial = await db.wHSerialNumber.findUnique({
    where: { tenantId_serialNumber: { tenantId, serialNumber } },
  });
  if (!serial) throw new NotFoundError('Serial number not found');
  return serial;
}

// ── Ship serial ─────────────────────────────────────────────────────────────

export async function shipSerial(tenantId: string, serialNumber: string) {
  const db = getPrismaClient();
  const serial = await db.wHSerialNumber.findUnique({
    where: { tenantId_serialNumber: { tenantId, serialNumber } },
  });
  if (!serial) throw new NotFoundError('Serial number not found');

  return db.wHSerialNumber.update({
    where: { id: serial.id },
    data: { status: 'RESERVED', shippedAt: new Date() },
  });
}

// ── Quarantine serial ───────────────────────────────────────────────────────

export async function quarantineSerial(tenantId: string, serialNumber: string) {
  const db = getPrismaClient();
  const serial = await db.wHSerialNumber.findUnique({
    where: { tenantId_serialNumber: { tenantId, serialNumber } },
  });
  if (!serial) throw new NotFoundError('Serial number not found');

  return db.wHSerialNumber.update({
    where: { id: serial.id },
    data: { status: 'QUARANTINE' },
  });
}
