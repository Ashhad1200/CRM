import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockCreateBOM = vi.fn();
const mockFindBOMById = vi.fn();
const mockFindBOMs = vi.fn();
const mockUpdateBOM = vi.fn();
const mockCreateWorkCenter = vi.fn();
const mockFindWorkCenters = vi.fn();
const mockFindWorkOrderById = vi.fn();
const mockFindWorkOrders = vi.fn();
const mockCreateWorkOrder = vi.fn();
const mockUpdateWorkOrder = vi.fn();
const mockUpdateWorkOrderStatus = vi.fn();
const mockGetNextWorkOrderNumber = vi.fn();
const mockRecordMaterialConsumption = vi.fn();
const mockRecordProductionOutput = vi.fn();
const mockCreateMRPRun = vi.fn();
const mockUpdateMRPRunStatus = vi.fn();
const mockFindMRPRuns = vi.fn();
const mockFindMRPRunById = vi.fn();
const mockFindWorkCenterById = vi.fn();

vi.mock('../repository.js', () => ({
  createBOM: (...args: unknown[]) => mockCreateBOM(...args),
  findBOMById: (...args: unknown[]) => mockFindBOMById(...args),
  findBOMs: (...args: unknown[]) => mockFindBOMs(...args),
  updateBOM: (...args: unknown[]) => mockUpdateBOM(...args),
  createWorkCenter: (...args: unknown[]) => mockCreateWorkCenter(...args),
  findWorkCenters: (...args: unknown[]) => mockFindWorkCenters(...args),
  findWorkCenterById: (...args: unknown[]) => mockFindWorkCenterById(...args),
  findWorkOrderById: (...args: unknown[]) => mockFindWorkOrderById(...args),
  findWorkOrders: (...args: unknown[]) => mockFindWorkOrders(...args),
  createWorkOrder: (...args: unknown[]) => mockCreateWorkOrder(...args),
  updateWorkOrder: (...args: unknown[]) => mockUpdateWorkOrder(...args),
  updateWorkOrderStatus: (...args: unknown[]) => mockUpdateWorkOrderStatus(...args),
  getNextWorkOrderNumber: (...args: unknown[]) => mockGetNextWorkOrderNumber(...args),
  recordMaterialConsumption: (...args: unknown[]) => mockRecordMaterialConsumption(...args),
  recordProductionOutput: (...args: unknown[]) => mockRecordProductionOutput(...args),
  createMRPRun: (...args: unknown[]) => mockCreateMRPRun(...args),
  updateMRPRunStatus: (...args: unknown[]) => mockUpdateMRPRunStatus(...args),
  findMRPRuns: (...args: unknown[]) => mockFindMRPRuns(...args),
  findMRPRunById: (...args: unknown[]) => mockFindMRPRunById(...args),
}));

const mockPublishWorkOrderCreated = vi.fn();
const mockPublishWorkOrderReleased = vi.fn();
const mockPublishWorkOrderCompleted = vi.fn();
const mockPublishProductionOutputRecorded = vi.fn();
const mockPublishMRPRunCompleted = vi.fn();

vi.mock('../events.js', () => ({
  publishWorkOrderCreated: (...args: unknown[]) => mockPublishWorkOrderCreated(...args),
  publishWorkOrderReleased: (...args: unknown[]) => mockPublishWorkOrderReleased(...args),
  publishWorkOrderCompleted: (...args: unknown[]) => mockPublishWorkOrderCompleted(...args),
  publishProductionOutputRecorded: (...args: unknown[]) =>
    mockPublishProductionOutputRecorded(...args),
  publishMRPRunCompleted: (...args: unknown[]) => mockPublishMRPRunCompleted(...args),
  MANUFACTURING_EVENTS: {
    WORK_ORDER_CREATED: 'manufacturing.work_order.created',
    WORK_ORDER_RELEASED: 'manufacturing.work_order.released',
    WORK_ORDER_COMPLETED: 'manufacturing.work_order.completed',
    PRODUCTION_OUTPUT_RECORDED: 'manufacturing.production.output_recorded',
    MRP_RUN_COMPLETED: 'manufacturing.mrp.completed',
  },
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
  tenantContext: { getStore: vi.fn() },
}));

vi.mock('@softcrm/shared-kernel', async () => {
  const actual = await vi.importActual<typeof import('@softcrm/shared-kernel')>(
    '@softcrm/shared-kernel',
  );
  return {
    ...actual,
    generateId: vi.fn(() => 'generated-id'),
  };
});

// ── Import under test (after mocks) ────────────────────────────────────────────

import {
  createBOM,
  createWorkOrder,
  releaseWorkOrder,
  completeWorkOrder,
  recordProductionOutput,
  runMRP,
} from '../service.js';

import { ValidationError, NotFoundError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';

const DEFAULT_PAGINATION = { page: 1, limit: 20 };

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPublishWorkOrderCreated.mockResolvedValue(undefined);
  mockPublishWorkOrderReleased.mockResolvedValue(undefined);
  mockPublishWorkOrderCompleted.mockResolvedValue(undefined);
  mockPublishProductionOutputRecorded.mockResolvedValue(undefined);
  mockPublishMRPRunCompleted.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createBOM ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createBOM', () => {
  it('creates a BOM with line items and returns the persisted record', async () => {
    const bomData = {
      productId: 'product-1',
      name: 'Widget BOM v1',
      bomVersion: '1.0',
      isActive: true,
      lines: [
        {
          componentProductId: 'comp-1',
          description: 'Steel rod',
          quantity: 5,
          unit: 'kg',
          unitCost: 10,
        },
        {
          componentProductId: 'comp-2',
          description: 'Bolt set',
          quantity: 20,
          unit: 'pcs',
          unitCost: 0.5,
        },
      ],
    };

    const createdBOM = {
      id: 'bom-1',
      tenantId: TENANT_ID,
      ...bomData,
      totalCost: 60,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: ACTOR_ID,
      lines: bomData.lines.map((l, i) => ({
        id: `line-${i + 1}`,
        bomId: 'bom-1',
        ...l,
        lineTotal: l.quantity * l.unitCost,
      })),
    };

    mockCreateBOM.mockResolvedValue(createdBOM);

    const result = await createBOM(TENANT_ID, bomData, ACTOR_ID);

    expect(mockCreateBOM).toHaveBeenCalledWith(TENANT_ID, bomData, ACTOR_ID);
    expect(result.id).toBe('bom-1');
    expect(result.name).toBe('Widget BOM v1');
    expect(result.lines).toHaveLength(2);
  });

  it('delegates directly to repository without additional transformation', async () => {
    const bomData = {
      productId: 'product-2',
      name: 'Simple BOM',
      bomVersion: '2.0',
      isActive: true,
      lines: [
        { componentProductId: 'comp-3', quantity: 1, unit: 'pcs', unitCost: 100 },
      ],
    };

    const expectedBOM = { id: 'bom-2', ...bomData, tenantId: TENANT_ID, totalCost: 100 };
    mockCreateBOM.mockResolvedValue(expectedBOM);

    await createBOM(TENANT_ID, bomData, ACTOR_ID);

    expect(mockCreateBOM).toHaveBeenCalledTimes(1);
    expect(mockCreateBOM).toHaveBeenCalledWith(TENANT_ID, bomData, ACTOR_ID);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createWorkOrder ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createWorkOrder', () => {
  const workOrderData = {
    bomId: 'bom-1',
    productId: 'product-1',
    plannedQuantity: 100,
    plannedStartDate: '2026-03-01',
    plannedEndDate: '2026-03-15',
    notes: 'Rush order',
  };

  it('validates BOM exists, generates work order number, and emits created event', async () => {
    const bom = {
      id: 'bom-1',
      tenantId: TENANT_ID,
      productId: 'product-1',
      name: 'Widget BOM',
      isActive: true,
      lines: [],
    };

    const workOrder = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      workOrderNumber: 'WO-00001',
      bomId: 'bom-1',
      productId: 'product-1',
      plannedQuantity: 100,
      producedQuantity: 0,
      status: 'DRAFT',
      bom: { id: 'bom-1', name: 'Widget BOM', bomVersion: '1.0' },
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    mockFindBOMById.mockResolvedValue(bom);
    mockGetNextWorkOrderNumber.mockResolvedValue('WO-00001');
    mockCreateWorkOrder.mockResolvedValue(workOrder);

    const result = await createWorkOrder(TENANT_ID, workOrderData, ACTOR_ID);

    expect(mockFindBOMById).toHaveBeenCalledWith(TENANT_ID, 'bom-1');
    expect(mockGetNextWorkOrderNumber).toHaveBeenCalledWith(TENANT_ID);
    expect(mockCreateWorkOrder).toHaveBeenCalledWith(
      TENANT_ID,
      workOrderData,
      'WO-00001',
      ACTOR_ID,
    );
    expect(mockPublishWorkOrderCreated).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        workOrderId: 'wo-1',
        workOrderNumber: 'WO-00001',
        bomId: 'bom-1',
        productId: 'product-1',
        plannedQuantity: 100,
      }),
    );
    expect(result.id).toBe('wo-1');
    expect(result.status).toBe('DRAFT');
  });

  it('throws NotFoundError when BOM does not exist for this tenant', async () => {
    mockFindBOMById.mockRejectedValue(new NotFoundError('BillOfMaterial', 'bom-nonexistent'));

    await expect(
      createWorkOrder(TENANT_ID, { ...workOrderData, bomId: 'bom-nonexistent' }, ACTOR_ID),
    ).rejects.toThrow(NotFoundError);

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
    expect(mockPublishWorkOrderCreated).not.toHaveBeenCalled();
  });

  it('sets initial status to DRAFT', async () => {
    const bom = { id: 'bom-1', tenantId: TENANT_ID, name: 'BOM', lines: [] };
    const workOrder = {
      id: 'wo-2',
      tenantId: TENANT_ID,
      workOrderNumber: 'WO-00002',
      bomId: 'bom-1',
      productId: 'product-1',
      plannedQuantity: 50,
      producedQuantity: 0,
      status: 'DRAFT',
      bom: { id: 'bom-1', name: 'BOM', bomVersion: '1.0' },
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    mockFindBOMById.mockResolvedValue(bom);
    mockGetNextWorkOrderNumber.mockResolvedValue('WO-00002');
    mockCreateWorkOrder.mockResolvedValue(workOrder);

    const result = await createWorkOrder(TENANT_ID, workOrderData, ACTOR_ID);

    expect(result.status).toBe('DRAFT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── releaseWorkOrder ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('releaseWorkOrder', () => {
  it('transitions a DRAFT work order to IN_PROGRESS and emits released event', async () => {
    const draftWO = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      workOrderNumber: 'WO-00001',
      bomId: 'bom-1',
      productId: 'product-1',
      status: 'DRAFT',
      plannedQuantity: 100,
      producedQuantity: 0,
      bom: { id: 'bom-1', name: 'BOM', bomVersion: '1.0' },
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    const releasedWO = { ...draftWO, status: 'IN_PROGRESS', actualStartDate: new Date() };

    mockFindWorkOrderById.mockResolvedValue(draftWO);
    mockUpdateWorkOrderStatus.mockResolvedValue(releasedWO);

    const result = await releaseWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID);

    expect(mockUpdateWorkOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'wo-1',
      'IN_PROGRESS',
      ACTOR_ID,
      expect.objectContaining({ actualStartDate: expect.any(Date) }),
    );
    expect(mockPublishWorkOrderReleased).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        workOrderId: 'wo-1',
        workOrderNumber: 'WO-00001',
        productId: 'product-1',
        plannedQuantity: 100,
      }),
    );
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('throws ValidationError when work order is not in DRAFT status', async () => {
    const inProgressWO = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      status: 'IN_PROGRESS',
      bom: {},
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    mockFindWorkOrderById.mockResolvedValue(inProgressWO);

    await expect(releaseWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    expect(mockUpdateWorkOrderStatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── completeWorkOrder ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('completeWorkOrder', () => {
  const completedOperations = [
    {
      id: 'op-1',
      name: 'Cutting',
      sequence: 1,
      status: 'COMPLETED',
      workCenterId: 'wc-1',
      plannedHours: 2,
      actualHours: 2.5,
      startedAt: new Date(),
      completedAt: new Date(),
    },
    {
      id: 'op-2',
      name: 'Assembly',
      sequence: 2,
      status: 'COMPLETED',
      workCenterId: 'wc-2',
      plannedHours: 3,
      actualHours: 3,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  ];

  const productionOutputs = [
    {
      id: 'out-1',
      workOrderId: 'wo-1',
      productId: 'product-1',
      quantity: 95,
      unit: 'pcs',
      lotNumber: 'LOT-001',
      receivedAt: new Date(),
      receivedBy: ACTOR_ID,
      warehouseLocationId: null,
    },
  ];

  it('completes a work order when all operations done and output recorded, emits inventory event', async () => {
    const inProgressWO = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      workOrderNumber: 'WO-00001',
      bomId: 'bom-1',
      productId: 'product-1',
      status: 'IN_PROGRESS',
      plannedQuantity: 100,
      producedQuantity: 0,
      bom: { id: 'bom-1', name: 'BOM', bomVersion: '1.0' },
      operations: completedOperations,
      materialConsumptions: [],
      productionOutputs,
    };

    const completedWO = {
      ...inProgressWO,
      status: 'COMPLETED',
      producedQuantity: 95,
      actualEndDate: new Date(),
    };

    mockFindWorkOrderById.mockResolvedValue(inProgressWO);
    mockUpdateWorkOrderStatus.mockResolvedValue(completedWO);

    const result = await completeWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID);

    expect(mockUpdateWorkOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'wo-1',
      'COMPLETED',
      ACTOR_ID,
      expect.objectContaining({
        actualEndDate: expect.any(Date),
        producedQuantity: 95,
      }),
    );
    expect(mockPublishWorkOrderCompleted).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        workOrderId: 'wo-1',
        workOrderNumber: 'WO-00001',
        productId: 'product-1',
        producedQuantity: 95,
      }),
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('throws ValidationError when work order is not IN_PROGRESS', async () => {
    const draftWO = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      status: 'DRAFT',
      bom: {},
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    mockFindWorkOrderById.mockResolvedValue(draftWO);

    await expect(completeWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    expect(mockPublishWorkOrderCompleted).not.toHaveBeenCalled();
  });

  it('throws ValidationError when some operations are not completed', async () => {
    const pendingOperations = [
      { id: 'op-1', name: 'Cutting', sequence: 1, status: 'COMPLETED' },
      { id: 'op-2', name: 'Assembly', sequence: 2, status: 'PENDING' }, // still pending
    ];

    const woWithPendingOps = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      status: 'IN_PROGRESS',
      bom: {},
      operations: pendingOperations,
      materialConsumptions: [],
      productionOutputs: productionOutputs,
    };

    mockFindWorkOrderById.mockResolvedValue(woWithPendingOps);

    await expect(completeWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    expect(mockUpdateWorkOrderStatus).not.toHaveBeenCalled();
  });

  it('throws ValidationError when no production output has been recorded', async () => {
    const woNoOutput = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      status: 'IN_PROGRESS',
      bom: {},
      operations: completedOperations,
      materialConsumptions: [],
      productionOutputs: [], // no output
    };

    mockFindWorkOrderById.mockResolvedValue(woNoOutput);

    await expect(completeWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    expect(mockUpdateWorkOrderStatus).not.toHaveBeenCalled();
    expect(mockPublishWorkOrderCompleted).not.toHaveBeenCalled();
  });

  it('sums multiple production output records for total produced quantity', async () => {
    const multipleOutputs = [
      {
        id: 'out-1',
        workOrderId: 'wo-1',
        productId: 'product-1',
        quantity: 50,
        unit: 'pcs',
        lotNumber: 'LOT-001',
        receivedAt: new Date(),
        receivedBy: ACTOR_ID,
        warehouseLocationId: null,
      },
      {
        id: 'out-2',
        workOrderId: 'wo-1',
        productId: 'product-1',
        quantity: 45,
        unit: 'pcs',
        lotNumber: 'LOT-002',
        receivedAt: new Date(),
        receivedBy: ACTOR_ID,
        warehouseLocationId: null,
      },
    ];

    const wo = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      workOrderNumber: 'WO-00001',
      bomId: 'bom-1',
      productId: 'product-1',
      status: 'IN_PROGRESS',
      plannedQuantity: 100,
      producedQuantity: 0,
      bom: { id: 'bom-1', name: 'BOM', bomVersion: '1.0' },
      operations: completedOperations,
      materialConsumptions: [],
      productionOutputs: multipleOutputs,
    };

    const completedWO = { ...wo, status: 'COMPLETED', producedQuantity: 95 };
    mockFindWorkOrderById.mockResolvedValue(wo);
    mockUpdateWorkOrderStatus.mockResolvedValue(completedWO);

    await completeWorkOrder(TENANT_ID, 'wo-1', ACTOR_ID);

    // 50 + 45 = 95
    expect(mockUpdateWorkOrderStatus).toHaveBeenCalledWith(
      TENANT_ID,
      'wo-1',
      'COMPLETED',
      ACTOR_ID,
      expect.objectContaining({ producedQuantity: 95 }),
    );
    expect(mockPublishWorkOrderCompleted).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ producedQuantity: 95 }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── recordProductionOutput (inventory event) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('recordProductionOutput', () => {
  it('records output and emits inventory event for stock receipt', async () => {
    const inProgressWO = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      workOrderNumber: 'WO-00001',
      productId: 'product-1',
      status: 'IN_PROGRESS',
      bom: {},
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    const outputRecord = {
      id: 'out-1',
      workOrderId: 'wo-1',
      productId: 'product-1',
      quantity: 50,
      unit: 'pcs',
      lotNumber: 'LOT-001',
      receivedAt: new Date(),
      receivedBy: ACTOR_ID,
      warehouseLocationId: 'wh-loc-1',
    };

    mockFindWorkOrderById.mockResolvedValue(inProgressWO);
    mockRecordProductionOutput.mockResolvedValue(outputRecord);

    const outputData = {
      quantity: 50,
      unit: 'pcs',
      lotNumber: 'LOT-001',
      warehouseLocationId: 'wh-loc-1',
    };

    const result = await recordProductionOutput(TENANT_ID, 'wo-1', outputData, ACTOR_ID);

    expect(mockRecordProductionOutput).toHaveBeenCalledWith(
      'wo-1',
      'product-1',
      outputData,
      ACTOR_ID,
    );
    expect(mockPublishProductionOutputRecorded).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        workOrderId: 'wo-1',
        productId: 'product-1',
        quantity: 50,
        unit: 'pcs',
        lotNumber: 'LOT-001',
        warehouseLocationId: 'wh-loc-1',
      }),
    );
    expect(result.id).toBe('out-1');
  });

  it('throws ValidationError when work order is not IN_PROGRESS', async () => {
    const completedWO = {
      id: 'wo-1',
      tenantId: TENANT_ID,
      productId: 'product-1',
      status: 'COMPLETED',
      bom: {},
      operations: [],
      materialConsumptions: [],
      productionOutputs: [],
    };

    mockFindWorkOrderById.mockResolvedValue(completedWO);

    await expect(
      recordProductionOutput(
        TENANT_ID,
        'wo-1',
        { quantity: 10, unit: 'pcs' },
        ACTOR_ID,
      ),
    ).rejects.toThrow(ValidationError);

    expect(mockRecordProductionOutput).not.toHaveBeenCalled();
    expect(mockPublishProductionOutputRecorded).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── runMRP ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('runMRP', () => {
  it('creates MRP run record and emits mrp.completed event', async () => {
    const mrpRunCreated = {
      id: 'mrp-1',
      tenantId: TENANT_ID,
      horizon: 30,
      status: 'RUNNING',
      recommendations: [],
      createdAt: new Date(),
      createdBy: ACTOR_ID,
    };

    const mrpRunCompleted = {
      ...mrpRunCreated,
      status: 'COMPLETED',
    };

    mockCreateMRPRun.mockResolvedValue(mrpRunCreated);
    mockUpdateMRPRunStatus.mockResolvedValue(mrpRunCompleted);

    const result = await runMRP(TENANT_ID, { horizon: 30 }, ACTOR_ID);

    expect(mockCreateMRPRun).toHaveBeenCalledWith(TENANT_ID, { horizon: 30 }, ACTOR_ID);
    expect(mockUpdateMRPRunStatus).toHaveBeenCalledWith(TENANT_ID, 'mrp-1', 'COMPLETED', []);
    expect(mockPublishMRPRunCompleted).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        mrpRunId: 'mrp-1',
        tenantId: TENANT_ID,
        horizon: 30,
        recommendationCount: 0,
      }),
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('uses default horizon of 30 days when not specified', async () => {
    const mrpRun = {
      id: 'mrp-2',
      tenantId: TENANT_ID,
      horizon: 30,
      status: 'RUNNING',
      recommendations: [],
      createdAt: new Date(),
      createdBy: ACTOR_ID,
    };

    mockCreateMRPRun.mockResolvedValue(mrpRun);
    mockUpdateMRPRunStatus.mockResolvedValue({ ...mrpRun, status: 'COMPLETED' });

    await runMRP(TENANT_ID, { horizon: 30 }, ACTOR_ID);

    expect(mockPublishMRPRunCompleted).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ horizon: 30 }),
    );
  });
});
