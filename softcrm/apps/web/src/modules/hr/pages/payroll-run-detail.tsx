import { useParams, useNavigate } from 'react-router';
import {
  usePayrollRun,
  usePayslipsByPayrollRun,
  useApprovePayrollRun,
  useMarkPayrollRunPaid,
} from '../api';
import type { PayrollRunStatus, PaySlipStatus } from '../api';

const STATUS_COLORS: Record<PayrollRunStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CALCULATING: 'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

const PAYSLIP_STATUS_COLORS: Record<PaySlipStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payrollRun, isLoading, isError, error } = usePayrollRun(id ?? '');
  const { data: payslipsData } = usePayslipsByPayrollRun(id ?? '');

  const approvePayroll = useApprovePayrollRun();
  const markPaid = useMarkPayrollRunPaid();

  const payslips = payslipsData?.data ?? [];

  const formatCurrency = (value: string, currency = 'USD') => {
    return `${currency} ${parseFloat(value).toLocaleString()}`;
  };

  if (!id) return <p className="p-6 text-gray-400">Payroll run not found.</p>;
  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError) return <p className="p-6 text-red-600">{error.message}</p>;
  if (!payrollRun) return <p className="p-6 text-gray-400">Payroll run not found.</p>;

  const statusColors = STATUS_COLORS[payrollRun.status] ?? STATUS_COLORS['DRAFT'];

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/hr/payroll')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Payroll
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Payroll Run:{' '}
          {new Date(payrollRun.period + '-01').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          })}
        </h1>
        <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors}`}>
          {payrollRun.status.replace('_', ' ')}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Gross</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(payrollRun.totalGross)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Deductions</p>
          <p className="text-2xl font-bold text-red-600">
            -{formatCurrency(payrollRun.totalDeductions)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Net</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(payrollRun.totalNet)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Payslips</p>
          <p className="text-2xl font-bold text-blue-600">{payslips.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        {payrollRun.status === 'PENDING_APPROVAL' && (
          <button
            onClick={() => approvePayroll.mutate(payrollRun.id)}
            disabled={approvePayroll.isPending}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {approvePayroll.isPending ? 'Approving...' : 'Approve Payroll Run'}
          </button>
        )}
        {payrollRun.status === 'APPROVED' && (
          <button
            onClick={() => markPaid.mutate(payrollRun.id)}
            disabled={markPaid.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {markPaid.isPending ? 'Processing...' : 'Mark as Paid'}
          </button>
        )}
      </div>

      {/* Payslips Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Payslips</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Employee #</th>
              <th className="px-4 py-3">Gross Pay</th>
              <th className="px-4 py-3">Deductions</th>
              <th className="px-4 py-3">Net Pay</th>
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payslips.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  No payslips found for this payroll run.
                </td>
              </tr>
            ) : (
              payslips.map((ps) => {
                const totalDeductions = Object.values(
                  ps.deductions as Record<string, number>
                ).reduce((sum, val) => sum + (val || 0), 0);

                return (
                  <tr key={ps.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {ps.employee?.firstName?.[0]}
                          {ps.employee?.lastName?.[0]}
                        </div>
                        <span className="font-medium text-gray-900">
                          {ps.employee
                            ? `${ps.employee.firstName} ${ps.employee.lastName}`
                            : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ps.employee?.employeeNumber ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatCurrency(ps.grossPay, ps.currency)}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      -{formatCurrency(String(totalDeductions), ps.currency)}
                    </td>
                    <td className="px-4 py-3 font-medium text-green-600">
                      {formatCurrency(ps.netPay, ps.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ps.currency}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${
                          PAYSLIP_STATUS_COLORS[ps.status]
                        }`}
                      >
                        {ps.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Metadata */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Details</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900">
              {new Date(payrollRun.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Last Updated</dt>
            <dd className="text-gray-900">
              {new Date(payrollRun.updatedAt).toLocaleString()}
            </dd>
          </div>
          {payrollRun.approvedAt && (
            <div>
              <dt className="text-gray-500">Approved At</dt>
              <dd className="text-gray-900">
                {new Date(payrollRun.approvedAt).toLocaleString()}
              </dd>
            </div>
          )}
          {payrollRun.paidAt && (
            <div>
              <dt className="text-gray-500">Paid At</dt>
              <dd className="text-gray-900">
                {new Date(payrollRun.paidAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
