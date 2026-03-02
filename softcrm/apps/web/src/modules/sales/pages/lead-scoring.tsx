import { GlassCard, Badge, StatCard } from '@softcrm/ui';
import { useLeadScoreDistribution, useRescoreLeads } from '../api-gamification';

export default function LeadScoringPage() {
  const { data: dist } = useLeadScoreDistribution();
  const rescore = useRescoreLeads();

  const buckets = [
    { label: 'Hot', range: '70-100', count: dist?.hot ?? 0, color: 'text-red-500', bg: 'bg-red-500' },
    { label: 'Warm', range: '40-69', count: dist?.warm ?? 0, color: 'text-orange-500', bg: 'bg-orange-500' },
    { label: 'Cool', range: '20-39', count: dist?.cool ?? 0, color: 'text-blue-400', bg: 'bg-blue-400' },
    { label: 'Cold', range: '0-19', count: dist?.cold ?? 0, color: 'text-gray-400', bg: 'bg-gray-400' },
  ];
  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lead Scoring</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI-powered lead scoring with demographic and behavioral signals
          </p>
        </div>
        <button
          onClick={() => rescore.mutate()}
          disabled={rescore.isPending}
          className="rounded-lg bg-gradient-to-r from-[var(--accent-from,#3b82f6)] to-[var(--accent-to,#6366f1)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
        >
          {rescore.isPending ? 'Rescoring...' : 'Rescore All Leads'}
        </button>
      </div>

      {/* Distribution Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map((b) => (
          <StatCard
            key={b.label}
            label={`${b.label} Leads (${b.range})`}
            value={b.count}
            change={total > 0 ? Math.round((b.count / total) * 100) : 0}
            changeLabel="of total"
          />
        ))}
      </div>

      {/* Distribution Bar */}
      <GlassCard tier="medium" padding="lg">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Score Distribution</h2>
        {total > 0 ? (
          <div className="flex h-6 rounded-full overflow-hidden">
            {buckets.map((b) => (
              <div
                key={b.label}
                className={`${b.bg} transition-all`}
                style={{ width: `${(b.count / total) * 100}%` }}
                title={`${b.label}: ${b.count}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No leads to display</p>
        )}
        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          {buckets.map((b) => (
            <span key={b.label} className={b.color}>
              {b.label}: {b.count}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Scoring Rules */}
      <GlassCard tier="subtle" padding="lg">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Scoring Rules</h2>
        <div className="space-y-3">
          {[
            { name: 'Business Email', category: 'Demographic', points: 15 },
            { name: 'Phone Number', category: 'Demographic', points: 10 },
            { name: 'Company Name', category: 'Firmographic', points: 10 },
            { name: 'Job Title', category: 'Demographic', points: 10 },
            { name: 'Decision Maker', category: 'Demographic', points: 20 },
            { name: 'Source Quality', category: 'Behavioral', points: 15 },
            { name: 'Recency', category: 'Behavioral', points: 20 },
          ].map((rule) => (
            <div key={rule.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-900 dark:text-gray-100">{rule.name}</span>
                <Badge variant="outline">{rule.category}</Badge>
              </div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {rule.points} pts max
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
