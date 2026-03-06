/**
 * E097 — Pre-built Dashboard Templates.
 *
 * Shows pre-configured dashboard templates that users can
 * select and instantiate.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

// ── Template definitions ────────────────────────────────────────────────────────

interface TemplateWidget {
  widgetType: string;
  title: string;
  dataSource: string;
  colSpan: number;
  rowSpan: number;
}

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  widgets: TemplateWidget[];
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'sales',
    name: 'Sales Dashboard',
    description: 'Pipeline overview, conversion rates, and revenue metrics',
    icon: '💰',
    widgets: [
      { widgetType: 'StatCard', title: 'Open Deals', dataSource: 'open-deals', colSpan: 1, rowSpan: 1 },
      { widgetType: 'StatCard', title: 'Total Revenue', dataSource: 'total-revenue', colSpan: 1, rowSpan: 1 },
      { widgetType: 'ChartCard', title: 'Pipeline by Stage', dataSource: 'open-deals', colSpan: 2, rowSpan: 2 },
      { widgetType: 'DataTable', title: 'Recent Deals', dataSource: 'open-deals', colSpan: 4, rowSpan: 2 },
    ],
  },
  {
    id: 'accounting',
    name: 'Accounting Dashboard',
    description: 'Cash position, AR aging, and revenue trends',
    icon: '📒',
    widgets: [
      { widgetType: 'StatCard', title: 'Total Revenue', dataSource: 'total-revenue', colSpan: 1, rowSpan: 1 },
      { widgetType: 'StatCard', title: 'Inventory Value', dataSource: 'inventory-value', colSpan: 1, rowSpan: 1 },
      { widgetType: 'ChartCard', title: 'Revenue Trend', dataSource: 'total-revenue', colSpan: 2, rowSpan: 2 },
    ],
  },
  {
    id: 'hr',
    name: 'HR Dashboard',
    description: 'Headcount, leave tracking, and payroll overview',
    icon: '👥',
    widgets: [
      { widgetType: 'StatCard', title: 'Employee Count', dataSource: 'employee-count', colSpan: 1, rowSpan: 1 },
      { widgetType: 'ChartCard', title: 'Department Distribution', dataSource: 'employee-count', colSpan: 2, rowSpan: 2 },
      { widgetType: 'DataTable', title: 'Recent Hires', dataSource: 'employee-count', colSpan: 4, rowSpan: 2 },
    ],
  },
  {
    id: 'pos',
    name: 'POS Dashboard',
    description: 'Daily sales, top-selling items, and register performance',
    icon: '🏪',
    widgets: [
      { widgetType: 'StatCard', title: 'Total Revenue', dataSource: 'total-revenue', colSpan: 1, rowSpan: 1 },
      { widgetType: 'StatCard', title: 'Inventory Value', dataSource: 'inventory-value', colSpan: 1, rowSpan: 1 },
      { widgetType: 'ChartCard', title: 'Daily Sales', dataSource: 'total-revenue', colSpan: 2, rowSpan: 2 },
    ],
  },
];

// ── Component ───────────────────────────────────────────────────────────────────

export default function PrebuiltDashboardsPage() {
  const qc = useQueryClient();
  const [createdId, setCreatedId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (template: DashboardTemplate) =>
      apiClient<{ data: { id: string } }>('/api/v1/analytics/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          layout: { widgets: template.widgets },
        }),
      }),
    onSuccess: (res) => {
      setCreatedId(res.data.id);
      qc.invalidateQueries({ queryKey: ['analytics', 'dashboards'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Templates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose a pre-built template to quickly set up a dashboard.
        </p>
      </div>

      {createdId && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Dashboard created successfully!
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{t.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{t.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{t.description}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {t.widgets.length} widgets
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setCreatedId(null);
                  createMut.mutate(t);
                }}
                disabled={createMut.isPending}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMut.isPending ? 'Creating...' : 'Use Template'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
