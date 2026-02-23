/**
 * Analytics module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import {
  NotFoundError,
  ValidationError,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import { logger } from '../../logger.js';
import * as repo from './repository.js';
import * as events from './events.js';

import type {
  DashboardFilters,
  ReportFilters,
  PipelineMetrics,
  DashboardMetricsResult,
  WidgetMetricResult,
  ReportResult,
  ForecastResult,
  AnomalyResult,
  RepScorecard,
} from './types.js';
import type {
  CreateDashboardInput,
  UpdateDashboardInput,
  AddWidgetInput,
  CreateReportInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Dashboards ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createDashboard(
  tenantId: string,
  data: CreateDashboardInput,
  actorId: string,
) {
  // Check name uniqueness within tenant
  const existing = await repo.findDashboardByName(tenantId, data.name);
  if (existing) {
    throw new ValidationError(`Dashboard with name "${data.name}" already exists`);
  }

  return repo.createDashboard(tenantId, data, actorId);
}

export async function getDashboards(
  tenantId: string,
  filters: DashboardFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findDashboards(tenantId, filters, pagination);
  return paginatedResult(data, total, { page: pagination.page, pageSize: pagination.limit });
}

export async function getDashboard(tenantId: string, dashboardId: string) {
  const dashboard = await repo.findDashboardById(tenantId, dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard', dashboardId);
  }
  return dashboard;
}

export async function updateDashboard(
  tenantId: string,
  dashboardId: string,
  data: UpdateDashboardInput,
) {
  const dashboard = await repo.findDashboardById(tenantId, dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard', dashboardId);
  }

  // If name is changing, check uniqueness
  if (data.name && data.name !== dashboard.name) {
    const existing = await repo.findDashboardByName(tenantId, data.name);
    if (existing) {
      throw new ValidationError(`Dashboard with name "${data.name}" already exists`);
    }
  }

  return repo.updateDashboard(tenantId, dashboardId, data);
}

export async function deleteDashboard(tenantId: string, dashboardId: string) {
  const dashboard = await repo.findDashboardById(tenantId, dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard', dashboardId);
  }

  return repo.deleteDashboard(tenantId, dashboardId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Widgets ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function addWidget(
  tenantId: string,
  dashboardId: string,
  data: AddWidgetInput,
) {
  const dashboard = await repo.findDashboardById(tenantId, dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard', dashboardId);
  }

  return repo.createWidget(dashboardId, data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Dashboard Metrics ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDashboardMetrics(
  tenantId: string,
  dashboardId: string,
): Promise<DashboardMetricsResult> {
  const dashboard = await repo.findDashboardById(tenantId, dashboardId);
  if (!dashboard) {
    throw new NotFoundError('Dashboard', dashboardId);
  }

  // Resolve each widget's data
  const widgetResults: WidgetMetricResult[] = dashboard.widgets.map(
    (widget: { id: string; type: string; config: unknown }) => {
      // TODO: Resolve actual widget data from cross-module queries based on widget config.
      // For now, return stub data per widget type.
      return {
        widgetId: widget.id,
        type: widget.type,
        data: resolveWidgetData(widget.type, widget.config),
      };
    },
  );

  const result: DashboardMetricsResult = {
    dashboardId,
    widgets: widgetResults,
    calculatedAt: new Date().toISOString(),
  };

  // Publish metrics updated event
  await events.publishMetricsUpdated(tenantId, 'system', {
    id: dashboard.id,
    name: dashboard.name,
  });

  return result;
}

/**
 * Resolve widget data based on type and config.
 * TODO: Replace stubs with real cross-module queries (deals, contacts, etc.)
 */
function resolveWidgetData(type: string, _config: unknown): unknown {
  switch (type) {
    case 'KPI':
      return { value: 0, label: 'Pending data source', trend: 0 };
    case 'CHART':
      return { labels: [], series: [], chartType: 'bar' };
    case 'TABLE':
      return { columns: [], rows: [] };
    case 'FUNNEL':
      return { stages: [] };
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Saved Reports ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createReport(
  tenantId: string,
  data: CreateReportInput,
  actorId: string,
) {
  // Check name uniqueness within tenant
  const existing = await repo.findReportByName(tenantId, data.name);
  if (existing) {
    throw new ValidationError(`Report with name "${data.name}" already exists`);
  }

  return repo.createReport(tenantId, data, actorId);
}

export async function getReports(
  tenantId: string,
  filters: ReportFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findReports(tenantId, filters, pagination);
  return paginatedResult(data, total, { page: pagination.page, pageSize: pagination.limit });
}

export async function getReport(tenantId: string, reportId: string) {
  const report = await repo.findReportById(tenantId, reportId);
  if (!report) {
    throw new NotFoundError('SavedReport', reportId);
  }
  return report;
}

export async function runReport(
  tenantId: string,
  reportId: string,
  pagination: Pagination,
): Promise<ReportResult> {
  const report = await repo.findReportById(tenantId, reportId);
  if (!report) {
    throw new NotFoundError('SavedReport', reportId);
  }

  // Extract report config
  const fieldSelection = report.fieldSelection as string[];
  const _groupBy = report.groupBy;
  const _aggregation = report.aggregation;
  const _filters = report.filters as Record<string, unknown> | null;

  // TODO: Build dynamic query based on fieldSelection, groupBy, aggregation, filters.
  // This requires cross-module access to deals, contacts, activities, etc.
  // For now, return stub data structure.
  logger.info(
    { tenantId, reportId, fields: fieldSelection, page: pagination.page },
    'Running saved report',
  );

  return {
    columns: fieldSelection,
    rows: [],
    totalRows: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Forecasting ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateForecast(
  tenantId: string,
  type: string | undefined,
  historicalMonths: number,
): Promise<ForecastResult[]> {
  const forecastTypes = type ? [type] : ['REVENUE', 'PIPELINE'];
  const results: ForecastResult[] = [];

  for (const ft of forecastTypes) {
    // TODO: Query real historical data from deals/pipeline modules for the
    // specified historicalMonths window. For now, generate stub data with
    // a simple linear regression placeholder.
    logger.info(
      { tenantId, type: ft, historicalMonths },
      'Generating forecast',
    );

    // Simple linear regression placeholder — generates 3-month forecast
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

      // Stub values — replace with actual regression output
      const baseValue = 100000 * (1 + i * 0.05);
      const confidence = baseValue * 0.15;

      const forecast = await repo.createForecast(tenantId, {
        type: ft,
        period,
        predictedValue: Math.round(baseValue * 100) / 100,
        confidenceLow: Math.round((baseValue - confidence) * 100) / 100,
        confidenceHigh: Math.round((baseValue + confidence) * 100) / 100,
        modelVersion: 'linear-v1',
      });

      results.push({
        id: forecast.id,
        type: forecast.type,
        period: forecast.period,
        predictedValue: Number(forecast.predictedValue),
        confidenceLow: Number(forecast.confidenceLow),
        confidenceHigh: Number(forecast.confidenceHigh),
        modelVersion: forecast.modelVersion,
        createdAt: forecast.createdAt,
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Anomaly Detection ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function detectAnomalies(
  tenantId: string,
  metric: string,
  window: number,
): Promise<AnomalyResult[]> {
  // TODO: Query real metric values from the appropriate module for the specified
  // window (days). Compare current value to rolling average, flag when > 2 std
  // deviations. For now, return stub indicating no anomalies detected.
  logger.info(
    { tenantId, metric, window },
    'Running anomaly detection',
  );

  // Placeholder — in production, pull real values and compute:
  // rollingAvg = mean(values), stdDev = std(values),
  // deviationFactor = |current - rollingAvg| / stdDev
  const currentValue = 0;
  const rollingAvg = 0;
  const stdDeviation = 0;
  const deviationFactor = 0;

  return [
    {
      metric,
      currentValue,
      rollingAvg,
      stdDeviation,
      deviationFactor,
      isAnomaly: deviationFactor > 2,
      detectedAt: new Date().toISOString(),
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Pipeline Metrics ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function calculatePipelineMetrics(
  tenantId: string,
): Promise<PipelineMetrics> {
  // TODO: Query deals module for real pipeline data including:
  // - Total pipeline value (sum of open deal amounts)
  // - Weighted pipeline (deal amount * stage probability)
  // - Deals grouped by stage
  // - Win rate (won / (won + lost))
  // - Revenue MTD/QTD/YTD from closed-won deals
  // - Average deal size
  // - Sales velocity (avg deals * avg value * win rate / avg cycle time)
  logger.info({ tenantId }, 'Calculating pipeline metrics');

  return {
    totalPipeline: 0,
    weightedPipeline: 0,
    dealsByStage: {},
    winRate: 0,
    revenueMTD: 0,
    revenueQTD: 0,
    revenueYTD: 0,
    avgDealSize: 0,
    velocity: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Rep Scorecard ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getRepScorecard(
  tenantId: string,
  userId: string,
): Promise<RepScorecard> {
  // TODO: Query cross-module data for:
  // - Deals closed by user (deals module)
  // - Revenue from closed-won deals (deals module)
  // - Activities logged (activities module)
  // - Average response time to leads (comms module)
  // - Pipeline coverage ratio (deals module)
  logger.info({ tenantId, userId }, 'Generating rep scorecard');

  return {
    userId,
    dealsClosed: 0,
    revenue: 0,
    activities: 0,
    avgResponseTime: 0,
    pipelineCoverage: 0,
  };
}
