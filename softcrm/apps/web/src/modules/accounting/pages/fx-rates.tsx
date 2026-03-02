import { useState } from 'react';
import { GlassCard, GlassPanel } from '@softcrm/ui';
import { useCompanies, useExchangeRates, useSetExchangeRate } from '../api-enhanced.js';
import type { ExchangeRate } from '../api-enhanced.js';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'] as const;

export default function FxRatesPage() {
  const [companyId, setCompanyId] = useState('');

  // Add rate form
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [rate, setRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();
  const { data: rates = [], isLoading: ratesLoading } = useExchangeRates(companyId || undefined);
  const setExchangeRate = useSetExchangeRate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !rate) return;
    setExchangeRate.mutate(
      { companyId, fromCurrency, toCurrency, rate: Number(rate), effectiveDate },
      { onSuccess: () => setRate('') },
    );
  };

  const rateList = rates as ExchangeRate[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Exchange Rates</h1>

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

      {companyId && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Add rate form */}
          <GlassPanel tier="medium" className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Add Exchange Rate</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">From Currency</label>
                <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">To Currency</label>
                <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Rate</label>
                <input type="number" step="0.000001" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required
                  placeholder="e.g. 1.0850"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Effective Date</label>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
              </div>
              <button type="submit" disabled={setExchangeRate.isPending || !rate}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {setExchangeRate.isPending ? 'Saving…' : 'Add Rate'}
              </button>
              {setExchangeRate.isError && (
                <p className="text-sm text-red-600">{setExchangeRate.error.message}</p>
              )}
            </form>
          </GlassPanel>

          {/* Rates table */}
          <div className="lg:col-span-2">
            <GlassCard tier="medium" padding="none">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Current Rates</h2>
              </div>

              {ratesLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}
                </div>
              ) : rateList.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No exchange rates configured.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">To</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3">Effective Date</th>
                      <th className="px-4 py-3">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateList.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.fromCurrency}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.toCurrency}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">{Number(r.rate).toFixed(6)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{new Date(r.effectiveDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-500">{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
