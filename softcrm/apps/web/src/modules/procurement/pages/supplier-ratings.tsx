import { useState } from 'react';
import { GlassCard, StatCard } from '@softcrm/ui';
import { useSuppliers } from '../api';
import {
  useSupplierRatings,
  useSupplierScorecard,
  useRateSupplier,
} from '../api-enhanced';
import type { Supplier } from '../api';

export default function SupplierRatingsPage() {
  const [selectedId, setSelectedId] = useState('');
  const [showRateForm, setShowRateForm] = useState(false);

  const { data: suppliersData } = useSuppliers();
  const suppliers: Supplier[] = suppliersData?.data ?? [];

  const { data: scorecard } = useSupplierScorecard(selectedId || undefined);
  const { data: ratings = [] } = useSupplierRatings(selectedId || undefined);

  // Rate form state
  const [quality, setQuality] = useState('3');
  const [delivery, setDelivery] = useState('3');
  const [price, setPrice] = useState('3');
  const [comments, setComments] = useState('');
  const rate = useRateSupplier();

  const handleRate = (e: React.FormEvent) => {
    e.preventDefault();
    rate.mutate(
      {
        supplierId: selectedId,
        qualityScore: Number(quality),
        deliveryScore: Number(delivery),
        priceScore: Number(price),
        comments: comments || undefined,
      },
      {
        onSuccess: () => {
          setShowRateForm(false);
          setQuality('3');
          setDelivery('3');
          setPrice('3');
          setComments('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Supplier Ratings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View scorecards and rate supplier performance
          </p>
        </div>
        {selectedId && (
          <button
            onClick={() => setShowRateForm(!showRateForm)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Rate Supplier
          </button>
        )}
      </div>

      {/* Supplier selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Supplier
        </label>
        <select
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setShowRateForm(false);
          }}
          className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="">Choose a supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>

      {/* Rate form */}
      {showRateForm && selectedId && (
        <GlassCard tier="medium" padding="lg">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Rate Supplier
          </h2>
          <form onSubmit={handleRate} className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Quality (0-5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Delivery (0-5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Price (0-5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Comments
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={rate.isPending}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {rate.isPending ? 'Submitting...' : 'Submit Rating'}
              </button>
              <button
                type="button"
                onClick={() => setShowRateForm(false)}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
            {rate.isError && (
              <p className="text-sm text-red-600">{rate.error.message}</p>
            )}
          </form>
        </GlassCard>
      )}

      {/* Scorecard */}
      {selectedId && scorecard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Quality"
            value={`${Math.round(scorecard.avgQuality * 20)}%`}
            change={Math.round(scorecard.avgQuality * 20)}
            changeLabel={`${scorecard.avgQuality.toFixed(1)} / 5`}
          />
          <StatCard
            label="Delivery"
            value={`${Math.round(scorecard.avgDelivery * 20)}%`}
            change={Math.round(scorecard.avgDelivery * 20)}
            changeLabel={`${scorecard.avgDelivery.toFixed(1)} / 5`}
          />
          <StatCard
            label="Price"
            value={`${Math.round(scorecard.avgPrice * 20)}%`}
            change={Math.round(scorecard.avgPrice * 20)}
            changeLabel={`${scorecard.avgPrice.toFixed(1)} / 5`}
          />
          <StatCard
            label="Overall"
            value={`${Math.round(scorecard.avgOverall * 20)}%`}
            change={Math.round(scorecard.avgOverall * 20)}
            changeLabel={`${scorecard.totalRatings} ratings`}
          />
        </div>
      )}

      {/* Rating History */}
      {selectedId && (
        <GlassCard tier="subtle" padding="none">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Rating History
            </h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Quality</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Overall</th>
                <th className="px-4 py-3">Comments</th>
              </tr>
            </thead>
            <tbody>
              {ratings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No ratings yet.
                  </td>
                </tr>
              ) : (
                ratings.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-white/5 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {r.qualityScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {r.deliveryScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {r.priceScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {r.overallScore.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {r.comments ?? '-'}
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
