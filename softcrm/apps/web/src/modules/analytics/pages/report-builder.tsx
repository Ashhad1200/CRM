import { useState } from 'react';
import {
  useReports,
  useReport,
  useCreateReport,
  useRunReport,
  type SavedReport,
  type ReportResult,
} from '../api.js';

export default function ReportBuilderPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [fields, setFields] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [aggregation, setAggregation] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('');
  const [scheduleRecipients, setScheduleRecipients] = useState('');

  // Report results
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);

  const params: Record<string, unknown> = { page, limit };
  const { data: listData, isLoading, error } = useReports(params);
  const reports = listData?.data ?? [];
  const totalPages = listData?.totalPages ?? 1;

  const { data: detailData } = useReport(selectedId);
  const report = detailData?.data;

  const createMut = useCreateReport();
  const runMut = useRunReport(selectedId);

  function handleCreate() {
    if (!name.trim() || !fields.trim()) return;
    const fieldSelection = fields.split(',').map((f) => f.trim()).filter(Boolean);
    createMut.mutate(
      {
        name: name.trim(),
        fieldSelection,
        groupBy: groupBy || undefined,
        aggregation: aggregation || undefined,
        scheduleFrequency: scheduleFrequency || undefined,
        scheduleRecipients: scheduleRecipients ? scheduleRecipients.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setName('');
          setFields('');
          setGroupBy('');
          setAggregation('');
          setScheduleFrequency('');
          setScheduleRecipients('');
        },
      },
    );
  }

  function handleRun() {
    if (!selectedId) return;
    runMut.mutate(undefined, {
      onSuccess: (res) => { setReportResult(res.data); },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showCreate ? 'Cancel' : 'New Report'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Monthly sales report"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fields * (comma-separated)</label>
              <input
                type="text"
                value={fields}
                onChange={(e) => setFields(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="revenue, dealCount, stage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
              <input
                type="text"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="stage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">None</option>
                <option value="SUM">Sum</option>
                <option value="AVG">Average</option>
                <option value="COUNT">Count</option>
                <option value="MIN">Min</option>
                <option value="MAX">Max</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Frequency</label>
              <select
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (comma-separated emails)</label>
              <input
                type="text"
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="user@example.com, manager@example.com"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMut.isPending ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">Error: {(error as Error).message}</p>}

      {/* Report list */}
      {!isLoading && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fields</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Group By</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Schedule</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reports.map((r: SavedReport) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedId === r.id ? 'bg-indigo-50' : ''}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.fieldSelection.join(', ')}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.groupBy ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.scheduleFrequency ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No reports yet.</td></tr>
              )}
            </tbody>
          </table>
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

      {/* Selected report detail & run */}
      {report && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{report.name}</h2>
            <button
              onClick={handleRun}
              disabled={runMut.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {runMut.isPending ? 'Running...' : 'Run Report'}
            </button>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Fields:</span> {report.fieldSelection.join(', ')}</p>
            {report.groupBy && <p><span className="font-medium">Group By:</span> {report.groupBy}</p>}
            {report.aggregation && <p><span className="font-medium">Aggregation:</span> {report.aggregation}</p>}
          </div>
        </div>
      )}

      {/* Report results */}
      {reportResult && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Results ({reportResult.totalRows} rows)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {reportResult.columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reportResult.rows.map((row, i) => (
                  <tr key={i}>
                    {reportResult.columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-600">
                        {String((row as Record<string, unknown>)[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
                {reportResult.rows.length === 0 && (
                  <tr><td colSpan={reportResult.columns.length} className="px-4 py-6 text-center text-sm text-gray-500">No data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
