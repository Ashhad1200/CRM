/**
 * Asset Management module — comprehensive service unit tests.
 *
 * Tests cover:
 * - Asset category CRUD (create, list, get by id)
 * - Fixed asset registration (create with purchase date, cost, useful life)
 * - Depreciation schedule generation (generateDepreciationSchedule)
 * - Asset disposal and journal entry creation
 * - Maintenance log CRUD (schedule, complete, list)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (must precede imports of the module under test) ───────────────

vi.mock('../repository.js', () => ({
  findAssetCategory: vi.fn(),
  findAssetCategories: vi.fn(),
  createAssetCategory: vi.fn(),
  updateAssetCategory: vi.fn(),
  deleteAssetCategory: vi.fn(),
  generateNextAssetNumber: vi.fn(),
  createAsset: vi.fn(),
  findAsset: vi.fn(),
  updateAsset: vi.fn(),
  findAssets: vi.fn(),
  upsertDepreciationSchedule: vi.fn(),
  findDepreciationSchedule: vi.fn(),
  findUnpostedDepreciationForPeriod: vi.fn(),
  markDepreciationPosted: vi.fn(),
  updateAssetBookValue: vi.fn(),
  createMaintenanceRecord: vi.fn(),
  completeMaintenanceRecord: vi.fn(),
  findMaintenanceRecords: vi.fn(),
  createAssetDisposal: vi.fn(),
  getAssetRegisterSummary: vi.fn(),
}));

vi.mock('../events.js', () => ({
  publishAssetCreated: vi.fn(),
  publishAssetDepreciated: vi.fn(),
  publishAssetDisposed: vi.fn(),
  publishMaintenanceScheduled: vi.fn(),
  ASSETS_EVENTS: {
    ASSET_CREATED: 'assets.asset.created',
    ASSET_DEPRECIATED: 'assets.asset.depreciated',
    ASSET_DISPOSED: 'assets.asset.disposed',
    MAINTENANCE_SCHEDULED: 'assets.maintenance.scheduled',
  },
}));

import * as repo from '../repository.js';
import * as events from '../events.js';
import {
  createAssetCategory,
  listAssetCategories,
  getAssetCategory,
  updateAssetCategory,
  deleteAssetCategory,
  createAsset,
  getAsset,
  listAssets,
  generateDepreciationSchedule,
  getDepreciationSchedule,
  disposeAsset,
  scheduleAssetMaintenance,
  completeMaintenance,
  listMaintenanceSchedule,
  getAssetRegister,
} from '../service.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ASSET_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CATEGORY_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const MAINTENANCE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

// ── Test helpers ───────────────────────────────────────────────────────────────

function mockCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: CATEGORY_ID,
    tenantId: TENANT_ID,
    name: 'Vehicles',
    usefulLifeYears: 5,
    salvageValuePercent: { toFixed: () => '10' },
    depreciationMethod: 'STRAIGHT_LINE',
    glAccountId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function mockAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSET_ID,
    tenantId: TENANT_ID,
    assetNumber: 'FA-0001',
    name: 'Company Vehicle',
    description: null,
    categoryId: CATEGORY_ID,
    serialNumber: null,
    purchaseDate: new Date('2024-01-01'),
    purchasePrice: 50000,
    currentBookValue: 50000,
    salvageValue: 5000,
    usefulLifeYears: 5,
    depreciationMethod: 'STRAIGHT_LINE',
    totalUnitsExpected: null,
    totalUnitsProduced: 0,
    locationId: null,
    departmentId: null,
    assignedTo: null,
    status: 'ACTIVE',
    purchaseInvoiceId: null,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: ACTOR_ID,
    version: 1,
    category: mockCategory(),
    depreciationSchedule: [],
    maintenance: [],
    disposal: null,
    ...overrides,
  };
}

function mockMaintenanceRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: MAINTENANCE_ID,
    tenantId: TENANT_ID,
    assetId: ASSET_ID,
    type: 'PREVENTIVE',
    description: 'Annual oil change',
    scheduledDate: new Date('2025-06-01'),
    completedDate: null,
    cost: null,
    vendor: null,
    notes: null,
    status: 'SCHEDULED',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: ACTOR_ID,
    ...overrides,
  };
}

// ── Global reset ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(events.publishAssetCreated).mockResolvedValue(undefined);
  vi.mocked(events.publishAssetDepreciated).mockResolvedValue(undefined);
  vi.mocked(events.publishAssetDisposed).mockResolvedValue(undefined);
  vi.mocked(events.publishMaintenanceScheduled).mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── 1. Asset Category CRUD ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Asset Category CRUD', () => {
  describe('createAssetCategory', () => {
    it('should delegate to repository and return the created category', async () => {
      const input = {
        name: 'Office Equipment',
        usefulLifeYears: 3,
        salvageValuePercent: 5,
        depreciationMethod: 'STRAIGHT_LINE' as const,
      };
      const created = mockCategory({ name: 'Office Equipment', usefulLifeYears: 3 });
      vi.mocked(repo.createAssetCategory).mockResolvedValue(created as never);

      const result = await createAssetCategory(TENANT_ID, input);

      expect(repo.createAssetCategory).toHaveBeenCalledWith(TENANT_ID, input);
      expect(result).toEqual(created);
    });
  });

  describe('listAssetCategories', () => {
    it('should return all categories for the tenant', async () => {
      const categories = [
        mockCategory({ id: 'cat-1', name: 'Vehicles' }),
        mockCategory({ id: 'cat-2', name: 'IT Equipment' }),
        mockCategory({ id: 'cat-3', name: 'Furniture' }),
      ];
      vi.mocked(repo.findAssetCategories).mockResolvedValue(categories as never);

      const result = await listAssetCategories(TENANT_ID);

      expect(repo.findAssetCategories).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ name: 'Vehicles' });
      expect(result[2]).toMatchObject({ name: 'Furniture' });
    });

    it('should return empty array when no categories exist', async () => {
      vi.mocked(repo.findAssetCategories).mockResolvedValue([] as never);

      const result = await listAssetCategories(TENANT_ID);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAssetCategory', () => {
    it('should return a single category by id', async () => {
      const category = mockCategory();
      vi.mocked(repo.findAssetCategory).mockResolvedValue(category as never);

      const result = await getAssetCategory(TENANT_ID, CATEGORY_ID);

      expect(repo.findAssetCategory).toHaveBeenCalledWith(TENANT_ID, CATEGORY_ID);
      expect(result).toMatchObject({ id: CATEGORY_ID, name: 'Vehicles' });
    });
  });

  describe('updateAssetCategory', () => {
    it('should delegate update to repository with correct parameters', async () => {
      const updateData = { name: 'Heavy Vehicles', usefulLifeYears: 10 };
      const updated = mockCategory({ name: 'Heavy Vehicles', usefulLifeYears: 10 });
      vi.mocked(repo.updateAssetCategory).mockResolvedValue(updated as never);

      const result = await updateAssetCategory(TENANT_ID, CATEGORY_ID, updateData);

      expect(repo.updateAssetCategory).toHaveBeenCalledWith(TENANT_ID, CATEGORY_ID, updateData);
      expect(result).toMatchObject({ name: 'Heavy Vehicles', usefulLifeYears: 10 });
    });
  });

  describe('deleteAssetCategory', () => {
    it('should verify category exists then delete', async () => {
      vi.mocked(repo.findAssetCategory).mockResolvedValue(mockCategory() as never);
      vi.mocked(repo.deleteAssetCategory).mockResolvedValue(undefined as never);

      await deleteAssetCategory(TENANT_ID, CATEGORY_ID);

      expect(repo.findAssetCategory).toHaveBeenCalledWith(TENANT_ID, CATEGORY_ID);
      expect(repo.deleteAssetCategory).toHaveBeenCalledWith(TENANT_ID, CATEGORY_ID);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── 2. Fixed Asset Registration ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Fixed Asset Registration', () => {
  describe('createAsset', () => {
    it('should create an asset with purchase date, cost, and useful life from category', async () => {
      const category = mockCategory({ usefulLifeYears: 5, salvageValuePercent: 10 });
      vi.mocked(repo.findAssetCategory).mockResolvedValue(category as never);
      vi.mocked(repo.generateNextAssetNumber).mockResolvedValue('FA-0001');

      const created = mockAsset({
        purchaseDate: new Date('2024-06-15'),
        purchasePrice: 75000,
        currentBookValue: 75000,
        usefulLifeYears: 5,
      });
      vi.mocked(repo.createAsset).mockResolvedValue(created as never);

      const input = {
        name: 'Delivery Truck',
        categoryId: CATEGORY_ID,
        purchaseDate: '2024-06-15',
        purchasePrice: 75000,
      };

      const result = await createAsset(TENANT_ID, input, ACTOR_ID);

      expect(repo.findAssetCategory).toHaveBeenCalledWith(TENANT_ID, CATEGORY_ID);
      expect(repo.generateNextAssetNumber).toHaveBeenCalledWith(TENANT_ID);
      expect(repo.createAsset).toHaveBeenCalledWith(
        TENANT_ID,
        input,
        'FA-0001',
        ACTOR_ID,
        expect.objectContaining({
          usefulLifeYears: 5,
          salvageValuePercent: 10,
          depreciationMethod: 'STRAIGHT_LINE',
        }),
      );
      expect(result.purchasePrice).toBe(75000);
      expect(result.currentBookValue).toBe(75000);
    });

    it('should emit ASSET_CREATED event with correct payload', async () => {
      vi.mocked(repo.findAssetCategory).mockResolvedValue(mockCategory() as never);
      vi.mocked(repo.generateNextAssetNumber).mockResolvedValue('FA-0005');
      vi.mocked(repo.createAsset).mockResolvedValue(
        mockAsset({ assetNumber: 'FA-0005', purchasePrice: 30000 }) as never,
      );

      await createAsset(
        TENANT_ID,
        { name: 'Laptop', categoryId: CATEGORY_ID, purchaseDate: '2024-03-01', purchasePrice: 30000 },
        ACTOR_ID,
      );

      expect(events.publishAssetCreated).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          id: ASSET_ID,
          assetNumber: 'FA-0005',
          purchasePrice: 30000,
        }),
      );
    });
  });

  describe('getAsset', () => {
    it('should return a single asset by id', async () => {
      const asset = mockAsset();
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

      const result = await getAsset(TENANT_ID, ASSET_ID);

      expect(repo.findAsset).toHaveBeenCalledWith(TENANT_ID, ASSET_ID);
      expect(result).toMatchObject({ id: ASSET_ID, name: 'Company Vehicle' });
    });
  });

  describe('listAssets', () => {
    it('should return paginated list with meta', async () => {
      const assets = [mockAsset(), mockAsset({ id: 'asset-2', name: 'Forklift' })];
      vi.mocked(repo.findAssets).mockResolvedValue({ data: assets, total: 2 } as never);

      const result = await listAssets(
        TENANT_ID,
        { categoryId: CATEGORY_ID, status: 'ACTIVE' as never },
        { page: 1, limit: 10 },
      );

      expect(repo.findAssets).toHaveBeenCalledWith(
        TENANT_ID,
        { categoryId: CATEGORY_ID, status: 'ACTIVE' },
        { page: 1, limit: 10 },
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 10 });
    });

    it('should return empty data with zero total when no assets match', async () => {
      vi.mocked(repo.findAssets).mockResolvedValue({ data: [], total: 0 } as never);

      const result = await listAssets(TENANT_ID, {}, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getAssetRegister', () => {
    it('should compute register summary across all assets', async () => {
      const assets = [
        { purchasePrice: 50000, currentBookValue: 40000, status: 'ACTIVE' },
        { purchasePrice: 30000, currentBookValue: 15000, status: 'ACTIVE' },
        { purchasePrice: 20000, currentBookValue: 0, status: 'FULLY_DEPRECIATED' },
      ];
      vi.mocked(repo.getAssetRegisterSummary).mockResolvedValue(assets as never);

      const result = await getAssetRegister(TENANT_ID);

      expect(result.totalAssets).toBe(3);
      expect(result.totalCost).toBe(100000);
      expect(result.netBookValue).toBe(55000);
      expect(result.totalAccumulatedDepreciation).toBe(45000);
      expect(result.byStatus).toMatchObject({ ACTIVE: 2, FULLY_DEPRECIATED: 1 });
    });

    it('should return zeroes when tenant has no assets', async () => {
      vi.mocked(repo.getAssetRegisterSummary).mockResolvedValue([] as never);

      const result = await getAssetRegister(TENANT_ID);

      expect(result.totalAssets).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.netBookValue).toBe(0);
      expect(result.totalAccumulatedDepreciation).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── 3. Depreciation Schedule Generation ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Depreciation Schedule Generation', () => {
  describe('generateDepreciationSchedule', () => {
    it('should fetch asset, calculate schedule, and persist via repository', async () => {
      const asset = mockAsset({
        purchaseDate: new Date('2024-01-01'),
        purchasePrice: 12000,
        salvageValue: 0,
        usefulLifeYears: 1,
        depreciationMethod: 'STRAIGHT_LINE',
        totalUnitsExpected: null,
      });
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

      const persistedSchedule = Array.from({ length: 12 }, (_, i) => ({
        id: `sched-${i}`,
        periodStart: new Date(2024, i, 1),
        periodEnd: new Date(2024, i + 1, 0),
        depreciationCharge: 1000,
      }));
      vi.mocked(repo.upsertDepreciationSchedule).mockResolvedValue(persistedSchedule as never);

      const result = await generateDepreciationSchedule(TENANT_ID, ASSET_ID);

      expect(repo.findAsset).toHaveBeenCalledWith(TENANT_ID, ASSET_ID);
      expect(repo.upsertDepreciationSchedule).toHaveBeenCalledWith(
        ASSET_ID,
        expect.arrayContaining([
          expect.objectContaining({ depreciationCharge: 1000 }),
        ]),
      );
      expect(result).toEqual(persistedSchedule);
    });

    it('should throw ValidationError for a disposed asset', async () => {
      const asset = mockAsset({ status: 'DISPOSED' });
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

      await expect(
        generateDepreciationSchedule(TENANT_ID, ASSET_ID),
      ).rejects.toThrow('Cannot generate depreciation schedule for a disposed asset');
    });

    it('should pass correct parameters for declining balance method', async () => {
      const asset = mockAsset({
        purchaseDate: new Date('2024-01-01'),
        purchasePrice: 24000,
        salvageValue: 2000,
        usefulLifeYears: 2,
        depreciationMethod: 'DECLINING_BALANCE',
        totalUnitsExpected: null,
      });
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
      vi.mocked(repo.upsertDepreciationSchedule).mockResolvedValue([] as never);

      await generateDepreciationSchedule(TENANT_ID, ASSET_ID);

      // Verify the schedule was generated with 24 periods
      expect(repo.upsertDepreciationSchedule).toHaveBeenCalledWith(
        ASSET_ID,
        expect.any(Array),
      );
      const schedule = vi.mocked(repo.upsertDepreciationSchedule).mock.calls[0]![1] as Array<{
        depreciationCharge: number;
        openingValue: number;
      }>;
      expect(schedule).toHaveLength(24);
      // First period: double-declining rate = (2/2)/12 = 1/12 of opening value
      const expectedFirstCharge = Math.round(24000 * (2 / 2 / 12) * 100) / 100;
      expect(schedule[0]!.depreciationCharge).toBe(expectedFirstCharge);
      expect(schedule[0]!.openingValue).toBe(24000);
    });
  });

  describe('getDepreciationSchedule', () => {
    it('should verify asset ownership then return schedule', async () => {
      const asset = mockAsset();
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

      const schedule = [
        { id: 'sched-1', depreciationCharge: 750, closingValue: 49250, posted: false },
        { id: 'sched-2', depreciationCharge: 750, closingValue: 48500, posted: false },
      ];
      vi.mocked(repo.findDepreciationSchedule).mockResolvedValue(schedule as never);

      const result = await getDepreciationSchedule(TENANT_ID, ASSET_ID);

      expect(repo.findAsset).toHaveBeenCalledWith(TENANT_ID, ASSET_ID);
      expect(repo.findDepreciationSchedule).toHaveBeenCalledWith(ASSET_ID);
      expect(result).toHaveLength(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── 4. Asset Disposal and Journal Entry ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Asset Disposal', () => {
  it('should calculate gain when proceeds exceed book value', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 10000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-1',
      gainLoss: 5000,
    } as never);

    const result = await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      { disposalDate: '2026-03-15', disposalMethod: 'SOLD', proceedsAmount: 15000 },
      ACTOR_ID,
    );

    expect(result.gainLoss).toBe(5000);
    expect(repo.createAssetDisposal).toHaveBeenCalledWith(
      TENANT_ID,
      ASSET_ID,
      expect.objectContaining({ disposalMethod: 'SOLD', proceedsAmount: 15000 }),
      5000,
      ACTOR_ID,
    );
  });

  it('should calculate loss when proceeds are below book value', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 20000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-2',
      gainLoss: -17000,
    } as never);

    const result = await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      { disposalDate: '2026-03-15', disposalMethod: 'SCRAPPED', proceedsAmount: 3000 },
      ACTOR_ID,
    );

    expect(result.gainLoss).toBe(-17000);
  });

  it('should emit ASSET_DISPOSED event with gain/loss details', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 8000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-3',
      gainLoss: 2000,
    } as never);

    await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      { disposalDate: '2026-06-01', disposalMethod: 'SOLD', proceedsAmount: 10000 },
      ACTOR_ID,
    );

    expect(events.publishAssetDisposed).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        assetId: ASSET_ID,
        assetNumber: 'FA-0001',
        disposalMethod: 'SOLD',
        proceedsAmount: 10000,
        gainLoss: 2000,
      }),
    );
  });

  it('should reject disposal of already-disposed asset', async () => {
    vi.mocked(repo.findAsset).mockResolvedValue(mockAsset({ status: 'DISPOSED' }) as never);

    await expect(
      disposeAsset(
        TENANT_ID,
        ASSET_ID,
        { disposalDate: '2026-01-01', disposalMethod: 'DONATED', proceedsAmount: 0 },
        ACTOR_ID,
      ),
    ).rejects.toThrow('Asset is already disposed');
  });

  it('should handle zero-proceeds disposal (write-off)', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 5000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-4',
      gainLoss: -5000,
    } as never);

    const result = await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      { disposalDate: '2026-01-01', disposalMethod: 'SCRAPPED', proceedsAmount: 0 },
      ACTOR_ID,
    );

    expect(result.gainLoss).toBe(-5000);
    expect(repo.createAssetDisposal).toHaveBeenCalledWith(
      TENANT_ID,
      ASSET_ID,
      expect.anything(),
      -5000,
      ACTOR_ID,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── 5. Maintenance Log CRUD ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('Maintenance Log CRUD', () => {
  describe('scheduleAssetMaintenance', () => {
    it('should create a maintenance record and emit event', async () => {
      const asset = mockAsset({ status: 'ACTIVE' });
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

      const record = mockMaintenanceRecord();
      vi.mocked(repo.createMaintenanceRecord).mockResolvedValue(record as never);

      const input = {
        type: 'PREVENTIVE' as const,
        description: 'Annual oil change',
        scheduledDate: '2025-06-01',
      };

      const result = await scheduleAssetMaintenance(TENANT_ID, ASSET_ID, input, ACTOR_ID);

      expect(repo.findAsset).toHaveBeenCalledWith(TENANT_ID, ASSET_ID);
      expect(repo.createMaintenanceRecord).toHaveBeenCalledWith(
        TENANT_ID,
        ASSET_ID,
        input,
        ACTOR_ID,
      );
      expect(result).toMatchObject({ id: MAINTENANCE_ID, type: 'PREVENTIVE' });
      expect(events.publishMaintenanceScheduled).toHaveBeenCalledWith(
        TENANT_ID,
        ACTOR_ID,
        expect.objectContaining({
          id: MAINTENANCE_ID,
          assetId: ASSET_ID,
          type: 'PREVENTIVE',
        }),
      );
    });

    it('should reject maintenance scheduling for disposed assets', async () => {
      vi.mocked(repo.findAsset).mockResolvedValue(mockAsset({ status: 'DISPOSED' }) as never);

      await expect(
        scheduleAssetMaintenance(
          TENANT_ID,
          ASSET_ID,
          { type: 'CORRECTIVE' as never, description: 'Repair', scheduledDate: '2025-07-01' },
          ACTOR_ID,
        ),
      ).rejects.toThrow('Cannot schedule maintenance for a disposed asset');
    });
  });

  describe('completeMaintenance', () => {
    it('should delegate completion to repository', async () => {
      const completed = mockMaintenanceRecord({
        completedDate: new Date('2025-06-02'),
        cost: 350,
        status: 'COMPLETED',
      });
      vi.mocked(repo.completeMaintenanceRecord).mockResolvedValue(completed as never);

      const input = {
        completedDate: '2025-06-02',
        cost: 350,
        notes: 'Oil changed, filter replaced',
      };

      const result = await completeMaintenance(TENANT_ID, MAINTENANCE_ID, input);

      expect(repo.completeMaintenanceRecord).toHaveBeenCalledWith(
        TENANT_ID,
        MAINTENANCE_ID,
        input,
      );
      expect(result).toMatchObject({ status: 'COMPLETED', cost: 350 });
    });
  });

  describe('listMaintenanceSchedule', () => {
    it('should verify asset ownership and return paginated maintenance records', async () => {
      const asset = mockAsset();
      vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

      const records = [
        mockMaintenanceRecord({ id: 'maint-1', description: 'Oil change' }),
        mockMaintenanceRecord({ id: 'maint-2', description: 'Tire rotation' }),
      ];
      vi.mocked(repo.findMaintenanceRecords).mockResolvedValue({
        data: records,
        total: 2,
      } as never);

      const result = await listMaintenanceSchedule(
        TENANT_ID,
        ASSET_ID,
        { page: 1, limit: 20 },
      );

      expect(repo.findAsset).toHaveBeenCalledWith(TENANT_ID, ASSET_ID);
      expect(repo.findMaintenanceRecords).toHaveBeenCalledWith(
        TENANT_ID,
        ASSET_ID,
        { page: 1, limit: 20 },
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 20 });
    });

    it('should return empty list when no maintenance records exist', async () => {
      vi.mocked(repo.findAsset).mockResolvedValue(mockAsset() as never);
      vi.mocked(repo.findMaintenanceRecords).mockResolvedValue({
        data: [],
        total: 0,
      } as never);

      const result = await listMaintenanceSchedule(
        TENANT_ID,
        ASSET_ID,
        { page: 1, limit: 10 },
      );

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
