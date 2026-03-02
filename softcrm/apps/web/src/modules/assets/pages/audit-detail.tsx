import { useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  useAssetAudit,
  useStartAudit,
  useCompleteAudit,
  useUpdateAuditLine,
  type AssetAuditLine,
  type AuditStatus,
  type AssetCondition,
} from '../api';

const STATUS_COLORS: Record<AuditStatus, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const CONDITION_OPTIONS: AssetCondition[] = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AuditLineRow({
  line,
  auditId,
  canEdit,
}: {
  line: AssetAuditLine;
  auditId: string;
  canEdit: boolean;
}) {
  const updateLine = useUpdateAuditLine();
  const [actualLocation, setActualLocation] = useState(line.actualLocation ?? '');
  const [actualCondition, setActualCondition] = useState<AssetCondition | ''>(
    line.actualCondition ?? '',
  );
  const [notes, setNotes] = useState(line.notes ?? '');
  const [isEditing, setIsEditing] = useState(false);

  const handleVerify = () => {
    updateLine.mutate({
      auditId,
      lineId: line.id,
      actualLocation: actualLocation || undefined,
      actualCondition: actualCondition || undefined,
      isVerified: true,
      notes: notes || undefined,
    });
    setIsEditing(false);
  };

  const hasDiscrepancy =
    (line.expectedLocation && actualLocation && line.expectedLocation !== actualLocation) ||
    (line.expectedCondition && actualCondition && line.expectedCondition !== actualCondition);

  return (
    <tr className={`border-b border-gray-100 ${line.isDiscrepancy ? 'bg-red-50' : ''}`}>
      <td className="px-3 py-3 font-medium text-gray-900">
        {line.asset?.assetNumber ?? '-'}
      </td>
      <td className="px-3 py-3 text-gray-700">{line.asset?.name ?? '-'}</td>
      <td className="px-3 py-3 text-gray-600">{line.expectedLocation ?? '-'}</td>
      <td className="px-3 py-3">
        {canEdit && !line.isVerified ? (
          <input
            value={actualLocation}
            onChange={(e) => setActualLocation(e.target.value)}
            onFocus={() => setIsEditing(true)}
            placeholder="Enter location"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <span className={hasDiscrepancy ? 'text-red-600 font-medium' : ''}>
            {line.actualLocation ?? '-'}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-gray-600">{line.expectedCondition ?? '-'}</td>
      <td className="px-3 py-3">
        {canEdit && !line.isVerified ? (
          <select
            value={actualCondition}
            onChange={(e) => setActualCondition(e.target.value as AssetCondition)}
            onFocus={() => setIsEditing(true)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select...</option>
            {CONDITION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <span className={hasDiscrepancy ? 'text-red-600 font-medium' : ''}>
            {line.actualCondition ?? '-'}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        {line.isVerified ? (
          <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
            Verified
          </span>
        ) : line.isDiscrepancy ? (
          <span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
            Discrepancy
          </span>
        ) : (
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            Pending
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        {canEdit && !line.isVerified && (
          <button
            onClick={handleVerify}
            disabled={updateLine.isPending}
            className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            {updateLine.isPending ? 'Saving...' : 'Verify'}
          </button>
        )}
      </td>
    </tr>
  );
}

function CompleteAuditDialog({
  auditId,
  onClose,
}: {
  auditId: string;
  onClose: () => void;
}) {
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const completeAudit = useCompleteAudit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeAudit.mutate(
      {
        id: auditId,
        findings: findings || undefined,
        recommendations: recommendations || undefined,
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
          Complete Audit
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Findings
        </label>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          rows={4}
          placeholder="Document any findings from the audit..."
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Recommendations
        </label>
        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={4}
          placeholder="Provide recommendations for improvements..."
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
            disabled={completeAudit.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {completeAudit.isPending ? 'Completing...' : 'Complete Audit'}
          </button>
        </div>

        {completeAudit.isError && (
          <p className="mt-2 text-sm text-red-600">{completeAudit.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: audit, isLoading, isError, error } = useAssetAudit(id ?? '');
  const startAudit = useStartAudit();

  const [showComplete, setShowComplete] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'discrepancy'>('all');

  if (!id) return <p className="p-6 text-gray-400">Audit not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!audit) return <p className="p-6 text-gray-400">Audit not found.</p>;

  const lines = audit.lines ?? [];
  const canEdit = audit.status === 'IN_PROGRESS';

  const filteredLines = lines.filter((line) => {
    if (filter === 'pending') return !line.isVerified;
    if (filter === 'verified') return line.isVerified;
    if (filter === 'discrepancy') return line.isDiscrepancy;
    return true;
  });

  const handleStart = () => {
    startAudit.mutate({ id });
  };

  const progressPercent = audit.totalAssets > 0
    ? Math.round((audit.assetsVerified / audit.totalAssets) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-2 flex items-center gap-4">
        <Link
          to="/assets/audits"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Audits
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{audit.auditNumber}</h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[audit.status]}`}
        >
          {audit.status.replace('_', ' ')}
        </span>
      </div>

      <p className="mb-4 text-lg text-gray-700">{audit.name}</p>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Total Assets</p>
          <p className="text-2xl font-semibold text-gray-900">{audit.totalAssets}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Verified</p>
          <p className="text-2xl font-semibold text-green-600">{audit.assetsVerified}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Missing</p>
          <p className="text-2xl font-semibold text-red-600">{audit.assetsMissing}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Found</p>
          <p className="text-2xl font-semibold text-blue-600">{audit.assetsFound}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 uppercase">Discrepancies</p>
          <p className="text-2xl font-semibold text-orange-600">{audit.discrepancies}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Audit Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-3 rounded-full bg-gray-200">
          <div
            className="h-3 rounded-full bg-blue-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        {audit.status === 'SCHEDULED' && (
          <button
            onClick={handleStart}
            disabled={startAudit.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {startAudit.isPending ? 'Starting...' : 'Start Audit'}
          </button>
        )}
        {audit.status === 'IN_PROGRESS' && (
          <button
            onClick={() => setShowComplete(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Complete Audit
          </button>
        )}
      </div>

      {showComplete && (
        <CompleteAuditDialog auditId={id} onClose={() => setShowComplete(false)} />
      )}

      {/* Audit Details */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <p className="text-sm text-gray-500">Scheduled Date</p>
          <p className="font-medium">{formatDate(audit.scheduledDate)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Scope</p>
          <p className="font-medium">{audit.scope}</p>
        </div>
        {audit.startedAt && (
          <div>
            <p className="text-sm text-gray-500">Started At</p>
            <p className="font-medium">{formatDateTime(audit.startedAt)}</p>
          </div>
        )}
        {audit.completedAt && (
          <div>
            <p className="text-sm text-gray-500">Completed At</p>
            <p className="font-medium">{formatDateTime(audit.completedAt)}</p>
          </div>
        )}
      </div>

      {/* Findings (if completed) */}
      {audit.status === 'COMPLETED' && (audit.findings || audit.recommendations) && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          {audit.findings && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Findings</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{audit.findings}</p>
            </div>
          )}
          {audit.recommendations && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{audit.recommendations}</p>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(['all', 'pending', 'verified', 'discrepancy'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 text-sm ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Audit Lines Table */}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
            <th className="px-3 py-3">Asset #</th>
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Expected Location</th>
            <th className="px-3 py-3">Actual Location</th>
            <th className="px-3 py-3">Expected Condition</th>
            <th className="px-3 py-3">Actual Condition</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredLines.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                No assets to audit.
              </td>
            </tr>
          ) : (
            filteredLines.map((line) => (
              <AuditLineRow
                key={line.id}
                line={line}
                auditId={id}
                canEdit={canEdit}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
