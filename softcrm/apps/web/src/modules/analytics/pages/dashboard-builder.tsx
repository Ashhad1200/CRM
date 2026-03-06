/**
 * E095 — Dashboard Builder.
 *
 * Drag-and-drop dashboard builder with widget catalog, CSS Grid layout,
 * save/load dashboard layouts, and configurable widgets.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

// ── Types ───────────────────────────────────────────────────────────────────────

interface AvailableMetric {
  module: string;
  metric: string;
  label: string;
  type: string;
}

interface BuilderWidget {
  id: string;
  widgetType: 'StatCard' | 'ChartCard' | 'DataTable';
  title: string;
  dataSource: string;
  colSpan: number;
  rowSpan: number;
}

interface DashboardLayout {
  widgets: BuilderWidget[];
}

// ── Catalog items ───────────────────────────────────────────────────────────────

const WIDGET_CATALOG: Array<{
  type: BuilderWidget['widgetType'];
  label: string;
  icon: string;
  defaultColSpan: number;
  defaultRowSpan: number;
}> = [
  { type: 'StatCard', label: 'Stat Card', icon: '📊', defaultColSpan: 1, defaultRowSpan: 1 },
  { type: 'ChartCard', label: 'Chart Card', icon: '📈', defaultColSpan: 2, defaultRowSpan: 2 },
  { type: 'DataTable', label: 'Data Table', icon: '📋', defaultColSpan: 4, defaultRowSpan: 2 },
];

let nextId = 1;

// ── Component ───────────────────────────────────────────────────────────────────

export default function DashboardBuilderPage() {
  const qc = useQueryClient();
  const [widgets, setWidgets] = useState<BuilderWidget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [layoutName, setLayoutName] = useState('My Dashboard');
  const [draggedType, setDraggedType] = useState<BuilderWidget['widgetType'] | null>(null);

  // Fetch available metrics for data-source picker
  const { data: metricsData } = useQuery({
    queryKey: ['widget-metrics'],
    queryFn: () =>
      apiClient<{ data: AvailableMetric[] }>('/api/v1/analytics/widgets/metrics'),
  });
  const metrics = metricsData?.data ?? [];

  // Save layout mutation
  const saveMut = useMutation({
    mutationFn: (layout: DashboardLayout) =>
      apiClient<{ data: unknown }>('/api/v1/analytics/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: layoutName, layout }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', 'dashboards'] });
    },
  });

  const addWidget = useCallback(
    (type: BuilderWidget['widgetType']) => {
      const catalog = WIDGET_CATALOG.find((c) => c.type === type)!;
      const w: BuilderWidget = {
        id: `w-${nextId++}`,
        widgetType: type,
        title: catalog.label,
        dataSource: '',
        colSpan: catalog.defaultColSpan,
        rowSpan: catalog.defaultRowSpan,
      };
      setWidgets((prev) => [...prev, w]);
      setSelectedWidgetId(w.id);
    },
    [],
  );

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedWidgetId((sel) => (sel === id ? null : sel));
  }, []);

  const updateWidget = useCallback(
    (id: string, updates: Partial<BuilderWidget>) => {
      setWidgets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      );
    },
    [],
  );

  const handleSave = () => saveMut.mutate({ widgets });

  const selectedWidget = widgets.find((w) => w.id === selectedWidgetId) ?? null;

  return (
    <div className="flex h-full gap-4">
      {/* ── Widget Catalog Sidebar ───────────────────────────────────────── */}
      <aside className="w-56 shrink-0 space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700">Widget Catalog</h3>
        {WIDGET_CATALOG.map((item) => (
          <button
            key={item.type}
            draggable
            onDragStart={() => setDraggedType(item.type)}
            onDragEnd={() => setDraggedType(null)}
            onClick={() => addWidget(item.type)}
            className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100 transition-colors cursor-grab active:cursor-grabbing"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <hr className="border-gray-200" />

        {/* Config panel for selected widget */}
        {selectedWidget && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-600 uppercase">Configure</h4>
            <label className="block text-xs text-gray-600">
              Title
              <input
                type="text"
                value={selectedWidget.title}
                onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              Data Source
              <select
                value={selectedWidget.dataSource}
                onChange={(e) => updateWidget(selectedWidget.id, { dataSource: e.target.value })}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">— none —</option>
                {metrics.map((m) => (
                  <option key={m.metric} value={m.metric}>
                    {m.label} ({m.module})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-gray-600">
              Col Span
              <input
                type="number"
                min={1}
                max={4}
                value={selectedWidget.colSpan}
                onChange={(e) => updateWidget(selectedWidget.id, { colSpan: Number(e.target.value) })}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-600">
              Row Span
              <input
                type="number"
                min={1}
                max={3}
                value={selectedWidget.rowSpan}
                onChange={(e) => updateWidget(selectedWidget.id, { rowSpan: Number(e.target.value) })}
                className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
        )}
      </aside>

      {/* ── Grid Layout Area ─────────────────────────────────────────────── */}
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium"
            placeholder="Dashboard name"
          />
          <button
            onClick={handleSave}
            disabled={saveMut.isPending || widgets.length === 0}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Saving...' : 'Save Layout'}
          </button>
          {saveMut.isSuccess && (
            <span className="text-xs text-green-600">Saved!</span>
          )}
        </div>

        {/* Grid */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (draggedType) {
              addWidget(draggedType);
              setDraggedType(null);
            }
          }}
          className="min-h-[400px] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            gridAutoRows: 'minmax(120px, auto)',
          }}
        >
          {widgets.length === 0 && (
            <p className="col-span-4 flex items-center justify-center text-sm text-gray-400">
              Click or drag widgets from the catalog to add them here
            </p>
          )}
          {widgets.map((w) => (
            <div
              key={w.id}
              onClick={() => setSelectedWidgetId(w.id)}
              className={`rounded-lg border bg-white p-3 shadow-sm cursor-pointer transition-all ${
                selectedWidgetId === w.id
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:shadow-md'
              }`}
              style={{
                gridColumn: `span ${w.colSpan}`,
                gridRow: `span ${w.rowSpan}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-600">{w.widgetType}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWidget(w.id);
                  }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm font-medium text-gray-900">{w.title}</p>
              {w.dataSource && (
                <p className="mt-1 text-xs text-gray-500">Source: {w.dataSource}</p>
              )}
              {!w.dataSource && (
                <p className="mt-1 text-xs text-gray-400 italic">No data source</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
