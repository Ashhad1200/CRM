import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useCAPA, useUpdateCAPA, useTrackCAPA, useVerifyCAPA } from '../api';
import type { CorrectiveActionStatus, CorrectiveActionType } from '../api';

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

export default function CAPADetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: capa, isLoading, isError, error } = useCAPA(id ?? '');
  const updateCAPA = useUpdateCAPA();
  const trackCAPA = useTrackCAPA();
  const verifyCAPA = useVerifyCAPA();

  const [showRootCause, setShowRootCause] = useState(false);
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('');
  const [implementationPlan, setImplementationPlan] = useState('');
  const [effectiveness, setEffectiveness] = useState('');
  const [showVerify, setShowVerify] = useState(false);

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

  if (!capa) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-400">CAPA not found.</p>
      </div>
    );
  }

  const handleStartProgress = () => {
    if (!capa.rootCauseAnalysis && !rootCauseAnalysis) {
      setShowRootCause(true);
      return;
    }
    trackCAPA.mutate({ id: capa.id, status: 'IN_PROGRESS' });
    if (rootCauseAnalysis || implementationPlan) {
      updateCAPA.mutate({
        id: capa.id,
        rootCauseAnalysis: rootCauseAnalysis || undefined,
        implementationPlan: implementationPlan || undefined,
      });
    }
    setShowRootCause(false);
  };

  const handleComplete = () => {
    trackCAPA.mutate({
      id: capa.id,
      status: 'COMPLETED',
      completedDate: new Date().toISOString(),
    });
  };

  const handleVerify = () => {
    if (!effectiveness) {
      setShowVerify(true);
      return;
    }
    verifyCAPA.mutate({
      id: capa.id,
      verifiedBy: 'current-user',
      effectiveness,
    });
    setShowVerify(false);
  };

  const isDueSoon =
    new Date(capa.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isOverdue = new Date(capa.dueDate) < new Date();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/quality/capas')}
            className="mb-2 text-sm text-blue-600 hover:underline"
          >
            Back to CAPAs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            CAPA {capa.capaNumber}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-3 py-1 text-sm font-medium ${TYPE_COLORS[capa.type]}`}>
            {capa.type}
          </span>
          <span className={`rounded px-3 py-1 text-sm font-medium ${STATUS_COLORS[capa.status]}`}>
            {capa.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* CAPA Details */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{capa.title}</h2>
        <p className="mb-4 text-gray-600">{capa.description}</p>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Assigned To</dt>
            <dd className="text-gray-900">{capa.assignedTo}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Due Date</dt>
            <dd
              className={
                isOverdue
                  ? 'font-medium text-red-600'
                  : isDueSoon
                    ? 'text-yellow-600'
                    : 'text-gray-900'
              }
            >
              {new Date(capa.dueDate).toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
              {isDueSoon && !isOverdue && ' (Due Soon)'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="font-medium text-gray-500">Proposed Action</dt>
            <dd className="text-gray-900">{capa.proposedAction}</dd>
          </div>
          {capa.rootCauseAnalysis && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">Root Cause Analysis</dt>
              <dd className="text-gray-900">{capa.rootCauseAnalysis}</dd>
            </div>
          )}
          {capa.implementationPlan && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">Implementation Plan</dt>
              <dd className="text-gray-900">{capa.implementationPlan}</dd>
            </div>
          )}
          {capa.completedDate && (
            <div>
              <dt className="font-medium text-gray-500">Completed Date</dt>
              <dd className="text-gray-900">
                {new Date(capa.completedDate).toLocaleDateString()}
              </dd>
            </div>
          )}
          {capa.effectiveness && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">Effectiveness Assessment</dt>
              <dd className="text-gray-900">{capa.effectiveness}</dd>
            </div>
          )}
          {capa.verifiedBy && (
            <div>
              <dt className="font-medium text-gray-500">Verified By</dt>
              <dd className="text-gray-900">
                {capa.verifiedBy} on {new Date(capa.verifiedAt!).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Root Cause Input */}
      {showRootCause && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Root Cause Analysis
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Please provide root cause analysis before starting work on this CAPA.
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Root Cause Analysis *
            </label>
            <textarea
              value={rootCauseAnalysis}
              onChange={(e) => setRootCauseAnalysis(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Describe the root cause of this issue..."
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Implementation Plan
            </label>
            <textarea
              value={implementationPlan}
              onChange={(e) => setImplementationPlan(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Describe how this will be implemented..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowRootCause(false)}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleStartProgress}
              disabled={!rootCauseAnalysis || trackCAPA.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Start Work
            </button>
          </div>
        </div>
      )}

      {/* Verification Input */}
      {showVerify && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Verify Effectiveness
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Please assess the effectiveness of this CAPA before verification.
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Effectiveness Assessment *
            </label>
            <textarea
              value={effectiveness}
              onChange={(e) => setEffectiveness(e.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Describe whether the corrective action was effective and why..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowVerify(false)}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={!effectiveness || verifyCAPA.isPending}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Verify CAPA
            </button>
          </div>
        </div>
      )}

      {/* Status Actions */}
      {!showRootCause && !showVerify && capa.status !== 'VERIFIED' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>

          <div className="flex gap-3">
            {capa.status === 'OPEN' && (
              <button
                onClick={handleStartProgress}
                disabled={trackCAPA.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Start Work
              </button>
            )}
            {capa.status === 'IN_PROGRESS' && (
              <button
                onClick={handleComplete}
                disabled={trackCAPA.isPending}
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Mark Completed
              </button>
            )}
            {capa.status === 'COMPLETED' && (
              <button
                onClick={handleVerify}
                disabled={verifyCAPA.isPending}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Verify Effectiveness
              </button>
            )}
          </div>
        </div>
      )}

      {/* Linked NCR */}
      {capa.ncr && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Related NCR</h2>
          <button
            onClick={() => navigate(`/quality/ncrs/${capa.ncr!.id}`)}
            className="text-sm text-blue-600 hover:underline"
          >
            NCR {capa.ncr.ncrNumber}: {capa.ncr.title}
          </button>
        </div>
      )}

      {(trackCAPA.isError || verifyCAPA.isError) && (
        <p className="mt-4 text-sm text-red-600">
          {trackCAPA.error?.message ?? verifyCAPA.error?.message}
        </p>
      )}
    </div>
  );
}
