import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useCAPAs, useCreateCAPA, useTrackCAPA } from '../api';
import type { CAPA, CorrectiveActionType, CorrectiveActionStatus } from '../api';

const STATUS_COLORS: Record<CorrectiveActionStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<CorrectiveActionType, string> = {
  CORRECTIVE: 'bg-blue-100 text-blue-700',
  PREVENTIVE: 'bg-purple-100 text-purple-700',
};

const STATUS_ORDER: CorrectiveActionStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
];

function StatusBadge({ status }: { status: CorrectiveActionStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function TypeBadge({ type }: { type: CorrectiveActionType }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
      {type}
    </span>
  );
}

function CAPACard({
  capa,
  onNavigate,
  onMoveStatus,
}: {
  capa: CAPA;
  onNavigate: (id: string) => void;
  onMoveStatus: (id: string, status: CorrectiveActionStatus) => void;
}) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', capa.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isDueSoon =
    new Date(capa.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isOverdue = new Date(capa.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onNavigate(capa.id)}
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md ${
        isOverdue
          ? 'border-red-300'
          : isDueSoon
            ? 'border-yellow-300'
            : 'border-gray-200'
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500">{capa.capaNumber}</p>
        <TypeBadge type={capa.type} />
      </div>
      <p className="mb-2 text-sm font-medium text-gray-900 line-clamp-2">
        {capa.title}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{capa.assignedTo}</span>
        <span
          className={`text-xs ${
            isOverdue
              ? 'font-medium text-red-600'
              : isDueSoon
                ? 'text-yellow-600'
                : 'text-gray-500'
          }`}
        >
          {new Date(capa.dueDate).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function StatusColumn({
  status,
  capas,
  onMoveStatus,
  onNavigate,
}: {
  status: CorrectiveActionStatus;
  capas: CAPA[];
  onMoveStatus: (id: string, status: CorrectiveActionStatus) => void;
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
    const capaId = e.dataTransfer.getData('text/plain');
    if (capaId) {
      onMoveStatus(capaId, status);
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
          {capas.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {capas.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">No CAPAs</p>
        ) : (
          capas.map((capa) => (
            <CAPACard
              key={capa.id}
              capa={capa}
              onNavigate={onNavigate}
              onMoveStatus={onMoveStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CreateCAPADialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CorrectiveActionType>('CORRECTIVE');
  const [proposedAction, setProposedAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const createCAPA = useCreateCAPA();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCAPA.mutate(
      {
        title,
        description,
        type,
        proposedAction,
        assignedTo,
        dueDate,
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Create CAPA</h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Brief title for this CAPA"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Type *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CorrectiveActionType)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="CORRECTIVE">Corrective Action</option>
            <option value="PREVENTIVE">Preventive Action</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Describe the issue or concern..."
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Proposed Action *
          </label>
          <textarea
            value={proposedAction}
            onChange={(e) => setProposedAction(e.target.value)}
            required
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="What action will be taken..."
          />
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Assigned To *
            </label>
            <input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
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
            disabled={createCAPA.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createCAPA.isPending ? 'Creating...' : 'Create CAPA'}
          </button>
        </div>

        {createCAPA.isError && (
          <p className="mt-2 text-sm text-red-600">{createCAPA.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function CAPAsListPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [typeFilter, setTypeFilter] = useState('');

  const filters: Record<string, string> = {};
  if (typeFilter) filters['type'] = typeFilter;

  const { data, isLoading, isError, error } = useCAPAs(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const trackCAPA = useTrackCAPA();

  const capas: CAPA[] = data?.data ?? [];

  const capasByStatus = useMemo(() => {
    const map = new Map<CorrectiveActionStatus, CAPA[]>();
    for (const status of STATUS_ORDER) {
      map.set(status, []);
    }
    // Also handle OVERDUE
    map.set('OVERDUE', []);

    for (const capa of capas) {
      const list = map.get(capa.status);
      if (list) {
        list.push(capa);
      }
    }
    return map;
  }, [capas]);

  const handleMoveStatus = (id: string, status: CorrectiveActionStatus) => {
    trackCAPA.mutate({ id, status });
  };

  const handleNavigate = (id: string) => {
    navigate(`/quality/capas/${id}`);
  };

  return (
    <div className="mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Corrective & Preventive Actions
        </h1>
        <div className="flex gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="CORRECTIVE">Corrective</option>
            <option value="PREVENTIVE">Preventive</option>
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
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New CAPA
          </button>
        </div>
      </div>

      {showCreate && <CreateCAPADialog onClose={() => setShowCreate(false)} />}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              capas={capasByStatus.get(status) ?? []}
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
              <th className="px-3 py-3">CAPA #</th>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Assigned To</th>
              <th className="px-3 py-3">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {capas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  No CAPAs found.
                </td>
              </tr>
            ) : (
              capas.map((capa) => (
                <tr
                  key={capa.id}
                  onClick={() => handleNavigate(capa.id)}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {capa.capaNumber}
                  </td>
                  <td className="max-w-xs truncate px-3 py-3 text-gray-600">
                    {capa.title}
                  </td>
                  <td className="px-3 py-3">
                    <TypeBadge type={capa.type} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={capa.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-600">{capa.assignedTo}</td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(capa.dueDate).toLocaleDateString()}
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
