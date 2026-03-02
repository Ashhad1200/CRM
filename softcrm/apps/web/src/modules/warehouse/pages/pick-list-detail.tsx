import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  usePickList,
  useAssignPickList,
  useStartPickList,
  useCompletePickList,
  useUpdatePickListLine,
} from '../api';
import type { PickListStatus, PickListLineStatus } from '../api';

const STATUS_COLORS: Record<PickListStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const LINE_STATUS_COLORS: Record<PickListLineStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
};

export default function PickListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pickList, isLoading, isError, error } = usePickList(id ?? '');

  const [assignTo, setAssignTo] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [pickedQty, setPickedQty] = useState('');

  const assignPickList = useAssignPickList();
  const startPickList = useStartPickList();
  const completePickList = useCompletePickList();
  const updateLine = useUpdatePickListLine();

  if (!id) return <p className="p-6 text-gray-400">Pick list not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!pickList) return <p className="p-6 text-gray-400">Pick list not found.</p>;

  const handleAssign = () => {
    if (!assignTo) return;
    assignPickList.mutate(
      { id, assignedTo: assignTo },
      {
        onSuccess: () => {
          setShowAssign(false);
          setAssignTo('');
        },
      },
    );
  };

  const handleStart = () => {
    startPickList.mutate(id);
  };

  const handleComplete = () => {
    const lines = pickList.lines.map((line) => ({
      lineId: line.id,
      pickedQty: line.pickedQty,
    }));
    completePickList.mutate({ id, lines });
  };

  const handleUpdateLine = (lineId: string) => {
    updateLine.mutate(
      { pickListId: id, lineId, pickedQty },
      {
        onSuccess: () => {
          setEditingLineId(null);
          setPickedQty('');
        },
      },
    );
  };

  const totalRequested = pickList.lines.reduce(
    (sum, l) => sum + parseFloat(l.requestedQty),
    0,
  );
  const totalPicked = pickList.lines.reduce(
    (sum, l) => sum + parseFloat(l.pickedQty),
    0,
  );
  const progress = totalRequested > 0 ? (totalPicked / totalRequested) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/warehouse/pick-lists')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Pick Lists
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Pick List #{pickList.id.slice(-8)}
        </h1>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            STATUS_COLORS[pickList.status]
          }`}
        >
          {pickList.status.replace('_', ' ')}
        </span>
      </div>

      {/* Summary */}
      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Warehouse:</span>
            <span className="ml-2 font-medium text-gray-900">
              {pickList.warehouse?.name ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Source Order:</span>
            <span className="ml-2 font-medium text-gray-900">
              {pickList.sourceOrderId ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Assigned To:</span>
            <span className="ml-2 font-medium text-gray-900">
              {pickList.assignedTo ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Date(pickList.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-900">
              {totalPicked.toFixed(3)} / {totalRequested.toFixed(3)} ({progress.toFixed(1)}%)
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-gray-200">
            <div
              className="h-2 rounded bg-green-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2 border-t border-gray-200 pt-4">
          {pickList.status === 'DRAFT' && (
            <button
              onClick={() => setShowAssign(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Assign
            </button>
          )}
          {pickList.status === 'ASSIGNED' && (
            <button
              onClick={handleStart}
              disabled={startPickList.isPending}
              className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
            >
              {startPickList.isPending ? 'Starting...' : 'Start Picking'}
            </button>
          )}
          {pickList.status === 'IN_PROGRESS' && (
            <button
              onClick={handleComplete}
              disabled={completePickList.isPending || progress < 100}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {completePickList.isPending ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>

        {/* Assign dialog */}
        {showAssign && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Assign to User ID
            </label>
            <div className="flex gap-2">
              <input
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                placeholder="Enter user ID"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleAssign}
                disabled={assignPickList.isPending || !assignTo}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {assignPickList.isPending ? 'Assigning...' : 'Assign'}
              </button>
              <button
                onClick={() => setShowAssign(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pick Lines */}
      <div className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Pick Lines</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Product ID</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Lot</th>
              <th className="px-3 py-3 text-right">Requested</th>
              <th className="px-3 py-3 text-right">Picked</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {pickList.lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                  No lines in this pick list.
                </td>
              </tr>
            ) : (
              pickList.lines.map((line) => (
                <tr key={line.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {line.productId}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {line.location?.code ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {line.lot?.lotNumber ?? '-'}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-900">
                    {parseFloat(line.requestedQty).toFixed(3)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {editingLineId === line.id ? (
                      <input
                        type="number"
                        value={pickedQty}
                        onChange={(e) => setPickedQty(e.target.value)}
                        step="0.001"
                        max={parseFloat(line.requestedQty)}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-900">
                        {parseFloat(line.pickedQty).toFixed(3)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        LINE_STATUS_COLORS[line.status]
                      }`}
                    >
                      {line.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {pickList.status === 'IN_PROGRESS' && (
                      <>
                        {editingLineId === line.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateLine(line.id)}
                              disabled={updateLine.isPending}
                              className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingLineId(null)}
                              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingLineId(line.id);
                              setPickedQty(line.pickedQty);
                            }}
                            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error messages */}
      {(assignPickList.isError ||
        startPickList.isError ||
        completePickList.isError ||
        updateLine.isError) && (
        <p className="mt-2 text-sm text-red-600">
          {assignPickList.error?.message ||
            startPickList.error?.message ||
            completePickList.error?.message ||
            updateLine.error?.message}
        </p>
      )}
    </div>
  );
}
