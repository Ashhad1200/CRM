import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock service layer ─────────────────────────────────────────────────────────

const mockGetProducts = vi.fn();
const mockGetProduct = vi.fn();
const mockCreateProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockGetWarehouses = vi.fn();
const mockCreateWarehouse = vi.fn();
const mockAdjustStock = vi.fn();
const mockReserveStock = vi.fn();
const mockCheckLowStock = vi.fn();
const mockGetSalesOrders = vi.fn();
const mockCreateSalesOrder = vi.fn();
const mockFulfillOrder = vi.fn();
const mockCancelOrder = vi.fn();
const mockGetPurchaseOrders = vi.fn();
const mockCreatePurchaseOrder = vi.fn();
const mockApprovePurchaseOrder = vi.fn();
const mockReceiveGoods = vi.fn();
const mockGetSalesOrder = vi.fn();
const mockGetPurchaseOrder = vi.fn();
const mockGetPriceBooks = vi.fn();
const mockCreatePriceBook = vi.fn();
const mockCreatePriceBookEntry = vi.fn();

vi.mock('../service.js', () => ({
  getProducts: (...args: unknown[]) => mockGetProducts(...args),
  getProduct: (...args: unknown[]) => mockGetProduct(...args),
  createProduct: (...args: unknown[]) => mockCreateProduct(...args),
  updateProduct: (...args: unknown[]) => mockUpdateProduct(...args),
  getWarehouses: (...args: unknown[]) => mockGetWarehouses(...args),
  createWarehouse: (...args: unknown[]) => mockCreateWarehouse(...args),
  adjustStock: (...args: unknown[]) => mockAdjustStock(...args),
  reserveStock: (...args: unknown[]) => mockReserveStock(...args),
  checkLowStock: (...args: unknown[]) => mockCheckLowStock(...args),
  getSalesOrders: (...args: unknown[]) => mockGetSalesOrders(...args),
  getSalesOrder: (...args: unknown[]) => mockGetSalesOrder(...args),
  createSalesOrder: (...args: unknown[]) => mockCreateSalesOrder(...args),
  fulfillOrder: (...args: unknown[]) => mockFulfillOrder(...args),
  cancelOrder: (...args: unknown[]) => mockCancelOrder(...args),
  getPurchaseOrders: (...args: unknown[]) => mockGetPurchaseOrders(...args),
  getPurchaseOrder: (...args: unknown[]) => mockGetPurchaseOrder(...args),
  createPurchaseOrder: (...args: unknown[]) => mockCreatePurchaseOrder(...args),
  approvePurchaseOrder: (...args: unknown[]) => mockApprovePurchaseOrder(...args),
  receiveGoods: (...args: unknown[]) => mockReceiveGoods(...args),
  getPriceBooks: (...args: unknown[]) => mockGetPriceBooks(...args),
  createPriceBook: (...args: unknown[]) => mockCreatePriceBook(...args),
  createPriceBookEntry: (...args: unknown[]) => mockCreatePriceBookEntry(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
  tenantContext: { getStore: vi.fn() },
}));

// ── Import router (after mocks) ────────────────────────────────────────────────

import { inventoryRouter } from '../routes.js';

// ── Test app setup ─────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { tid: TENANT_ID, sub: ACTOR_ID, email: 'test@test.com' };
    next();
  });
  app.use('/inventory', inventoryRouter);
  return app;
}

const app = createApp();

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Product routes ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /inventory/products', () => {
  it('returns 200 with paginated products', async () => {
    mockGetProducts.mockResolvedValue({
      data: [{ id: 'p-1', name: 'Widget' }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/inventory/products')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toEqual([{ id: 'p-1', name: 'Widget' }]);
    expect(mockGetProducts).toHaveBeenCalled();
  });
});

describe('GET /inventory/products/:id', () => {
  it('returns 200 with product detail', async () => {
    const product = { id: 'p-1', name: 'Widget', sku: 'SKU-001' };
    mockGetProduct.mockResolvedValue(product);

    const res = await request(app).get('/inventory/products/p-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: product });
    expect(mockGetProduct).toHaveBeenCalledWith(TENANT_ID, 'p-1');
  });
});

describe('POST /inventory/products', () => {
  it('returns 201 with created product', async () => {
    const product = { id: 'p-1', sku: 'SKU-001', name: 'Widget' };
    mockCreateProduct.mockResolvedValue(product);

    const res = await request(app)
      .post('/inventory/products')
      .send({ sku: 'SKU-001', name: 'Widget', unitPrice: 19.99, cost: 10, taxClass: 'STANDARD' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: product });
    expect(mockCreateProduct).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ sku: 'SKU-001' }),
      ACTOR_ID,
    );
  });
});

describe('PUT /inventory/products/:id', () => {
  it('returns 200 with updated product', async () => {
    const product = { id: 'p-1', sku: 'SKU-001', name: 'Updated Widget' };
    mockUpdateProduct.mockResolvedValue(product);

    const res = await request(app)
      .put('/inventory/products/p-1')
      .send({ name: 'Updated Widget' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: product });
    expect(mockUpdateProduct).toHaveBeenCalledWith(
      TENANT_ID,
      'p-1',
      expect.objectContaining({ name: 'Updated Widget', id: 'p-1' }),
      ACTOR_ID,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Warehouse routes ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /inventory/warehouses', () => {
  it('returns 200 with warehouses', async () => {
    const warehouses = [{ id: 'wh-1', name: 'Main Warehouse' }];
    mockGetWarehouses.mockResolvedValue(warehouses);

    const res = await request(app).get('/inventory/warehouses');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: warehouses });
    expect(mockGetWarehouses).toHaveBeenCalledWith(TENANT_ID);
  });
});

describe('POST /inventory/warehouses', () => {
  it('returns 201 with created warehouse', async () => {
    const warehouse = { id: 'wh-1', name: 'New Warehouse' };
    mockCreateWarehouse.mockResolvedValue(warehouse);

    const res = await request(app)
      .post('/inventory/warehouses')
      .send({ name: 'New Warehouse' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: warehouse });
    expect(mockCreateWarehouse).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ name: 'New Warehouse' }),
      ACTOR_ID,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Stock routes ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /inventory/stock/adjust', () => {
  it('returns 200 with adjusted stock result', async () => {
    const result = { quantity: 50 };
    mockAdjustStock.mockResolvedValue(result);

    const res = await request(app)
      .post('/inventory/stock/adjust')
      .send({ productId: 'p-1', warehouseId: 'wh-1', quantity: 20, reason: 'PURCHASE' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: result });
    expect(mockAdjustStock).toHaveBeenCalledWith(
      TENANT_ID,
      'p-1',
      'wh-1',
      20,
      'PURCHASE',
      ACTOR_ID,
    );
  });
});

describe('POST /inventory/stock/reserve', () => {
  it('returns 200 with success', async () => {
    mockReserveStock.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/inventory/stock/reserve')
      .send({ productId: 'p-1', warehouseId: 'wh-1', quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { success: true } });
    expect(mockReserveStock).toHaveBeenCalledWith(TENANT_ID, 'p-1', 'wh-1', 5);
  });
});

describe('GET /inventory/stock/low', () => {
  it('returns 200 with low stock levels', async () => {
    const lowStock = [{ productId: 'p-1', quantity: 3 }];
    mockCheckLowStock.mockResolvedValue(lowStock);

    const res = await request(app).get('/inventory/stock/low');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: lowStock });
    expect(mockCheckLowStock).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Sales Order routes ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /inventory/orders', () => {
  it('returns 200 with paginated orders', async () => {
    mockGetSalesOrders.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await request(app)
      .get('/inventory/orders')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(mockGetSalesOrders).toHaveBeenCalled();
  });
});

describe('POST /inventory/orders', () => {
  it('returns 201 with created order', async () => {
    const order = { id: 'order-1', orderNumber: 1001 };
    mockCreateSalesOrder.mockResolvedValue(order);

    const res = await request(app)
      .post('/inventory/orders')
      .send({
        lines: [{ productId: 'p-1', quantity: 2, unitPrice: 100 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: order });
    expect(mockCreateSalesOrder).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Object),
      ACTOR_ID,
    );
  });
});

describe('POST /inventory/orders/:id/fulfill', () => {
  it('returns 200 with fulfilled order', async () => {
    const order = { id: 'order-1', status: 'FULFILLED' };
    mockFulfillOrder.mockResolvedValue(order);

    const res = await request(app).post('/inventory/orders/order-1/fulfill');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: order });
    expect(mockFulfillOrder).toHaveBeenCalledWith(TENANT_ID, 'order-1', ACTOR_ID);
  });
});

describe('POST /inventory/orders/:id/cancel', () => {
  it('returns 200 with cancelled order', async () => {
    const order = { id: 'order-1', status: 'CANCELLED' };
    mockCancelOrder.mockResolvedValue(order);

    const res = await request(app).post('/inventory/orders/order-1/cancel');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: order });
    expect(mockCancelOrder).toHaveBeenCalledWith(TENANT_ID, 'order-1', ACTOR_ID);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Purchase Order routes ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /inventory/purchase-orders', () => {
  it('returns 200 with paginated purchase orders', async () => {
    mockGetPurchaseOrders.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });

    const res = await request(app)
      .get('/inventory/purchase-orders')
      .query({ page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(mockGetPurchaseOrders).toHaveBeenCalled();
  });
});

describe('POST /inventory/purchase-orders', () => {
  it('returns 201 with created purchase order', async () => {
    const po = { id: 'po-1', poNumber: 5001, status: 'DRAFT' };
    mockCreatePurchaseOrder.mockResolvedValue(po);

    const res = await request(app)
      .post('/inventory/purchase-orders')
      .send({
        vendorName: 'Acme Supplies',
        lines: [{ productId: 'p-1', quantity: 100, unitCost: 8.5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: po });
    expect(mockCreatePurchaseOrder).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(Object),
      ACTOR_ID,
    );
  });
});
