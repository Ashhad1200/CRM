import { useState } from 'react';
import { GlassCard } from '@softcrm/ui';
import { useCompanies, useBudgets, useCreateBudget, useBudgetVariance } from '../api-enhanced.js';
import type { Budget, BudgetVariance } from '../api-enhanced.js';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
}));

function fmt(n: number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BudgetManagementPage() {
  const [companyId, setCompanyId] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [month, setMonth] = useState<number | undefined>(undefined);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState('MONTHLY');

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets(companyId || undefined);
  const { data: variance = [], isLoading: varianceLoading } = useBudgetVariance(
    selectedBudgetId || undefined,
    month,
  );
  const createBudget = useCreateBudget();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    createBudget.mutate(
      { name, year, period, companyId },
      {
        onSuccess: () => {
          setShowCreate(false);
          setName('');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Budget Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!companyId}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          New Budget
        </button>
      </div>

      {/* Company selector */}
      <GlassCard tier="subtle" padding="md">
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Company</label>
        {companiesLoading ? (
          <div className="h-9 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : (
          <select
            value={companyId}
            onChange={(e) => { setCompanyId(e.target.value); setSelectedBudgetId(''); }}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        )}
      </GlassCard>

      {/* Create budget dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">New Budget</h2>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
                <input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Period</label>
                <select value={period} onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={createBudget.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {createBudget.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
            {createBudget.isError && (
              <p className="mt-2 text-sm text-red-600">{createBudget.error.message}</p>
            )}
          </form>
        </div>
      )}

      {/* Budget list */}
      {companyId && (
        <GlassCard tier="medium" padding="none">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budgets</h2>
          </div>
          {budgetsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
            </div>
          ) : (budgets as Budget[]).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No budgets found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(budgets as Budget[]).map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.year}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.period}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedBudgetId(b.id === selectedBudgetId ? '' : b.id)}
                        className="rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        {b.id === selectedBudgetId ? 'Hide Variance' : 'View Variance'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      )}

      {/* Variance analysis */}
      {selectedBudgetId && (
        <GlassCard tier="medium" padding="lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budget Variance</h2>
            <select
              value={month ?? ''}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">All Months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {varianceLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
            </div>
          ) : (variance as BudgetVariance[]).length === 0 ? (
            <p className="text-center text-sm text-gray-400">No variance data available.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2 text-right">Budgeted</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Variance</th>
                  <th className="px-3 py-2 text-right">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {(variance as BudgetVariance[]).map((v) => {
                  const isPositive = v.variance >= 0;
                  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
                  return (
                    <tr key={v.accountId} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{v.accountName}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fmt(v.budgeted)}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{fmt(v.actual)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${colorClass}`}>{fmt(v.variance)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${colorClass}`}>
                        {v.variancePercent > 0 ? '+' : ''}{v.variancePercent.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </GlassCard>
      )}
    </div>
  );
}
