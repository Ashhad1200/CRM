/**
 * Analytics module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/analytics/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { getConfig } from '../../config/index.js';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import * as widgetsSvc from './widgets.service.js';
import * as forecastSvc from './forecast.service.js';
import { parseNaturalQuery } from './nl-query.service.js';
import {
  createDashboardSchema,
  updateDashboardSchema,
  addWidgetSchema,
  createReportSchema,
  runReportSchema,
  forecastQuerySchema,
  anomalyQuerySchema,
  listDashboardsQuerySchema,
  listReportsQuerySchema,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Safely extract a single string param from Express 5's `string | string[]`. */
function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
}

/** Wrap an async route handler so rejected promises forward to Express error middleware. */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ── Inline param schemas ───────────────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

// ── Redis cache helper ─────────────────────────────────────────────────────────

const CACHE_TTL = 300; // 5 minutes
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getConfig().REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return redis;
}

async function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  try {
    const raw = await getRedis().get(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Redis unavailable — fall through to compute
  }
  const result = await compute();
  try {
    await getRedis().set(key, JSON.stringify(result), 'EX', CACHE_TTL);
  } catch {
    // best-effort cache write
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const router: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Dashboards ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/dashboards',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ query: listDashboardsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listDashboardsQuerySchema
    >;
    const result = await svc.getDashboards(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

router.post(
  '/dashboards',
  requirePermission({ module: 'analytics', action: 'create' }),
  validate({ body: createDashboardSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const dashboard = await svc.createDashboard(tenantId, req.body, actorId);
    res.status(201).json({ data: dashboard });
  }),
);

router.get(
  '/dashboards/:id',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const dashboard = await svc.getDashboard(tenantId, id);
    res.json({ data: dashboard });
  }),
);

router.patch(
  '/dashboards/:id',
  requirePermission({ module: 'analytics', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateDashboardSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const dashboard = await svc.updateDashboard(tenantId, id, req.body);
    res.json({ data: dashboard });
  }),
);

router.delete(
  '/dashboards/:id',
  requirePermission({ module: 'analytics', action: 'delete' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    await svc.deleteDashboard(tenantId, id);
    res.json({ data: { success: true } });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Widgets ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/dashboards/:id/widgets',
  requirePermission({ module: 'analytics', action: 'create' }),
  validate({ params: uuidParamSchema, body: addWidgetSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const dashboardId = param(req, 'id');
    const widget = await svc.addWidget(tenantId, dashboardId, req.body);
    res.status(201).json({ data: widget });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Dashboard Metrics ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/dashboards/:id/metrics',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const dashboardId = param(req, 'id');
    const cacheKey = `analytics:metrics:${tenantId}:${dashboardId}`;
    const metrics = await cached(cacheKey, () => svc.getDashboardMetrics(tenantId, dashboardId));
    res.json({ data: metrics });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Reports ──────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/reports',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ query: listReportsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listReportsQuerySchema
    >;
    const result = await svc.getReports(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

router.post(
  '/reports',
  requirePermission({ module: 'analytics', action: 'create' }),
  validate({ body: createReportSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const report = await svc.createReport(tenantId, req.body, actorId);
    res.status(201).json({ data: report });
  }),
);

router.get(
  '/reports/:id',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const report = await svc.getReport(tenantId, id);
    res.json({ data: report });
  }),
);

router.post(
  '/reports/:id/run',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ params: uuidParamSchema, query: runReportSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const reportId = param(req, 'id');
    const { page, limit } = req.query as unknown as z.infer<typeof runReportSchema>;
    const result = await svc.runReport(tenantId, reportId, { page, limit });
    res.json({ data: result });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Forecasting ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/forecast',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ query: forecastQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { type, historicalMonths } = req.query as unknown as z.infer<
      typeof forecastQuerySchema
    >;
    const cacheKey = `analytics:forecast:${tenantId}:${type}:${historicalMonths}`;
    const forecasts = await cached(cacheKey, () => svc.generateForecast(tenantId, type, historicalMonths));
    res.json({ data: forecasts });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Anomaly Detection ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/anomalies',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ query: anomalyQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { metric, window } = req.query as unknown as z.infer<typeof anomalyQuerySchema>;
    const anomalies = await svc.detectAnomalies(tenantId, metric, window);
    res.json({ data: anomalies });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Pipeline Metrics ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/pipeline-metrics',
  requirePermission({ module: 'analytics', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const cacheKey = `analytics:pipeline:${tenantId}`;
    const metrics = await cached(cacheKey, () => svc.calculatePipelineMetrics(tenantId));
    res.json({ data: metrics });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Rep Scorecards ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/scorecards/:userId',
  requirePermission({ module: 'analytics', action: 'read' }),
  validate({ params: userIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const userId = param(req, 'userId');
    const scorecard = await svc.getRepScorecard(tenantId, userId);
    res.json({ data: scorecard });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Widget Data API (E096) ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/widgets/data',
  requirePermission({ module: 'analytics', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const body = req.body;
    const cacheKey = `analytics:widget:${tenantId}:${JSON.stringify(body)}`;
    const data = await cached(cacheKey, () => widgetsSvc.getWidgetData(tenantId, body));
    res.json({ data });
  }),
);

router.get(
  '/widgets/metrics',
  requirePermission({ module: 'analytics', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = 'analytics:widget-metrics';
    const metrics = await cached(cacheKey, () => widgetsSvc.getAvailableMetrics());
    res.json({ data: metrics });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Revenue Forecast (E098) ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/forecast/revenue',
  requirePermission({ module: 'analytics', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const cacheKey = `analytics:forecast-revenue:${tenantId}`;
    const forecast = await cached(cacheKey, () => forecastSvc.getRevenueForecast(tenantId));
    res.json({ data: forecast });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── NL Query (E099) ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/nl-query',
  requirePermission({ module: 'analytics', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { query } = req.body as { query: string };
    const parsed = parseNaturalQuery(query ?? '');
    if (!parsed) {
      res.json({ data: null, message: 'Could not understand query' });
      return;
    }
    const data = await widgetsSvc.getWidgetData(tenantId, {
      type: 'kpi',
      module: parsed.module,
      metric: parsed.metric,
    });
    res.json({ data });
  }),
);

export const analyticsRouter = router;
