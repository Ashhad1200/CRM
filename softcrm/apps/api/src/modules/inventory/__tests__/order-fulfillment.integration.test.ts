import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be BEFORE module-under-test imports) ──────────────────────

// ── Repository mocks ───────────────────────────────────────────────────────────

const mockFindProductBySku = vi.fn();
const mockCreateProduct = vi.fn();
const mockFindProduct = vi.fn();
const mockFindProducts = vi.fn();
const mockUpdateProduct = vi.fn();
const mockFindOrCreateStockLevel = vi.fn();
const mockAdjustStockLevel = vi.fn();
const mockReserveStockLevel = vi.fn();
const mockReleaseStockLevel = vi.fn();
const mockCreateStockAdjustment = vi.fn();
const mockFindLowStockLevels = vi.fn();
const mockGetNextOrderNumber = vi.fn();
const mockCreateSalesOrder = vi.fn();
const mockFindSalesOrder = vi.fn();
const mockFindSalesOrders = vi.fn();
const mockUpdateSalesOrderStatus = vi.fn();
const mockMarkSalesOrderLineFulfilled = vi.fn();
const mockGetNextPONumber = vi.fn();
const mockCreatePurchaseOrder = vi.fn();
const mockFindPurchaseOrder = vi.fn();
const mockFindPurchaseOrders = vi.fn();
const mockApprovePurchaseOrder = vi.fn();
const mockUpdatePurchaseOrderStatus = vi.fn();
const mockUpdatePOLineReceivedQty = vi.fn();
const mockFindPriceBooks = vi.fn();
const mockCreatePriceBook = vi.fn();
const mockCreatePriceBookEntry = vi.fn();
const mockFindWarehouses = vi.fn();
const mockCreateWarehouse = vi.fn();

vi.mock('../repository.js', () => ({
  findProductBySku: (...args: unknown[]) => mockFindProductBySku(...args),
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  findProduct: (...args: unknown[]) => mockFindProduct(...args),
  findProducts: (...args: unknown[]) => mockFindProducts(...args),
  updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  findOrCreateStockLevel: (...args: unknown[]) => mockFindOrCreateStockLevel(...args),
  adjustStockLevel: (...args: unknown[]) => mockAdjustStockLevel(...args),
  reserveStockLevel: (...args: unknown[]) => mockReserveStockLevel(...args),
  releaseStockLevel: (...args: unknown[]) => mockReleaseStockLevel(...args),
  createStockAdjustment: (...args: unknown[]) => mockCreateStockAdjustment(...args),
  findLowStockLevels: (...args: unknown[]) => mockFindLowStockLevels(...args),
  getNextOrderNumber: (...args: unknown[]) => mockGetNextOrderNumber(...args),
  createSalesOrder: (...args: unknown[]) => mockCreateSalesOrder(...args),
  findSalesOrder: (...args: unknown[]) => mockFindSalesOrder(...args),
  findSalesOrders: (...args: unknown[]) => mockFindSalesOrders(...args),
  updateSalesOrderStatus: (...args: unknown[]) => mockUpdateSalesOrderStatus(...args),
  markSalesOrderLineFulfilled: (...args: unknown[]) => mockMarkSalesOrderLineFulfilled(...args),
  getNextPONumber: (...args: unknown[]) => mockGetNextPONumber(...args),
  createPurchaseOrder: (...args: unknown[]) => mockCreatePurchaseOrder(...args),
  findPurchaseOrder: (...args: unknown[]) => mockFindPurchaseOrder(...args),
  findPurchaseOrders: (...args: unknown[]) => mockFindPurchaseOrders(...args),
  approvePurchaseOrder: (...args: unknown[]) => mockApprovePurchaseOrder(...args),
  updatePurchaseOrderStatus: (...args: unknown[]) => mockUpdatePurchaseOrderStatus(...args),
  updatePOLineReceivedQty: (...args: unknown[]) => mockUpdatePOLineReceivedQty(...args),
  findPriceBooks: (...args: unknown[]) => mockFindPriceBooks(...args),
  createPriceBook: (...args: unknown[]) => mockCreatePriceBook(...args),
  createPriceBookEntry: (...args: unknown[]) => mockCreatePriceBookEntry(...args),
  findWarehouses: (...args: unknown[]) => mockFindWarehouses(...args),
  createWarehouse: (...args: unknown[]) => mockCreateWarehouse(...args),
}));

// ── Events mocks ───────────────────────────────────────────────────────────────

const mockPublishOrderFulfilled = vi.fn();
const mockPublishStockLow = vi.fn();

vi.mock('../events.js', () => ({
  publishOrderFulfilled: (...args: unknown[]) => mockPublishOrderFulfilled(...args),
  publishStockLow: (...args: unknown[]) => mockPublishStockLow(...args),
}));

// ── DB mock ────────────────────────────────────────────────────────────────────

const mockTx = {
  warehouse: { findMany: vi.fn(() => [{ id: 'wh-1', isActive: true }]) },
  purchaseOrder: { findUniqueOrThrow: vi.fn() },
  product: { findFirst: vi.fn() },
};
const mockTransaction = vi.fn((cb: Function) => cb(mockTx));
const mockPrisma = {
  $transaction: mockTransaction,
  warehouse: { findMany: vi.fn() },
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
  tenantContext: { getStore: vi.fn() },
}));

// ── Shared-kernel mock ─────────────────────────────────────────────────────────

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

// ── Logger mock ────────────────────────────────────────────────────────────────

vi.mock('../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import modules under test (after mocks) ───────────────────────────────────

import * as svc from '../service.js';
import { handleDealWon } from '../listeners.js';
import type { DealWonPayload } from '@softcrm/shared-kernel';
import { ValidationError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Test data ──────────────────────────────────────────────────────────────────

const dealPayload: DealWonPayload = {
  dealId: 'deal-1',
  contactId: 'contact-1',
  accountId: 'account-1',
  products: [
    { productId: 'prod-1', quantity: 5, unitPrice: 50 },
    { productId: 'prod-2', quantity: 10, unitPrice: 25 },
  ],
};

const mockOrder = {
  id: 'order-1',
  tenantId: 'tenant-1',
  orderNumber: 1001,
  dealId: 'deal-1',
  status: 'CONFIRMED',
  subtotal: 500,
  taxAmount: 0,
  total: 500,
  lines: [
    {
      id: 'line-1',
      productId: 'prod-1',
      quantity: 5,
      unitPrice: 50,
      lineTotal: 250,
      fulfilled: false,
      product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A', cost: 30 },
    },
    {
      id: 'line-2',
      productId: 'prod-2',
      quantity: 10,
      unitPrice: 25,
      lineTotal: 250,
      fulfilled: false,
      product: { id: 'prod-2', sku: 'SKU-002', name: 'Widget B', cost: 15 },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ── Order Fulfillment Integration Tests ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Order Fulfillment Integration — deal.won → fulfill → COGS event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
    mockTx.warehouse.findMany.mockResolvedValue([{ id: 'wh-1', isActive: true }]);
    mockTx.purchaseOrder.findUniqueOrThrow.mockResolvedValue({ lines: [] });
  });

  // ── 1. deal.won triggers sales order creation ────────────────────────────────

  it('deal.won event triggers sales order creation with correct lines', async () => {
    mockGetNextOrderNumber.mockResolvedValue(1001);
    const createdOrder = { id: 'order-1', orderNumber: 1001, status: 'CONFIRMED' };
    mockCreateSalesOrder.mockResolvedValue(createdOrder);
    mockReserveStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);

    await handleDealWon(TENANT_ID, ACTOR_ID, dealPayload);

    // Assert createSalesOrder was called with CONFIRMED status and correct lines
    expect(mockCreateSalesOrder).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        dealId: 'deal-1',
        contactId: 'contact-1',
        accountId: 'account-1',
        status: 'CONFIRMED',
        orderNumber: 1001,
        lines: expect.arrayContaining([
          expect.objectContaining({ productId: 'prod-1', quantity: 5, unitPrice: 50, lineTotal: 250 }),
          expect.objectContaining({ productId: 'prod-2', quantity: 10, unitPrice: 25, lineTotal: 250 }),
        ]),
      }),
      mockTx,
    );

    // Assert stock was reserved for each product
    expect(mockReserveStockLevel).toHaveBeenCalledTimes(2);
    expect(mockReserveStockLevel).toHaveBeenCalledWith(TENANT_ID, 'prod-1', 'wh-1', 5, mockTx);
    expect(mockReserveStockLevel).toHaveBeenCalledWith(TENANT_ID, 'prod-2', 'wh-1', 10, mockTx);
  });

  // ── 2. sales order from deal has correct totals ──────────────────────────────

  it('sales order from deal has correct totals', async () => {
    mockGetNextOrderNumber.mockResolvedValue(1001);
    mockCreateSalesOrder.mockResolvedValue(undefined);
    mockReserveStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);

    await handleDealWon(TENANT_ID, ACTOR_ID, dealPayload);

    const orderArg = mockCreateSalesOrder.mock.calls[0]![1] as {
      subtotal: number;
      taxAmount: number;
      total: number;
      lines: { lineTotal: number }[];
    };

    // subtotal = sum of (quantity * unitPrice) for all lines = (5*50) + (10*25) = 500
    const expectedSubtotal = dealPayload.products.reduce(
      (sum, p) => sum + p.quantity * Number(p.unitPrice),
      0,
    );
    expect(orderArg.subtotal).toBe(expectedSubtotal);
    expect(orderArg.subtotal).toBe(500);

    // total = subtotal (no tax in this flow)
    expect(orderArg.taxAmount).toBe(0);
    expect(orderArg.total).toBe(orderArg.subtotal);
  });

  // ── 3. fulfillOrder decrements stock and releases reservations ───────────────

  it('fulfillOrder decrements stock and releases reservations', async () => {
    mockFindSalesOrder.mockResolvedValue(mockOrder);
    mockMarkSalesOrderLineFulfilled.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockReleaseStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    const fulfilledOrder = { ...mockOrder, status: 'FULFILLED', fulfilledAt: new Date() };
    mockUpdateSalesOrderStatus.mockResolvedValue(fulfilledOrder);
    mockPublishOrderFulfilled.mockResolvedValue(undefined);

    await svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID);

    // Assert adjustStockLevel called with negative qty for each line
    expect(mockAdjustStockLevel).toHaveBeenCalledTimes(2);
    expect(mockAdjustStockLevel).toHaveBeenCalledWith(TENANT_ID, 'prod-1', 'wh-1', -5, mockTx);
    expect(mockAdjustStockLevel).toHaveBeenCalledWith(TENANT_ID, 'prod-2', 'wh-1', -10, mockTx);

    // Assert releaseStockLevel called for each line
    expect(mockReleaseStockLevel).toHaveBeenCalledTimes(2);
    expect(mockReleaseStockLevel).toHaveBeenCalledWith(TENANT_ID, 'prod-1', 'wh-1', 5, mockTx);
    expect(mockReleaseStockLevel).toHaveBeenCalledWith(TENANT_ID, 'prod-2', 'wh-1', 10, mockTx);
  });

  // ── 4. fulfillOrder publishes ORDER_FULFILLED event with COGS line details ───

  it('fulfillOrder publishes ORDER_FULFILLED event with COGS line details', async () => {
    mockFindSalesOrder.mockResolvedValue(mockOrder);
    mockMarkSalesOrderLineFulfilled.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockReleaseStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    const fulfilledOrder = { ...mockOrder, status: 'FULFILLED', fulfilledAt: new Date() };
    mockUpdateSalesOrderStatus.mockResolvedValue(fulfilledOrder);
    mockPublishOrderFulfilled.mockResolvedValue(undefined);

    await svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID);

    // Assert publishOrderFulfilled was called with correct args
    expect(mockPublishOrderFulfilled).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      fulfilledOrder,
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'prod-1',
          quantity: 5,
          unitPrice: 50,
          cost: 30,
          lineTotal: 250,
        }),
        expect.objectContaining({
          productId: 'prod-2',
          quantity: 10,
          unitPrice: 25,
          cost: 15,
          lineTotal: 250,
        }),
      ]),
    );
  });

  // ── 5. fulfillOrder updates order status to FULFILLED ────────────────────────

  it('fulfillOrder updates order status to FULFILLED', async () => {
    mockFindSalesOrder.mockResolvedValue(mockOrder);
    mockMarkSalesOrderLineFulfilled.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockReleaseStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    const fulfilledOrder = { ...mockOrder, status: 'FULFILLED', fulfilledAt: new Date() };
    mockUpdateSalesOrderStatus.mockResolvedValue(fulfilledOrder);
    mockPublishOrderFulfilled.mockResolvedValue(undefined);

    const result = await svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID);

    expect(mockUpdateSalesOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'order-1',
      'FULFILLED',
      expect.objectContaining({ fulfilledAt: expect.any(Date) }),
      mockTx,
    );
    expect(result.status).toBe('FULFILLED');
  });

  // ── 6. cannot fulfill already fulfilled order ────────────────────────────────

  it('cannot fulfill already fulfilled order', async () => {
    mockFindSalesOrder.mockResolvedValue({ ...mockOrder, status: 'FULFILLED' });

    await expect(svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      'already fulfilled',
    );
  });

  // ── 7. cannot fulfill cancelled order ────────────────────────────────────────

  it('cannot fulfill cancelled order', async () => {
    mockFindSalesOrder.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

    await expect(svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(svc.fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      'cancelled',
    );
  });

  // ── 8. deal.won with no products skips order creation ────────────────────────

  it('deal.won with no products skips order creation', async () => {
    const emptyPayload: DealWonPayload = {
      dealId: 'deal-2',
      contactId: 'contact-1',
      accountId: 'account-1',
      products: [],
    };

    await handleDealWon(TENANT_ID, ACTOR_ID, emptyPayload);

    expect(mockCreateSalesOrder).not.toHaveBeenCalled();
    expect(mockReserveStockLevel).not.toHaveBeenCalled();
  });
});
