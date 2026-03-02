import { useState } from 'react';
import {
  useAssetDisposals,
  useCreateAssetDisposal,
  useApproveDisposal,
  useRejectDisposal,
  useFixedAssets,
  type AssetDisposal,
  type DisposalStatus,
  type DisposalMethod,
} from '../api';

const STATUS_COLORS: Record<DisposalStatus, string> = {
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const METHOD_LABELS: Record<DisposalMethod, string> = {
  SOLD: 'Sold',
  SCRAPPED: 'Scrapped',
  DONATED: 'Donated',
  WRITTEN_OFF: 'Written Off',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function CreateDisposalDialog({ onClose }: { onClose: () => void }) {
  const { data: assetsData } = useFixedAssets({ status: 'ACTIVE' });
  const assets = assetsData?.data ?? [];

  const [assetId, setAssetId] = useState('');
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().slice(0, 10));
  const [disposalMethod, setDisposalMethod] = useState<DisposalMethod>('SOLD');
  const [proceedsAmount, setProceedsAmount] = useState('0');
  const [disposalCosts, setDisposalCosts] = useState('0');
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const createDisposal = useCreateAssetDisposal();

  const selectedAsset = assets.find((a) => a.id === assetId);
  const bookValue = selectedAsset ? parseFloat(selectedAsset.currentBookValue) : 0;
  const proceeds = parseFloat(proceedsAmount) || 0;
  const costs = parseFloat(disposalCosts) || 0;
  const gainLoss = proceeds - costs - bookValue;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDisposal.mutate(
      {
        assetId,
        disposalDate,
        disposalMethod,
        bookValueAtDisposal: selectedAsset?.currentBookValue ?? '0',
        proceedsAmount,
        disposalCosts,
        gainLoss: gainLoss.toFixed(2),
        buyerName: buyerName || undefined,
        buyerContact: buyerContact || undefined,
        reason: reason || undefined,
        notes: notes || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Create Asset Disposal
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Asset *</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select asset...</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.assetNumber} - {a.name} (Book Value: {formatCurrency(a.currentBookValue)})
            </option>
          ))}
        </select>

        {selectedAsset && (
          <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
            <p className="text-gray-600">
              <strong>Current Book Value:</strong>{' '}
              {formatCurrency(selectedAsset.currentBookValue)}
            </p>
            <p className="text-gray-600">
              <strong>Purchase Price:</strong>{' '}
              {formatCurrency(selectedAsset.purchasePrice)}
            </p>
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Disposal Date *
            </label>
            <input
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Disposal Method *
            </label>
            <select
              value={disposalMethod}
              onChange={(e) => setDisposalMethod(e.target.value as DisposalMethod)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="SOLD">Sold</option>
              <option value="SCRAPPED">Scrapped</option>
              <option value="DONATED">Donated</option>
              <option value="WRITTEN_OFF">Written Off</option>
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Proceeds Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={proceedsAmount}
              onChange={(e) => setProceedsAmount(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Disposal Costs
            </label>
            <input
              type="number"
              step="0.01"
              value={disposalCosts}
              onChange={(e) => setDisposalCosts(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {selectedAsset && (
          <div className="mb-4 rounded bg-blue-50 p-3 text-sm">
            <p className={`font-medium ${gainLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {gainLoss >= 0 ? 'Gain' : 'Loss'} on Disposal:{' '}
              {formatCurrency(Math.abs(gainLoss).toFixed(2))}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              = Proceeds ({formatCurrency(proceeds.toFixed(2))}) - Costs ({formatCurrency(costs.toFixed(2))}) - Book Value ({formatCurrency(bookValue.toFixed(2))})
            </p>
          </div>
        )}

        {disposalMethod === 'SOLD' && (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Buyer Name
            </label>
            <input
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-gray-700">
              Buyer Contact
            </label>
            <input
              value={buyerContact}
              onChange={(e) => setBuyerContact(e.target.value)}
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </>
        )}

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reason for Disposal
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
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
            disabled={createDisposal.isPending || !assetId}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createDisposal.isPending ? 'Creating...' : 'Submit for Approval'}
          </button>
        </div>

        {createDisposal.isError && (
          <p className="mt-2 text-sm text-red-600">{createDisposal.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function DisposalsListPage() {
  const { data, isLoading, isError, error } = useAssetDisposals();
  const approveDisposal = useApproveDisposal();
  const rejectDisposal = useRejectDisposal();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const disposals: AssetDisposal[] = data?.data ?? [];

  const filtered = statusFilter
    ? disposals.filter((d) => d.status === statusFilter)
    : disposals;

  const handleApprove = (id: string) => {
    approveDisposal.mutate({ id });
  };

  const handleReject = (id: string) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason !== null) {
      rejectDisposal.mutate({ id, reason: reason || undefined });
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Disposals</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Disposal
        </button>
      </div>

      {showCreate && <CreateDisposalDialog onClose={() => setShowCreate(false)} />}

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Disposal #</th>
              <th className="px-3 py-3">Asset</th>
              <th className="px-3 py-3">Method</th>
              <th className="px-3 py-3">Book Value</th>
              <th className="px-3 py-3">Proceeds</th>
              <th className="px-3 py-3">Gain/Loss</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  No disposals found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const gainLoss = parseFloat(d.gainLoss);
                return (
                  <tr key={d.id} className="border-b border-gray-100">
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {d.disposalNumber}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {d.asset?.assetNumber} - {d.asset?.name}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {METHOD_LABELS[d.disposalMethod]}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatCurrency(d.bookValueAtDisposal)}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatCurrency(d.proceedsAmount)}
                    </td>
                    <td className={`px-3 py-3 font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {gainLoss >= 0 ? '+' : ''}{formatCurrency(d.gainLoss)}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {formatDate(d.disposalDate)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${STATUS_COLORS[d.status]}`}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        {d.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleApprove(d.id)}
                              disabled={approveDisposal.isPending}
                              className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(d.id)}
                              disabled={rejectDisposal.isPending}
                              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
