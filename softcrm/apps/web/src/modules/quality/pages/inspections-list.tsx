import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useInspections, useCreateInspection, useChecklists } from '../api';
import type { Inspection, InspectionStatus, InspectionType } from '../api';

const STATUS_COLORS: Record<InspectionStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PASSED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  WAIVED: 'bg-yellow-100 text-yellow-700',
};

const TYPE_LABELS: Record<InspectionType, string> = {
  INCOMING: 'Incoming',
  IN_PROCESS: 'In-Process',
  FINAL: 'Final',
  SUPPLIER: 'Supplier',
};

function StatusBadge({ status }: { status: InspectionStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function CreateInspectionDialog({ onClose }: { onClose: () => void }) {
  const [templateId, setTemplateId] = useState('');
  const [type, setType] = useState<InspectionType>('INCOMING');
  const [lotNumber, setLotNumber] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [sampledUnits, setSampledUnits] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');

  const { data: checklistsData } = useChecklists({ isActive: 'true' });
  const checklists = checklistsData?.data ?? [];
  const createInspection = useCreateInspection();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInspection.mutate(
      {
        templateId,
        type,
        lotNumber: lotNumber || undefined,
        batchSize: batchSize ? parseInt(batchSize) : undefined,
        sampledUnits: sampledUnits ? parseInt(sampledUnits) : undefined,
        scheduledDate,
        notes: notes || undefined,
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
          Schedule New Inspection
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Checklist Template *
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a template...</option>
          {checklists.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({TYPE_LABELS[c.type]})
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Inspection Type *
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InspectionType)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <div className="mb-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Lot Number
            </label>
            <input
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Batch Size
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sampled Units
            </label>
            <input
              type="number"
              value={sampledUnits}
              onChange={(e) => setSampledUnits(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Scheduled Date *
        </label>
        <input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

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
            disabled={createInspection.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createInspection.isPending ? 'Scheduling...' : 'Schedule Inspection'}
          </button>
        </div>

        {createInspection.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createInspection.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function InspectionsListPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;
  if (typeFilter) filters['type'] = typeFilter;

  const { data, isLoading, isError, error } = useInspections(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const inspections: Inspection[] = data?.data ?? [];

  const filtered = inspections.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.inspectionNumber.toLowerCase().includes(q) ||
      (i.lotNumber?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Schedule Inspection
        </button>
      </div>

      {showCreate && (
        <CreateInspectionDialog onClose={() => setShowCreate(false)} />
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by number or lot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="WAIVED">Waived</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Inspection #</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Lot Number</th>
              <th className="px-3 py-3">Scheduled</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Result</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No inspections found.
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr
                  key={i.id}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                  onClick={() => navigate(`/quality/inspections/${i.id}`)}
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {i.inspectionNumber}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {TYPE_LABELS[i.type]}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {i.lotNumber ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {new Date(i.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {i.overallResult ?? '-'}
                  </td>
                  <td className="px-3 py-3">
                    {i.status === 'PENDING' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/quality/inspections/${i.id}/conduct`);
                        }}
                        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Start
                      </button>
                    )}
                    {i.status === 'IN_PROGRESS' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/quality/inspections/${i.id}/conduct`);
                        }}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Continue
                      </button>
                    )}
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
