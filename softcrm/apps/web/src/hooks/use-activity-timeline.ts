/**
 * E101 — Unified Activity Timeline hook.
 *
 * Fetches a cross-module activity timeline for any entity.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';

export interface TimelineEntry {
  id: string;
  type: string;
  summary: string;
  actorName?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function useActivityTimeline(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['activity-timeline', entityType, entityId],
    queryFn: () =>
      apiClient<{ data: TimelineEntry[] }>(
        `/api/v1/comms/timeline?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      ).then((r) => r.data),
    enabled: !!entityId,
  });
}
