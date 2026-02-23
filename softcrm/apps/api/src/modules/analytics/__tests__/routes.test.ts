import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock declarations (must be before vi.mock calls) ────────────────────────────

const mockCreateDashboard = vi.fn();
const mockGetDashboards = vi.fn();
const mockGetDashboard = vi.fn();
const mockUpdateDashboard = vi.fn();
const mockDeleteDashboard = vi.fn();
const mockAddWidget = vi.fn();
const mockGetDashboardMetrics = vi.fn();
const mockCreateReport = vi.fn();
const mockGetReports = vi.fn();
const mockGetReport = vi.fn();
const mockRunReport = vi.fn();
const mockGenerateForecast = vi.fn();
const mockDetectAnomalies = vi.fn();
const mockCalculatePipelineMetrics = vi.fn();
const mockGetRepScorecard = vi.fn();

vi.mock('../service.js', () => ({
  createDashboard: (...args: unknown[]) => mockCreateDashboard(...args),
  getDashboards: (...args: unknown[]) => mockGetDashboards(...args),
  getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
  updateDashboard: (...args: unknown[]) => mockUpdateDashboard(...args),
  deleteDashboard: (...args: unknown[]) => mockDeleteDashboard(...args),
  addWidget: (...args: unknown[]) => mockAddWidget(...args),
  getDashboardMetrics: (...args: unknown[]) => mockGetDashboardMetrics(...args),
  createReport: (...args: unknown[]) => mockCreateReport(...args),
  getReports: (...args: unknown[]) => mockGetReports(...args),
  getReport: (...args: unknown[]) => mockGetReport(...args),
  runReport: (...args: unknown[]) => mockRunReport(...args),
  generateForecast: (...args: unknown[]) => mockGenerateForecast(...args),
  detectAnomalies: (...args: unknown[]) => mockDetectAnomalies(...args),
  calculatePipelineMetrics: (...args: unknown[]) => mockCalculatePipelineMetrics(...args),
  getRepScorecard: (...args: unknown[]) => mockGetRepScorecard(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: Function) => next(),
}));

// ── Import router AFTER mocks ───────────────────────────────────────────────────

import { analyticsRouter } from '../routes.js';

// ── Test app setup ──────────────────────────────────────────────────────────────

function createTestApp() {
  const app = express();
  app.use(express.json());
  // Inject fake user
  app.use((req: any, _res: any, next: Function) => {
    req.user = { tid: 'tenant-1', sub: 'user-1', roles: ['admin'] };
    next();
  });
  app.use('/analytics', analyticsRouter);
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tests ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Dashboards ───────────────────────────────────────────────────────────────

describe('Dashboard routes', () => {
  it('GET /analytics/dashboards → 200', async () => {
    const paginated = { data: [{ id: 'dash-1' }], total: 1, page: 1, pageSize: 10, totalPages: 1 };
    mockGetDashboards.mockResolvedValue(paginated);

    const res = await request(createTestApp())
      .get('/analytics/dashboards')
      .query({ page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(mockGetDashboards).toHaveBeenCalled();
  });

  it('POST /analytics/dashboards → 201', async () => {
    const dashboard = { id: 'dash-1', name: 'Sales Overview' };
    mockCreateDashboard.mockResolvedValue(dashboard);

    const res = await request(createTestApp())
      .post('/analytics/dashboards')
      .send({ name: 'Sales Overview' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: dashboard });
    expect(mockCreateDashboard).toHaveBeenCalledWith('tenant-1', { name: 'Sales Overview' }, 'user-1');
  });

  it('GET /analytics/dashboards/:id → 200', async () => {
    const dashboard = { id: 'dash-1', name: 'Sales Overview', widgets: [] };
    mockGetDashboard.mockResolvedValue(dashboard);

    const res = await request(createTestApp())
      .get('/analytics/dashboards/dash-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: dashboard });
    expect(mockGetDashboard).toHaveBeenCalledWith('tenant-1', 'dash-1');
  });

  it('PATCH /analytics/dashboards/:id → 200', async () => {
    const updated = { id: 'dash-1', name: 'Revenue Dashboard' };
    mockUpdateDashboard.mockResolvedValue(updated);

    const res = await request(createTestApp())
      .patch('/analytics/dashboards/dash-1')
      .send({ name: 'Revenue Dashboard' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: updated });
    expect(mockUpdateDashboard).toHaveBeenCalledWith('tenant-1', 'dash-1', { name: 'Revenue Dashboard' });
  });

  it('DELETE /analytics/dashboards/:id → 204', async () => {
    mockDeleteDashboard.mockResolvedValue(undefined);

    const res = await request(createTestApp())
      .delete('/analytics/dashboards/dash-1');

    // Route returns 200 with { data: { success: true } } per routes.ts
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { success: true } });
    expect(mockDeleteDashboard).toHaveBeenCalledWith('tenant-1', 'dash-1');
  });
});

// ── Widgets ──────────────────────────────────────────────────────────────────

describe('Widget routes', () => {
  it('POST /analytics/dashboards/:id/widgets → 201', async () => {
    const widget = { id: 'w-1', dashboardId: 'dash-1', type: 'KPI', title: 'Revenue' };
    mockAddWidget.mockResolvedValue(widget);

    const res = await request(createTestApp())
      .post('/analytics/dashboards/dash-1/widgets')
      .send({ type: 'KPI', title: 'Revenue', config: {} });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: widget });
    expect(mockAddWidget).toHaveBeenCalled();
  });
});

// ── Dashboard Metrics ────────────────────────────────────────────────────────

describe('Dashboard Metrics routes', () => {
  it('GET /analytics/dashboards/:id/metrics → 200', async () => {
    const metrics = {
      dashboardId: 'dash-1',
      widgets: [{ widgetId: 'w-1', type: 'KPI', data: { value: 100 } }],
      calculatedAt: '2026-02-22T00:00:00.000Z',
    };
    mockGetDashboardMetrics.mockResolvedValue(metrics);

    const res = await request(createTestApp())
      .get('/analytics/dashboards/dash-1/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: metrics });
    expect(mockGetDashboardMetrics).toHaveBeenCalledWith('tenant-1', 'dash-1');
  });
});

// ── Reports ──────────────────────────────────────────────────────────────────

describe('Report routes', () => {
  it('GET /analytics/reports → 200', async () => {
    const paginated = { data: [{ id: 'rpt-1' }], total: 1, page: 1, pageSize: 10, totalPages: 1 };
    mockGetReports.mockResolvedValue(paginated);

    const res = await request(createTestApp())
      .get('/analytics/reports')
      .query({ page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(mockGetReports).toHaveBeenCalled();
  });

  it('POST /analytics/reports → 201', async () => {
    const report = { id: 'rpt-1', name: 'Monthly Revenue', type: 'PIPELINE' };
    mockCreateReport.mockResolvedValue(report);

    const res = await request(createTestApp())
      .post('/analytics/reports')
      .send({ name: 'Monthly Revenue', type: 'PIPELINE', fieldSelection: ['amount'] });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: report });
    expect(mockCreateReport).toHaveBeenCalledWith(
      'tenant-1',
      { name: 'Monthly Revenue', type: 'PIPELINE', fieldSelection: ['amount'] },
      'user-1',
    );
  });

  it('GET /analytics/reports/:id → 200', async () => {
    const report = { id: 'rpt-1', name: 'Monthly Revenue', type: 'PIPELINE' };
    mockGetReport.mockResolvedValue(report);

    const res = await request(createTestApp())
      .get('/analytics/reports/rpt-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: report });
    expect(mockGetReport).toHaveBeenCalledWith('tenant-1', 'rpt-1');
  });

  it('POST /analytics/reports/:id/run → 200', async () => {
    const result = { columns: ['amount', 'stage'], rows: [], totalRows: 0 };
    mockRunReport.mockResolvedValue(result);

    const res = await request(createTestApp())
      .post('/analytics/reports/rpt-1/run')
      .query({ page: '1', limit: '10' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: result });
    expect(mockRunReport).toHaveBeenCalled();
  });
});

// ── Forecasting ──────────────────────────────────────────────────────────────

describe('Forecast routes', () => {
  it('GET /analytics/forecast → 200', async () => {
    const forecasts = [
      { id: 'fc-1', type: 'REVENUE', period: '2026-03', predictedValue: 105000 },
    ];
    mockGenerateForecast.mockResolvedValue(forecasts);

    const res = await request(createTestApp())
      .get('/analytics/forecast')
      .query({ historicalMonths: '12' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: forecasts });
    expect(mockGenerateForecast).toHaveBeenCalled();
  });
});

// ── Anomaly Detection ────────────────────────────────────────────────────────

describe('Anomaly routes', () => {
  it('GET /analytics/anomalies?metric=revenue&window=30 → 200', async () => {
    const anomalies = [
      { metric: 'revenue', currentValue: 50000, rollingAvg: 48000, stdDeviation: 2000, deviationFactor: 1, isAnomaly: false, detectedAt: '2026-02-22T00:00:00.000Z' },
    ];
    mockDetectAnomalies.mockResolvedValue(anomalies);

    const res = await request(createTestApp())
      .get('/analytics/anomalies')
      .query({ metric: 'revenue', window: '30' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: anomalies });
    expect(mockDetectAnomalies).toHaveBeenCalled();
  });
});

// ── Pipeline Metrics ─────────────────────────────────────────────────────────

describe('Pipeline Metrics routes', () => {
  it('GET /analytics/pipeline-metrics → 200', async () => {
    const metrics = {
      totalPipeline: 500000,
      weightedPipeline: 250000,
      dealsByStage: { discovery: 5, proposal: 3 },
      winRate: 0.35,
      revenueMTD: 80000,
      revenueQTD: 200000,
      revenueYTD: 600000,
      avgDealSize: 25000,
      velocity: 12000,
    };
    mockCalculatePipelineMetrics.mockResolvedValue(metrics);

    const res = await request(createTestApp())
      .get('/analytics/pipeline-metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: metrics });
    expect(mockCalculatePipelineMetrics).toHaveBeenCalledWith('tenant-1');
  });
});

// ── Rep Scorecards ───────────────────────────────────────────────────────────

describe('Scorecard routes', () => {
  it('GET /analytics/scorecards/:userId → 200', async () => {
    const scorecard = {
      userId: 'user-1',
      dealsClosed: 12,
      revenue: 300000,
      activities: 85,
      avgResponseTime: 2.5,
      pipelineCoverage: 3.2,
    };
    mockGetRepScorecard.mockResolvedValue(scorecard);

    const res = await request(createTestApp())
      .get('/analytics/scorecards/user-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: scorecard });
    expect(mockGetRepScorecard).toHaveBeenCalledWith('tenant-1', 'user-1');
  });
});
