/**
 * Asset Management module — service unit tests.
 *
 * Tests cover:
 * - createAsset: auto book value = purchase price, asset number generation
 * - calculateDepreciationSchedule: straight-line correctness
 * - disposeAsset: gain/loss calculation, event emission
 * - runMonthlyDepreciation: book value update
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Module mocks ───────────────────────────────────────────────────────────────
// All external dependencies are mocked so tests run without a real DB or Redis.

vi.mock('../repository.js', () => ({
  findAssetCategory: vi.fn(),
  generateNextAssetNumber: vi.fn(),
  createAsset: vi.fn(),
  findAsset: vi.fn(),
  updateAsset: vi.fn(),
  findAssets: vi.fn(),
  findAssetCategories: vi.fn(),
  createAssetCategory: vi.fn(),
  updateAssetCategory: vi.fn(),
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
  createAsset,
  calculateDepreciationSchedule,
  disposeAsset,
  runMonthlyDepreciation,
  generateDepreciationSchedule,
} from '../service.js';

// ── Test helpers ───────────────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ASSET_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const CATEGORY_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

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
    purchasePrice: { toFixed: () => '50000' },
    currentBookValue: { toFixed: () => '50000' },
    salvageValue: { toFixed: () => '5000' },
    usefulLifeYears: 5,
    depreciationMethod: 'STRAIGHT_LINE',
    totalUnitsExpected: null,
    totalUnitsProduced: { toFixed: () => '0' },
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

// ═══════════════════════════════════════════════════════════════════════════════
// ── createAsset ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('createAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set initial currentBookValue equal to purchasePrice', async () => {
    const category = mockCategory();
    vi.mocked(repo.findAssetCategory).mockResolvedValue(category as never);
    vi.mocked(repo.generateNextAssetNumber).mockResolvedValue('FA-0001');

    const createdAsset = mockAsset({ purchasePrice: 50000, currentBookValue: 50000 });
    vi.mocked(repo.createAsset).mockResolvedValue(createdAsset as never);
    vi.mocked(events.publishAssetCreated).mockResolvedValue(undefined);

    const result = await createAsset(
      TENANT_ID,
      {
        name: 'Company Vehicle',
        categoryId: CATEGORY_ID,
        purchaseDate: '2024-01-01',
        purchasePrice: 50000,
      },
      ACTOR_ID,
    );

    // Verify repo.createAsset was called with the correct initial book value
    expect(repo.createAsset).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ purchasePrice: 50000 }),
      'FA-0001',
      ACTOR_ID,
      expect.objectContaining({
        usefulLifeYears: 5,
        depreciationMethod: 'STRAIGHT_LINE',
      }),
    );

    expect(result.purchasePrice).toBe(50000);
    expect(result.currentBookValue).toBe(50000);
  });

  it('should auto-generate an asset number in FA-NNNN format', async () => {
    vi.mocked(repo.findAssetCategory).mockResolvedValue(mockCategory() as never);
    vi.mocked(repo.generateNextAssetNumber).mockResolvedValue('FA-0042');
    vi.mocked(repo.createAsset).mockResolvedValue(mockAsset({ assetNumber: 'FA-0042' }) as never);
    vi.mocked(events.publishAssetCreated).mockResolvedValue(undefined);

    await createAsset(
      TENANT_ID,
      {
        name: 'Server Rack',
        categoryId: CATEGORY_ID,
        purchaseDate: '2024-06-01',
        purchasePrice: 12000,
      },
      ACTOR_ID,
    );

    expect(repo.generateNextAssetNumber).toHaveBeenCalledWith(TENANT_ID);
    expect(repo.createAsset).toHaveBeenCalledWith(
      TENANT_ID,
      expect.anything(),
      'FA-0042',
      ACTOR_ID,
      expect.anything(),
    );
  });

  it('should emit ASSET_CREATED event after creation', async () => {
    vi.mocked(repo.findAssetCategory).mockResolvedValue(mockCategory() as never);
    vi.mocked(repo.generateNextAssetNumber).mockResolvedValue('FA-0001');
    vi.mocked(repo.createAsset).mockResolvedValue(mockAsset() as never);
    vi.mocked(events.publishAssetCreated).mockResolvedValue(undefined);

    await createAsset(
      TENANT_ID,
      {
        name: 'Company Vehicle',
        categoryId: CATEGORY_ID,
        purchaseDate: '2024-01-01',
        purchasePrice: 50000,
      },
      ACTOR_ID,
    );

    expect(events.publishAssetCreated).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({ id: ASSET_ID, assetNumber: 'FA-0001' }),
    );
  });

  it('should derive salvageValue from category salvageValuePercent when not provided', async () => {
    // Category has 10% salvage value percent
    const category = mockCategory({ salvageValuePercent: 10 });
    vi.mocked(repo.findAssetCategory).mockResolvedValue(category as never);
    vi.mocked(repo.generateNextAssetNumber).mockResolvedValue('FA-0001');
    vi.mocked(repo.createAsset).mockResolvedValue(mockAsset() as never);
    vi.mocked(events.publishAssetCreated).mockResolvedValue(undefined);

    await createAsset(
      TENANT_ID,
      {
        name: 'Asset',
        categoryId: CATEGORY_ID,
        purchaseDate: '2024-01-01',
        purchasePrice: 10000,
        // No salvageValue provided — should derive from category (10% of 10000 = 1000)
      },
      ACTOR_ID,
    );

    // Third argument to createAsset includes salvageValuePercent from category
    expect(repo.createAsset).toHaveBeenCalledWith(
      TENANT_ID,
      expect.anything(),
      'FA-0001',
      ACTOR_ID,
      expect.objectContaining({ salvageValuePercent: 10 }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── calculateDepreciationSchedule (straight-line) ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateDepreciationSchedule — STRAIGHT_LINE', () => {
  const BASE_ASSET = {
    purchaseDate: new Date('2024-01-01'),
    purchasePrice: 12000,
    salvageValue: 0,
    usefulLifeYears: 1, // 12 months
    depreciationMethod: 'STRAIGHT_LINE',
    totalUnitsExpected: null,
  };

  it('should return 12 periods for a 1-year useful life', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    expect(schedule).toHaveLength(12);
  });

  it('should charge (purchasePrice - salvageValue) / totalMonths per period', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    // 12000 / 12 = 1000 per month
    const expectedMonthlyCharge = 1000;
    for (const period of schedule) {
      expect(period.depreciationCharge).toBe(expectedMonthlyCharge);
    }
  });

  it('should have openingValue of first period equal to purchasePrice', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    expect(schedule[0]!.openingValue).toBe(12000);
  });

  it('should have closingValue of last period equal to salvageValue', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    expect(schedule[schedule.length - 1]!.closingValue).toBe(0);
  });

  it('should chain: closing value of period N is opening value of period N+1', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i]!.closingValue).toBe(schedule[i + 1]!.openingValue);
    }
  });

  it('should respect non-zero salvageValue', () => {
    const asset = { ...BASE_ASSET, purchasePrice: 10000, salvageValue: 1000 };
    const schedule = calculateDepreciationSchedule(asset);
    // Depreciable: 9000 / 12 = 750 per month
    expect(schedule[0]!.depreciationCharge).toBe(750);
    expect(schedule[schedule.length - 1]!.closingValue).toBe(1000);
  });

  it('should generate 60 periods for a 5-year asset', () => {
    const asset = { ...BASE_ASSET, usefulLifeYears: 5 };
    const schedule = calculateDepreciationSchedule(asset);
    expect(schedule).toHaveLength(60);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── calculateDepreciationSchedule (declining balance) ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateDepreciationSchedule — DECLINING_BALANCE', () => {
  const BASE_ASSET = {
    purchaseDate: new Date('2024-01-01'),
    purchasePrice: 12000,
    salvageValue: 0,
    usefulLifeYears: 2, // 24 months, annual rate = 2/2 = 100%, monthly = 100%/12
    depreciationMethod: 'DECLINING_BALANCE',
    totalUnitsExpected: null,
  };

  it('should return 24 periods for a 2-year useful life', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    expect(schedule).toHaveLength(24);
  });

  it('should apply double-declining rate to opening value each period', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    // Monthly rate = (2 / 2) / 12 = 1/12
    const monthlyRate = (2 / BASE_ASSET.usefulLifeYears) / 12;
    const expectedFirstCharge = Math.round(12000 * monthlyRate * 100) / 100;
    expect(schedule[0]!.depreciationCharge).toBe(expectedFirstCharge);
  });

  it('should never let closingValue go below salvageValue', () => {
    const asset = { ...BASE_ASSET, salvageValue: 500 };
    const schedule = calculateDepreciationSchedule(asset);
    for (const period of schedule) {
      expect(period.closingValue).toBeGreaterThanOrEqual(500);
    }
  });

  it('should chain: closing value of period N is opening value of period N+1', () => {
    const schedule = calculateDepreciationSchedule(BASE_ASSET);
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i]!.closingValue).toBe(schedule[i + 1]!.openingValue);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── disposeAsset ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('disposeAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate gain when proceeds > book value', async () => {
    const asset = mockAsset({
      currentBookValue: { toFixed: () => '10000' },
      status: 'ACTIVE',
    });
    // Override Number() behaviour: purchasePrice = 50000 but currentBookValue as number
    // The service calls Number(asset.currentBookValue) so we return a numeric-compatible object
    const assetWithNumericValues = {
      ...asset,
      currentBookValue: 10000,
    };
    vi.mocked(repo.findAsset).mockResolvedValue(assetWithNumericValues as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-id',
      gainLoss: 5000,
    } as never);
    vi.mocked(events.publishAssetDisposed).mockResolvedValue(undefined);

    const result = await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      {
        disposalDate: '2026-01-15',
        disposalMethod: 'SOLD',
        proceedsAmount: 15000,
      },
      ACTOR_ID,
    );

    // gain = 15000 - 10000 = 5000
    expect(result.gainLoss).toBe(5000);
    expect(repo.createAssetDisposal).toHaveBeenCalledWith(
      TENANT_ID,
      ASSET_ID,
      expect.anything(),
      5000,
      ACTOR_ID,
    );
  });

  it('should calculate loss when proceeds < book value', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 20000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-id',
      gainLoss: -15000,
    } as never);
    vi.mocked(events.publishAssetDisposed).mockResolvedValue(undefined);

    const result = await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      {
        disposalDate: '2026-01-15',
        disposalMethod: 'SCRAPPED',
        proceedsAmount: 5000,
      },
      ACTOR_ID,
    );

    // loss = 5000 - 20000 = -15000
    expect(result.gainLoss).toBe(-15000);
  });

  it('should calculate zero gain/loss when proceeds equal book value', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 12000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({
      id: 'disposal-id',
      gainLoss: 0,
    } as never);
    vi.mocked(events.publishAssetDisposed).mockResolvedValue(undefined);

    const result = await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      {
        disposalDate: '2026-01-15',
        disposalMethod: 'DONATED',
        proceedsAmount: 12000,
      },
      ACTOR_ID,
    );

    expect(result.gainLoss).toBe(0);
  });

  it('should emit ASSET_DISPOSED event', async () => {
    const asset = mockAsset({ status: 'ACTIVE', currentBookValue: 10000 });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);
    vi.mocked(repo.createAssetDisposal).mockResolvedValue({ id: 'disposal-id', gainLoss: 5000 } as never);
    vi.mocked(events.publishAssetDisposed).mockResolvedValue(undefined);

    await disposeAsset(
      TENANT_ID,
      ASSET_ID,
      {
        disposalDate: '2026-01-15',
        disposalMethod: 'SOLD',
        proceedsAmount: 15000,
      },
      ACTOR_ID,
    );

    expect(events.publishAssetDisposed).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        assetId: ASSET_ID,
        assetNumber: 'FA-0001',
        disposalMethod: 'SOLD',
        proceedsAmount: 15000,
        gainLoss: 5000,
      }),
    );
  });

  it('should throw ValidationError when trying to dispose an already-disposed asset', async () => {
    const asset = mockAsset({ status: 'DISPOSED' });
    vi.mocked(repo.findAsset).mockResolvedValue(asset as never);

    await expect(
      disposeAsset(
        TENANT_ID,
        ASSET_ID,
        { disposalDate: '2026-01-15', disposalMethod: 'SOLD', proceedsAmount: 0 },
        ACTOR_ID,
      ),
    ).rejects.toThrow('Asset is already disposed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── runMonthlyDepreciation ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

describe('runMonthlyDepreciation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update book value for each unposted entry in the period', async () => {
    const unpostedEntries = [
      {
        id: 'sched-1',
        assetId: ASSET_ID,
        depreciationCharge: 750,
        closingValue: 9250,
        asset: {
          assetNumber: 'FA-0001',
          salvageValue: 1000,
        },
      },
    ];

    vi.mocked(repo.findUnpostedDepreciationForPeriod).mockResolvedValue(
      unpostedEntries as never,
    );
    vi.mocked(repo.markDepreciationPosted).mockResolvedValue(undefined as never);
    vi.mocked(repo.updateAssetBookValue).mockResolvedValue(undefined as never);
    vi.mocked(events.publishAssetDepreciated).mockResolvedValue(undefined);

    const result = await runMonthlyDepreciation(TENANT_ID, '2026-02', ACTOR_ID);

    expect(result.processed).toBe(1);
    expect(result.totalDepreciationCharge).toBe(750);
    expect(result.assetsSummary[0]).toMatchObject({
      assetId: ASSET_ID,
      assetNumber: 'FA-0001',
      charge: 750,
      newBookValue: 9250,
    });
  });

  it('should call markDepreciationPosted for each processed entry', async () => {
    const unpostedEntries = [
      {
        id: 'sched-1',
        assetId: ASSET_ID,
        depreciationCharge: 750,
        closingValue: 9250,
        asset: { assetNumber: 'FA-0001', salvageValue: 1000 },
      },
      {
        id: 'sched-2',
        assetId: 'other-asset-id',
        depreciationCharge: 500,
        closingValue: 5000,
        asset: { assetNumber: 'FA-0002', salvageValue: 0 },
      },
    ];

    vi.mocked(repo.findUnpostedDepreciationForPeriod).mockResolvedValue(
      unpostedEntries as never,
    );
    vi.mocked(repo.markDepreciationPosted).mockResolvedValue(undefined as never);
    vi.mocked(repo.updateAssetBookValue).mockResolvedValue(undefined as never);
    vi.mocked(events.publishAssetDepreciated).mockResolvedValue(undefined);

    await runMonthlyDepreciation(TENANT_ID, '2026-02', ACTOR_ID);

    expect(repo.markDepreciationPosted).toHaveBeenCalledTimes(2);
    expect(repo.markDepreciationPosted).toHaveBeenCalledWith('sched-1', undefined);
    expect(repo.markDepreciationPosted).toHaveBeenCalledWith('sched-2', undefined);
  });

  it('should call updateAssetBookValue with closingValue for each entry', async () => {
    const unpostedEntries = [
      {
        id: 'sched-1',
        assetId: ASSET_ID,
        depreciationCharge: 750,
        closingValue: 9250,
        asset: { assetNumber: 'FA-0001', salvageValue: 1000 },
      },
    ];

    vi.mocked(repo.findUnpostedDepreciationForPeriod).mockResolvedValue(
      unpostedEntries as never,
    );
    vi.mocked(repo.markDepreciationPosted).mockResolvedValue(undefined as never);
    vi.mocked(repo.updateAssetBookValue).mockResolvedValue(undefined as never);
    vi.mocked(events.publishAssetDepreciated).mockResolvedValue(undefined);

    await runMonthlyDepreciation(TENANT_ID, '2026-02', ACTOR_ID);

    expect(repo.updateAssetBookValue).toHaveBeenCalledWith(ASSET_ID, 9250, undefined);
  });

  it('should mark asset as FULLY_DEPRECIATED when closing value equals salvage value', async () => {
    const unpostedEntries = [
      {
        id: 'sched-final',
        assetId: ASSET_ID,
        depreciationCharge: 1000,
        closingValue: 1000, // equals salvageValue
        asset: { assetNumber: 'FA-0001', salvageValue: 1000 },
      },
    ];

    vi.mocked(repo.findUnpostedDepreciationForPeriod).mockResolvedValue(
      unpostedEntries as never,
    );
    vi.mocked(repo.markDepreciationPosted).mockResolvedValue(undefined as never);
    vi.mocked(repo.updateAssetBookValue).mockResolvedValue(undefined as never);
    vi.mocked(events.publishAssetDepreciated).mockResolvedValue(undefined);

    await runMonthlyDepreciation(TENANT_ID, '2026-02', ACTOR_ID);

    // closingValue (1000) <= salvage (1000) should trigger FULLY_DEPRECIATED
    expect(repo.updateAssetBookValue).toHaveBeenCalledWith(
      ASSET_ID,
      1000,
      'FULLY_DEPRECIATED',
    );
  });

  it('should emit ASSET_DEPRECIATED event for each processed entry', async () => {
    const unpostedEntries = [
      {
        id: 'sched-1',
        assetId: ASSET_ID,
        depreciationCharge: 750,
        closingValue: 9250,
        asset: { assetNumber: 'FA-0001', salvageValue: 1000 },
      },
    ];

    vi.mocked(repo.findUnpostedDepreciationForPeriod).mockResolvedValue(
      unpostedEntries as never,
    );
    vi.mocked(repo.markDepreciationPosted).mockResolvedValue(undefined as never);
    vi.mocked(repo.updateAssetBookValue).mockResolvedValue(undefined as never);
    vi.mocked(events.publishAssetDepreciated).mockResolvedValue(undefined);

    await runMonthlyDepreciation(TENANT_ID, '2026-02', ACTOR_ID);

    expect(events.publishAssetDepreciated).toHaveBeenCalledWith(
      TENANT_ID,
      ACTOR_ID,
      expect.objectContaining({
        assetId: ASSET_ID,
        period: '2026-02',
        depreciationCharge: 750,
        newBookValue: 9250,
      }),
    );
  });

  it('should return zero processed when no unposted entries exist', async () => {
    vi.mocked(repo.findUnpostedDepreciationForPeriod).mockResolvedValue([]);

    const result = await runMonthlyDepreciation(TENANT_ID, '2026-02', ACTOR_ID);

    expect(result.processed).toBe(0);
    expect(result.totalDepreciationCharge).toBe(0);
    expect(result.assetsSummary).toHaveLength(0);
  });

  it('should throw ValidationError for invalid period format', async () => {
    await expect(
      runMonthlyDepreciation(TENANT_ID, '2026-2', ACTOR_ID),
    ).rejects.toThrow('Invalid period format');
  });
});
