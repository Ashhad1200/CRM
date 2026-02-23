import { useState } from 'react';
import { Link } from 'react-router';
import {
  useWorkflows,
  useDeleteWorkflow,
  useActivateWorkflow,
  useDeactivateWorkflow,
} from '../api-workflows';
import type { Workflow } from '../api-workflows';

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}

function WorkflowActions({ workflow }: { workflow: Workflow }) {
  const deleteMut = useDeleteWorkflow();
  const activateMut = useActivateWorkflow();
  const deactivateMut = useDeactivateWorkflow();

  const isActive = workflow.status === 'ACTIVE';
  const toggling = activateMut.isPending || deactivateMut.isPending;

  const handleToggle = () => {
    if (isActive) {
      deactivateMut.mutate(workflow.id);
    } else {
      activateMut.mutate(workflow.id);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) {
      deleteMut.mutate(workflow.id);
    }
  };

  return (
    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
      <Link
        to={`/admin/workflows/${workflow.id}`}
        className="text-xs text-blue-600 hover:underline"
      >
        Edit
      </Link>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
      >
        {toggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
      </button>
      <button
        onClick={handleDelete}
        disabled={deleteMut.isPending}
        className="text-xs text-red-500 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}

function triggerLabel(workflow: Workflow): string {
  if (workflow.trigger.type === 'cron') return workflow.trigger.cron ?? 'cron';
  return workflow.trigger.event ?? 'event';
}

export default function WorkflowsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError, error } = useWorkflows({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    pageSize,
  });

  const workflows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <Link
          to="/admin/workflows/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search workflows…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* States */}
      {isLoading && <p className="text-gray-500">Loading workflows…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {/* Table */}
      {data && (
        <>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Trigger</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-center">Executions</th>
                <th className="px-3 py-3">Last Updated</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => (
                <tr
                  key={w.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    <Link
                      to={`/admin/workflows/${w.id}`}
                      className="hover:underline"
                    >
                      {w.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    <span className="mr-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                      {w.trigger.type}
                    </span>
                    {triggerLabel(w)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600">
                    {w._count?.executions ?? 0}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(w.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <WorkflowActions workflow={w} />
                  </td>
                </tr>
              ))}
              {workflows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    No workflows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {page} of {totalPages} ({data.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded border border-gray-300 px-3 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
