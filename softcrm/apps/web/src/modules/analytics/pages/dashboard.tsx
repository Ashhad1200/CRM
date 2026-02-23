import { useState } from 'react';
import {
  useDashboards,
  useDashboard,
  useCreateDashboard,
  useDeleteDashboard,
  useDashboardMetrics,
  useAddWidget,
  type Dashboard,
} from '../api.js';

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDefault, setNewDefault] = useState(false);

  // Widget form
  const [widgetType, setWidgetType] = useState('CHART');

  const params: Record<string, unknown> = { page, limit };
  const { data: listData, isLoading, error } = useDashboards(params);
  const dashboards = listData?.data ?? [];
  const totalPages = listData?.totalPages ?? 1;

  const { data: detailData } = useDashboard(selectedId);
  const dashboard = detailData?.data;

  const { data: metricsData } = useDashboardMetrics(selectedId);
  const metrics = metricsData?.data;

  const createMut = useCreateDashboard();
  const deleteMut = useDeleteDashboard(selectedId);
  const addWidgetMut = useAddWidget(selectedId);

  function handleCreate() {
    if (!newName.trim()) return;
    createMut.mutate({ name: newName.trim(), isDefault: newDefault }, {
      onSuccess: () => { setShowCreate(false); setNewName(''); setNewDefault(false); },
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this dashboard?')) return;
    setSelectedId(id);
    deleteMut.mutate();
  }

  function handleAddWidget() {
    addWidgetMut.mutate({ type: widgetType, config: {}, position: { x: 0, y: 0, w: 4, h: 3 } });
  }

  function fmt(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  }

  function pct(value: number) {
    return `${(value * 100).toFixed(1)}%`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboards</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showCreate ? 'Cancel' : 'New Dashboard'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Dashboard name"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={newDefault} onChange={(e) => setNewDefault(e.target.checked)} />
            Set as default
          </label>
          <button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMut.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">Error: {(error as Error).message}</p>}

      {/* Dashboard list */}
      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d: Dashboard) => (
            <div
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
                selectedId === d.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{d.name}</h3>
                {d.isDefault && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Default</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {d.widgets?.length ?? 0} widgets &middot; Updated {new Date(d.updatedAt).toLocaleDateString()}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}
                className="mt-2 text-xs text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          ))}
          {dashboards.length === 0 && (
            <p className="text-sm text-gray-500 col-span-full">No dashboards yet. Create one to get started.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-md border px-3 py-1 text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Selected dashboard detail */}
      {dashboard && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">{dashboard.name}</h2>

          {/* KPI Cards */}
          {metrics && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Total Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(metrics.totalPipeline)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{pct(metrics.winRate)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Revenue MTD</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(metrics.revenueMTD)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">Avg Deal Size</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(metrics.avgDealSize)}</p>
              </div>
            </div>
          )}

          {/* Widgets */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-medium text-gray-900">Widgets ({dashboard.widgets?.length ?? 0})</h3>
            {dashboard.widgets && dashboard.widgets.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.widgets.map((w) => (
                  <div key={w.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                    <span className="text-xs font-medium text-indigo-600">{w.type}</span>
                    <p className="text-xs text-gray-500 mt-1">ID: {w.id.slice(0, 8)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No widgets yet.</p>
            )}
            <div className="flex items-end gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Widget Type</label>
                <select
                  value={widgetType}
                  onChange={(e) => setWidgetType(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="CHART">Chart</option>
                  <option value="KPI">KPI</option>
                  <option value="TABLE">Table</option>
                  <option value="FUNNEL">Funnel</option>
                </select>
              </div>
              <button
                onClick={handleAddWidget}
                disabled={addWidgetMut.isPending}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
