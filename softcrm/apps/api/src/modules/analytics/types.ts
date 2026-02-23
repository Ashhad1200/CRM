/**
 * Analytics module — domain types.
 */

// ── Dashboard types ────────────────────────────────────────────────────────────

export interface DashboardWithWidgets {
  id: string;
  tenantId: string;
  name: string;
  ownerId: string;
  isDefault: boolean;
  layout: unknown;
  createdAt: Date;
  updatedAt: Date;
  widgets: WidgetData[];
}

export interface WidgetData {
  id: string;
  dashboardId: string;
  type: string;
  config: unknown;
  position: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ── Metrics types ──────────────────────────────────────────────────────────────

export interface PipelineMetrics {
  totalPipeline: number;
  weightedPipeline: number;
  dealsByStage: Record<string, number>;
  winRate: number;
  revenueMTD: number;
  revenueQTD: number;
  revenueYTD: number;
  avgDealSize: number;
  velocity: number;
}

export interface WidgetMetricResult {
  widgetId: string;
  type: string;
  data: unknown;
}

export interface DashboardMetricsResult {
  dashboardId: string;
  widgets: WidgetMetricResult[];
  calculatedAt: string;
}

// ── Report types ───────────────────────────────────────────────────────────────

export interface ReportConfig {
  fieldSelection: string[];
  groupBy?: string;
  aggregation?: string;
  filters?: Record<string, unknown>;
}

export interface ReportResult {
  columns: string[];
  rows: unknown[];
  totalRows: number;
}

// ── Forecast types ─────────────────────────────────────────────────────────────

export interface ForecastResult {
  id: string;
  type: string;
  period: string;
  predictedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
  modelVersion: string;
  createdAt: Date;
}

// ── Anomaly types ──────────────────────────────────────────────────────────────

export interface AnomalyResult {
  metric: string;
  currentValue: number;
  rollingAvg: number;
  stdDeviation: number;
  deviationFactor: number;
  isAnomaly: boolean;
  detectedAt: string;
}

// ── Rep Scorecard ──────────────────────────────────────────────────────────────

export interface RepScorecard {
  userId: string;
  dealsClosed: number;
  revenue: number;
  activities: number;
  avgResponseTime: number;
  pipelineCoverage: number;
}

// ── Filter interfaces ──────────────────────────────────────────────────────────

export interface DashboardFilters {
  search?: string;
  ownerId?: string;
}

export interface ReportFilters {
  search?: string;
  ownerId?: string;
}
