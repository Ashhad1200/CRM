import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock setup (must be before imports of the module under test) ────────────────

const mockFindSupplierByCode = vi.fn();
const mockFindSupplier = vi.fn();
const mockFindSuppliers = vi.fn();
const mockCreateSupplier = vi.fn();
const mockUpdateSupplier = vi.fn();
const mockAddSupplierProduct = vi.fn();
const mockGetNextReqNumber = vi.fn();
const mockCreatePurchaseRequisition = vi.fn();
const mockFindPurchaseRequisition = vi.fn();
const mockFindPurchaseRequisitions = vi.fn();
const mockUpdatePurchaseRequisitionStatus = vi.fn();
const mockGetNextRFQNumber = vi.fn();
const mockCreateRFQ = vi.fn();
const mockFindRFQ = vi.fn();
const mockFindRFQs = vi.fn();
const mockFindRFQSupplier = vi.fn();
const mockUpdateRFQStatus = vi.fn();
const mockUpdateRFQSupplierResponse = vi.fn();
const mockMarkRFQSuppliersAsSent = vi.fn();
const mockGetNextPONumber = vi.fn();
const mockCreateProcurementPO = vi.fn();
const mockFindProcurementPO = vi.fn();
const mockFindProcurementPOs = vi.fn();
const mockUpdateProcurementPOStatus = vi.fn();
const mockUpdateProcurementPOLineReceivedQty = vi.fn();
const mockGetNextReceiptNumber = vi.fn();
const mockCreateGoodsReceipt = vi.fn();
const mockFindGoodsReceipt = vi.fn();
const mockUpdateGoodsReceiptStatus = vi.fn();

vi.mock('../repository.js', () => ({
  findSupplierByCode: (...args: unknown[]) => mockFindSupplierByCode(...args),
  findSupplier: (...args: unknown[]) => mockFindSupplier(...args),
  findSuppliers: (...args: unknown[]) => mockFindSuppliers(...args),
  createSupplier: (...args: unknown[]) => mockCreateSupplier(...args),
  updateSupplier: (...args: unknown[]) => mockUpdateSupplier(...args),
  addSupplierProduct: (...args: unknown[]) => mockAddSupplierProduct(...args),
  getNextReqNumber: (...args: unknown[]) => mockGetNextReqNumber(...args),
  createPurchaseRequisition: (...args: unknown[]) => mockCreatePurchaseRequisition(...args),
  findPurchaseRequisition: (...args: unknown[]) => mockFindPurchaseRequisition(...args),
  findPurchaseRequisitions: (...args: unknown[]) => mockFindPurchaseRequisitions(...args),
  updatePurchaseRequisitionStatus: (...args: unknown[]) => mockUpdatePurchaseRequisitionStatus(...args),
  getNextRFQNumber: (...args: unknown[]) => mockGetNextRFQNumber(...args),
  createRFQ: (...args: unknown[]) => mockCreateRFQ(...args),
  findRFQ: (...args: unknown[]) => mockFindRFQ(...args),
  findRFQs: (...args: unknown[]) => mockFindRFQs(...args),
  findRFQSupplier: (...args: unknown[]) => mockFindRFQSupplier(...args),
  updateRFQStatus: (...args: unknown[]) => mockUpdateRFQStatus(...args),
  updateRFQSupplierResponse: (...args: unknown[]) => mockUpdateRFQSupplierResponse(...args),
  markRFQSuppliersAsSent: (...args: unknown[]) => mockMarkRFQSuppliersAsSent(...args),
  getNextPONumber: (...args: unknown[]) => mockGetNextPONumber(...args),
  createProcurementPO: (...args: unknown[]) => mockCreateProcurementPO(...args),
  findProcurementPO: (...args: unknown[]) => mockFindProcurementPO(...args),
  findProcurementPOs: (...args: unknown[]) => mockFindProcurementPOs(...args),
  updateProcurementPOStatus: (...args: unknown[]) => mockUpdateProcurementPOStatus(...args),
  updateProcurementPOLineReceivedQty: (...args: unknown[]) => mockUpdateProcurementPOLineReceivedQty(...args),
  getNextReceiptNumber: (...args: unknown[]) => mockGetNextReceiptNumber(...args),
  createGoodsReceipt: (...args: unknown[]) => mockCreateGoodsReceipt(...args),
  findGoodsReceipt: (...args: unknown[]) => mockFindGoodsReceipt(...args),
  updateGoodsReceiptStatus: (...args: unknown[]) => mockUpdateGoodsReceiptStatus(...args),
}));

const mockPublishPOCreated = vi.fn();
const mockPublishPOConfirmed = vi.fn();
const mockPublishGoodsReceived = vi.fn();
const mockPublishSupplierCreated = vi.fn();

vi.mock('../events.js', () => ({
  publishPOCreated: (...args: unknown[]) => mockPublishPOCreated(...args),
  publishPOConfirmed: (...args: unknown[]) => mockPublishPOConfirmed(...args),
  publishGoodsReceived: (...args: unknown[]) => mockPublishGoodsReceived(...args),
  publishSupplierCreated: (...args: unknown[]) => mockPublishSupplierCreated(...args),
  PROCUREMENT_EVENTS: {
    PO_CREATED: 'procurement.po.created',
    PO_CONFIRMED: 'procurement.po.confirmed',
    GOODS_RECEIVED: 'procurement.goods_received',
    SUPPLIER_CREATED: 'procurement.supplier.created',
  },
}));

const mockTx = {
  procurementPO: {
    findUniqueOrThrow: vi.fn(),
  },
};
const mockTransaction = vi.fn((cb: Function) => cb(mockTx));
const mockPrisma = {
  $transaction: mockTransaction,
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
  createPurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  approvePurchaseRequisition,
  rejectPurchaseRequisition,
  confirmGoodsReceipt,
  createSupplier,
} from '../service.js';

import { ValidationError, NotFoundError } from '@softcrm/shared-kernel';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'user-1';
const SUPPLIER_ID = '11111111-1111-1111-1111-111111111111';
const PO_ID = '22222222-2222-2222-2222-222222222222';
const RECEIPT_ID = '33333333-3333-3333-3333-333333333333';
const REQUISITION_ID = '44444444-4444-4444-4444-444444444444';

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.mockImplementation((cb: Function) => cb(mockTx));
  mockTx.procurementPO.findUniqueOrThrow.mockResolvedValue({ lines: [] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createPurchaseOrder ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createPurchaseOrder', () => {
  const input = {
    supplierId: SUPPLIER_ID,
    currency: 'USD' as const,
    lines: [
      {
        productId: '55555555-5555-5555-5555-555555555555',
        description: 'Widget A',
        quantity: 100,
        unitPrice: 9.99,
        taxRate: 0.1,
      },
    ],
  };

  const mockPO = {
    id: PO_ID,
    poNumber: 'PO-001',
    supplierId: SUPPLIER_ID,
    total: 1098.9,
    currency: 'USD',
    status: 'DRAFT',
    lines: [],
  };

  beforeEach(() => {
    mockFindSupplier.mockResolvedValue({ id: SUPPLIER_ID, name: 'Acme Corp' });
    mockCreateProcurementPO.mockResolvedValue(mockPO);
    mockPublishPOCreated.mockResolvedValue(undefined);
    mockUpdatePurchaseRequisitionStatus.mockResolvedValue(undefined);
  });

  it('creates a purchase order with DRAFT status', async () => {
    const result = await createPurchaseOrder(TENANT_ID, input, ACTOR_ID);

    expect(mockFindSupplier).toHaveBeenCalledWith(TENANT_ID, SUPPLIER_ID);
    expect(mockCreateProcurementPO).toHaveBeenCalledWith(
      TENANT_ID,
      input,
      ACTOR_ID,
      mockTx,
    );
    expect(result).toEqual(mockPO);
  });

  it('publishes PO_CREATED event after creation', async () => {
    await createPurchaseOrder(TENANT_ID, input, ACTOR_ID);

    expect(mockPublishPOCreated).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: PO_ID, poNumber: 'PO-001' }),
    );
  });

  it('updates requisition status to PO_CREATED when requisitionId provided', async () => {
    const inputWithReq = { ...input, requisitionId: REQUISITION_ID };
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'APPROVED',
    });

    await createPurchaseOrder(TENANT_ID, inputWithReq, ACTOR_ID);

    expect(mockUpdatePurchaseRequisitionStatus).toHaveBeenCalledWith(
      TENANT_ID,
      REQUISITION_ID,
      'PO_CREATED',
      {},
      mockTx,
    );
  });

  it('throws NotFoundError when supplier does not exist', async () => {
    mockFindSupplier.mockRejectedValue(new NotFoundError('Supplier', SUPPLIER_ID));

    await expect(createPurchaseOrder(TENANT_ID, input, ACTOR_ID)).rejects.toThrow(
      NotFoundError,
    );
    expect(mockCreateProcurementPO).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── confirmPurchaseOrder ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('confirmPurchaseOrder', () => {
  const mockDraftPO = {
    id: PO_ID,
    poNumber: 'PO-001',
    supplierId: SUPPLIER_ID,
    status: 'DRAFT',
    total: 999,
    currency: 'USD',
  };

  beforeEach(() => {
    mockFindProcurementPO.mockResolvedValue(mockDraftPO);
    mockPublishPOConfirmed.mockResolvedValue(undefined);
  });

  it('confirms a draft purchase order', async () => {
    const confirmedPO = { ...mockDraftPO, status: 'CONFIRMED' };
    mockUpdateProcurementPOStatus.mockResolvedValue(confirmedPO);

    const result = await confirmPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID);

    expect(mockFindProcurementPO).toHaveBeenCalledWith(TENANT_ID, PO_ID);
    expect(mockUpdateProcurementPOStatus).toHaveBeenCalledWith(
      TENANT_ID,
      PO_ID,
      'CONFIRMED',
      expect.objectContaining({
        approvalStatus: 'APPROVED',
        approvedBy: ACTOR_ID,
        approvedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual(confirmedPO);
  });

  it('publishes PO_CONFIRMED event after confirmation', async () => {
    const confirmedPO = { ...mockDraftPO, status: 'CONFIRMED' };
    mockUpdateProcurementPOStatus.mockResolvedValue(confirmedPO);

    await confirmPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID);

    expect(mockPublishPOConfirmed).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      confirmedPO,
    );
  });

  it('throws ValidationError when PO is not in DRAFT status', async () => {
    mockFindProcurementPO.mockResolvedValue({ ...mockDraftPO, status: 'CONFIRMED' });

    await expect(confirmPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(confirmPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      'DRAFT',
    );
    expect(mockUpdateProcurementPOStatus).not.toHaveBeenCalled();
  });

  it('throws ValidationError when PO is cancelled', async () => {
    mockFindProcurementPO.mockResolvedValue({ ...mockDraftPO, status: 'CANCELLED' });

    await expect(confirmPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    expect(mockUpdateProcurementPOStatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── confirmGoodsReceipt ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('confirmGoodsReceipt', () => {
  const mockDraftReceipt = {
    id: RECEIPT_ID,
    receiptNumber: 'GR-001',
    poId: PO_ID,
    warehouseId: '66666666-6666-6666-6666-666666666666',
    receivedAt: new Date('2024-01-15'),
    status: 'DRAFT',
    lines: [
      {
        id: 'rl-1',
        poLineId: 'pol-1',
        productId: '77777777-7777-7777-7777-777777777777',
        receivedQty: 50,
        lotNumber: 'LOT-001',
        notes: null,
      },
    ],
  };

  const mockPOWithLines = {
    id: PO_ID,
    status: 'CONFIRMED',
    lines: [
      {
        id: 'pol-1',
        productId: '77777777-7777-7777-7777-777777777777',
        quantity: 100,
        receivedQty: 0,
      },
    ],
  };

  beforeEach(() => {
    mockFindGoodsReceipt.mockResolvedValue(mockDraftReceipt);
    mockFindProcurementPO.mockResolvedValue(mockPOWithLines);
    mockUpdateProcurementPOLineReceivedQty.mockResolvedValue(undefined);
    mockUpdateProcurementPOStatus.mockResolvedValue(undefined);
    mockPublishGoodsReceived.mockResolvedValue(undefined);

    // Default: re-fetch returns partial receipt
    mockTx.procurementPO.findUniqueOrThrow.mockResolvedValue({
      lines: [
        { id: 'pol-1', receivedQty: 50, quantity: 100 },
      ],
    });
  });

  it('updates PO line receivedQty when confirming', async () => {
    const confirmedReceipt = { ...mockDraftReceipt, status: 'CONFIRMED' };
    mockUpdateGoodsReceiptStatus.mockResolvedValue(confirmedReceipt);

    await confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID);

    expect(mockUpdateProcurementPOLineReceivedQty).toHaveBeenCalledWith(
      'pol-1',
      50, // 0 existing + 50 received = 50
      mockTx,
    );
  });

  it('marks PO as PARTIALLY_RECEIVED when some lines are partially received', async () => {
    mockTx.procurementPO.findUniqueOrThrow.mockResolvedValue({
      lines: [
        { id: 'pol-1', receivedQty: 50, quantity: 100 }, // partially received
      ],
    });

    const confirmedReceipt = { ...mockDraftReceipt, status: 'CONFIRMED' };
    mockUpdateGoodsReceiptStatus.mockResolvedValue(confirmedReceipt);

    await confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID);

    expect(mockUpdateProcurementPOStatus).toHaveBeenCalledWith(
      TENANT_ID,
      PO_ID,
      'PARTIALLY_RECEIVED',
      {},
      mockTx,
    );
  });

  it('marks PO as RECEIVED when all lines are fully received', async () => {
    mockTx.procurementPO.findUniqueOrThrow.mockResolvedValue({
      lines: [
        { id: 'pol-1', receivedQty: 100, quantity: 100 }, // fully received
      ],
    });

    const confirmedReceipt = { ...mockDraftReceipt, status: 'CONFIRMED' };
    mockUpdateGoodsReceiptStatus.mockResolvedValue(confirmedReceipt);

    await confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID);

    expect(mockUpdateProcurementPOStatus).toHaveBeenCalledWith(
      TENANT_ID,
      PO_ID,
      'RECEIVED',
      {},
      mockTx,
    );
  });

  it('emits GOODS_RECEIVED event with receipt and line details', async () => {
    const confirmedReceipt = { ...mockDraftReceipt, status: 'CONFIRMED' };
    mockUpdateGoodsReceiptStatus.mockResolvedValue(confirmedReceipt);

    await confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID);

    expect(mockPublishGoodsReceived).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        id: RECEIPT_ID,
        receiptNumber: 'GR-001',
        poId: PO_ID,
        lines: expect.arrayContaining([
          expect.objectContaining({
            productId: '77777777-7777-7777-7777-777777777777',
            receivedQty: 50,
          }),
        ]),
      }),
    );
  });

  it('throws ValidationError when receipt is already confirmed', async () => {
    mockFindGoodsReceipt.mockResolvedValue({ ...mockDraftReceipt, status: 'CONFIRMED' });

    await expect(confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID)).rejects.toThrow(
      'already confirmed',
    );
    expect(mockPublishGoodsReceived).not.toHaveBeenCalled();
  });

  it('does not update PO status when received qty has not changed', async () => {
    // PO is already CONFIRMED and no lines change
    mockTx.procurementPO.findUniqueOrThrow.mockResolvedValue({
      lines: [
        { id: 'pol-1', receivedQty: 0, quantity: 100 }, // No qty received yet
      ],
    });

    const confirmedReceipt = { ...mockDraftReceipt, status: 'CONFIRMED' };
    mockUpdateGoodsReceiptStatus.mockResolvedValue(confirmedReceipt);

    await confirmGoodsReceipt(TENANT_ID, RECEIPT_ID, ACTOR_ID);

    // Status stays CONFIRMED — no update call
    expect(mockUpdateProcurementPOStatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── approvePurchaseRequisition ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('approvePurchaseRequisition', () => {
  beforeEach(() => {
    mockUpdatePurchaseRequisitionStatus.mockResolvedValue(undefined);
  });

  it('approves a submitted requisition', async () => {
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'SUBMITTED',
    });
    const approved = { id: REQUISITION_ID, status: 'APPROVED' };
    mockUpdatePurchaseRequisitionStatus.mockResolvedValue(approved);

    const result = await approvePurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID);

    expect(mockFindPurchaseRequisition).toHaveBeenCalledWith(TENANT_ID, REQUISITION_ID);
    expect(mockUpdatePurchaseRequisitionStatus).toHaveBeenCalledWith(
      TENANT_ID,
      REQUISITION_ID,
      'APPROVED',
      expect.objectContaining({
        approvedBy: ACTOR_ID,
        approvedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual(approved);
  });

  it('throws ValidationError when requisition is not in SUBMITTED status', async () => {
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'DRAFT',
    });

    await expect(
      approvePurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
    await expect(
      approvePurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID),
    ).rejects.toThrow('SUBMITTED');
    expect(mockUpdatePurchaseRequisitionStatus).not.toHaveBeenCalled();
  });

  it('throws ValidationError when requisition is already approved', async () => {
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'APPROVED',
    });

    await expect(
      approvePurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
    expect(mockUpdatePurchaseRequisitionStatus).not.toHaveBeenCalled();
  });

  it('throws ValidationError when requisition is rejected', async () => {
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'REJECTED',
    });

    await expect(
      approvePurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
    expect(mockUpdatePurchaseRequisitionStatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── rejectPurchaseRequisition ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('rejectPurchaseRequisition', () => {
  it('rejects a submitted requisition', async () => {
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'SUBMITTED',
    });
    const rejected = { id: REQUISITION_ID, status: 'REJECTED' };
    mockUpdatePurchaseRequisitionStatus.mockResolvedValue(rejected);

    const result = await rejectPurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID);

    expect(mockUpdatePurchaseRequisitionStatus).toHaveBeenCalledWith(
      TENANT_ID,
      REQUISITION_ID,
      'REJECTED',
      expect.objectContaining({ approvedBy: ACTOR_ID }),
    );
    expect(result).toEqual(rejected);
  });

  it('throws ValidationError when requisition is not in SUBMITTED status', async () => {
    mockFindPurchaseRequisition.mockResolvedValue({
      id: REQUISITION_ID,
      status: 'DRAFT',
    });

    await expect(
      rejectPurchaseRequisition(TENANT_ID, REQUISITION_ID, ACTOR_ID),
    ).rejects.toThrow(ValidationError);
    expect(mockUpdatePurchaseRequisitionStatus).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── createSupplier ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createSupplier', () => {
  const input = {
    name: 'Acme Corp',
    code: 'ACME-001',
    currency: 'USD' as const,
  };

  it('creates a supplier when code is unique', async () => {
    mockFindSupplierByCode.mockResolvedValue(null);
    const created = { id: 's-1', ...input };
    mockCreateSupplier.mockResolvedValue(created);
    mockPublishSupplierCreated.mockResolvedValue(undefined);

    const result = await createSupplier(TENANT_ID, input, ACTOR_ID);

    expect(mockFindSupplierByCode).toHaveBeenCalledWith(TENANT_ID, 'ACME-001');
    expect(mockCreateSupplier).toHaveBeenCalledWith(TENANT_ID, input, ACTOR_ID);
    expect(mockPublishSupplierCreated).toHaveBeenCalledWith(TENANT_ID, ACTOR_ID, created);
    expect(result).toEqual(created);
  });

  it('throws ValidationError on duplicate supplier code', async () => {
    mockFindSupplierByCode.mockResolvedValue({ id: 'existing-1', code: 'ACME-001' });

    await expect(createSupplier(TENANT_ID, input, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(createSupplier(TENANT_ID, input, ACTOR_ID)).rejects.toThrow(
      '"ACME-001"',
    );
    expect(mockCreateSupplier).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── cancelPurchaseOrder ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('cancelPurchaseOrder', () => {
  it('cancels a confirmed purchase order', async () => {
    mockFindProcurementPO.mockResolvedValue({
      id: PO_ID,
      status: 'CONFIRMED',
    });
    const cancelledPO = { id: PO_ID, status: 'CANCELLED' };
    mockUpdateProcurementPOStatus.mockResolvedValue(cancelledPO);

    const result = await cancelPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID);

    expect(mockUpdateProcurementPOStatus).toHaveBeenCalledWith(
      TENANT_ID,
      PO_ID,
      'CANCELLED',
    );
    expect(result).toEqual(cancelledPO);
  });

  it('throws ValidationError when PO is fully received', async () => {
    mockFindProcurementPO.mockResolvedValue({ id: PO_ID, status: 'RECEIVED' });

    await expect(cancelPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(cancelPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      'fully received',
    );
    expect(mockUpdateProcurementPOStatus).not.toHaveBeenCalled();
  });

  it('throws ValidationError when PO is already cancelled', async () => {
    mockFindProcurementPO.mockResolvedValue({ id: PO_ID, status: 'CANCELLED' });

    await expect(cancelPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      ValidationError,
    );
    await expect(cancelPurchaseOrder(TENANT_ID, PO_ID, ACTOR_ID)).rejects.toThrow(
      'already cancelled',
    );
  });
});
