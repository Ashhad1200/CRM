import { useState } from 'react';
import { useAuditLog } from '../api';
import type { AuditEntry } from '../api';

const MODULES = ['', 'SALES', 'ACCOUNTING', 'SUPPORT', 'MARKETING', 'INVENTORY', 'PROJECTS', 'PLATFORM'] as const;
const PAGE_SIZE = 25;

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function ChangesViewer({ changes }: { changes: unknown }) {
  if (!changes || (typeof changes === 'object' && Object.keys(changes as object).length === 0)) {
    return <span className="text-gray-400">No changes recorded</span>;
  }
  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
      {JSON.stringify(changes, null, 2)}
    </pre>
  );
}

function exportCsv(entries: AuditEntry[]) {
  const headers = ['Timestamp', 'Actor', 'Module', 'Entity', 'Action', 'Record ID', 'Changes'];
  const rows = entries.map((e) => [
    e.timestamp,
    e.actorId ?? '',
    e.module,
    e.entity,
    e.action,
    e.recordId,
    JSON.stringify(e.changes),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const [module, setModule] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useAuditLog({
    module: module || undefined,
    entity: entity || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <button
          onClick={() => exportCsv(entries)}
          disabled={entries.length === 0}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Module</label>
          <select
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All modules</option>
            {MODULES.filter(Boolean).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Entity</label>
          <input
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by entity…"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {!isLoading && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-2 w-8" />
              <th className="px-3 py-2">Timestamp</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Module</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Record ID</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <>
                <tr
                  key={e.id}
                  onClick={() =>
                    setExpandedId((prev) => (prev === e.id ? null : e.id))
                  }
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-gray-400">
                    {expandedId === e.id ? '▼' : '▶'}
                  </td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                    {formatTimestamp(e.timestamp)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                    {e.actorId ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                      {e.module}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{e.entity}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        e.action === 'CREATE'
                          ? 'bg-green-100 text-green-700'
                          : e.action === 'DELETE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">
                    {e.recordId}
                  </td>
                </tr>
                {expandedId === e.id && (
                  <tr key={`${e.id}-details`} className="border-b border-gray-100">
                    <td />
                    <td colSpan={6} className="px-3 py-3">
                      <ChangesViewer changes={e.changes} />
                    </td>
                  </tr>
                )}
              </>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} ({total} entries)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
