import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  useAssetAudits,
  useCreateAssetAudit,
  useStartAudit,
  type AssetAudit,
  type AuditStatus,
  type AuditScope,
} from '../api';

const STATUS_COLORS: Record<AuditStatus, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const SCOPE_COLORS: Record<AuditScope, string> = {
  FULL: 'bg-purple-100 text-purple-700',
  LOCATION: 'bg-blue-100 text-blue-700',
  CATEGORY: 'bg-green-100 text-green-700',
  DEPARTMENT: 'bg-orange-100 text-orange-700',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CreateAuditDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<AuditScope>('FULL');
  const [scheduledDate, setScheduledDate] = useState('');

  const createAudit = useCreateAssetAudit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAudit.mutate(
      {
        name,
        description: description || undefined,
        scope,
        scheduledDate,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Schedule Asset Audit
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Audit Name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Q1 2025 Full Asset Audit"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Scope *
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as AuditScope)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="FULL">Full Audit</option>
              <option value="LOCATION">By Location</option>
              <option value="CATEGORY">By Category</option>
              <option value="DEPARTMENT">By Department</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Scheduled Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
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
            disabled={createAudit.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createAudit.isPending ? 'Creating...' : 'Schedule Audit'}
          </button>
        </div>

        {createAudit.isError && (
          <p className="mt-2 text-sm text-red-600">{createAudit.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function AuditsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAssetAudits();
  const startAudit = useStartAudit();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const audits: AssetAudit[] = data?.data ?? [];

  const filtered = statusFilter
    ? audits.filter((a) => a.status === statusFilter)
    : audits;

  const handleStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startAudit.mutate({ id });
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Audits</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Schedule Audit
        </button>
      </div>

      {showCreate && <CreateAuditDialog onClose={() => setShowCreate(false)} />}

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div className="grid gap-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No audits found.</p>
          ) : (
            filtered.map((audit) => (
              <div
                key={audit.id}
                onClick={() => navigate(`/assets/audits/${audit.id}`)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {audit.auditNumber}
                      </h3>
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[audit.status]}`}
                      >
                        {audit.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${SCOPE_COLORS[audit.scope]}`}
                      >
                        {audit.scope}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-700">{audit.name}</p>
                    {audit.description && (
                      <p className="mt-1 text-sm text-gray-500">{audit.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Scheduled: {formatDate(audit.scheduledDate)}
                    </p>
                    {audit.status === 'SCHEDULED' && (
                      <button
                        onClick={(e) => handleStart(audit.id, e)}
                        disabled={startAudit.isPending}
                        className="mt-2 rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Start Audit
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {audit.totalAssets > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>
                        Progress: {audit.assetsVerified} / {audit.totalAssets} assets
                      </span>
                      <span>
                        {Math.round((audit.assetsVerified / audit.totalAssets) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${(audit.assetsVerified / audit.totalAssets) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats */}
                {audit.status !== 'SCHEDULED' && (
                  <div className="mt-4 flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Verified:</span>{' '}
                      <span className="font-medium text-green-600">
                        {audit.assetsVerified}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Missing:</span>{' '}
                      <span className="font-medium text-red-600">
                        {audit.assetsMissing}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Found:</span>{' '}
                      <span className="font-medium text-blue-600">
                        {audit.assetsFound}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Discrepancies:</span>{' '}
                      <span className="font-medium text-orange-600">
                        {audit.discrepancies}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
