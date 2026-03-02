import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useNCRs, useCreateNCR, useUpdateNCRStatus } from '../api';
import type { NCR, NcrStatus, NcrSeverity } from '../api';

const STATUS_COLORS: Record<NcrStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-green-100 text-green-700',
};

const SEVERITY_COLORS: Record<NcrSeverity, string> = {
  MINOR: 'bg-gray-100 text-gray-700',
  MAJOR: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_ORDER: NcrStatus[] = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

function StatusBadge({ status }: { status: NcrStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: NcrSeverity }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[severity]}`}>
      {severity}
    </span>
  );
}

function NCRCard({
  ncr,
  onNavigate,
  onMoveStatus,
}: {
  ncr: NCR;
  onNavigate: (id: string) => void;
  onMoveStatus: (id: string, status: NcrStatus) => void;
}) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', ncr.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onNavigate(ncr.id)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500">{ncr.ncrNumber}</p>
        <SeverityBadge severity={ncr.severity} />
      </div>
      <p className="mb-2 text-sm font-medium text-gray-900 line-clamp-2">{ncr.title}</p>
      <p className="text-xs text-gray-500">
        Detected: {new Date(ncr.detectedAt).toLocaleDateString()}
      </p>
    </div>
  );
}

function StatusColumn({
  status,
  ncrs,
  onMoveStatus,
  onNavigate,
}: {
  status: NcrStatus;
  ncrs: NCR[];
  onMoveStatus: (id: string, status: NcrStatus) => void;
  onNavigate: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const ncrId = e.dataTransfer.getData('text/plain');
    if (ncrId) {
      onMoveStatus(ncrId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[400px] w-72 shrink-0 flex-col rounded-lg bg-gray-50 p-3 ${
        dragOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {status.replace('_', ' ')}
        </h3>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
          {ncrs.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {ncrs.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">No NCRs</p>
        ) : (
          ncrs.map((ncr) => (
            <NCRCard
              key={ncr.id}
              ncr={ncr}
              onNavigate={onNavigate}
              onMoveStatus={onMoveStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CreateNCRDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<NcrSeverity>('MINOR');
  const [immediateAction, setImmediateAction] = useState('');
  const createNCR = useCreateNCR();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNCR.mutate(
      {
        title,
        description,
        severity,
        immediateAction: immediateAction || undefined,
        detectedAt: new Date().toISOString(),
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Create Non-Conformance Report
        </h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Brief description of the issue"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Detailed description of the non-conformance..."
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Severity *
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as NcrSeverity)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="MINOR">Minor</option>
            <option value="MAJOR">Major</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Immediate Action Taken
          </label>
          <textarea
            value={immediateAction}
            onChange={(e) => setImmediateAction(e.target.value)}
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Any immediate containment actions..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createNCR.isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {createNCR.isPending ? 'Creating...' : 'Create NCR'}
          </button>
        </div>

        {createNCR.isError && (
          <p className="mt-2 text-sm text-red-600">{createNCR.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function NCRsListPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [severityFilter, setSeverityFilter] = useState('');

  const filters: Record<string, string> = {};
  if (severityFilter) filters['severity'] = severityFilter;

  const { data, isLoading, isError, error } = useNCRs(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const updateStatus = useUpdateNCRStatus();

  const ncrs: NCR[] = data?.data ?? [];

  const ncrsByStatus = useMemo(() => {
    const map = new Map<NcrStatus, NCR[]>();
    for (const status of STATUS_ORDER) {
      map.set(status, []);
    }
    for (const ncr of ncrs) {
      const list = map.get(ncr.status);
      if (list) {
        list.push(ncr);
      }
    }
    return map;
  }, [ncrs]);

  const handleMoveStatus = (id: string, status: NcrStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleNavigate = (id: string) => {
    navigate(`/quality/ncrs/${id}`);
  };

  return (
    <div className="mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Non-Conformance Reports</h1>
        <div className="flex gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="MINOR">Minor</option>
            <option value="MAJOR">Major</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <div className="flex rounded border border-gray-300">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            New NCR
          </button>
        </div>
      </div>

      {showCreate && <CreateNCRDialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              ncrs={ncrsByStatus.get(status) ?? []}
              onMoveStatus={handleMoveStatus}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}

      {data && viewMode === 'list' && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">NCR #</th>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Severity</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Detected</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ncrs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No NCRs found.
                </td>
              </tr>
            ) : (
              ncrs.map((ncr) => (
                <tr
                  key={ncr.id}
                  onClick={() => handleNavigate(ncr.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">{ncr.ncrNumber}</td>
                  <td className="max-w-xs truncate px-3 py-3 text-gray-600">{ncr.title}</td>
                  <td className="px-3 py-3">
                    <SeverityBadge severity={ncr.severity} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={ncr.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(ncr.detectedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {ncr.correctiveActions?.length ?? 0} actions
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
