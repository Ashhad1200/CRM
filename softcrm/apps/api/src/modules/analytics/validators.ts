/**
 * Analytics module — Zod validation schemas.
 */

import { z } from 'zod';

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

// ── Enum schemas ───────────────────────────────────────────────────────────────

export const widgetTypeSchema = z.enum(['CHART', 'KPI', 'TABLE', 'FUNNEL']);
export const forecastTypeSchema = z.enum(['REVENUE', 'PIPELINE']);

// ── Dashboard schemas ──────────────────────────────────────────────────────────

export const createDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  isDefault: z.boolean().optional(),
  layout: z.record(z.unknown()).optional(),
  widgets: z.array(z.object({
    type: widgetTypeSchema,
    config: z.record(z.unknown()),
    position: z.record(z.unknown()),
  })).optional(),
});

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;

export const updateDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isDefault: z.boolean().optional(),
  layout: z.record(z.unknown()).optional(),
});

export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;

// ── Widget schemas ─────────────────────────────────────────────────────────────

export const addWidgetSchema = z.object({
  type: widgetTypeSchema,
  config: z.record(z.unknown()),
  position: z.record(z.unknown()),
});

export type AddWidgetInput = z.infer<typeof addWidgetSchema>;

// ── Report schemas ─────────────────────────────────────────────────────────────

export const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  fieldSelection: z.array(z.string().min(1)),
  groupBy: z.string().optional(),
  aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
  filters: z.record(z.unknown()).optional(),
  scheduleFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  scheduleRecipients: z.array(z.string().email()).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const runReportSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export type RunReportInput = z.infer<typeof runReportSchema>;

// ── Forecast schemas ───────────────────────────────────────────────────────────

export const forecastQuerySchema = z.object({
  type: forecastTypeSchema.optional(),
  historicalMonths: z.coerce.number().int().min(3).max(36).default(12),
});

export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;

// ── Anomaly schemas ────────────────────────────────────────────────────────────

export const anomalyQuerySchema = z.object({
  metric: z.enum(['revenue', 'deals', 'pipeline', 'tickets', 'response_time']),
  window: z.coerce.number().int().min(7).max(90).default(30),
});

export type AnomalyQueryInput = z.infer<typeof anomalyQuerySchema>;

// ── List queries ───────────────────────────────────────────────────────────────

export const listDashboardsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export const listReportsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});
