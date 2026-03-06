/**
 * E096 — Widget Data API service.
 *
 * Provides dynamic widget data and available metric definitions
 * for the dashboard builder.
 */

import { getPrismaClient } from '@softcrm/db';

export type WidgetType = 'kpi' | 'timeSeries' | 'topN' | 'funnel' | 'pie';

export interface WidgetQuery {
  type: WidgetType;
  module: string;
  metric: string;
  period?: string;
  limit?: number;
}

export async function getWidgetData(tenantId: string, query: WidgetQuery) {
  const db = getPrismaClient();

  switch (query.metric) {
    case 'total-revenue': {
      const invoices = await db.invoice.findMany({
        where: { tenantId, status: 'PAID' },
        select: { total: true },
      });
      return {
        value: invoices.reduce((s, i) => s + Number(i.total), 0),
        label: 'Total Revenue',
      };
    }
    case 'open-deals': {
      const count = await db.deal.count({
        where: { tenantId, status: { notIn: ['WON', 'LOST'] } },
      });
      return { value: count, label: 'Open Deals' };
    }
    case 'active-tickets': {
      const count = await db.ticket.count({
        where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
      return { value: count, label: 'Active Tickets' };
    }
    case 'employee-count': {
      const count = await db.employee.count({
        where: { tenantId, status: { not: 'TERMINATED' } },
      });
      return { value: count, label: 'Employees' };
    }
    case 'inventory-value': {
      const products = await db.product.findMany({
        where: { tenantId },
        select: { cost: true },
      });
      return {
        value: products.reduce((s, p) => s + Number(p.cost ?? 0), 0),
        label: 'Inventory Value',
      };
    }
    default:
      return { value: 0, label: query.metric };
  }
}

export async function getAvailableMetrics(): Promise<
  Array<{ module: string; metric: string; label: string; type: WidgetType }>
> {
  return [
    { module: 'sales', metric: 'open-deals', label: 'Open Deals', type: 'kpi' },
    { module: 'sales', metric: 'total-revenue', label: 'Total Revenue', type: 'kpi' },
    { module: 'support', metric: 'active-tickets', label: 'Active Tickets', type: 'kpi' },
    { module: 'hr', metric: 'employee-count', label: 'Employee Count', type: 'kpi' },
    { module: 'inventory', metric: 'inventory-value', label: 'Inventory Value', type: 'kpi' },
  ];
}
