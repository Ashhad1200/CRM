/**
 * POS module — service unit tests.
 *
 * Covers:
 *   - openSession: happy path, terminal not found, already open
 *   - processPayment: emits ORDER_COMPLETED, triggers inventory event,
 *                     rejects mismatched amounts, rejects non-OPEN orders
 *   - closeSession: calculates variance correctly
 *   - loyaltyPoints: earn (with active program) and redeem (with validation)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must precede module imports) ───────────────────────────────────────

// repository mocks
const mockCreateSession = vi.fn();
const mockFindSession = vi.fn();
const mockCloseSession = vi.fn();
const mockGetSessionSummaryData = vi.fn();
const mockFindOrder = vi.fn();
const mockCreatePayment = vi.fn();
const mockMarkPaymentRefunded = vi.fn();
const mockUpdateOrderStatus = vi.fn();
const mockFindLoyaltyProgram = vi.fn();
const mockFindCustomerLoyalty = vi.fn();
const mockEarnPoints = vi.fn();
const mockRedeemPoints = vi.fn();

vi.mock('../repository.js', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  findSession: (...args: unknown[]) => mockFindSession(...args),
  closeSession: (...args: unknown[]) => mockCloseSession(...args),
  getSessionSummaryData: (...args: unknown[]) => mockGetSessionSummaryData(...args),
  findOrder: (...args: unknown[]) => mockFindOrder(...args),
  createPayment: (...args: unknown[]) => mockCreatePayment(...args),
  markPaymentRefunded: (...args: unknown[]) => mockMarkPaymentRefunded(...args),
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
  findLoyaltyProgram: (...args: unknown[]) => mockFindLoyaltyProgram(...args),
  findCustomerLoyalty: (...args: unknown[]) => mockFindCustomerLoyalty(...args),
  earnPoints: (...args: unknown[]) => mockEarnPoints(...args),
  redeemPoints: (...args: unknown[]) => mockRedeemPoints(...args),
  findTerminals: vi.fn(),
  createTerminal: vi.fn(),
  findTerminal: vi.fn(),
  findOrders: vi.fn(),
  createOrder: vi.fn(),
  addLineToOrder: vi.fn(),
  removeLineFromOrder: vi.fn(),
  applyOrderDiscount: vi.fn(),
  findKitchenOrders: vi.fn(),
  createKitchenOrder: vi.fn(),
  updateKitchenOrderStatus: vi.fn(),
  findTables: vi.fn(),
  findTable: vi.fn(),
  createTable: vi.fn(),
  updateTableStatus: vi.fn(),
  upsertLoyaltyProgram: vi.fn(),
}));

// events mocks
const mockPublishSessionOpened = vi.fn();
const mockPublishSessionClosed = vi.fn();
const mockPublishOrderCompleted = vi.fn();
const mockPublishOrderRefunded = vi.fn();
const mockPublishKitchenOrderReady = vi.fn();

vi.mock('../events.js', () => ({
  POS_EVENTS: {
    ORDER_COMPLETED: 'pos.order.completed',
    ORDER_REFUNDED: 'pos.order.refunded',
    SESSION_OPENED: 'pos.session.opened',
    SESSION_CLOSED: 'pos.session.closed',
    KITCHEN_ORDER_READY: 'pos.kitchen_order.ready',
  },
  publishSessionOpened: (...args: unknown[]) => mockPublishSessionOpened(...args),
  publishSessionClosed: (...args: unknown[]) => mockPublishSessionClosed(...args),
  publishOrderCompleted: (...args: unknown[]) => mockPublishOrderCompleted(...args),
  publishOrderRefunded: (...args: unknown[]) => mockPublishOrderRefunded(...args),
  publishKitchenOrderReady: (...args: unknown[]) => mockPublishKitchenOrderReady(...args),
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}));

// ── Import under test (after mocks) ───────────────────────────────────────────

import {
  sessionService,
  orderService,
  loyaltyService,
} from '../service.js';

import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-abc';
const ACTOR_ID = 'user-abc';
const ORDER_ID = 'order-uuid-1';
const SESSION_ID = 'session-uuid-1';
const TERMINAL_ID = 'terminal-uuid-1';
const CUSTOMER_ID = 'customer-uuid-1';

const sampleSession = {
  id: SESSION_ID,
  tenantId: TENANT_ID,
  terminalId: TERMINAL_ID,
  cashierId: ACTOR_ID,
  openedAt: new Date('2026-02-28T08:00:00Z'),
  closedAt: null,
  openingCash: '200.00',
  closingCash: null,
  expectedCash: null,
  variance: null,
  status: 'OPEN',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleOrderLine = {
  id: 'line-uuid-1',
  orderId: ORDER_ID,
  productId: 'product-uuid-1',
  description: 'Burger',
  quantity: '2',
  unitPrice: '12.50',
  discount: '0',
  taxRate: '10',
  lineTotal: '25.00',
  modifiers: [],
};

const sampleOrder = {
  id: ORDER_ID,
  tenantId: TENANT_ID,
  sessionId: SESSION_ID,
  orderNumber: 'POS-001',
  status: 'OPEN',
  subtotal: '25.00',
  taxAmount: '2.50',
  discountAmount: '0.00',
  total: '27.50',
  currency: 'USD',
  customerId: CUSTOMER_ID,
  loyaltyPointsEarned: 0,
  notes: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: ACTOR_ID,
  version: 1,
  lines: [sampleOrderLine],
  payments: [],
};

const sampleLoyaltyProgram = {
  id: 'program-uuid-1',
  tenantId: TENANT_ID,
  name: 'Default',
  pointsPerCurrency: '1',     // 1 point per $1
  pointsRedemptionRate: '0.01', // 1 cent per point
  minRedemption: 100,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── beforeEach reset ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPublishSessionOpened.mockResolvedValue(undefined);
  mockPublishSessionClosed.mockResolvedValue(undefined);
  mockPublishOrderCompleted.mockResolvedValue(undefined);
  mockPublishOrderRefunded.mockResolvedValue(undefined);
  mockPublishKitchenOrderReady.mockResolvedValue(undefined);
  mockCreatePayment.mockResolvedValue({ id: 'payment-uuid-1', status: 'COMPLETED' });
  mockEarnPoints.mockResolvedValue(undefined);
  mockRedeemPoints.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── openSession ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('sessionService.openSession', () => {
  it('creates a session and publishes SESSION_OPENED event', async () => {
    mockCreateSession.mockResolvedValue(sampleSession);

    const result = await sessionService.openSession(
      TENANT_ID,
      {
        terminalId: TERMINAL_ID,
        cashierId: ACTOR_ID,
        openingCash: 200,
      },
      ACTOR_ID,
    );

    expect(mockCreateSession).toHaveBeenCalledWith(TENANT_ID, {
      terminalId: TERMINAL_ID,
      cashierId: ACTOR_ID,
      openingCash: 200,
    });

    expect(mockPublishSessionOpened).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        id: SESSION_ID,
        terminalId: TERMINAL_ID,
        cashierId: ACTOR_ID,
      }),
    );

    expect(result.id).toBe(SESSION_ID);
  });

  it('propagates repository errors (e.g. terminal already in session)', async () => {
    mockCreateSession.mockRejectedValue(
      new Error('Terminal already has an open session'),
    );

    await expect(
      sessionService.openSession(
        TENANT_ID,
        { terminalId: TERMINAL_ID, cashierId: ACTOR_ID, openingCash: 200 },
        ACTOR_ID,
      ),
    ).rejects.toThrow('Terminal already has an open session');

    expect(mockPublishSessionOpened).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── processPayment ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('orderService.processPayment', () => {
  const paidOrder = {
    ...sampleOrder,
    status: 'PAID',
    completedAt: new Date(),
    loyaltyPointsEarned: 27,
  };

  beforeEach(() => {
    mockFindLoyaltyProgram.mockResolvedValue(sampleLoyaltyProgram);
    mockUpdateOrderStatus.mockResolvedValue(paidOrder);
  });

  it('creates payment, marks order PAID, emits ORDER_COMPLETED', async () => {
    mockFindOrder.mockResolvedValue(sampleOrder);

    const result = await orderService.processPayment(
      TENANT_ID,
      ORDER_ID,
      { method: 'CASH', amount: 27.50 },
      ACTOR_ID,
    );

    expect(mockCreatePayment).toHaveBeenCalledWith(
      ORDER_ID,
      expect.objectContaining({ method: 'CASH', amount: 27.50 }),
    );

    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      ORDER_ID,
      'PAID',
      expect.objectContaining({ completedAt: expect.any(Date), version: 1 }),
    );

    expect(mockPublishOrderCompleted).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        id: ORDER_ID,
        orderNumber: 'POS-001',
        total: expect.anything(),
      }),
    );

    expect(result.status).toBe('PAID');
  });

  it('throws ValidationError when payment amount does not match order total', async () => {
    mockFindOrder.mockResolvedValue(sampleOrder); // total = 27.50

    await expect(
      orderService.processPayment(
        TENANT_ID,
        ORDER_ID,
        { method: 'CASH', amount: 20.00 }, // wrong amount
        ACTOR_ID,
      ),
    ).rejects.toThrow(ValidationError);

    expect(mockCreatePayment).not.toHaveBeenCalled();
    expect(mockPublishOrderCompleted).not.toHaveBeenCalled();
  });

  it('throws ValidationError when order is not OPEN', async () => {
    mockFindOrder.mockResolvedValue({ ...sampleOrder, status: 'PAID' });

    await expect(
      orderService.processPayment(
        TENANT_ID,
        ORDER_ID,
        { method: 'CARD', amount: 27.50 },
        ACTOR_ID,
      ),
    ).rejects.toThrow(ValidationError);

    expect(mockPublishOrderCompleted).not.toHaveBeenCalled();
  });

  it('publishes ORDER_COMPLETED which triggers inventory deduction event', async () => {
    mockFindOrder.mockResolvedValue(sampleOrder);

    await orderService.processPayment(
      TENANT_ID,
      ORDER_ID,
      { method: 'CASH', amount: 27.50 },
      ACTOR_ID,
    );

    // The ORDER_COMPLETED event is the trigger for the inventory listener
    expect(mockPublishOrderCompleted).toHaveBeenCalledOnce();
    const call = mockPublishOrderCompleted.mock.calls[0];
    // lines should be present so the listener can dispatch per-product events
    expect(call[2]).toMatchObject({
      lines: expect.arrayContaining([
        expect.objectContaining({ productId: 'product-uuid-1' }),
      ]),
    });
  });

  it('earns loyalty points when customerId is set', async () => {
    mockFindOrder.mockResolvedValue(sampleOrder); // customerId = CUSTOMER_ID

    await orderService.processPayment(
      TENANT_ID,
      ORDER_ID,
      { method: 'CASH', amount: 27.50 },
      ACTOR_ID,
    );

    expect(mockEarnPoints).toHaveBeenCalledWith(
      TENANT_ID,
      CUSTOMER_ID,
      expect.any(Number), // 27 points (floor of 27.50 * 1 point/currency)
    );
  });

  it('does not call earnPoints when customerId is null', async () => {
    mockFindOrder.mockResolvedValue({ ...sampleOrder, customerId: null });

    await orderService.processPayment(
      TENANT_ID,
      ORDER_ID,
      { method: 'CASH', amount: 27.50 },
      ACTOR_ID,
    );

    expect(mockEarnPoints).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── closeSession ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('sessionService.closeSession', () => {
  it('calculates expectedCash = openingCash + cash payments, computes variance', async () => {
    const orders = [
      {
        id: 'order-1',
        status: 'PAID',
        total: '50.00',
        payments: [
          { method: 'CASH', amount: '30.00', status: 'COMPLETED' },
          { method: 'CARD', amount: '20.00', status: 'COMPLETED' },
        ],
      },
      {
        id: 'order-2',
        status: 'PAID',
        total: '40.00',
        payments: [{ method: 'CASH', amount: '40.00', status: 'COMPLETED' }],
      },
      {
        id: 'order-3',
        status: 'VOID',
        total: '10.00',
        payments: [],
      },
    ];

    mockGetSessionSummaryData.mockResolvedValue({
      session: sampleSession,
      orders,
    });

    const closedSession = {
      ...sampleSession,
      status: 'CLOSED',
      closedAt: new Date(),
      closingCash: '280.00',   // operator counted 280
      expectedCash: '270.00',  // 200 + 70 (30 + 40) cash payments
      variance: '10.00',       // 280 - 270
    };
    mockCloseSession.mockResolvedValue(closedSession);
    mockPublishSessionClosed.mockResolvedValue(undefined);

    const result = await sessionService.closeSession(
      TENANT_ID,
      SESSION_ID,
      { closingCash: 280 },
      ACTOR_ID,
    );

    // Expected cash = openingCash (200) + CASH payments from PAID orders (30 + 40 = 70) = 270
    expect(mockCloseSession).toHaveBeenCalledWith(
      TENANT_ID,
      SESSION_ID,
      280,       // closingCash
      270,       // expectedCash = 200 + 70
    );

    expect(mockPublishSessionClosed).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: SESSION_ID }),
    );

    expect(result.status).toBe('CLOSED');
    expect(result.closingCash).toBe('280.00');
    expect(result.expectedCash).toBe('270.00');
    expect(result.variance).toBe('10.00');
  });

  it('excludes REFUNDED orders from cash total', async () => {
    const orders = [
      {
        id: 'order-1',
        status: 'REFUNDED',
        total: '50.00',
        payments: [{ method: 'CASH', amount: '50.00', status: 'REFUNDED' }],
      },
    ];

    mockGetSessionSummaryData.mockResolvedValue({
      session: sampleSession,
      orders,
    });

    const closedSession = {
      ...sampleSession,
      status: 'CLOSED',
      closingCash: '200.00',
      expectedCash: '200.00',
      variance: '0.00',
    };
    mockCloseSession.mockResolvedValue(closedSession);

    await sessionService.closeSession(
      TENANT_ID,
      SESSION_ID,
      { closingCash: 200 },
      ACTOR_ID,
    );

    // REFUNDED order: status !== PAID so its payments are excluded
    // Expected = openingCash (200) + 0 cash = 200
    expect(mockCloseSession).toHaveBeenCalledWith(TENANT_ID, SESSION_ID, 200, 200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── loyaltyService.earnLoyaltyPoints ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('loyaltyService.earnLoyaltyPoints', () => {
  it('calculates points based on pointsPerCurrency and calls earnPoints', async () => {
    mockFindLoyaltyProgram.mockResolvedValue(sampleLoyaltyProgram);

    const pointsEarned = await loyaltyService.earnLoyaltyPoints(
      TENANT_ID,
      CUSTOMER_ID,
      100,
    );

    // 100 * 1 point/$ = 100 points
    expect(pointsEarned).toBe(100);
    expect(mockEarnPoints).toHaveBeenCalledWith(TENANT_ID, CUSTOMER_ID, 100);
  });

  it('returns 0 and does not call earnPoints when no active program', async () => {
    mockFindLoyaltyProgram.mockResolvedValue(null);

    const pointsEarned = await loyaltyService.earnLoyaltyPoints(
      TENANT_ID,
      CUSTOMER_ID,
      100,
    );

    expect(pointsEarned).toBe(0);
    expect(mockEarnPoints).not.toHaveBeenCalled();
  });

  it('floors fractional points', async () => {
    mockFindLoyaltyProgram.mockResolvedValue({
      ...sampleLoyaltyProgram,
      pointsPerCurrency: '0.5', // 0.5 points per $1
    });

    const pointsEarned = await loyaltyService.earnLoyaltyPoints(
      TENANT_ID,
      CUSTOMER_ID,
      27.50,
    );

    // 27.50 * 0.5 = 13.75 → floor = 13
    expect(pointsEarned).toBe(13);
    expect(mockEarnPoints).toHaveBeenCalledWith(TENANT_ID, CUSTOMER_ID, 13);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── loyaltyService.redeemLoyaltyPoints ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('loyaltyService.redeemLoyaltyPoints', () => {
  it('returns discount amount and calls redeemPoints', async () => {
    mockFindLoyaltyProgram.mockResolvedValue(sampleLoyaltyProgram);

    const discount = await loyaltyService.redeemLoyaltyPoints(
      TENANT_ID,
      CUSTOMER_ID,
      200,
    );

    // 200 points * 0.01 rate = $2.00
    expect(discount).toBe(2.00);
    expect(mockRedeemPoints).toHaveBeenCalledWith(TENANT_ID, CUSTOMER_ID, 200);
  });

  it('throws ValidationError when below minimum redemption', async () => {
    mockFindLoyaltyProgram.mockResolvedValue(sampleLoyaltyProgram); // minRedemption = 100

    await expect(
      loyaltyService.redeemLoyaltyPoints(TENANT_ID, CUSTOMER_ID, 50),
    ).rejects.toThrow(ValidationError);
    await expect(
      loyaltyService.redeemLoyaltyPoints(TENANT_ID, CUSTOMER_ID, 50),
    ).rejects.toThrow(/minimum/i);

    expect(mockRedeemPoints).not.toHaveBeenCalled();
  });

  it('throws ValidationError when no active loyalty program', async () => {
    mockFindLoyaltyProgram.mockResolvedValue(null);

    await expect(
      loyaltyService.redeemLoyaltyPoints(TENANT_ID, CUSTOMER_ID, 200),
    ).rejects.toThrow(ValidationError);
  });

  it('propagates repository error when insufficient points', async () => {
    mockFindLoyaltyProgram.mockResolvedValue(sampleLoyaltyProgram);
    mockRedeemPoints.mockRejectedValue(
      new ValidationError('Insufficient loyalty points: has 50, requested 200'),
    );

    await expect(
      loyaltyService.redeemLoyaltyPoints(TENANT_ID, CUSTOMER_ID, 200),
    ).rejects.toThrow(ValidationError);
    await expect(
      loyaltyService.redeemLoyaltyPoints(TENANT_ID, CUSTOMER_ID, 200),
    ).rejects.toThrow(/Insufficient/);
  });
});
