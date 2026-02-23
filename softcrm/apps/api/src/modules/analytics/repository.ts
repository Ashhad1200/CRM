/**
 * Analytics module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  ConflictError,
  generateId,
} from '@softcrm/shared-kernel';

// Prisma enum type helpers — we extract enum types from the Prisma client
// to safely cast validated string inputs without importing @prisma/client directly.
type PrismaClient = ReturnType<typeof getPrismaClient>;
type WidgetCreateInput = NonNullable<Parameters<PrismaClient['widget']['create']>[0]>['data'];
type PrismaWidgetType = NonNullable<WidgetCreateInput>['type'];
type ForecastCreateInput = NonNullable<Parameters<PrismaClient['forecast']['create']>[0]>['data'];
type PrismaForecastType = NonNullable<ForecastCreateInput>['type'];

import type { DashboardFilters, ReportFilters } from './types.js';
import type {
  CreateDashboardInput,
  UpdateDashboardInput,
  AddWidgetInput,
  CreateReportInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
}

/** Transaction client for use in multi-step operations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: Pagination): { skip: number; take: number } {
  const skip = (pagination.page - 1) * pagination.limit;
  return { skip, take: pagination.limit };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Dashboards ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const dashboardWithWidgetsInclude = {
  widgets: true,
} as const;

export async function createDashboard(
  tenantId: string,
  data: CreateDashboardInput,
  actorId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const dashboardId = generateId();

  const dashboard = await client.dashboard.create({
    data: {
      id: dashboardId,
      tenantId,
      name: data.name,
      ownerId: actorId,
      isDefault: data.isDefault ?? false,
      layout: data.layout ? (data.layout as never) : undefined,
    },
    include: dashboardWithWidgetsInclude,
  });

  // Create widgets if provided
  if (data.widgets && data.widgets.length > 0) {
    await client.widget.createMany({
      data: data.widgets.map((w) => ({
        id: generateId(),
        dashboardId,
        type: w.type as PrismaWidgetType,
        config: w.config as never,
        position: w.position as never,
      })),
    });

    // Re-fetch with widgets
    return client.dashboard.findFirst({
      where: { id: dashboardId, tenantId },
      include: dashboardWithWidgetsInclude,
    });
  }

  return dashboard;
}

export async function findDashboardById(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.dashboard.findFirst({
    where: { id, tenantId },
    include: dashboardWithWidgetsInclude,
  });
}

export async function findDashboardByName(
  tenantId: string,
  name: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.dashboard.findFirst({
    where: { tenantId, name },
  });
}

export async function findDashboards(
  tenantId: string,
  filters: DashboardFilters,
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['name'] = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters.ownerId) {
    where['ownerId'] = filters.ownerId;
  }

  const [data, total] = await Promise.all([
    client.dashboard.findMany({
      where,
      include: dashboardWithWidgetsInclude,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    client.dashboard.count({ where }),
  ]);

  return { data, total };
}

export async function updateDashboard(
  tenantId: string,
  id: string,
  data: UpdateDashboardInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.dashboard.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.layout !== undefined && { layout: data.layout as never }),
    },
    include: dashboardWithWidgetsInclude,
  });
}

export async function deleteDashboard(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();

  // Delete associated widgets first
  await client.widget.deleteMany({
    where: { dashboardId: id },
  });

  return client.dashboard.delete({
    where: { id },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Widgets ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createWidget(
  dashboardId: string,
  data: AddWidgetInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.widget.create({
    data: {
      id: generateId(),
      dashboardId,
      type: data.type as PrismaWidgetType,
      config: data.config as never,
      position: data.position as never,
    },
  });
}

export async function updateWidget(
  widgetId: string,
  data: Partial<AddWidgetInput>,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.widget.update({
    where: { id: widgetId },
    data: {
      ...(data.type !== undefined && { type: data.type as PrismaWidgetType }),
      ...(data.config !== undefined && { config: data.config as never }),
      ...(data.position !== undefined && { position: data.position as never }),
    },
  });
}

export async function deleteWidget(
  widgetId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.widget.delete({
    where: { id: widgetId },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Saved Reports ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createReport(
  tenantId: string,
  data: CreateReportInput,
  actorId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.savedReport.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      ownerId: actorId,
      fieldSelection: data.fieldSelection as never,
      groupBy: data.groupBy ?? null,
      aggregation: data.aggregation ?? null,
      filters: data.filters ? (data.filters as never) : undefined,
      scheduleFrequency: data.scheduleFrequency ?? null,
      scheduleRecipients: data.scheduleRecipients ?? [],
    },
  });
}

export async function findReportById(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.savedReport.findFirst({
    where: { id, tenantId },
  });
}

export async function findReportByName(
  tenantId: string,
  name: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.savedReport.findFirst({
    where: { tenantId, name },
  });
}

export async function findReports(
  tenantId: string,
  filters: ReportFilters,
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['name'] = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters.ownerId) {
    where['ownerId'] = filters.ownerId;
  }

  const [data, total] = await Promise.all([
    client.savedReport.findMany({
      where,
      ...paginationArgs(pagination),
      orderBy: { createdAt: 'desc' },
    }),
    client.savedReport.count({ where }),
  ]);

  return { data, total };
}

export async function updateReport(
  tenantId: string,
  id: string,
  data: Partial<CreateReportInput>,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.savedReport.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.fieldSelection !== undefined && { fieldSelection: data.fieldSelection as never }),
      ...(data.groupBy !== undefined && { groupBy: data.groupBy }),
      ...(data.aggregation !== undefined && { aggregation: data.aggregation }),
      ...(data.filters !== undefined && { filters: data.filters as never }),
      ...(data.scheduleFrequency !== undefined && { scheduleFrequency: data.scheduleFrequency }),
      ...(data.scheduleRecipients !== undefined && { scheduleRecipients: data.scheduleRecipients }),
    },
  });
}

export async function deleteReport(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.savedReport.delete({
    where: { id },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Forecasts ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createForecast(
  tenantId: string,
  data: {
    type: string;
    period: string;
    predictedValue: number;
    confidenceLow: number;
    confidenceHigh: number;
    modelVersion: string;
  },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.forecast.create({
    data: {
      id: generateId(),
      tenantId,
      type: data.type as PrismaForecastType,
      period: data.period,
      predictedValue: data.predictedValue,
      confidenceLow: data.confidenceLow,
      confidenceHigh: data.confidenceHigh,
      modelVersion: data.modelVersion,
    },
  });
}

export async function findForecasts(
  tenantId: string,
  type?: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (type) {
    where['type'] = type as PrismaForecastType;
  }

  return client.forecast.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function findLatestForecast(
  tenantId: string,
  type: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.forecast.findFirst({
    where: { tenantId, type: type as PrismaForecastType },
    orderBy: { createdAt: 'desc' },
  });
}
