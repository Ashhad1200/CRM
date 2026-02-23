import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

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

const mockPublishOrderFulfilled = vi.fn();
const mockPublishStockLow = vi.fn();

vi.mock('../events.js', () => ({
  publishOrderFulfilled: (...args: unknown[]) => mockPublishOrderFulfilled(...args),
  publishStockLow: (...args: unknown[]) => mockPublishStockLow(...args),
}));

const mockTx = {
  product: { findFirst: vi.fn() },
  warehouse: { findMany: vi.fn(() => [{ id: 'wh-1', isActive: true }]) },
  purchaseOrder: {
    findUniqueOrThrow: vi.fn(),
  },
};
const mockTransaction = vi.fn((cb: Function) => cb(mockTx));
const mockPrisma = {
  $transaction: mockTransaction,
  product: { findFirst: vi.fn() },
  warehouse: { findMany: vi.fn() },
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => mockPrisma),
  tenantContext: { getStore: vi.fn() },
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>('@softcrm/shared-kernel');
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  createProduct,
  adjustStock,
  reserveStock,
  checkLowStock,
  createSalesOrderFromDeal,
  fulfillOrder,
  cancelOrder,
  createPurchaseOrder,
  approvePurchaseOrder,
  receiveGoods,
} from '../service.js';

import { ValidationError, NotFoundError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default transaction mock behavior
  mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
  mockTx.warehouse.findMany.mockResolvedValue([{ id: 'wh-1', isActive: true }]);
  mockTx.purchaseOrder.findUniqueOrThrow.mockResolvedValue({
    lines: [],
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createProduct ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createProduct', () => {
  const input = {
    sku: 'SKU-001',
    name: 'Widget A',
    unitPrice: 19.99,
    cost: 10.0,
    taxClass: 'STANDARD' as const,
  };

  it('creates a product when SKU is unique', async () => {
    mockFindProductBySku.mockResolvedValue(null);
    const expected = { id: 'p-1', ...input };
    mockCreateProduct.mockResolvedValue(expected);

    const result = await createProduct(TENANT_ID, input, ACTOR_ID);

    expect(mockFindProductBySku).toHaveBeenCalledWith(TENANT_ID, 'SKU-001');
    expect(mockCreateProduct).toHaveBeenCalledWith(TENANT_ID, input, ACTOR_ID);
    expect(result).toEqual(expected);
  });

  it('throws ValidationError on duplicate SKU', async () => {
    mockFindProductBySku.mockResolvedValue({ id: 'existing-1', sku: 'SKU-001' });

    await expect(createProduct(TENANT_ID, input, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(createProduct(TENANT_ID, input, ACTOR_ID)).rejects.toThrow(
      'SKU "SKU-001" already exists',
    );
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── adjustStock ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('adjustStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
  });

  it('adjusts stock level and creates adjustment record', async () => {
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue({ quantity: 50 });
    mockTx.product.findFirst.mockResolvedValue({ sku: 'SKU-001' });

    const result = await adjustStock(TENANT_ID, 'p-1', 'wh-1', 20, 'PURCHASE', ACTOR_ID);

    expect(mockCreateStockAdjustment).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        productId: 'p-1',
        warehouseId: 'wh-1',
        quantity: 20,
        reason: 'PURCHASE',
        createdBy: ACTOR_ID,
      }),
      mockTx,
    );
    expect(mockAdjustStockLevel).toHaveBeenCalledWith(
      TENANT_ID,
      'p-1',
      'wh-1',
      20,
      mockTx,
    );
    expect(result).toEqual({ quantity: 50 });
  });

  it('publishes STOCK_LOW when quantity falls below threshold (default 10)', async () => {
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue({ quantity: 5 });
    mockTx.product.findFirst.mockResolvedValue({ sku: 'SKU-LOW' });

    await adjustStock(TENANT_ID, 'p-1', 'wh-1', -15, 'MANUAL', ACTOR_ID);

    expect(mockPublishStockLow).toHaveBeenCalledWith(
      TENANT_ID,
      'p-1',
      5,
      10,
      'SKU-LOW',
    );
  });

  it('does not publish STOCK_LOW when quantity is above threshold', async () => {
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue({ quantity: 25 });
    mockTx.product.findFirst.mockResolvedValue(null);

    await adjustStock(TENANT_ID, 'p-1', 'wh-1', 10, 'PURCHASE', ACTOR_ID);

    expect(mockPublishStockLow).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── reserveStock ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('reserveStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
  });

  it('reserves stock and records adjustment with reason RESERVED', async () => {
    mockReserveStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);

    await reserveStock(TENANT_ID, 'p-1', 'wh-1', 5);

    expect(mockReserveStockLevel).toHaveBeenCalledWith(TENANT_ID, 'p-1', 'wh-1', 5, mockTx);
    expect(mockCreateStockAdjustment).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        productId: 'p-1',
        warehouseId: 'wh-1',
        quantity: 5,
        reason: 'RESERVED',
        createdBy: 'system',
      }),
      mockTx,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createSalesOrderFromDeal ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createSalesOrderFromDeal', () => {
  const dealPayload = {
    dealId: 'deal-1',
    contactId: 'contact-1',
    accountId: 'account-1',
    products: [
      { productId: 'p-1', quantity: 2, unitPrice: 100 },
      { productId: 'p-2', quantity: 3, unitPrice: 50 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
    mockTx.warehouse.findMany.mockResolvedValue([{ id: 'wh-1' }]);
  });

  it('creates a sales order with CONFIRMED status', async () => {
    mockGetNextOrderNumber.mockResolvedValue(1001);
    const createdOrder = { id: 'order-1', orderNumber: 1001, status: 'CONFIRMED' };
    mockCreateSalesOrder.mockResolvedValue(createdOrder);
    mockReserveStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);

    const result = await createSalesOrderFromDeal(TENANT_ID, dealPayload, ACTOR_ID);

    expect(mockGetNextOrderNumber).toHaveBeenCalledWith(TENANT_ID, mockTx);
    expect(mockCreateSalesOrder).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        dealId: 'deal-1',
        status: 'CONFIRMED',
        orderNumber: 1001,
      }),
      mockTx,
    );
    expect(result).toEqual(createdOrder);
  });

  it('reserves stock for each line item using first warehouse', async () => {
    mockGetNextOrderNumber.mockResolvedValue(1001);
    mockCreateSalesOrder.mockResolvedValue({ id: 'order-1' });
    mockReserveStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);

    await createSalesOrderFromDeal(TENANT_ID, dealPayload, ACTOR_ID);

    // Should reserve for each product line
    expect(mockReserveStockLevel).toHaveBeenCalledTimes(2);
    expect(mockReserveStockLevel).toHaveBeenCalledWith(TENANT_ID, 'p-1', 'wh-1', 2, mockTx);
    expect(mockReserveStockLevel).toHaveBeenCalledWith(TENANT_ID, 'p-2', 'wh-1', 3, mockTx);

    expect(mockCreateStockAdjustment).toHaveBeenCalledTimes(2);
    expect(mockCreateStockAdjustment).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ productId: 'p-1', reason: 'RESERVED' }),
      mockTx,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── fulfillOrder ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('fulfillOrder', () => {
  const mockOrder = {
    id: 'order-1',
    orderNumber: 1001,
    status: 'CONFIRMED',
    total: 350,
    lines: [
      {
        id: 'line-1',
        productId: 'p-1',
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
        fulfilled: false,
        product: { id: 'p-1', sku: 'SKU-001', name: 'Widget', cost: 50 },
      },
      {
        id: 'line-2',
        productId: 'p-2',
        quantity: 3,
        unitPrice: 50,
        lineTotal: 150,
        fulfilled: false,
        product: { id: 'p-2', sku: 'SKU-002', name: 'Gadget', cost: 25 },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
    mockTx.warehouse.findMany.mockResolvedValue([{ id: 'wh-1' }]);
    mockFindSalesOrder.mockResolvedValue(mockOrder);
  });

  it('fulfills order, decrements stock, releases reservation, and updates status', async () => {
    mockMarkSalesOrderLineFulfilled.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockReleaseStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    const fulfilledOrder = { ...mockOrder, status: 'FULFILLED', fulfilledAt: new Date() };
    mockUpdateSalesOrderStatus.mockResolvedValue(fulfilledOrder);
    mockPublishOrderFulfilled.mockResolvedValue(undefined);

    const result = await fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID);

    expect(mockFindSalesOrder).toHaveBeenCalledWith(TENANT_ID, 'order-1');
    expect(mockMarkSalesOrderLineFulfilled).toHaveBeenCalledTimes(2);
    expect(mockAdjustStockLevel).toHaveBeenCalledTimes(2);
    expect(mockReleaseStockLevel).toHaveBeenCalledTimes(2);
    expect(mockUpdateSalesOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'order-1',
      'FULFILLED',
      expect.objectContaining({ fulfilledAt: expect.any(Date) }),
      mockTx,
    );
    expect(result).toEqual(fulfilledOrder);
  });

  it('publishes ORDER_FULFILLED event with line cost details', async () => {
    mockMarkSalesOrderLineFulfilled.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockReleaseStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    const fulfilledOrder = { ...mockOrder, status: 'FULFILLED' };
    mockUpdateSalesOrderStatus.mockResolvedValue(fulfilledOrder);
    mockPublishOrderFulfilled.mockResolvedValue(undefined);

    await fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID);

    expect(mockPublishOrderFulfilled).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      fulfilledOrder,
      expect.arrayContaining([
        expect.objectContaining({ productId: 'p-1', cost: 50, quantity: 2 }),
        expect.objectContaining({ productId: 'p-2', cost: 25, quantity: 3 }),
      ]),
    );
  });

  it('rejects fulfillment of already fulfilled order', async () => {
    mockFindSalesOrder.mockResolvedValue({ ...mockOrder, status: 'FULFILLED' });

    await expect(fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      'already fulfilled',
    );
  });

  it('rejects fulfillment of cancelled order', async () => {
    mockFindSalesOrder.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

    await expect(fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(fulfillOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      'cancelled',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── cancelOrder ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('cancelOrder', () => {
  const mockOrder = {
    id: 'order-1',
    status: 'CONFIRMED',
    lines: [
      {
        id: 'line-1',
        productId: 'p-1',
        quantity: 2,
        fulfilled: false,
      },
      {
        id: 'line-2',
        productId: 'p-2',
        quantity: 3,
        fulfilled: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
    mockTx.warehouse.findMany.mockResolvedValue([{ id: 'wh-1' }]);
    mockFindSalesOrder.mockResolvedValue(mockOrder);
  });

  it('cancels order and releases reserved stock for each line', async () => {
    mockReleaseStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
    mockUpdateSalesOrderStatus.mockResolvedValue(cancelledOrder);

    const result = await cancelOrder(TENANT_ID, 'order-1', ACTOR_ID);

    expect(mockReleaseStockLevel).toHaveBeenCalledTimes(2);
    expect(mockReleaseStockLevel).toHaveBeenCalledWith(TENANT_ID, 'p-1', 'wh-1', 2, mockTx);
    expect(mockReleaseStockLevel).toHaveBeenCalledWith(TENANT_ID, 'p-2', 'wh-1', 3, mockTx);
    expect(mockUpdateSalesOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'order-1',
      'CANCELLED',
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
      mockTx,
    );
    expect(result).toEqual(cancelledOrder);
  });

  it('rejects cancellation of already cancelled order', async () => {
    mockFindSalesOrder.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

    await expect(cancelOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(cancelOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      'already cancelled',
    );
  });

  it('rejects cancellation of fulfilled order', async () => {
    mockFindSalesOrder.mockResolvedValue({ ...mockOrder, status: 'FULFILLED' });

    await expect(cancelOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(cancelOrder(TENANT_ID, 'order-1', ACTOR_ID)).rejects.toThrow(
      'fulfilled',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createPurchaseOrder ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createPurchaseOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
  });

  it('creates a purchase order with DRAFT status', async () => {
    mockGetNextPONumber.mockResolvedValue(5001);
    const createdPO = { id: 'po-1', poNumber: 5001, status: 'DRAFT' };
    mockCreatePurchaseOrder.mockResolvedValue(createdPO);

    const input = {
      vendorName: 'Acme Supplies',
      lines: [
        { productId: 'p-1', quantity: 100, unitCost: 8.5 },
      ],
    };

    const result = await createPurchaseOrder(TENANT_ID, input, ACTOR_ID);

    expect(mockGetNextPONumber).toHaveBeenCalledWith(TENANT_ID, mockTx);
    expect(mockCreatePurchaseOrder).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        vendorName: 'Acme Supplies',
        status: 'DRAFT',
        approvalStatus: 'PENDING',
        poNumber: 5001,
      }),
      mockTx,
    );
    expect(result).toEqual(createdPO);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── approvePurchaseOrder ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('approvePurchaseOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
  });

  it('approves a pending purchase order', async () => {
    mockFindPurchaseOrder.mockResolvedValue({
      id: 'po-1',
      approvalStatus: 'PENDING',
    });
    const approvedPO = { id: 'po-1', approvalStatus: 'APPROVED' };
    mockApprovePurchaseOrder.mockResolvedValue(approvedPO);

    const result = await approvePurchaseOrder(TENANT_ID, 'po-1', ACTOR_ID);

    expect(mockFindPurchaseOrder).toHaveBeenCalledWith(TENANT_ID, 'po-1');
    expect(mockApprovePurchaseOrder).toHaveBeenCalledWith(TENANT_ID, 'po-1', mockTx);
    expect(result).toEqual(approvedPO);
  });

  it('rejects approval of already approved purchase order', async () => {
    mockFindPurchaseOrder.mockResolvedValue({
      id: 'po-1',
      approvalStatus: 'APPROVED',
    });

    await expect(approvePurchaseOrder(TENANT_ID, 'po-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(approvePurchaseOrder(TENANT_ID, 'po-1', ACTOR_ID)).rejects.toThrow(
      'already approved',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── receiveGoods ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('receiveGoods', () => {
  const mockPO = {
    id: 'po-1',
    status: 'APPROVED',
    lines: [
      {
        id: 'pol-1',
        productId: 'p-1',
        quantity: 100,
        receivedQty: 0,
      },
      {
        id: 'pol-2',
        productId: 'p-2',
        quantity: 50,
        receivedQty: 0,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
    mockTx.warehouse.findMany.mockResolvedValue([{ id: 'wh-1' }]);
    mockFindPurchaseOrder.mockResolvedValue(mockPO);
  });

  it('receives goods and increments stock for each line', async () => {
    mockUpdatePOLineReceivedQty.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    mockTx.purchaseOrder.findUniqueOrThrow.mockResolvedValue({
      lines: [
        { receivedQty: 50, quantity: 100 },
        { receivedQty: 0, quantity: 50 },
      ],
    });
    mockFindPurchaseOrder.mockResolvedValue(mockPO);

    const lines = [{ lineId: 'pol-1', receivedQty: 50 }];

    await receiveGoods(TENANT_ID, 'po-1', lines, ACTOR_ID);

    expect(mockUpdatePOLineReceivedQty).toHaveBeenCalledWith('pol-1', 50, mockTx);
    expect(mockAdjustStockLevel).toHaveBeenCalledWith(
      TENANT_ID,
      'p-1',
      'wh-1',
      50,
      mockTx,
    );
    expect(mockCreateStockAdjustment).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        productId: 'p-1',
        quantity: 50,
        reason: 'PURCHASE',
      }),
      mockTx,
    );
  });

  it('marks PO as RECEIVED when all lines fully received', async () => {
    mockUpdatePOLineReceivedQty.mockResolvedValue(undefined);
    mockAdjustStockLevel.mockResolvedValue(undefined);
    mockCreateStockAdjustment.mockResolvedValue(undefined);
    mockTx.purchaseOrder.findUniqueOrThrow.mockResolvedValue({
      lines: [
        { receivedQty: 100, quantity: 100 },
        { receivedQty: 50, quantity: 50 },
      ],
    });
    const receivedPO = { ...mockPO, status: 'RECEIVED' };
    mockUpdatePurchaseOrderStatus.mockResolvedValue(receivedPO);

    const lines = [
      { lineId: 'pol-1', receivedQty: 100 },
      { lineId: 'pol-2', receivedQty: 50 },
    ];

    const result = await receiveGoods(TENANT_ID, 'po-1', lines, ACTOR_ID);

    expect(mockUpdatePurchaseOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'po-1',
      'RECEIVED',
      expect.objectContaining({ receivedAt: expect.any(Date) }),
      mockTx,
    );
    expect(result).toEqual(receivedPO);
  });

  it('throws ValidationError when received qty exceeds ordered qty', async () => {
    const poWithPartial = {
      ...mockPO,
      lines: [
        { id: 'pol-1', productId: 'p-1', quantity: 100, receivedQty: 90 },
      ],
    };
    mockFindPurchaseOrder.mockResolvedValue(poWithPartial);

    const lines = [{ lineId: 'pol-1', receivedQty: 20 }]; // 90 + 20 = 110 > 100

    await expect(
      receiveGoods(TENANT_ID, 'po-1', lines, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
    await expect(
      receiveGoods(TENANT_ID, 'po-1', lines, ACTOR_ID),
    ).rejects.toThrow('exceeds ordered quantity');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── checkLowStock ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('checkLowStock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds low stock levels and publishes STOCK_LOW for each', async () => {
    const lowStockItems = [
      { productId: 'p-1', quantity: 3, product: { sku: 'SKU-001' } },
      { productId: 'p-2', quantity: 7, product: { sku: 'SKU-002' } },
    ];
    mockFindLowStockLevels.mockResolvedValue(lowStockItems);
    mockPublishStockLow.mockResolvedValue(undefined);

    const result = await checkLowStock(TENANT_ID);

    expect(mockFindLowStockLevels).toHaveBeenCalledWith(TENANT_ID, 10); // default threshold
    expect(mockPublishStockLow).toHaveBeenCalledTimes(2);
    expect(mockPublishStockLow).toHaveBeenCalledWith(TENANT_ID, 'p-1', 3, 10, 'SKU-001');
    expect(mockPublishStockLow).toHaveBeenCalledWith(TENANT_ID, 'p-2', 7, 10, 'SKU-002');
    expect(result).toEqual(lowStockItems);
  });

  it('uses custom threshold when provided', async () => {
    mockFindLowStockLevels.mockResolvedValue([]);
    mockPublishStockLow.mockResolvedValue(undefined);

    await checkLowStock(TENANT_ID, 25);

    expect(mockFindLowStockLevels).toHaveBeenCalledWith(TENANT_ID, 25);
    expect(mockPublishStockLow).not.toHaveBeenCalled();
  });
});
