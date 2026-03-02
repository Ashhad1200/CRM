import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  usePayrollRuns,
  useCreatePayrollRun,
  useApprovePayrollRun,
  useMarkPayrollRunPaid,
} from '../api';
import type { PayrollRun, PayrollRunStatus } from '../api';

const STATUS_COLORS: Record<PayrollRunStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CALCULATING: 'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

function CreatePayrollRunDialog({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const createPayrollRun = useCreatePayrollRun();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPayrollRun.mutate(
      { period },
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
          New Payroll Run
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Period (YYYY-MM) *
        </label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          required
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
            disabled={createPayrollRun.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createPayrollRun.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        {createPayrollRun.isError && (
          <p className="mt-2 text-sm text-red-600">
            {createPayrollRun.error.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function PayrollPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filters: Record<string, string> = {};
  if (statusFilter) filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = usePayrollRuns(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const approvePayroll = useApprovePayrollRun();
  const markPaid = useMarkPayrollRunPaid();

  const payrollRuns: PayrollRun[] = data?.data ?? [];

  const formatCurrency = (value: string) => {
    return `$${parseFloat(value).toLocaleString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Payroll Run
        </button>
      </div>

      {showCreate && (
        <CreatePayrollRunDialog onClose={() => setShowCreate(false)} />
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Runs</p>
          <p className="text-2xl font-bold text-gray-900">{payrollRuns.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600">
            {payrollRuns.filter((r) => r.status === 'PENDING_APPROVAL').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {payrollRuns.filter((r) => r.status === 'APPROVED').length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-emerald-600">
            {payrollRuns.filter((r) => r.status === 'PAID').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CALCULATING">Calculating</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-3 py-3">Period</th>
              <th className="px-3 py-3">Total Gross</th>
              <th className="px-3 py-3">Deductions</th>
              <th className="px-3 py-3">Total Net</th>
              <th className="px-3 py-3">Payslips</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No payroll runs found.
                </td>
              </tr>
            ) : (
              payrollRuns.map((pr) => (
                <tr
                  key={pr.id}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                  onClick={() => navigate(`/hr/payroll/${pr.id}`)}
                >
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {new Date(pr.period + '-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                    })}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {formatCurrency(pr.totalGross)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {formatCurrency(pr.totalDeductions)}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {formatCurrency(pr.totalNet)}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {pr.paySlipCount ?? 0}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        STATUS_COLORS[pr.status]
                      }`}
                    >
                      {pr.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {pr.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => approvePayroll.mutate(pr.id)}
                          disabled={approvePayroll.isPending}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          Approve
                        </button>
                      )}
                      {pr.status === 'APPROVED' && (
                        <button
                          onClick={() => markPaid.mutate(pr.id)}
                          disabled={markPaid.isPending}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/hr/payroll/${pr.id}`)}
                        className="text-sm text-gray-600 hover:text-gray-700"
                      >
                        View
                      </button>
                    </div>
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
