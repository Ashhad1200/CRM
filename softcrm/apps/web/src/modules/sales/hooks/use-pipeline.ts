import { useMemo } from 'react';
import type { Deal, Pipeline } from '../api';

/**
 * Groups deals by stageId for kanban rendering.
 */
export function useDealsByStage(deals: Deal[] | undefined, pipeline: Pipeline | undefined) {
  return useMemo(() => {
    if (!deals || !pipeline) return new Map<string, Deal[]>();

    const grouped = new Map<string, Deal[]>();
    for (const stage of pipeline.stages) {
      grouped.set(stage.id, []);
    }
    for (const deal of deals) {
      const arr = grouped.get(deal.stageId);
      if (arr) {
        arr.push(deal);
      }
    }
    return grouped;
  }, [deals, pipeline]);
}

/**
 * Returns a lead score color class based on the score value.
 */
export function useLeadScoreColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700' };
  if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
  return { bg: 'bg-gray-100', text: 'text-gray-600' };
}

/**
 * Formats a Decimal string as currency display.
 */
export function formatCurrency(value: string | number, currency = 'USD'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
