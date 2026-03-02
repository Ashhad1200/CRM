/**
 * POS module — data-access layer (repository).
 *
 * Every query is scoped by tenantId as the primary filter.
 * Prisma model names mirror the pos.prisma schema exactly.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  generateId,
} from '@softcrm/shared-kernel';

import type {
  POSOrderFilters,
  KitchenOrderFilters,
  POSTerminalFilters,
  RestaurantTableFilters,
} from './types.js';
import type {
  CreateTerminalInput,
  OpenSessionInput,
  CreateOrderInput,
  OrderLineInput,
  CreateTableInput,
  CreateLoyaltyProgramInput,
  UpdateLoyaltyProgramInput,
} from './validators.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

function paginationArgs(p: Pagination): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const skip = (p.page - 1) * p.limit;
  const orderBy = p.sortBy ? { [p.sortBy]: p.sortDir ?? 'asc' } : undefined;
  return { skip, take: p.limit, ...(orderBy ? { orderBy } : {}) };
}

// ── Includes ───────────────────────────────────────────────────────────────────

const orderDetailInclude = {
  lines: true,
  payments: true,
} as const;

const kitchenOrderDetailInclude = {
  items: true,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ── Terminals ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findTerminals(
  tenantId: string,
  filters: POSTerminalFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status;

  const { skip, take, orderBy } = paginationArgs(pagination);
  const [data, total] = await db.$transaction([
    db.pOSTerminal.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    }),
    db.pOSTerminal.count({ where }),
  ]);
  return { data, total };
}

export async function createTerminal(
  tenantId: string,
  data: CreateTerminalInput,
) {
  const db = getPrismaClient();
  return db.pOSTerminal.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      warehouseId: data.warehouseId,
      status: data.status as never,
    },
  });
}

export async function findTerminal(tenantId: string, id: string) {
  const db = getPrismaClient();
  const terminal = await db.pOSTerminal.findFirst({ where: { id, tenantId } });
  if (!terminal) throw new NotFoundError('POSTerminal', id);
  return terminal;
}

export async function updateTerminalSession(
  tenantId: string,
  terminalId: string,
  sessionId: string | null,
  status: string,
) {
  const db = getPrismaClient();
  return db.pOSTerminal.update({
    where: { id: terminalId },
    data: {
      currentSessionId: sessionId,
      status: status as never,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sessions ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createSession(
  tenantId: string,
  data: OpenSessionInput,
) {
  const db = getPrismaClient();

  // Verify terminal belongs to tenant and is not already in an open session
  const terminal = await db.pOSTerminal.findFirst({
    where: { id: data.terminalId, tenantId },
  });
  if (!terminal) throw new NotFoundError('POSTerminal', data.terminalId);

  const existingOpen = await db.pOSSession.findFirst({
    where: { tenantId, terminalId: data.terminalId, status: 'OPEN' },
  });
  if (existingOpen) {
    throw new ConflictError(
      `Terminal ${data.terminalId} already has an open session: ${existingOpen.id}`,
    );
  }

  const sessionId = generateId();

  return db.$transaction(async (tx) => {
    const session = await tx.pOSSession.create({
      data: {
        id: sessionId,
        tenantId,
        terminalId: data.terminalId,
        cashierId: data.cashierId,
        openedAt: new Date(),
        openingCash: data.openingCash,
        status: 'OPEN',
      },
    });

    await tx.pOSTerminal.update({
      where: { id: data.terminalId },
      data: { currentSessionId: sessionId, status: 'ONLINE' },
    });

    return session;
  });
}

export async function findSession(tenantId: string, id: string) {
  const db = getPrismaClient();
  const session = await db.pOSSession.findFirst({ where: { id, tenantId } });
  if (!session) throw new NotFoundError('POSSession', id);
  return session;
}

export async function closeSession(
  tenantId: string,
  sessionId: string,
  closingCash: number,
  expectedCash: number,
) {
  const db = getPrismaClient();
  const variance = closingCash - expectedCash;

  return db.$transaction(async (tx) => {
    const session = await tx.pOSSession.findFirst({
      where: { id: sessionId, tenantId },
    });
    if (!session) throw new NotFoundError('POSSession', sessionId);
    if (session.status !== 'OPEN') {
      throw new ValidationError('Session is not open');
    }

    const closed = await tx.pOSSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingCash,
        expectedCash,
        variance,
      },
    });

    await tx.pOSTerminal.update({
      where: { id: session.terminalId },
      data: { currentSessionId: null, status: 'OFFLINE' },
    });

    return closed;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Orders ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findOrders(
  tenantId: string,
  filters: POSOrderFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (filters.sessionId) where['sessionId'] = filters.sessionId;
  if (filters.status) where['status'] = filters.status;
  if (filters.customerId) where['customerId'] = filters.customerId;
  if (filters.startDate || filters.endDate) {
    const df: Record<string, unknown> = {};
    if (filters.startDate) df['gte'] = new Date(filters.startDate);
    if (filters.endDate) df['lte'] = new Date(filters.endDate);
    where['createdAt'] = df;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);
  const [data, total] = await db.$transaction([
    db.pOSOrder.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: orderDetailInclude,
    }),
    db.pOSOrder.count({ where }),
  ]);
  return { data, total };
}

export async function findOrder(tenantId: string, id: string) {
  const db = getPrismaClient();
  const order = await db.pOSOrder.findFirst({
    where: { id, tenantId },
    include: orderDetailInclude,
  });
  if (!order) throw new NotFoundError('POSOrder', id);
  return order;
}

export async function createOrder(
  tenantId: string,
  data: CreateOrderInput,
  createdBy: string,
) {
  const db = getPrismaClient();

  // Verify session belongs to tenant
  const session = await db.pOSSession.findFirst({
    where: { id: data.sessionId, tenantId },
  });
  if (!session) throw new NotFoundError('POSSession', data.sessionId);
  if (session.status !== 'OPEN') {
    throw new ValidationError('Cannot create order on a closed session');
  }

  return db.$transaction(async (tx) => {
    // Auto-generate order number
    const lastOrder = await tx.pOSOrder.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const lastNum = lastOrder
      ? parseInt(lastOrder.orderNumber.replace(/^POS-/, ''), 10)
      : 0;
    const orderNumber = `POS-${String(lastNum + 1).padStart(3, '0')}`;

    // Compute line totals
    const computedLines = data.lines.map((line) => {
      const lineTotal =
        Number(line.quantity) * Number(line.unitPrice) - Number(line.discount);
      return { ...line, lineTotal };
    });

    const subtotal = computedLines.reduce((sum, l) => sum + l.lineTotal, 0);
    const taxAmount = computedLines.reduce(
      (sum, l) => sum + l.lineTotal * (Number(l.taxRate) / 100),
      0,
    );
    const total = subtotal + taxAmount;

    return tx.pOSOrder.create({
      data: {
        id: generateId(),
        tenantId,
        sessionId: data.sessionId,
        orderNumber,
        currency: (data.currency ?? 'USD') as never,
        customerId: data.customerId,
        notes: data.notes,
        subtotal,
        taxAmount,
        total,
        createdBy,
        lines: {
          create: computedLines.map((line) => ({
            id: generateId(),
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            taxRate: line.taxRate,
            lineTotal: line.lineTotal,
            modifiers: (line.modifiers ?? []) as never,
          })),
        },
      },
      include: orderDetailInclude,
    });
  });
}

export async function addLineToOrder(
  tenantId: string,
  orderId: string,
  line: OrderLineInput,
) {
  const db = getPrismaClient();

  const order = await db.pOSOrder.findFirst({ where: { id: orderId, tenantId } });
  if (!order) throw new NotFoundError('POSOrder', orderId);
  if (order.status !== 'OPEN') {
    throw new ValidationError('Cannot modify a non-open order');
  }

  const lineTotal =
    Number(line.quantity) * Number(line.unitPrice) - Number(line.discount);
  const taxAmount = lineTotal * (Number(line.taxRate) / 100);

  return db.$transaction(async (tx) => {
    await tx.pOSOrderLine.create({
      data: {
        id: generateId(),
        orderId,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxRate: line.taxRate,
        lineTotal,
        modifiers: (line.modifiers ?? []) as never,
      },
    });

    await recomputeOrderTotals(tx as never, orderId);

    return tx.pOSOrder.findFirstOrThrow({
      where: { id: orderId },
      include: orderDetailInclude,
    });
  });
}

export async function removeLineFromOrder(
  tenantId: string,
  orderId: string,
  lineId: string,
) {
  const db = getPrismaClient();

  const order = await db.pOSOrder.findFirst({ where: { id: orderId, tenantId } });
  if (!order) throw new NotFoundError('POSOrder', orderId);
  if (order.status !== 'OPEN') {
    throw new ValidationError('Cannot modify a non-open order');
  }

  return db.$transaction(async (tx) => {
    const line = await tx.pOSOrderLine.findFirst({ where: { id: lineId, orderId } });
    if (!line) throw new NotFoundError('POSOrderLine', lineId);

    await tx.pOSOrderLine.delete({ where: { id: lineId } });
    await recomputeOrderTotals(tx as never, orderId);

    return tx.pOSOrder.findFirstOrThrow({
      where: { id: orderId },
      include: orderDetailInclude,
    });
  });
}

export async function applyOrderDiscount(
  tenantId: string,
  orderId: string,
  discountAmount: number,
) {
  const db = getPrismaClient();

  const order = await db.pOSOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { lines: true },
  });
  if (!order) throw new NotFoundError('POSOrder', orderId);
  if (order.status !== 'OPEN') {
    throw new ValidationError('Cannot discount a non-open order');
  }

  const subtotal = order.lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  const taxAmount = order.lines.reduce(
    (sum, l) => sum + Number(l.lineTotal) * (Number(l.taxRate) / 100),
    0,
  );
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  return db.pOSOrder.update({
    where: { id: orderId },
    data: { discountAmount, total },
    include: orderDetailInclude,
  });
}

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  status: string,
  extra?: { completedAt?: Date; loyaltyPointsEarned?: number; version?: number },
) {
  const db = getPrismaClient();

  const existing = await db.pOSOrder.findFirst({ where: { id: orderId, tenantId } });
  if (!existing) throw new NotFoundError('POSOrder', orderId);

  if (extra?.version !== undefined) {
    const result = await db.pOSOrder.updateMany({
      where: { id: orderId, tenantId, version: extra.version },
      data: {
        status: status as never,
        ...(extra.completedAt ? { completedAt: extra.completedAt } : {}),
        ...(extra.loyaltyPointsEarned !== undefined
          ? { loyaltyPointsEarned: extra.loyaltyPointsEarned }
          : {}),
        version: { increment: 1 },
      } as never,
    });
    if (result.count === 0) {
      throw new ConflictError('POSOrder was modified by another process');
    }
    return db.pOSOrder.findFirstOrThrow({
      where: { id: orderId },
      include: orderDetailInclude,
    });
  }

  return db.pOSOrder.update({
    where: { id: orderId },
    data: {
      status: status as never,
      ...(extra?.completedAt ? { completedAt: extra.completedAt } : {}),
      ...(extra?.loyaltyPointsEarned !== undefined
        ? { loyaltyPointsEarned: extra.loyaltyPointsEarned }
        : {}),
    },
    include: orderDetailInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Payments ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPayment(
  orderId: string,
  data: {
    method: string;
    amount: number;
    reference?: string;
  },
) {
  const db = getPrismaClient();
  return db.pOSPayment.create({
    data: {
      id: generateId(),
      orderId,
      method: data.method as never,
      amount: data.amount,
      reference: data.reference,
      processedAt: new Date(),
      status: 'COMPLETED',
    },
  });
}

export async function markPaymentRefunded(paymentId: string) {
  const db = getPrismaClient();
  return db.pOSPayment.update({
    where: { id: paymentId },
    data: { status: 'REFUNDED' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Kitchen Orders ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findKitchenOrders(
  tenantId: string,
  filters: KitchenOrderFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status;
  if (filters.tableId) where['tableId'] = filters.tableId;
  if (filters.startDate || filters.endDate) {
    const df: Record<string, unknown> = {};
    if (filters.startDate) df['gte'] = new Date(filters.startDate);
    if (filters.endDate) df['lte'] = new Date(filters.endDate);
    where['createdAt'] = df;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);
  const [data, total] = await db.$transaction([
    db.kitchenOrder.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'asc' },
      include: kitchenOrderDetailInclude,
    }),
    db.kitchenOrder.count({ where }),
  ]);
  return { data, total };
}

export async function findKitchenOrder(tenantId: string, id: string) {
  const db = getPrismaClient();
  const ko = await db.kitchenOrder.findFirst({
    where: { id, tenantId },
    include: kitchenOrderDetailInclude,
  });
  if (!ko) throw new NotFoundError('KitchenOrder', id);
  return ko;
}

export async function createKitchenOrder(
  tenantId: string,
  orderId: string,
  tableId?: string,
) {
  const db = getPrismaClient();

  // Load the order with its lines
  const order = await db.pOSOrder.findFirst({
    where: { id: orderId, tenantId },
    include: { lines: true },
  });
  if (!order) throw new NotFoundError('POSOrder', orderId);

  return db.$transaction(async (tx) => {
    // Auto-generate ticket number
    const lastTicket = await tx.kitchenOrder.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true },
    });
    const lastNum = lastTicket
      ? parseInt(lastTicket.ticketNumber.replace(/^K-/, ''), 10)
      : 0;
    const ticketNumber = `K-${String(lastNum + 1).padStart(3, '0')}`;

    const koId = generateId();
    const ko = await tx.kitchenOrder.create({
      data: {
        id: koId,
        tenantId,
        orderId,
        tableId: tableId ?? null,
        ticketNumber,
        status: 'PENDING',
        items: {
          create: order.lines.map((line) => ({
            id: generateId(),
            orderLineId: line.id,
            productName: line.description,
            quantity: line.quantity,
            course: null,
            modifiers: line.modifiers as never,
            status: 'PENDING',
          })),
        },
      },
      include: kitchenOrderDetailInclude,
    });

    return ko;
  });
}

export async function updateKitchenOrderStatus(
  tenantId: string,
  kitchenOrderId: string,
  status: string,
) {
  const db = getPrismaClient();

  const ko = await db.kitchenOrder.findFirst({
    where: { id: kitchenOrderId, tenantId },
  });
  if (!ko) throw new NotFoundError('KitchenOrder', kitchenOrderId);

  const extra: Record<string, unknown> = {};
  if (status === 'READY') extra['readyAt'] = new Date();
  if (status === 'SERVED') extra['servedAt'] = new Date();

  return db.kitchenOrder.update({
    where: { id: kitchenOrderId },
    data: { status: status as never, ...extra },
    include: kitchenOrderDetailInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Restaurant Tables ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findTables(
  tenantId: string,
  filters: RestaurantTableFilters,
  pagination: Pagination,
) {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };
  if (filters.status) where['status'] = filters.status;
  if (filters.section) where['section'] = filters.section;

  const { skip, take, orderBy } = paginationArgs(pagination);
  const [data, total] = await db.$transaction([
    db.restaurantTable.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { tableNumber: 'asc' },
    }),
    db.restaurantTable.count({ where }),
  ]);
  return { data, total };
}

export async function findTable(tenantId: string, id: string) {
  const db = getPrismaClient();
  const table = await db.restaurantTable.findFirst({ where: { id, tenantId } });
  if (!table) throw new NotFoundError('RestaurantTable', id);
  return table;
}

export async function createTable(tenantId: string, data: CreateTableInput) {
  const db = getPrismaClient();
  return db.restaurantTable.create({
    data: {
      id: generateId(),
      tenantId,
      tableNumber: data.tableNumber,
      section: data.section,
      capacity: data.capacity,
      status: (data.status ?? 'AVAILABLE') as never,
    },
  });
}

export async function updateTableStatus(
  tenantId: string,
  tableId: string,
  status: string,
  currentOrderId?: string | null,
) {
  const db = getPrismaClient();
  const table = await db.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
  if (!table) throw new NotFoundError('RestaurantTable', tableId);

  return db.restaurantTable.update({
    where: { id: tableId },
    data: {
      status: status as never,
      ...(currentOrderId !== undefined ? { currentOrderId } : {}),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Loyalty Program ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findLoyaltyProgram(tenantId: string) {
  const db = getPrismaClient();
  return db.loyaltyProgram.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function upsertLoyaltyProgram(
  tenantId: string,
  data: CreateLoyaltyProgramInput | UpdateLoyaltyProgramInput,
) {
  const db = getPrismaClient();
  const existing = await db.loyaltyProgram.findFirst({ where: { tenantId } });

  if (existing) {
    return db.loyaltyProgram.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.pointsPerCurrency !== undefined
          ? { pointsPerCurrency: data.pointsPerCurrency }
          : {}),
        ...(data.pointsRedemptionRate !== undefined
          ? { pointsRedemptionRate: data.pointsRedemptionRate }
          : {}),
        ...(data.minRedemption !== undefined
          ? { minRedemption: data.minRedemption }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  const full = data as CreateLoyaltyProgramInput;
  return db.loyaltyProgram.create({
    data: {
      id: generateId(),
      tenantId,
      name: full.name,
      pointsPerCurrency: full.pointsPerCurrency,
      pointsRedemptionRate: full.pointsRedemptionRate,
      minRedemption: full.minRedemption,
      isActive: full.isActive ?? true,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Customer Loyalty ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findCustomerLoyalty(tenantId: string, customerId: string) {
  const db = getPrismaClient();
  return db.customerLoyalty.findFirst({ where: { tenantId, customerId } });
}

export async function earnPoints(
  tenantId: string,
  customerId: string,
  points: number,
) {
  const db = getPrismaClient();
  const existing = await db.customerLoyalty.findFirst({
    where: { tenantId, customerId },
  });

  if (existing) {
    return db.customerLoyalty.update({
      where: { id: existing.id },
      data: {
        points: { increment: points },
        lifetimePoints: { increment: points },
      },
    });
  }

  return db.customerLoyalty.create({
    data: {
      id: generateId(),
      tenantId,
      customerId,
      points,
      lifetimePoints: points,
    },
  });
}

export async function redeemPoints(
  tenantId: string,
  customerId: string,
  points: number,
) {
  const db = getPrismaClient();
  const loyalty = await db.customerLoyalty.findFirst({
    where: { tenantId, customerId },
  });

  if (!loyalty) throw new NotFoundError('CustomerLoyalty', customerId);
  if (loyalty.points < points) {
    throw new ValidationError(
      `Insufficient loyalty points: has ${loyalty.points}, requested ${points}`,
    );
  }

  return db.customerLoyalty.update({
    where: { id: loyalty.id },
    data: { points: { decrement: points } },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Session Summary ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSessionSummaryData(tenantId: string, sessionId: string) {
  const db = getPrismaClient();

  const session = await db.pOSSession.findFirst({ where: { id: sessionId, tenantId } });
  if (!session) throw new NotFoundError('POSSession', sessionId);

  const orders = await db.pOSOrder.findMany({
    where: { tenantId, sessionId },
    include: { payments: true },
  });

  return { session, orders };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Internal helpers ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

async function recomputeOrderTotals(
  tx: ReturnType<typeof getPrismaClient>,
  orderId: string,
) {
  const lines = await tx.pOSOrderLine.findMany({ where: { orderId } });
  const order = await tx.pOSOrder.findFirstOrThrow({ where: { id: orderId } });

  const subtotal = lines.reduce((sum, l) => sum + Number(l.lineTotal), 0);
  const taxAmount = lines.reduce(
    (sum, l) => sum + Number(l.lineTotal) * (Number(l.taxRate) / 100),
    0,
  );
  const total = Math.max(0, subtotal + taxAmount - Number(order.discountAmount));

  await tx.pOSOrder.update({
    where: { id: orderId },
    data: { subtotal, taxAmount, total },
  });
}
