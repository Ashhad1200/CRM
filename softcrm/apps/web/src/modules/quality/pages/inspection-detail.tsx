import { useParams, useNavigate } from 'react-router';
import { useInspection, useApproveInspection } from '../api';
import type { InspectionStatus, InspectionResult } from '../api';

const STATUS_COLORS: Record<InspectionStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PASSED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  WAIVED: 'bg-yellow-100 text-yellow-700',
};

const RESULT_COLORS: Record<InspectionResult, string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  CONDITIONAL: 'bg-yellow-100 text-yellow-700',
};

function StatusBadge({ status }: { status: InspectionStatus }) {
  return (
    <span className={`inline-block rounded px-3 py-1 text-sm font-medium ${STATUS_COLORS[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ResultBadge({ result }: { result: InspectionResult }) {
  return (
    <span className={`inline-block rounded px-3 py-1 text-sm font-medium ${RESULT_COLORS[result]}`}>
      {result}
    </span>
  );
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inspection, isLoading, isError, error } = useInspection(id ?? '');
  const approveInspection = useApproveInspection();

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

  if (!inspection) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-400">Inspection not found.</p>
      </div>
    );
  }

  const handleApprove = (approved: boolean) => {
    approveInspection.mutate({ id: inspection.id, approved });
  };

  const needsApproval = inspection.status === 'IN_PROGRESS' && inspection.overallResult;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/quality/inspections')}
            className="mb-2 text-sm text-blue-600 hover:underline"
          >
            Back to Inspections
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Inspection {inspection.inspectionNumber}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={inspection.status} />
          {inspection.overallResult && (
            <ResultBadge result={inspection.overallResult} />
          )}
        </div>
      </div>

      {/* Inspection Info */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">Type</dt>
            <dd className="text-gray-900">{inspection.type.replace('_', ' ')}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Template</dt>
            <dd className="text-gray-900">{inspection.template?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Lot Number</dt>
            <dd className="text-gray-900">{inspection.lotNumber ?? '-'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Batch Size</dt>
            <dd className="text-gray-900">{inspection.batchSize ?? '-'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Sampled Units</dt>
            <dd className="text-gray-900">{inspection.sampledUnits ?? '-'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">Scheduled Date</dt>
            <dd className="text-gray-900">
              {new Date(inspection.scheduledDate).toLocaleString()}
            </dd>
          </div>
          {inspection.conductedDate && (
            <div>
              <dt className="font-medium text-gray-500">Conducted Date</dt>
              <dd className="text-gray-900">
                {new Date(inspection.conductedDate).toLocaleString()}
              </dd>
            </div>
          )}
          {inspection.notes && (
            <div className="col-span-2">
              <dt className="font-medium text-gray-500">Notes</dt>
              <dd className="text-gray-900">{inspection.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Inspection Results */}
      {inspection.results && inspection.results.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Results</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-2 text-left">Question</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Value</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {inspection.results.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-900">{r.question}</td>
                  <td className="px-3 py-2 text-gray-600">{r.resultType}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {r.resultType === 'PASS_FAIL'
                      ? r.passFail
                        ? 'Pass'
                        : 'Fail'
                      : r.resultType === 'NUMERIC'
                        ? r.numericValue
                        : r.textValue ?? '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        r.isPassing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {r.isPassing ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.notes ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {inspection.status === 'PENDING' && (
          <button
            onClick={() => navigate(`/quality/inspections/${inspection.id}/conduct`)}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Start Inspection
          </button>
        )}
        {inspection.status === 'IN_PROGRESS' && (
          <button
            onClick={() => navigate(`/quality/inspections/${inspection.id}/conduct`)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue Inspection
          </button>
        )}
        {needsApproval && (
          <>
            <button
              onClick={() => handleApprove(true)}
              disabled={approveInspection.isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleApprove(false)}
              disabled={approveInspection.isPending}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
      </div>

      {approveInspection.isError && (
        <p className="mt-2 text-sm text-red-600">{approveInspection.error.message}</p>
      )}
    </div>
  );
}
