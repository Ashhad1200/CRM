import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client.js';

interface Single<T> { data: T }

type LeaderboardEntry = {
  userId: string; rank: number; dealsWon: number;
  revenue: number; score: number; activities: number;
};

type SalesTarget = {
  id: string; userId: string; metric: string; period: string;
  targetValue: number; actualValue: number; startDate: string; endDate: string;
};

type UserBadgeEntry = {
  id: string; earnedAt: string;
  badge: { name: string; icon: string; description: string };
};

type ScoreDistribution = { hot: number; warm: number; cool: number; cold: number };

const gamificationKeys = {
  leaderboard: (period: string) => ['gamification', 'leaderboard', period] as const,
  targets: (userId?: string) => ['gamification', 'targets', userId] as const,
  badges: (userId: string) => ['gamification', 'badges', userId] as const,
  scoreDistribution: ['gamification', 'score-distribution'] as const,
};

export function useLeaderboard(period = 'MONTHLY') {
  return useQuery({
    queryKey: gamificationKeys.leaderboard(period),
    queryFn: () =>
      apiClient<Single<LeaderboardEntry[]>>(
        `/api/v1/sales/gamification/leaderboard?period=${period}`,
      ).then((r) => r.data),
  });
}

export function useSalesTargets(userId?: string) {
  return useQuery({
    queryKey: gamificationKeys.targets(userId),
    queryFn: () => {
      const url = userId
        ? `/api/v1/sales/gamification/targets?userId=${userId}`
        : '/api/v1/sales/gamification/targets';
      return apiClient<Single<SalesTarget[]>>(url).then((r) => r.data);
    },
  });
}

export function useUserBadges(userId: string) {
  return useQuery({
    queryKey: gamificationKeys.badges(userId),
    queryFn: () =>
      apiClient<Single<UserBadgeEntry[]>>(
        `/api/v1/sales/gamification/badges/${userId}`,
      ).then((r) => r.data),
  });
}

export function useLeadScoreDistribution() {
  return useQuery({
    queryKey: gamificationKeys.scoreDistribution,
    queryFn: () =>
      apiClient<Single<ScoreDistribution>>(
        '/api/v1/sales/lead-scoring/distribution',
      ).then((r) => r.data),
  });
}

export function useRescoreLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<Single<{ updated: number }>>('/api/v1/sales/lead-scoring/rescore', {
        method: 'POST',
      }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gamification'] }); },
  });
}
