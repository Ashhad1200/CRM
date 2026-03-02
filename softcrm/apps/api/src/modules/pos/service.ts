/**
 * POS module — orchestration service.
 *
 * All business logic lives here. The service delegates persistence to the
 * repository and side-effects (event publishing) to events.ts.
 *
 * Exposed service objects follow the same pattern as the accounting module:
 * terminal, session, order, kitchen, table, loyalty.
 */

import { ValidationError } from '@softcrm/shared-kernel';

import * as repo from './repository.js';
import * as posEvents from './events.js';
import type {
  SessionSummary,
  PaymentMethodBreakdown,
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
  ProcessPaymentInput,
  CreateTableInput,
  CreateLoyaltyProgramInput,
  UpdateLoyaltyProgramInput,
  Pagination,
} from './validators.js';

// Re-export pagination type so routes can import from service
export type { Pagination };

// ── Terminals ─────────────────────────────────────────────────────────────────

export const terminalService = {
  async getTerminals(
    tenantId: string,
    filters: POSTerminalFilters,
    pagination: repo.Pagination,
  ) {
    const { data, total } = await repo.findTerminals(tenantId, filters, pagination);
    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
      },
    };
  },

  async createTerminal(tenantId: string, data: CreateTerminalInput) {
    return repo.createTerminal(tenantId, data);
  },

  async getTerminal(tenantId: string, id: string) {
    return repo.findTerminal(tenantId, id);
  },
};

// ── Sessions ──────────────────────────────────────────────────────────────────

export const sessionService = {
  /**
   * Open a new cashier session on a terminal.
   * Verifies the terminal is not already in an open session.
   */
  async openSession(
    tenantId: string,
    data: OpenSessionInput,
    actorId: string,
  ) {
    const session = await repo.createSession(tenantId, data);

    await posEvents.publishSessionOpened(tenantId, actorId, {
      id: session.id,
      terminalId: session.terminalId,
      cashierId: session.cashierId,
      openedAt: session.openedAt,
    });

    return session;
  },

  /**
   * Close an open session. Calculates expected cash from completed cash
   * payments, then computes variance against actual closing cash.
   */
  async closeSession(
    tenantId: string,
    sessionId: string,
    data: { closingCash: number },
    actorId: string,
  ) {
    // Calculate expected cash: opening cash + all CASH payments on PAID orders
    const { session, orders } = await repo.getSessionSummaryData(tenantId, sessionId);

    const openingCash = Number(session.openingCash);
    const cashPaymentsTotal = orders
      .filter((o) => o.status === 'PAID')
      .flatMap((o) => o.payments)
      .filter((p) => p.method === 'CASH' && p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const expectedCash = openingCash + cashPaymentsTotal;

    const closed = await repo.closeSession(
      tenantId,
      sessionId,
      data.closingCash,
      expectedCash,
    );

    await posEvents.publishSessionClosed(tenantId, actorId, {
      id: closed.id,
      terminalId: closed.terminalId,
      closedAt: closed.closedAt,
      variance: closed.variance,
    });

    return closed;
  },

  /**
   * Get a detailed summary of a session: total sales, payment breakdown,
   * order counts, cash variance.
   */
  async getSessionSummary(
    tenantId: string,
    sessionId: string,
  ): Promise<SessionSummary> {
    const { session, orders } = await repo.getSessionSummaryData(tenantId, sessionId);

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const refundedOrders = orders.filter((o) => o.status === 'REFUNDED');

    const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

    // Aggregate payments by method
    const methodMap = new Map<string, { total: number; count: number }>();
    for (const order of paidOrders) {
      for (const payment of order.payments) {
        if (payment.status !== 'COMPLETED') continue;
        const existing = methodMap.get(payment.method) ?? { total: 0, count: 0 };
        methodMap.set(payment.method, {
          total: existing.total + Number(payment.amount),
          count: existing.count + 1,
        });
      }
    }
    const paymentsByMethod: PaymentMethodBreakdown[] = Array.from(
      methodMap.entries(),
    ).map(([method, agg]) => ({ method, total: agg.total, count: agg.count }));

    return {
      sessionId: session.id,
      terminalId: session.terminalId,
      cashierId: session.cashierId,
      openedAt: session.openedAt,
      closedAt: session.closedAt ?? null,
      openingCash: Number(session.openingCash),
      closingCash: session.closingCash != null ? Number(session.closingCash) : null,
      expectedCash: session.expectedCash != null ? Number(session.expectedCash) : null,
      variance: session.variance != null ? Number(session.variance) : null,
      totalSales: Math.round(totalSales * 100) / 100,
      ordersCount: orders.length,
      paidOrdersCount: paidOrders.length,
      refundedOrdersCount: refundedOrders.length,
      paymentsByMethod,
    };
  },
};

// ── Orders ────────────────────────────────────────────────────────────────────

export const orderService = {
  async getOrders(
    tenantId: string,
    filters: POSOrderFilters,
    pagination: repo.Pagination,
  ) {
    const { data, total } = await repo.findOrders(tenantId, filters, pagination);
    return {
      data,
      meta: { total, page: pagination.page, limit: pagination.limit },
    };
  },

  async getOrder(tenantId: string, id: string) {
    return repo.findOrder(tenantId, id);
  },

  async createOrder(
    tenantId: string,
    data: CreateOrderInput,
    createdBy: string,
  ) {
    return repo.createOrder(tenantId, data, createdBy);
  },

  async addLineToOrder(
    tenantId: string,
    orderId: string,
    line: OrderLineInput,
  ) {
    return repo.addLineToOrder(tenantId, orderId, line);
  },

  async removeLineFromOrder(
    tenantId: string,
    orderId: string,
    lineId: string,
  ) {
    return repo.removeLineFromOrder(tenantId, orderId, lineId);
  },

  async applyDiscount(
    tenantId: string,
    orderId: string,
    discountAmount: number,
  ) {
    return repo.applyOrderDiscount(tenantId, orderId, discountAmount);
  },

  /**
   * Process a payment for an order.
   *
   * Validates that the payment amount covers the outstanding total.
   * On success:
   *   - Marks the order as PAID
   *   - Emits ORDER_COMPLETED (inventory + accounting listeners react)
   *   - Earns loyalty points if customerId is set
   */
  async processPayment(
    tenantId: string,
    orderId: string,
    data: ProcessPaymentInput,
    actorId: string,
  ) {
    const order = await repo.findOrder(tenantId, orderId);

    if (order.status !== 'OPEN') {
      throw new ValidationError('Only OPEN orders can be paid');
    }

    // Validate that payment amount equals the order total
    const orderTotal = Number(order.total);
    if (Math.abs(data.amount - orderTotal) > 0.01) {
      throw new ValidationError(
        `Payment amount ${data.amount} does not match order total ${orderTotal}`,
      );
    }

    // Persist the payment record
    await repo.createPayment(orderId, {
      method: data.method,
      amount: data.amount,
      reference: data.reference,
    });

    // Earn loyalty points before marking PAID (so points are computed)
    let loyaltyPointsEarned = 0;
    if (order.customerId) {
      loyaltyPointsEarned = await loyaltyService.earnLoyaltyPoints(
        tenantId,
        order.customerId,
        orderTotal,
      );
    }

    // Mark order as PAID with optimistic lock
    const paidOrder = await repo.updateOrderStatus(tenantId, orderId, 'PAID', {
      completedAt: new Date(),
      loyaltyPointsEarned,
      version: order.version,
    });

    // Emit ORDER_COMPLETED for downstream listeners (inventory, accounting)
    await posEvents.publishOrderCompleted(tenantId, actorId, {
      id: paidOrder.id,
      orderNumber: paidOrder.orderNumber,
      sessionId: paidOrder.sessionId,
      total: paidOrder.total,
      currency: paidOrder.currency,
      customerId: paidOrder.customerId ?? null,
      lines: paidOrder.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    });

    return paidOrder;
  },

  /**
   * Refund an order. The order must be in PAID status.
   * Emits ORDER_REFUNDED and marks any COMPLETED payments as REFUNDED.
   */
  async refundOrder(
    tenantId: string,
    orderId: string,
    reason: string,
    actorId: string,
  ) {
    const order = await repo.findOrder(tenantId, orderId);

    if (order.status !== 'PAID') {
      throw new ValidationError('Only PAID orders can be refunded');
    }

    // Mark all completed payments as refunded
    for (const payment of order.payments) {
      if (payment.status === 'COMPLETED') {
        await repo.markPaymentRefunded(payment.id);
      }
    }

    const refunded = await repo.updateOrderStatus(tenantId, orderId, 'REFUNDED');

    await posEvents.publishOrderRefunded(tenantId, actorId, {
      id: refunded.id,
      orderNumber: refunded.orderNumber,
      total: refunded.total,
      reason,
    });

    return refunded;
  },
};

// ── Kitchen ───────────────────────────────────────────────────────────────────

export const kitchenService = {
  async getKitchenOrders(
    tenantId: string,
    filters: KitchenOrderFilters,
    pagination: repo.Pagination,
  ) {
    const { data, total } = await repo.findKitchenOrders(
      tenantId,
      filters,
      pagination,
    );
    return {
      data,
      meta: { total, page: pagination.page, limit: pagination.limit },
    };
  },

  /**
   * Create a kitchen order for a POS order.
   * Splits the order lines into kitchen items (course-based splitting can be
   * added here when product metadata carries a course field).
   */
  async createKitchenOrder(
    tenantId: string,
    orderId: string,
    tableId?: string,
  ) {
    return repo.createKitchenOrder(tenantId, orderId, tableId);
  },

  /**
   * Update the status of a kitchen order.
   * When moving to READY, the KITCHEN_ORDER_READY event is published so
   * front-of-house staff can be notified.
   */
  async updateKitchenOrderStatus(
    tenantId: string,
    kitchenOrderId: string,
    status: string,
    actorId: string,
  ) {
    const ko = await repo.updateKitchenOrderStatus(tenantId, kitchenOrderId, status);

    if (status === 'READY') {
      await posEvents.publishKitchenOrderReady(tenantId, actorId, {
        id: ko.id,
        ticketNumber: ko.ticketNumber,
        orderId: ko.orderId,
        tableId: ko.tableId ?? null,
      });
    }

    return ko;
  },
};

// ── Tables ────────────────────────────────────────────────────────────────────

export const tableService = {
  async getTables(
    tenantId: string,
    filters: RestaurantTableFilters,
    pagination: repo.Pagination,
  ) {
    const { data, total } = await repo.findTables(tenantId, filters, pagination);
    return {
      data,
      meta: { total, page: pagination.page, limit: pagination.limit },
    };
  },

  async createTable(tenantId: string, data: CreateTableInput) {
    return repo.createTable(tenantId, data);
  },

  async updateTableStatus(
    tenantId: string,
    tableId: string,
    status: string,
    currentOrderId?: string | null,
  ) {
    return repo.updateTableStatus(tenantId, tableId, status, currentOrderId);
  },
};

// ── Loyalty ───────────────────────────────────────────────────────────────────

export const loyaltyService = {
  async getLoyaltyProgram(tenantId: string) {
    return repo.findLoyaltyProgram(tenantId);
  },

  async upsertLoyaltyProgram(
    tenantId: string,
    data: CreateLoyaltyProgramInput | UpdateLoyaltyProgramInput,
  ) {
    return repo.upsertLoyaltyProgram(tenantId, data);
  },

  async getCustomerLoyalty(tenantId: string, customerId: string) {
    return repo.findCustomerLoyalty(tenantId, customerId);
  },

  /**
   * Award points to a customer based on the order total.
   * Returns the number of points earned.
   */
  async earnLoyaltyPoints(
    tenantId: string,
    customerId: string,
    orderTotal: number,
  ): Promise<number> {
    const program = await repo.findLoyaltyProgram(tenantId);
    if (!program || !program.isActive) return 0;

    const pointsEarned = Math.floor(
      orderTotal * Number(program.pointsPerCurrency),
    );
    if (pointsEarned <= 0) return 0;

    await repo.earnPoints(tenantId, customerId, pointsEarned);
    return pointsEarned;
  },

  /**
   * Redeem loyalty points for a discount.
   * Returns the monetary discount amount.
   * Validates minimum redemption threshold and sufficient balance.
   */
  async redeemLoyaltyPoints(
    tenantId: string,
    customerId: string,
    points: number,
  ): Promise<number> {
    const program = await repo.findLoyaltyProgram(tenantId);
    if (!program || !program.isActive) {
      throw new ValidationError('No active loyalty program configured');
    }

    if (points < program.minRedemption) {
      throw new ValidationError(
        `Minimum redemption is ${program.minRedemption} points`,
      );
    }

    await repo.redeemPoints(tenantId, customerId, points);

    const discountAmount =
      Math.round(points * Number(program.pointsRedemptionRate) * 100) / 100;
    return discountAmount;
  },
};
