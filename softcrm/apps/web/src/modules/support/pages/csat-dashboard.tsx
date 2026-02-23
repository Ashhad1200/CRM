import { useCsatStats } from '../api.js';

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5 text-xl">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="text-yellow-400">★</span>
      ))}
      {hasHalf && <span className="text-yellow-400">★</span>}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300">★</span>
      ))}
    </div>
  );
}

export default function CsatDashboardPage() {
  const { data, isLoading, isError, error } = useCsatStats();

  if (isLoading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (isError) return <div className="p-6 text-red-600">{error.message}</div>;

  const stats = data?.data;
  if (!stats) return <div className="p-6 text-gray-500">No CSAT data available.</div>;

  const responsePercent = Math.round(stats.responseRate * 100);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Customer Satisfaction</h1>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Average Rating */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <p className="mb-1 text-sm font-medium text-gray-500">Average Rating</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-gray-900">
              {stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—'}
            </span>
            <span className="mb-1 text-sm text-gray-400">/ 5</span>
          </div>
          {stats.averageRating !== null && (
            <div className="mt-2">
              <StarRating rating={stats.averageRating} />
            </div>
          )}
        </div>

        {/* Response Rate */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <p className="mb-1 text-sm font-medium text-gray-500">Response Rate</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-gray-900">{responsePercent}%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${responsePercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {stats.totalResponses} of {stats.totalSurveys} surveys answered
          </p>
        </div>

        {/* Total Surveys */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <p className="mb-1 text-sm font-medium text-gray-500">Total Surveys Sent</p>
          <span className="text-4xl font-bold text-gray-900">{stats.totalSurveys}</span>
        </div>

        {/* Total Responses */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <p className="mb-1 text-sm font-medium text-gray-500">Total Responses</p>
          <span className="text-4xl font-bold text-gray-900">{stats.totalResponses}</span>
        </div>
      </div>
    </div>
  );
}
