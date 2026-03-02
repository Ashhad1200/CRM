import { useState } from 'react';
import { GlassCard, StatCard, Badge } from '@softcrm/ui';
import {
  useCompanies,
  useBankTransactions,
  useReconciliationSummary,
  useMatchTransaction,
  useReconcileTransaction,
} from '../api-enhanced.js';
import type { BankTransaction } from '../api-enhanced.js';

const STATUS_FILTERS = ['ALL', 'pending', 'matched', 'reconciled', 'excluded'] as const;

const STATUS_VARIANT: Record<string, 'warning' | 'primary' | 'success' | 'outline'> = {
  pending: 'warning',
  matched: 'primary',
  reconciled: 'success',
  excluded: 'outline',
};

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BankReconciliationPage() {
  const [companyId, setCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [matchingTxId, setMatchingTxId] = useState<string | null>(null);
  const [matchAccountId, setMatchAccountId] = useState('');

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: summary } = useReconciliationSummary(companyId || undefined);
  const { data: transactions = [], isLoading: txLoading } = useBankTransactions(
    companyId || undefined,
    statusFilter !== 'ALL' ? statusFilter : undefined,
  );
  const matchMutation = useMatchTransaction();
  const reconcileMutation = useReconcileTransaction();

  const txList = transactions as BankTransaction[];

  const handleMatch = (id: string) => {
    if (!matchAccountId) return;
    matchMutation.mutate({ id, accountId: matchAccountId }, {
      onSuccess: () => { setMatchingTxId(null); setMatchAccountId(''); },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bank Reconciliation</h1>

      {/* Company selector */}
      <GlassCard tier="subtle" padding="md">
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Company</label>
        {companiesLoading ? (
          <div className="h-9 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : (
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        )}
      </GlassCard>

      {/* Summary cards */}
      {companyId && summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending" value={summary.pending} />
          <StatCard label="Matched" value={summary.matched} />
          <StatCard label="Reconciled" value={summary.reconciled} />
          <StatCard label="Unreconciled Total" value={`$${fmt(summary.unreconciledTotal)}`} />
        </div>
      )}

      {/* Status filter */}
      {companyId && (
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Transactions table */}
      {companyId && (
        <GlassCard tier="medium" padding="none">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Transactions</h2>
          </div>

          {txLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
            </div>
          ) : txList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No transactions found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {txList.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{tx.description}</td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{tx.currency}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[tx.status] ?? 'default'}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {tx.status === 'pending' && (
                          <button
                            onClick={() => setMatchingTxId(matchingTxId === tx.id ? null : tx.id)}
                            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            Match
                          </button>
                        )}
                        {(tx.status === 'pending' || tx.status === 'matched') && (
                          <button
                            onClick={() => reconcileMutation.mutate(tx.id)}
                            disabled={reconcileMutation.isPending}
                            className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                          >
                            Reconcile
                          </button>
                        )}
                      </div>
                      {/* Match account input */}
                      {matchingTxId === tx.id && (
                        <div className="mt-2 flex items-center gap-1">
                          <input
                            placeholder="Account ID"
                            value={matchAccountId}
                            onChange={(e) => setMatchAccountId(e.target.value)}
                            className="w-32 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          />
                          <button
                            onClick={() => handleMatch(tx.id)}
                            disabled={matchMutation.isPending}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      )}
    </div>
  );
}
