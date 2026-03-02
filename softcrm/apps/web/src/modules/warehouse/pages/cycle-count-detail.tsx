import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useCycleCount,
  useStartCycleCount,
  useSubmitCycleCount,
  useApproveCycleCount,
} from '../api';
import type { CycleCountStatus, CycleCountDiscrepancy } from '../api';

const STATUS_COLORS: Record<CycleCountStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

interface CountEntry {
  productId: string;
  lotId: string;
  expectedQty: string;
  countedQty: string;
}

export default function CycleCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cycleCount, isLoading, isError, error } = useCycleCount(id ?? '');

  const [entries, setEntries] = useState<CountEntry[]>([]);
  const [newEntry, setNewEntry] = useState<CountEntry>({
    productId: '',
    lotId: '',
    expectedQty: '',
    countedQty: '',
  });

  const startCycleCount = useStartCycleCount();
  const submitCycleCount = useSubmitCycleCount();
  const approveCycleCount = useApproveCycleCount();

  if (!id) return <p className="p-6 text-gray-400">Cycle count not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!cycleCount) return <p className="p-6 text-gray-400">Cycle count not found.</p>;

  const handleStart = () => {
    startCycleCount.mutate(id);
  };

  const handleAddEntry = () => {
    if (!newEntry.productId || !newEntry.countedQty) return;
    setEntries([...entries, newEntry]);
    setNewEntry({
      productId: '',
      lotId: '',
      expectedQty: '',
      countedQty: '',
    });
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const discrepancies: CycleCountDiscrepancy[] = entries.map((e) => ({
      productId: e.productId,
      lotId: e.lotId || undefined,
      expectedQty: e.expectedQty || '0',
      countedQty: e.countedQty,
      variance: (parseFloat(e.countedQty) - parseFloat(e.expectedQty || '0')).toString(),
    }));
    submitCycleCount.mutate({ id, discrepancies });
  };

  const handleApprove = () => {
    approveCycleCount.mutate(id);
  };

  const isPending =
    startCycleCount.isPending ||
    submitCycleCount.isPending ||
    approveCycleCount.isPending;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouse/cycle-counts')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Cycle Counts
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Cycle Count #{cycleCount.id.slice(-8)}
        </h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            STATUS_COLORS[cycleCount.status]
          }`}
        >
          {cycleCount.status.replace('_', ' ')}
        </span>
      </div>

      {/* Details */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Warehouse:</span>
            <span className="ml-2 font-medium text-gray-900">
              {cycleCount.warehouse?.name ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Location:</span>
            <span className="ml-2 font-medium text-gray-900">
              {cycleCount.location?.code ?? 'All'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Counted By:</span>
            <span className="ml-2 font-medium text-gray-900">
              {cycleCount.countedBy}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Started:</span>
            <span className="ml-2 font-medium text-gray-900">
              {cycleCount.startedAt
                ? new Date(cycleCount.startedAt).toLocaleString()
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Completed:</span>
            <span className="ml-2 font-medium text-gray-900">
              {cycleCount.completedAt
                ? new Date(cycleCount.completedAt).toLocaleString()
                : '-'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
          {cycleCount.status === 'DRAFT' && (
            <button
              onClick={handleStart}
              disabled={isPending}
              className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {startCycleCount.isPending ? 'Starting...' : 'Start Count'}
            </button>
          )}
          {cycleCount.status === 'IN_PROGRESS' && entries.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitCycleCount.isPending ? 'Submitting...' : 'Submit Count'}
            </button>
          )}
          {cycleCount.status === 'COMPLETED' &&
            cycleCount.discrepancies &&
            cycleCount.discrepancies.length > 0 && (
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approveCycleCount.isPending ? 'Approving...' : 'Approve & Adjust'}
              </button>
            )}
        </div>
      </div>

      {/* Count Entry Form (for IN_PROGRESS) */}
      {cycleCount.status === 'IN_PROGRESS' && (
        <div className="mb-6 rounded border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Record Counts
          </h2>

          <div className="mb-4 grid grid-cols-5 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Product ID
              </label>
              <input
                value={newEntry.productId}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, productId: e.target.value })
                }
                placeholder="SKU-001"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Lot ID (optional)
              </label>
              <input
                value={newEntry.lotId}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, lotId: e.target.value })
                }
                placeholder="LOT-001"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Expected Qty
              </label>
              <input
                type="number"
                value={newEntry.expectedQty}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, expectedQty: e.target.value })
                }
                step="0.001"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Counted Qty
              </label>
              <input
                type="number"
                value={newEntry.countedQty}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, countedQty: e.target.value })
                }
                step="0.001"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddEntry}
                disabled={!newEntry.productId || !newEntry.countedQty}
                className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {entries.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">Product ID</th>
                  <th className="px-3 py-2">Lot ID</th>
                  <th className="px-3 py-2 text-right">Expected</th>
                  <th className="px-3 py-2 text-right">Counted</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const variance =
                    parseFloat(entry.countedQty) -
                    parseFloat(entry.expectedQty || '0');
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {entry.productId}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {entry.lotId || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {entry.expectedQty || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {entry.countedQty}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          variance === 0
                            ? 'text-gray-600'
                            : variance > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {variance > 0 ? '+' : ''}
                        {variance.toFixed(3)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleRemoveEntry(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Recorded Discrepancies (for COMPLETED) */}
      {cycleCount.status === 'COMPLETED' &&
        cycleCount.discrepancies &&
        cycleCount.discrepancies.length > 0 && (
          <div className="rounded border border-gray-200 bg-white p-4">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Discrepancies
            </h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">Product ID</th>
                  <th className="px-3 py-2">Lot ID</th>
                  <th className="px-3 py-2 text-right">Expected</th>
                  <th className="px-3 py-2 text-right">Counted</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                </tr>
              </thead>
              <tbody>
                {cycleCount.discrepancies.map((d, idx) => {
                  const variance = parseFloat(d.variance);
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {d.productId}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {d.lotId || '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {parseFloat(d.expectedQty).toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {parseFloat(d.countedQty).toFixed(3)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          variance === 0
                            ? 'text-gray-600'
                            : variance > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {variance > 0 ? '+' : ''}
                        {variance.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Error messages */}
      {(startCycleCount.isError ||
        submitCycleCount.isError ||
        approveCycleCount.isError) && (
        <p className="mt-2 text-sm text-red-600">
          {startCycleCount.error?.message ||
            submitCycleCount.error?.message ||
            approveCycleCount.error?.message}
        </p>
      )}
    </div>
  );
}
