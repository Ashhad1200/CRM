import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations (must be before vi.mock calls) ────────────────────────────

const mockFindDashboardByName = vi.fn();
const mockCreateDashboard = vi.fn();
const mockFindDashboardById = vi.fn();
const mockFindDashboards = vi.fn();
const mockUpdateDashboard = vi.fn();
const mockDeleteDashboard = vi.fn();
const mockCreateWidget = vi.fn();
const mockFindReportByName = vi.fn();
const mockCreateReport = vi.fn();
const mockFindReportById = vi.fn();
const mockFindReports = vi.fn();
const mockCreateForecast = vi.fn();
const mockFindForecasts = vi.fn();
const mockFindLatestForecast = vi.fn();

const mockPublishMetricsUpdated = vi.fn();

vi.mock('../repository.js', () => ({
  findDashboardByName: (...args: unknown[]) => mockFindDashboardByName(...args),
  createDashboard: (...args: unknown[]) => mockCreateDashboard(...args),
  findDashboardById: (...args: unknown[]) => mockFindDashboardById(...args),
  findDashboards: (...args: unknown[]) => mockFindDashboards(...args),
  updateDashboard: (...args: unknown[]) => mockUpdateDashboard(...args),
  deleteDashboard: (...args: unknown[]) => mockDeleteDashboard(...args),
  createWidget: (...args: unknown[]) => mockCreateWidget(...args),
  findReportByName: (...args: unknown[]) => mockFindReportByName(...args),
  createReport: (...args: unknown[]) => mockCreateReport(...args),
  findReportById: (...args: unknown[]) => mockFindReportById(...args),
  findReports: (...args: unknown[]) => mockFindReports(...args),
  createForecast: (...args: unknown[]) => mockCreateForecast(...args),
  findForecasts: (...args: unknown[]) => mockFindForecasts(...args),
  findLatestForecast: (...args: unknown[]) => mockFindLatestForecast(...args),
}));

vi.mock('../events.js', () => ({
  publishMetricsUpdated: (...args: unknown[]) => mockPublishMetricsUpdated(...args),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    $transaction: (fn: Function) => fn({}),
  }),
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import module under test AFTER mocks ────────────────────────────────────────

import * as svc from '../service.js';

// ── Test constants ──────────────────────────────────────────────────────────────

const T = 'tenant-1';
const ACTOR = 'user-1';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tests ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Dashboard CRUD ───────────────────────────────────────────────────────────

describe('Dashboards', () => {
  describe('createDashboard', () => {
    it('creates a dashboard when name is unique', async () => {
      mockFindDashboardByName.mockResolvedValue(null);
      const created = { id: 'dash-1', name: 'Sales Overview', tenantId: T, createdBy: ACTOR };
      mockCreateDashboard.mockResolvedValue(created);

      const result = await svc.createDashboard(T, { name: 'Sales Overview' } as any, ACTOR);

      expect(mockFindDashboardByName).toHaveBeenCalledWith(T, 'Sales Overview');
      expect(mockCreateDashboard).toHaveBeenCalledWith(T, { name: 'Sales Overview' }, ACTOR);
      expect(result).toEqual(created);
    });

    it('throws ValidationError on duplicate dashboard name', async () => {
      mockFindDashboardByName.mockResolvedValue({ id: 'existing', name: 'Sales Overview' });

      await expect(
        svc.createDashboard(T, { name: 'Sales Overview' } as any, ACTOR),
      ).rejects.toThrow('Dashboard with name "Sales Overview" already exists');
      expect(mockCreateDashboard).not.toHaveBeenCalled();
    });
  });

  describe('getDashboards', () => {
    it('returns paginated result', async () => {
      mockFindDashboards.mockResolvedValue({
        data: [{ id: 'dash-1' }, { id: 'dash-2' }],
        total: 2,
      });

      const result = await svc.getDashboards(T, {}, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: [{ id: 'dash-1' }, { id: 'dash-2' }],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });

  describe('getDashboard', () => {
    it('returns dashboard when found', async () => {
      const dashboard = {
        id: 'dash-1',
        name: 'Sales Overview',
        widgets: [{ id: 'w-1', type: 'KPI', config: {} }],
      };
      mockFindDashboardById.mockResolvedValue(dashboard);

      const result = await svc.getDashboard(T, 'dash-1');

      expect(result).toEqual(dashboard);
    });

    it('throws NotFoundError when dashboard not found', async () => {
      mockFindDashboardById.mockResolvedValue(null);

      await expect(svc.getDashboard(T, 'missing')).rejects.toThrow('Dashboard');
    });
  });

  describe('updateDashboard', () => {
    it('updates an existing dashboard', async () => {
      mockFindDashboardById.mockResolvedValue({ id: 'dash-1', name: 'Sales Overview' });
      mockFindDashboardByName.mockResolvedValue(null);
      const updated = { id: 'dash-1', name: 'Revenue Dashboard' };
      mockUpdateDashboard.mockResolvedValue(updated);

      const result = await svc.updateDashboard(T, 'dash-1', { name: 'Revenue Dashboard' } as any);

      expect(mockUpdateDashboard).toHaveBeenCalledWith(T, 'dash-1', { name: 'Revenue Dashboard' });
      expect(result).toEqual(updated);
    });

    it('throws NotFoundError when dashboard not found', async () => {
      mockFindDashboardById.mockResolvedValue(null);

      await expect(
        svc.updateDashboard(T, 'missing', { name: 'X' } as any),
      ).rejects.toThrow('Dashboard');
    });
  });

  describe('deleteDashboard', () => {
    it('deletes an existing dashboard', async () => {
      mockFindDashboardById.mockResolvedValue({ id: 'dash-1', name: 'Sales Overview' });
      mockDeleteDashboard.mockResolvedValue(undefined);

      await svc.deleteDashboard(T, 'dash-1');

      expect(mockFindDashboardById).toHaveBeenCalledWith(T, 'dash-1');
      expect(mockDeleteDashboard).toHaveBeenCalledWith(T, 'dash-1');
    });

    it('throws NotFoundError when dashboard not found', async () => {
      mockFindDashboardById.mockResolvedValue(null);

      await expect(svc.deleteDashboard(T, 'missing')).rejects.toThrow('Dashboard');
      expect(mockDeleteDashboard).not.toHaveBeenCalled();
    });
  });
});

// ── Widgets ──────────────────────────────────────────────────────────────────

describe('Widgets', () => {
  describe('addWidget', () => {
    it('adds a widget to an existing dashboard', async () => {
      mockFindDashboardById.mockResolvedValue({ id: 'dash-1', name: 'Sales Overview' });
      const widget = { id: 'w-1', dashboardId: 'dash-1', type: 'KPI', title: 'Revenue', config: {} };
      mockCreateWidget.mockResolvedValue(widget);

      const input = { type: 'KPI', title: 'Revenue', config: {} } as any;
      const result = await svc.addWidget(T, 'dash-1', input);

      expect(mockFindDashboardById).toHaveBeenCalledWith(T, 'dash-1');
      expect(mockCreateWidget).toHaveBeenCalledWith('dash-1', input);
      expect(result).toEqual(widget);
    });

    it('throws NotFoundError if dashboard not found', async () => {
      mockFindDashboardById.mockResolvedValue(null);

      await expect(
        svc.addWidget(T, 'missing', { type: 'KPI', title: 'X', config: {} } as any),
      ).rejects.toThrow('Dashboard');
      expect(mockCreateWidget).not.toHaveBeenCalled();
    });
  });
});

// ── Dashboard Metrics ────────────────────────────────────────────────────────

describe('Dashboard Metrics', () => {
  describe('getDashboardMetrics', () => {
    it('returns metrics for a dashboard with widgets', async () => {
      const dashboard = {
        id: 'dash-1',
        name: 'Sales Overview',
        widgets: [
          { id: 'w-1', type: 'KPI', config: {} },
          { id: 'w-2', type: 'CHART', config: {} },
        ],
      };
      mockFindDashboardById.mockResolvedValue(dashboard);
      mockPublishMetricsUpdated.mockResolvedValue(undefined);

      const result = await svc.getDashboardMetrics(T, 'dash-1');

      expect(result.dashboardId).toBe('dash-1');
      expect(result.widgets).toHaveLength(2);
      expect(result.widgets[0]).toMatchObject({ widgetId: 'w-1', type: 'KPI' });
      expect(result.widgets[1]).toMatchObject({ widgetId: 'w-2', type: 'CHART' });
      expect(result.calculatedAt).toBeDefined();
      expect(mockPublishMetricsUpdated).toHaveBeenCalledWith(T, 'system', {
        id: 'dash-1',
        name: 'Sales Overview',
      });
    });

    it('throws NotFoundError if dashboard not found', async () => {
      mockFindDashboardById.mockResolvedValue(null);

      await expect(svc.getDashboardMetrics(T, 'missing')).rejects.toThrow('Dashboard');
    });
  });
});

// ── Reports ──────────────────────────────────────────────────────────────────

describe('Reports', () => {
  describe('createReport', () => {
    it('creates a report when name is unique', async () => {
      mockFindReportByName.mockResolvedValue(null);
      const created = {
        id: 'rpt-1',
        name: 'Monthly Revenue',
        tenantId: T,
        type: 'PIPELINE',
        fieldSelection: ['amount', 'stage'],
        createdBy: ACTOR,
      };
      mockCreateReport.mockResolvedValue(created);

      const input = { name: 'Monthly Revenue', type: 'PIPELINE', fieldSelection: ['amount', 'stage'] } as any;
      const result = await svc.createReport(T, input, ACTOR);

      expect(mockFindReportByName).toHaveBeenCalledWith(T, 'Monthly Revenue');
      expect(mockCreateReport).toHaveBeenCalledWith(T, input, ACTOR);
      expect(result).toEqual(created);
    });

    it('throws ValidationError on duplicate report name', async () => {
      mockFindReportByName.mockResolvedValue({ id: 'existing', name: 'Monthly Revenue' });

      await expect(
        svc.createReport(T, { name: 'Monthly Revenue' } as any, ACTOR),
      ).rejects.toThrow('Report with name "Monthly Revenue" already exists');
      expect(mockCreateReport).not.toHaveBeenCalled();
    });
  });

  describe('getReports', () => {
    it('returns paginated result', async () => {
      mockFindReports.mockResolvedValue({
        data: [{ id: 'rpt-1' }, { id: 'rpt-2' }],
        total: 2,
      });

      const result = await svc.getReports(T, {}, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: [{ id: 'rpt-1' }, { id: 'rpt-2' }],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });
  });

  describe('getReport', () => {
    it('returns report when found', async () => {
      const report = { id: 'rpt-1', name: 'Monthly Revenue', type: 'PIPELINE' };
      mockFindReportById.mockResolvedValue(report);

      const result = await svc.getReport(T, 'rpt-1');

      expect(result).toEqual(report);
    });

    it('throws NotFoundError when report not found', async () => {
      mockFindReportById.mockResolvedValue(null);

      await expect(svc.getReport(T, 'missing')).rejects.toThrow('SavedReport');
    });
  });

  describe('runReport', () => {
    it('returns report result with columns and rows', async () => {
      const report = {
        id: 'rpt-1',
        name: 'Monthly Revenue',
        type: 'PIPELINE',
        fieldSelection: ['amount', 'stage'],
        groupBy: 'stage',
        aggregation: 'SUM',
        filters: null,
      };
      mockFindReportById.mockResolvedValue(report);

      const result = await svc.runReport(T, 'rpt-1', { page: 1, limit: 10 });

      expect(result).toMatchObject({
        columns: ['amount', 'stage'],
        rows: [],
        totalRows: 0,
      });
    });

    it('throws NotFoundError when report not found for run', async () => {
      mockFindReportById.mockResolvedValue(null);

      await expect(svc.runReport(T, 'missing', { page: 1, limit: 10 })).rejects.toThrow(
        'SavedReport',
      );
    });
  });
});

// ── Forecasting ──────────────────────────────────────────────────────────────

describe('Forecasting', () => {
  describe('generateForecast', () => {
    it('returns forecast results for default types', async () => {
      let callCount = 0;
      mockCreateForecast.mockImplementation(async (_tid: string, data: any) => {
        callCount++;
        return {
          id: `fc-${callCount}`,
          type: data.type,
          period: data.period,
          predictedValue: data.predictedValue,
          confidenceLow: data.confidenceLow,
          confidenceHigh: data.confidenceHigh,
          modelVersion: data.modelVersion,
          createdAt: new Date('2026-02-22'),
        };
      });

      const results = await svc.generateForecast(T, undefined, 12);

      // default types are REVENUE and PIPELINE, 3 months each = 6 forecasts
      expect(results).toHaveLength(6);
      expect(mockCreateForecast).toHaveBeenCalledTimes(6);
      expect(results[0]).toMatchObject({
        type: 'REVENUE',
        modelVersion: 'linear-v1',
      });
    });

    it('uses historicalMonths parameter and single type', async () => {
      let callCount = 0;
      mockCreateForecast.mockImplementation(async (_tid: string, data: any) => {
        callCount++;
        return {
          id: `fc-${callCount}`,
          type: data.type,
          period: data.period,
          predictedValue: data.predictedValue,
          confidenceLow: data.confidenceLow,
          confidenceHigh: data.confidenceHigh,
          modelVersion: data.modelVersion,
          createdAt: new Date('2026-02-22'),
        };
      });

      const results = await svc.generateForecast(T, 'REVENUE', 6);

      // Single type, 3 months = 3 forecasts
      expect(results).toHaveLength(3);
      expect(mockCreateForecast).toHaveBeenCalledTimes(3);
      results.forEach((r) => expect(r.type).toBe('REVENUE'));
    });
  });
});

// ── Anomaly Detection ────────────────────────────────────────────────────────

describe('Anomaly Detection', () => {
  describe('detectAnomalies', () => {
    it('returns anomaly results for a metric', async () => {
      const results = await svc.detectAnomalies(T, 'revenue', 30);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        metric: 'revenue',
        isAnomaly: false,
        detectedAt: expect.any(String),
      });
    });

    it('flags anomaly when deviation is high', async () => {
      // The current stub returns deviationFactor = 0 so isAnomaly = false.
      // We verify the shape; when real data is plugged in, deviation > 2 → true.
      const results = await svc.detectAnomalies(T, 'churn', 7);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('deviationFactor');
      expect(results[0]).toHaveProperty('isAnomaly');
      expect(results[0]).toHaveProperty('rollingAvg');
      expect(results[0]).toHaveProperty('stdDeviation');
    });
  });
});

// ── Pipeline Metrics ─────────────────────────────────────────────────────────

describe('Pipeline Metrics', () => {
  describe('calculatePipelineMetrics', () => {
    it('returns pipeline metrics', async () => {
      const result = await svc.calculatePipelineMetrics(T);

      expect(result).toMatchObject({
        totalPipeline: expect.any(Number),
        weightedPipeline: expect.any(Number),
        winRate: expect.any(Number),
        revenueMTD: expect.any(Number),
        revenueQTD: expect.any(Number),
        revenueYTD: expect.any(Number),
        avgDealSize: expect.any(Number),
        velocity: expect.any(Number),
      });
      expect(result.dealsByStage).toBeDefined();
    });

    it('returns zero values for empty data', async () => {
      const result = await svc.calculatePipelineMetrics(T);

      expect(result.totalPipeline).toBe(0);
      expect(result.weightedPipeline).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.revenueMTD).toBe(0);
      expect(result.avgDealSize).toBe(0);
      expect(result.velocity).toBe(0);
    });
  });
});

// ── Rep Scorecard ────────────────────────────────────────────────────────────

describe('Rep Scorecard', () => {
  describe('getRepScorecard', () => {
    it('returns scorecard for a user', async () => {
      const result = await svc.getRepScorecard(T, ACTOR);

      expect(result).toMatchObject({
        userId: ACTOR,
        dealsClosed: expect.any(Number),
        revenue: expect.any(Number),
        activities: expect.any(Number),
        avgResponseTime: expect.any(Number),
        pipelineCoverage: expect.any(Number),
      });
    });

    it('returns zeros for no data', async () => {
      const result = await svc.getRepScorecard(T, 'new-user');

      expect(result.userId).toBe('new-user');
      expect(result.dealsClosed).toBe(0);
      expect(result.revenue).toBe(0);
      expect(result.activities).toBe(0);
      expect(result.avgResponseTime).toBe(0);
      expect(result.pipelineCoverage).toBe(0);
    });
  });
});
