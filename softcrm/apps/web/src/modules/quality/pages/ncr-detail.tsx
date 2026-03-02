import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  useNCR,
  useUpdateNCR,
  useUpdateNCRStatus,
  useNCRActions,
  useCreateNCRAction,
  useCompleteNCRAction,
  useVerifyNCRAction,
} from '../api';
import type { NcrStatus, NcrSeverity, CorrectiveActionType, CorrectiveActionStatus } from '../api';

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

const ACTION_STATUS_COLORS: Record<CorrectiveActionStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

function AddActionDialog({
  ncrId,
  onClose,
}: {
  ncrId: string;
  onClose: () => void;
}) {
  const [actionType, setActionType] = useState<CorrectiveActionType>('CORRECTIVE');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const createAction = useCreateNCRAction();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAction.mutate(
      {
        ncrId,
        actionType,
        description,
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
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Add Corrective/Preventive Action
        </h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Action Type *
          </label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as CorrectiveActionType)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="CORRECTIVE">Corrective</option>
            <option value="PREVENTIVE">Preventive</option>
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
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Describe the action to be taken..."
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Assigned To *
          </label>
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Name or ID of responsible person"
          />
        </div>

        <div className="mb-4">
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
            disabled={createAction.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createAction.isPending ? 'Adding...' : 'Add Action'}
          </button>
        </div>

        {createAction.isError && (
          <p className="mt-2 text-sm text-red-600">{createAction.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function NCRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ncr, isLoading, isError, error } = useNCR(id ?? '');
  const { data: actionsData } = useNCRActions(id ?? '');
  const updateNCR = useUpdateNCR();
  const updateStatus = useUpdateNCRStatus();
  const completeAction = useCompleteNCRAction();
  const verifyAction = useVerifyNCRAction();

  const [showAddAction, setShowAddAction] = useState(false);
  const [rootCause, setRootCause] = useState('');
  const [showRootCause, setShowRootCause] = useState(false);

  const actions = actionsData?.data ?? [];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  if (!ncr) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-400">NCR not found.</p>
      </div>
    );
  }

  const handleStatusChange = (status: NcrStatus) => {
    if (status === 'RESOLVED' && !ncr.rootCause && !rootCause) {
      setShowRootCause(true);
      return;
    }
    updateStatus.mutate({ id: ncr.id, status, rootCause: rootCause || undefined });
    setShowRootCause(false);
  };

  const handleCompleteAction = (actionId: string) => {
    completeAction.mutate({ ncrId: ncr.id, actionId });
  };

  const handleVerifyAction = (actionId: string) => {
    verifyAction.mutate({ ncrId: ncr.id, actionId, verifiedBy: 'current-user' });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/quality/ncrs')}
            className="mb-2 text-sm text-blue-600 hover:underline"
          >
            Back to NCRs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">NCR {ncr.ncrNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-3 py-1 text-sm font-medium ${SEVERITY_COLORS[ncr.severity]}`}>
            {ncr.severity}
          </span>
          <span className={`rounded px-3 py-1 text-sm font-medium ${STATUS_COLORS[ncr.status]}`}>
            {ncr.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {showAddAction && (
        <AddActionDialog ncrId={ncr.id} onClose={() => setShowAddAction(false)} />
      )}

      {/* NCR Details */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{ncr.title}</h2>
        <p className="mb-4 text-gray-600">{ncr.description}</p>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Detected By</dt>
            <dd className="text-gray-900">{ncr.detectedBy}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Detected At</dt>
            <dd className="text-gray-900">
              {new Date(ncr.detectedAt).toLocaleString()}
            </dd>
          </div>
          {ncr.immediateAction && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">Immediate Action</dt>
              <dd className="text-gray-900">{ncr.immediateAction}</dd>
            </div>
          )}
          {ncr.rootCause && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">Root Cause</dt>
              <dd className="text-gray-900">{ncr.rootCause}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Status Actions */}
      {ncr.status !== 'CLOSED' && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Update Status</h2>

          {showRootCause && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Root Cause Analysis (required to resolve)
              </label>
              <textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Describe the root cause of this non-conformance..."
              />
            </div>
          )}

          <div className="flex gap-2">
            {ncr.status === 'OPEN' && (
              <button
                onClick={() => handleStatusChange('UNDER_REVIEW')}
                className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
              >
                Start Review
              </button>
            )}
            {ncr.status === 'UNDER_REVIEW' && (
              <button
                onClick={() => handleStatusChange('RESOLVED')}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Mark Resolved
              </button>
            )}
            {ncr.status === 'RESOLVED' && (
              <button
                onClick={() => handleStatusChange('CLOSED')}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Close NCR
              </button>
            )}
          </div>
        </div>
      )}

      {/* Corrective Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Corrective/Preventive Actions
          </h2>
          <button
            onClick={() => setShowAddAction(true)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Action
          </button>
        </div>

        {actions.length === 0 ? (
          <p className="py-8 text-center text-gray-400">
            No actions defined yet.
          </p>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => (
              <div
                key={action.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        action.actionType === 'CORRECTIVE'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {action.actionType}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_STATUS_COLORS[action.status]}`}
                    >
                      {action.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Due: {new Date(action.dueDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="mb-2 text-sm text-gray-900">{action.description}</p>
                <p className="mb-3 text-xs text-gray-500">
                  Assigned to: {action.assignedTo}
                </p>
                <div className="flex gap-2">
                  {action.status === 'OPEN' || action.status === 'IN_PROGRESS' ? (
                    <button
                      onClick={() => handleCompleteAction(action.id)}
                      disabled={completeAction.isPending}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark Complete
                    </button>
                  ) : null}
                  {action.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleVerifyAction(action.id)}
                      disabled={verifyAction.isPending}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
