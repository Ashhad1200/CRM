import { useState } from 'react';
import {
  useExpenses,
  useCreateExpense,
  useApproveExpense,
  useRejectExpense,
  useChartOfAccounts,
} from '../api.js';
import type { Expense } from '../api.js';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors}`}>
      {status}
    </span>
  );
}

function CreateExpenseDialog({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [vendor, setVendor] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const createExpense = useCreateExpense();
  const { data: coaData } = useChartOfAccounts();
  const expenseAccounts = (coaData?.data ?? []).filter((a) => a.type === 'EXPENSE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate(
      {
        description,
        amount: Number(amount),
        currency,
        date: new Date(date).toISOString(),
        categoryId,
        vendor: vendor || undefined,
        receiptUrl: receiptUrl || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Expense</h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">-- select --</option>
          {expenseAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-gray-700">Vendor</label>
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Optional"
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <label className="mb-1 block text-sm font-medium text-gray-700">Receipt URL</label>
        <input value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="Optional"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={createExpense.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {createExpense.isPending ? 'Creating…' : 'Submit Expense'}
          </button>
        </div>

        {createExpense.isError && (
          <p className="mt-2 text-sm text-red-600">{createExpense.error.message}</p>
        )}
      </form>
    </div>
  );
}

function RejectDialog({ expenseId, onClose }: { expenseId: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const rejectExpense = useRejectExpense();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rejectExpense.mutate({ id: expenseId, reason: reason || undefined }, { onSuccess: () => onClose() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Reject Expense</h3>
        <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="submit" disabled={rejectExpense.isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {rejectExpense.isPending ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
        {rejectExpense.isError && (
          <p className="mt-2 text-sm text-red-600">{rejectExpense.error.message}</p>
        )}
      </form>
    </div>
  );
}

export default function ExpensesListPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const approveExpense = useApproveExpense();

  const filters: Record<string, string> = {};
  if (statusFilter !== 'ALL') filters['status'] = statusFilter;

  const { data, isLoading, isError, error } = useExpenses(
    Object.keys(filters).length > 0 ? filters : undefined,
  );

  const expenses: Expense[] = data?.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button onClick={() => setShowCreate(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          New Expense
        </button>
      </div>

      {showCreate && <CreateExpenseDialog onClose={() => setShowCreate(false)} />}
      {rejectId && <RejectDialog expenseId={rejectId} onClose={() => setRejectId(null)} />}

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">Loading…</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {data && (
        <>
          <p className="mb-2 text-xs text-gray-400">{data.meta?.total ?? expenses.length} expense(s)</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">Vendor</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">No expenses found.</td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-600">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">{exp.description}</td>
                    <td className="px-3 py-3 text-gray-600">{exp.vendor ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{exp.category?.name ?? exp.categoryId}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      {exp.currency} {Number(exp.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={exp.status} /></td>
                    <td className="px-3 py-3">
                      {exp.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => approveExpense.mutate({ id: exp.id })}
                            disabled={approveExpense.isPending}
                            className="rounded bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50">
                            Approve
                          </button>
                          <button onClick={() => setRejectId(exp.id)}
                            className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
                            Reject
                          </button>
                        </div>
                      )}
                      {exp.status === 'REJECTED' && exp.rejectionReason && (
                        <span className="text-xs text-gray-500" title={exp.rejectionReason}>
                          Reason: {exp.rejectionReason.slice(0, 30)}{exp.rejectionReason.length > 30 ? '…' : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
