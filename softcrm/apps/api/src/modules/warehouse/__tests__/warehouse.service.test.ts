import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

// Repository mocks
const mockFindWarehouse = vi.fn();
const mockCreateWarehouse = vi.fn();
const mockFindWarehouses = vi.fn();
const mockUpdateWarehouse = vi.fn();
const mockFindLocation = vi.fn();
const mockCreateLocation = vi.fn();
const mockFindLocations = vi.fn();
const mockFindStockLot = vi.fn();
const mockCreateStockLot = vi.fn();
const mockUpdateStockLotQuantity = vi.fn();
const mockUpdateStockLotReserved = vi.fn();
const mockUpdateStockLotLocation = vi.fn();
const mockUpdateStockLotStatus = vi.fn();
const mockFindStockLots = vi.fn();
const mockGetAggregatedStockLevels = vi.fn();
const mockCreateStockMove = vi.fn();
const mockFindStockMoves = vi.fn();
const mockFindPickList = vi.fn();
const mockFindPickLists = vi.fn();
const mockCreatePickList = vi.fn();
const mockUpdatePickListStatus = vi.fn();
const mockUpdatePickListLine = vi.fn();
const mockFindShipment = vi.fn();
const mockFindShipments = vi.fn();
const mockCreateShipment = vi.fn();
const mockUpdateShipmentStatus = vi.fn();
const mockFindCycleCount = vi.fn();
const mockFindCycleCounts = vi.fn();
const mockCreateCycleCount = vi.fn();
const mockUpdateCycleCountStatus = vi.fn();
const mockGenerateMoveReference = vi.fn();

vi.mock('../repository.js', () => ({
  findWarehouse: (...args: unknown[]) => mockFindWarehouse(...args),
  createWarehouse: (...args: unknown[]) => mockCreateWarehouse(...args),
  findWarehouses: (...args: unknown[]) => mockFindWarehouses(...args),
  updateWarehouse: (...args: unknown[]) => mockUpdateWarehouse(...args),
  findLocation: (...args: unknown[]) => mockFindLocation(...args),
  createLocation: (...args: unknown[]) => mockCreateLocation(...args),
  findLocations: (...args: unknown[]) => mockFindLocations(...args),
  findStockLot: (...args: unknown[]) => mockFindStockLot(...args),
  createStockLot: (...args: unknown[]) => mockCreateStockLot(...args),
  updateStockLotQuantity: (...args: unknown[]) => mockUpdateStockLotQuantity(...args),
  updateStockLotReserved: (...args: unknown[]) => mockUpdateStockLotReserved(...args),
  updateStockLotLocation: (...args: unknown[]) => mockUpdateStockLotLocation(...args),
  updateStockLotStatus: (...args: unknown[]) => mockUpdateStockLotStatus(...args),
  findStockLots: (...args: unknown[]) => mockFindStockLots(...args),
  getAggregatedStockLevels: (...args: unknown[]) => mockGetAggregatedStockLevels(...args),
  createStockMove: (...args: unknown[]) => mockCreateStockMove(...args),
  findStockMoves: (...args: unknown[]) => mockFindStockMoves(...args),
  findPickList: (...args: unknown[]) => mockFindPickList(...args),
  findPickLists: (...args: unknown[]) => mockFindPickLists(...args),
  createPickList: (...args: unknown[]) => mockCreatePickList(...args),
  updatePickListStatus: (...args: unknown[]) => mockUpdatePickListStatus(...args),
  updatePickListLine: (...args: unknown[]) => mockUpdatePickListLine(...args),
  findShipment: (...args: unknown[]) => mockFindShipment(...args),
  findShipments: (...args: unknown[]) => mockFindShipments(...args),
  createShipment: (...args: unknown[]) => mockCreateShipment(...args),
  updateShipmentStatus: (...args: unknown[]) => mockUpdateShipmentStatus(...args),
  findCycleCount: (...args: unknown[]) => mockFindCycleCount(...args),
  findCycleCounts: (...args: unknown[]) => mockFindCycleCounts(...args),
  createCycleCount: (...args: unknown[]) => mockCreateCycleCount(...args),
  updateCycleCountStatus: (...args: unknown[]) => mockUpdateCycleCountStatus(...args),
  generateMoveReference: (...args: unknown[]) => mockGenerateMoveReference(...args),
}));

// Events mocks
const mockPublishStockReceived = vi.fn();
const mockPublishStockMoved = vi.fn();
const mockPublishPickListCompleted = vi.fn();
const mockPublishShipmentDispatched = vi.fn();
const mockPublishCycleCountCompleted = vi.fn();
const mockPublishStockAdjusted = vi.fn();

vi.mock('../events.js', () => ({
  WAREHOUSE_EVENTS: {
    STOCK_RECEIVED: 'warehouse.stock.received',
    STOCK_MOVED: 'warehouse.stock.moved',
    PICK_LIST_COMPLETED: 'warehouse.pick_list.completed',
    SHIPMENT_DISPATCHED: 'warehouse.shipment.dispatched',
    CYCLE_COUNT_COMPLETED: 'warehouse.cycle_count.completed',
    STOCK_ADJUSTED: 'warehouse.stock.adjusted',
  },
  publishStockReceived: (...args: unknown[]) => mockPublishStockReceived(...args),
  publishStockMoved: (...args: unknown[]) => mockPublishStockMoved(...args),
  publishPickListCompleted: (...args: unknown[]) => mockPublishPickListCompleted(...args),
  publishShipmentDispatched: (...args: unknown[]) => mockPublishShipmentDispatched(...args),
  publishCycleCountCompleted: (...args: unknown[]) => mockPublishCycleCountCompleted(...args),
  publishStockAdjusted: (...args: unknown[]) => mockPublishStockAdjusted(...args),
}));

// Prisma transaction mock
const mockTx = {
  wHStockLot: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  wHStockMove: {
    create: vi.fn(),
    count: vi.fn(() => 0),
  },
};

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    $transaction: (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
  }),
}));

// Import service AFTER mocks are set up
import * as svc from '../service.js';

// ── Test data helpers ──────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-abc123';
const ACTOR_ID = 'user-xyz789';

function makeWarehouse(overrides = {}) {
  return {
    id: 'wh-001',
    tenantId: TENANT_ID,
    name: 'Main Warehouse',
    code: 'WH-MAIN',
    address: {},
    isDefault: true,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    ...overrides,
  };
}

function makeStockLot(overrides = {}) {
  return {
    id: 'lot-001',
    tenantId: TENANT_ID,
    productId: 'prod-001',
    warehouseId: 'wh-001',
    locationId: 'loc-001',
    lotNumber: 'LOT-2024-001',
    serialNumber: null,
    quantity: 100,
    reservedQty: 0,
    expiryDate: null,
    receivedAt: new Date(),
    status: 'AVAILABLE',
    ...overrides,
  };
}

function makePickList(overrides = {}) {
  return {
    id: 'pl-001',
    tenantId: TENANT_ID,
    warehouseId: 'wh-001',
    sourceOrderId: 'so-001',
    sourceOrderType: 'SO',
    status: 'ASSIGNED',
    assignedTo: 'picker-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    version: 1,
    lines: [
      {
        id: 'pll-001',
        pickListId: 'pl-001',
        productId: 'prod-001',
        locationId: 'loc-001',
        lotId: 'lot-001',
        requestedQty: 10,
        pickedQty: 0,
        status: 'PENDING',
      },
    ],
    ...overrides,
  };
}

function makeShipment(overrides = {}) {
  return {
    id: 'ship-001',
    tenantId: TENANT_ID,
    warehouseId: 'wh-001',
    pickListId: 'pl-001',
    carrier: 'FedEx',
    trackingNumber: null,
    shippedAt: null,
    estimatedDelivery: null,
    status: 'PENDING',
    recipientName: 'John Doe',
    recipientAddress: { street: '123 Main St', city: 'Springfield' },
    weight: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    ...overrides,
  };
}

function makeStockMove(overrides = {}) {
  return {
    id: 'move-001',
    tenantId: TENANT_ID,
    reference: 'RCV-000001',
    moveType: 'RECEIPT',
    productId: 'prod-001',
    warehouseId: 'wh-001',
    lotId: 'lot-001',
    fromLocationId: null,
    toLocationId: 'loc-001',
    plannedQty: 50,
    doneQty: 50,
    status: 'DONE',
    sourceDocument: null,
    scheduledDate: new Date(),
    doneDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: ACTOR_ID,
    version: 1,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tests ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('warehouse service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPublishStockReceived.mockResolvedValue(undefined);
    mockPublishStockMoved.mockResolvedValue(undefined);
    mockPublishPickListCompleted.mockResolvedValue(undefined);
    mockPublishShipmentDispatched.mockResolvedValue(undefined);
    mockPublishCycleCountCompleted.mockResolvedValue(undefined);
    mockPublishStockAdjusted.mockResolvedValue(undefined);
    mockGenerateMoveReference.mockResolvedValue('RCV-000001');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // receiveStock
  // ─────────────────────────────────────────────────────────────────────────────

  describe('receiveStock', () => {
    it('creates a stock lot and RECEIPT stock move, then emits STOCK_RECEIVED', async () => {
      const warehouse = makeWarehouse();
      const lot = makeStockLot();
      const move = makeStockMove();

      mockFindWarehouse.mockResolvedValue(warehouse);
      mockCreateStockLot.mockResolvedValue(lot);
      mockCreateStockMove.mockResolvedValue(move);
      mockTx.wHStockMove.count.mockResolvedValue(0);

      const result = await svc.receiveStock(
        TENANT_ID,
        {
          warehouseId: 'wh-001',
          productId: 'prod-001',
          lotNumber: 'LOT-2024-001',
          quantity: 50,
          locationId: 'loc-001',
        },
        ACTOR_ID,
      );

      expect(mockFindWarehouse).toHaveBeenCalledWith(TENANT_ID, 'wh-001');
      expect(mockCreateStockLot).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          productId: 'prod-001',
          warehouseId: 'wh-001',
          lotNumber: 'LOT-2024-001',
          quantity: 50,
          locationId: 'loc-001',
        }),
        expect.anything(), // tx
      );
      expect(mockCreateStockMove).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          moveType: 'RECEIPT',
          productId: 'prod-001',
          warehouseId: 'wh-001',
          lotId: lot.id,
          doneQty: 50,
          status: 'DONE',
        }),
        expect.anything(), // tx
      );
      expect(mockPublishStockReceived).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          warehouseId: 'wh-001',
          productId: 'prod-001',
          lotId: lot.id,
          quantity: 50,
        }),
      );
      expect(result).toEqual({ lot, move });
    });

    it('throws ValidationError if warehouse is inactive', async () => {
      mockFindWarehouse.mockResolvedValue(makeWarehouse({ status: 'INACTIVE' }));

      await expect(
        svc.receiveStock(
          TENANT_ID,
          {
            warehouseId: 'wh-001',
            productId: 'prod-001',
            lotNumber: 'LOT-001',
            quantity: 10,
          },
          ACTOR_ID,
        ),
      ).rejects.toThrow('inactive');
    });

    it('passes sourceDocument through to the stock move', async () => {
      const warehouse = makeWarehouse();
      const lot = makeStockLot();
      const move = makeStockMove({ sourceDocument: 'PO-00042' });

      mockFindWarehouse.mockResolvedValue(warehouse);
      mockCreateStockLot.mockResolvedValue(lot);
      mockCreateStockMove.mockResolvedValue(move);

      await svc.receiveStock(
        TENANT_ID,
        {
          warehouseId: 'wh-001',
          productId: 'prod-001',
          lotNumber: 'LOT-001',
          quantity: 20,
          sourceDocument: 'PO-00042',
        },
        ACTOR_ID,
      );

      expect(mockCreateStockMove).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ sourceDocument: 'PO-00042' }),
        expect.anything(),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // completePickList
  // ─────────────────────────────────────────────────────────────────────────────

  describe('completePickList', () => {
    it('updates lot reservations and emits PICK_LIST_COMPLETED', async () => {
      const lot = makeStockLot({ quantity: 20, reservedQty: 10 });
      const pickList = makePickList({
        lines: [
          {
            id: 'pll-001',
            pickListId: 'pl-001',
            productId: 'prod-001',
            locationId: 'loc-001',
            lotId: 'lot-001',
            requestedQty: 10,
            pickedQty: 0,
            status: 'PENDING',
          },
        ],
      });

      mockFindPickList.mockResolvedValue(pickList);
      mockFindStockLot.mockResolvedValue(lot);
      mockUpdatePickListLine.mockResolvedValue({ id: 'pll-001', pickedQty: 10, status: 'DONE' });
      mockUpdateStockLotReserved.mockResolvedValue({ ...lot, reservedQty: 0 });
      mockUpdateStockLotQuantity.mockResolvedValue({ ...lot, quantity: 10 });
      mockUpdatePickListStatus.mockResolvedValue({ ...pickList, status: 'COMPLETED' });

      const result = await svc.completePickList(
        TENANT_ID,
        'pl-001',
        {
          lines: [{ lineId: 'pll-001', pickedQty: 10 }],
        },
        ACTOR_ID,
      );

      // Verify lot reserved qty was reduced
      expect(mockUpdateStockLotReserved).toHaveBeenCalledWith(
        'lot-001',
        -10,
        expect.anything(),
      );

      // Verify lot quantity was reduced by picked amount
      expect(mockUpdateStockLotQuantity).toHaveBeenCalledWith(
        'lot-001',
        -10,
        expect.anything(),
      );

      // Verify pick list line was updated to DONE
      expect(mockUpdatePickListLine).toHaveBeenCalledWith(
        'pll-001',
        10,
        'DONE',
        expect.anything(),
      );

      // Verify pick list status set to COMPLETED
      expect(mockUpdatePickListStatus).toHaveBeenCalledWith(
        'pl-001',
        'COMPLETED',
        {},
        expect.anything(),
      );

      // Verify PICK_LIST_COMPLETED event emitted
      expect(mockPublishPickListCompleted).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          pickListId: 'pl-001',
          warehouseId: 'wh-001',
          sourceOrderId: 'so-001',
        }),
      );

      expect(result).toEqual(expect.objectContaining({ status: 'COMPLETED' }));
    });

    it('sets line status to PARTIAL when pickedQty is less than requestedQty', async () => {
      const lot = makeStockLot({ quantity: 20, reservedQty: 10 });
      const pickList = makePickList({
        lines: [
          {
            id: 'pll-001',
            pickListId: 'pl-001',
            productId: 'prod-001',
            locationId: 'loc-001',
            lotId: 'lot-001',
            requestedQty: 10,
            pickedQty: 0,
            status: 'PENDING',
          },
        ],
      });

      mockFindPickList.mockResolvedValue(pickList);
      mockFindStockLot.mockResolvedValue(lot);
      mockUpdatePickListLine.mockResolvedValue({ id: 'pll-001', pickedQty: 5, status: 'PARTIAL' });
      mockUpdateStockLotReserved.mockResolvedValue(lot);
      mockUpdateStockLotQuantity.mockResolvedValue(lot);
      mockUpdatePickListStatus.mockResolvedValue({ ...pickList, status: 'COMPLETED' });

      await svc.completePickList(
        TENANT_ID,
        'pl-001',
        { lines: [{ lineId: 'pll-001', pickedQty: 5 }] },
        ACTOR_ID,
      );

      expect(mockUpdatePickListLine).toHaveBeenCalledWith(
        'pll-001',
        5,
        'PARTIAL',
        expect.anything(),
      );
    });

    it('throws ValidationError if pick list is already completed', async () => {
      mockFindPickList.mockResolvedValue(makePickList({ status: 'COMPLETED' }));

      await expect(
        svc.completePickList(
          TENANT_ID,
          'pl-001',
          { lines: [{ lineId: 'pll-001', pickedQty: 10 }] },
          ACTOR_ID,
        ),
      ).rejects.toThrow('already completed');
    });

    it('throws ValidationError if pick list is cancelled', async () => {
      mockFindPickList.mockResolvedValue(makePickList({ status: 'CANCELLED' }));

      await expect(
        svc.completePickList(
          TENANT_ID,
          'pl-001',
          { lines: [{ lineId: 'pll-001', pickedQty: 10 }] },
          ACTOR_ID,
        ),
      ).rejects.toThrow('cancelled');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // dispatchShipment
  // ─────────────────────────────────────────────────────────────────────────────

  describe('dispatchShipment', () => {
    it('dispatches shipment and emits SHIPMENT_DISPATCHED event', async () => {
      const shipment = makeShipment();
      const pickList = makePickList({ sourceOrderId: 'so-001' });
      const dispatchedShipment = { ...shipment, status: 'SHIPPED', shippedAt: new Date() };

      mockFindShipment.mockResolvedValue(shipment);
      mockFindPickList.mockResolvedValue(pickList);
      mockUpdateShipmentStatus.mockResolvedValue(dispatchedShipment);

      const result = await svc.dispatchShipment(
        TENANT_ID,
        'ship-001',
        {
          carrier: 'UPS',
          trackingNumber: '1Z999AA10123456784',
        },
        ACTOR_ID,
      );

      expect(mockFindShipment).toHaveBeenCalledWith(TENANT_ID, 'ship-001');
      expect(mockUpdateShipmentStatus).toHaveBeenCalledWith(
        'ship-001',
        'SHIPPED',
        expect.objectContaining({
          carrier: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          status: 'SHIPPED',
        }),
      );
      expect(mockPublishShipmentDispatched).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          shipmentId: 'ship-001',
          warehouseId: 'wh-001',
          carrier: 'UPS',
          trackingNumber: '1Z999AA10123456784',
          sourceOrderId: 'so-001',
        }),
      );
      expect(result).toEqual(dispatchedShipment);
    });

    it('throws ValidationError if shipment is not in PENDING status', async () => {
      mockFindShipment.mockResolvedValue(makeShipment({ status: 'SHIPPED' }));

      await expect(
        svc.dispatchShipment(TENANT_ID, 'ship-001', {}, ACTOR_ID),
      ).rejects.toThrow('Cannot be dispatched');
    });

    it('throws ValidationError if shipment is already delivered', async () => {
      mockFindShipment.mockResolvedValue(makeShipment({ status: 'DELIVERED' }));

      await expect(
        svc.dispatchShipment(TENANT_ID, 'ship-001', {}, ACTOR_ID),
      ).rejects.toThrow('PENDING');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // adjustStock
  // ─────────────────────────────────────────────────────────────────────────────

  describe('adjustStock', () => {
    it('creates ADJUSTMENT stock move and emits STOCK_ADJUSTED event', async () => {
      const lot = makeStockLot({ quantity: 100 });
      const adjustedLot = { ...lot, quantity: 90 };
      const move = makeStockMove({ moveType: 'ADJUSTMENT', reference: 'ADJ-000001' });

      mockFindStockLot.mockResolvedValue(lot);
      mockUpdateStockLotQuantity.mockResolvedValue(adjustedLot);
      mockCreateStockMove.mockResolvedValue(move);
      mockGenerateMoveReference.mockResolvedValue('ADJ-000001');
      mockTx.wHStockLot.findMany.mockResolvedValue([lot]);

      await svc.adjustStock(
        TENANT_ID,
        {
          warehouseId: 'wh-001',
          productId: 'prod-001',
          lotId: 'lot-001',
          quantityDelta: -10,
          reason: 'Damaged goods write-off',
        },
        ACTOR_ID,
      );

      expect(mockUpdateStockLotQuantity).toHaveBeenCalledWith(
        'lot-001',
        -10,
        expect.anything(),
      );
      expect(mockCreateStockMove).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          moveType: 'ADJUSTMENT',
          productId: 'prod-001',
          warehouseId: 'wh-001',
          plannedQty: 10,
          doneQty: 10,
        }),
        expect.anything(),
      );
      expect(mockPublishStockAdjusted).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          warehouseId: 'wh-001',
          productId: 'prod-001',
          lotId: 'lot-001',
          quantityDelta: -10,
          reason: 'Damaged goods write-off',
        }),
      );
    });

    it('throws ValidationError if adjustment would result in negative quantity', async () => {
      const lot = makeStockLot({ quantity: 5 });
      mockFindStockLot.mockResolvedValue(lot);
      mockTx.wHStockLot.findMany.mockResolvedValue([lot]);

      await expect(
        svc.adjustStock(
          TENANT_ID,
          {
            warehouseId: 'wh-001',
            productId: 'prod-001',
            lotId: 'lot-001',
            quantityDelta: -10,
            reason: 'Over-adjustment',
          },
          ACTOR_ID,
        ),
      ).rejects.toThrow('negative quantity');
    });

    it('creates a new lot when adjusting positively with no existing lot', async () => {
      const newLot = makeStockLot({ id: 'lot-new', lotNumber: `ADJ-${Date.now()}`, quantity: 0 });
      const move = makeStockMove({ moveType: 'ADJUSTMENT' });

      mockTx.wHStockLot.findMany.mockResolvedValue([]); // No existing lots
      mockCreateStockLot.mockResolvedValue(newLot);
      mockFindStockLot.mockResolvedValue({ ...newLot, quantity: 0 });
      mockUpdateStockLotQuantity.mockResolvedValue({ ...newLot, quantity: 25 });
      mockCreateStockMove.mockResolvedValue(move);
      mockGenerateMoveReference.mockResolvedValue('ADJ-000001');

      const result = await svc.adjustStock(
        TENANT_ID,
        {
          warehouseId: 'wh-001',
          productId: 'prod-001',
          quantityDelta: 25,
          reason: 'Initial stock entry',
        },
        ACTOR_ID,
      );

      expect(mockCreateStockLot).toHaveBeenCalled();
      expect(result).toEqual({ lot: expect.anything(), move });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // moveStock
  // ─────────────────────────────────────────────────────────────────────────────

  describe('moveStock', () => {
    it('creates INTERNAL move and updates lot location', async () => {
      const lot = makeStockLot({ quantity: 50, reservedQty: 0, warehouseId: 'wh-001' });
      const move = makeStockMove({ moveType: 'INTERNAL', reference: 'INT-000001' });
      const updatedLot = { ...lot, locationId: 'loc-002' };

      mockFindStockLot.mockResolvedValue(lot);
      mockCreateStockMove.mockResolvedValue(move);
      mockUpdateStockLotLocation.mockResolvedValue(updatedLot);
      mockGenerateMoveReference.mockResolvedValue('INT-000001');

      const result = await svc.moveStock(
        TENANT_ID,
        {
          warehouseId: 'wh-001',
          lotId: 'lot-001',
          fromLocationId: 'loc-001',
          toLocationId: 'loc-002',
          quantity: 20,
        },
        ACTOR_ID,
      );

      expect(mockCreateStockMove).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          moveType: 'INTERNAL',
          fromLocationId: 'loc-001',
          toLocationId: 'loc-002',
          doneQty: 20,
        }),
        expect.anything(),
      );
      expect(mockUpdateStockLotLocation).toHaveBeenCalledWith(
        'lot-001',
        'loc-002',
        expect.anything(),
      );
      expect(mockPublishStockMoved).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          lotId: 'lot-001',
          fromLocationId: 'loc-001',
          toLocationId: 'loc-002',
          quantity: 20,
        }),
      );
    });

    it('throws ValidationError if lot does not have sufficient available quantity', async () => {
      const lot = makeStockLot({ quantity: 10, reservedQty: 8 }); // only 2 available
      mockFindStockLot.mockResolvedValue(lot);

      await expect(
        svc.moveStock(
          TENANT_ID,
          {
            warehouseId: 'wh-001',
            lotId: 'lot-001',
            fromLocationId: 'loc-001',
            toLocationId: 'loc-002',
            quantity: 5,
          },
          ACTOR_ID,
        ),
      ).rejects.toThrow('Insufficient available quantity');
    });

    it('throws ValidationError if lot belongs to a different warehouse', async () => {
      const lot = makeStockLot({ warehouseId: 'wh-999' }); // different warehouse
      mockFindStockLot.mockResolvedValue(lot);

      await expect(
        svc.moveStock(
          TENANT_ID,
          {
            warehouseId: 'wh-001',
            lotId: 'lot-001',
            fromLocationId: 'loc-001',
            toLocationId: 'loc-002',
            quantity: 5,
          },
          ACTOR_ID,
        ),
      ).rejects.toThrow('does not belong to the specified warehouse');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Warehouse CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createWarehouse', () => {
    it('delegates to repository with correct parameters', async () => {
      const warehouse = makeWarehouse();
      mockCreateWarehouse.mockResolvedValue(warehouse);

      const result = await svc.createWarehouse(
        TENANT_ID,
        { name: 'Main Warehouse', code: 'WH-MAIN', address: {}, isDefault: true, status: 'ACTIVE' },
        ACTOR_ID,
      );

      expect(mockCreateWarehouse).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ name: 'Main Warehouse', code: 'WH-MAIN' }),
        ACTOR_ID,
      );
      expect(result).toEqual(warehouse);
    });
  });

  describe('getStockLevels', () => {
    it('returns aggregated stock levels from repository', async () => {
      const levels = [
        { productId: 'prod-001', warehouseId: 'wh-001', locationId: 'loc-001', availableQty: 90, reservedQty: 10, totalQty: 100 },
      ];
      mockGetAggregatedStockLevels.mockResolvedValue(levels);

      const result = await svc.getStockLevels(TENANT_ID, { productId: 'prod-001' });

      expect(mockGetAggregatedStockLevels).toHaveBeenCalledWith(TENANT_ID, { productId: 'prod-001' });
      expect(result).toEqual(levels);
    });
  });
});
