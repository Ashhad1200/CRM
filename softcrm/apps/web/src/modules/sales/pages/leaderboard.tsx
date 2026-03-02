import { useState } from 'react';
import { GlassCard, Badge, StatCard, ProgressRing } from '@softcrm/ui';
import { useLeaderboard, useSalesTargets, useUserBadges } from '../api-gamification';

const PERIODS = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<string>('MONTHLY');
  const { data: entries = [], isLoading } = useLeaderboard(period);
  const { data: targets = [] } = useSalesTargets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Sales Leaderboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track performance and compete with your team
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-white/20 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                period === p
                  ? 'bg-gradient-to-r from-[var(--accent-from,#3b82f6)] to-[var(--accent-to,#6366f1)] text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[entries[1], entries[0], entries[2]].map((entry, idx) => {
            if (!entry) return null;
            const medals = ['🥈', '🥇', '🥉'];
            return (
              <GlassCard
                key={entry.userId}
                tier={idx === 1 ? 'strong' : 'medium'}
                padding="lg"
                className={idx === 1 ? 'scale-105' : ''}
              >
                <div className="text-center">
                  <span className="text-3xl">{medals[idx]}</span>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    #{entry.rank}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {entry.dealsWon} deals · ${Number(entry.revenue).toLocaleString()}
                  </p>
                  <Badge className="mt-2">{entry.score} pts</Badge>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Full Rankings */}
      <GlassCard tier="subtle" padding="none">
        <div className="divide-y divide-white/10">
          <div className="grid grid-cols-5 gap-4 px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            <span>Rank</span>
            <span>Rep</span>
            <span className="text-right">Deals Won</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Score</span>
          </div>
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No data for this period</div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.userId}
                className="grid grid-cols-5 gap-4 px-4 py-3 text-sm hover:bg-white/5 transition"
              >
                <span className="font-bold text-gray-900 dark:text-gray-100">#{entry.rank}</span>
                <span className="text-gray-700 dark:text-gray-200 truncate">{entry.userId.slice(0, 8)}</span>
                <span className="text-right text-gray-900 dark:text-gray-100">{entry.dealsWon}</span>
                <span className="text-right text-gray-900 dark:text-gray-100">
                  ${Number(entry.revenue).toLocaleString()}
                </span>
                <span className="text-right">
                  <Badge variant="outline">{entry.score}</Badge>
                </span>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Active Targets */}
      {targets.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Targets</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {targets.map((target) => {
              const pct = target.targetValue > 0
                ? Math.min(100, Math.round((target.actualValue / target.targetValue) * 100))
                : 0;
              return (
                <GlassCard key={target.id} tier="medium" padding="md">
                  <div className="flex items-center gap-4">
                    <ProgressRing value={pct} size={48} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {target.metric.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {target.actualValue} / {target.targetValue}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
