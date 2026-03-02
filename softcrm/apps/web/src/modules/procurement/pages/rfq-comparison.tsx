import { useState } from 'react';
import { GlassCard } from '@softcrm/ui';
import { useRFQs, useRFQComparison } from '../api-enhanced';

export default function RFQComparisonPage() {
  const [selectedRfq, setSelectedRfq] = useState('');
  const { data: rfqs = [] } = useRFQs();
  const { data: comparison, isLoading, isError, error } = useRFQComparison(
    selectedRfq || undefined,
  );

  const suppliers = comparison?.suppliers ?? [];

  // Find best values for highlighting
  const lowestPrice = suppliers.reduce<number | null>((min, s) => {
    if (s.quotedPrice == null) return min;
    return min === null || s.quotedPrice < min ? s.quotedPrice : min;
  }, null);
  const shortestLead = suppliers.reduce<number | null>((min, s) => {
    if (s.quotedLeadTimeDays == null) return min;
    return min === null || s.quotedLeadTimeDays < min ? s.quotedLeadTimeDays : min;
  }, null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">RFQ Comparison</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Compare supplier responses across RFQs
        </p>
      </div>

      {/* RFQ Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select RFQ</label>
        <select
          value={selectedRfq}
          onChange={(e) => setSelectedRfq(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">Choose an RFQ...</option>
          {rfqs.map((rfq) => (
            <option key={rfq.id} value={rfq.id}>
              {rfq.rfqNumber} ({rfq.status})
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Loading comparison...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {selectedRfq && comparison && (
        <GlassCard tier="subtle" padding="none">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {comparison.rfqNumber} — Supplier Comparison
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Quoted Price</th>
                <th className="px-4 py-3">Lead Time (days)</th>
                <th className="px-4 py-3">Response Date</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No supplier responses yet.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.supplierId}
                    className="border-b border-gray-100 hover:bg-white/5 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {s.supplierName}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        s.quotedPrice != null && s.quotedPrice === lowestPrice
                          ? 'font-semibold text-green-600 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {s.quotedPrice != null
                        ? `$${s.quotedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 ${
                        s.quotedLeadTimeDays != null && s.quotedLeadTimeDays === shortestLead
                          ? 'font-semibold text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {s.quotedLeadTimeDays ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {s.responseReceivedAt
                        ? new Date(s.responseReceivedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {s.notes ?? '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
