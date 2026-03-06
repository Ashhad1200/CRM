/**
 * E099 — Natural Language Query Interface (Stub).
 *
 * Simple keyword-to-query mapper for analytics queries.
 */

const QUERY_PATTERNS: Record<string, { module: string; metric: string }> = {
  revenue: { module: 'sales', metric: 'total-revenue' },
  deals: { module: 'sales', metric: 'open-deals' },
  tickets: { module: 'support', metric: 'active-tickets' },
  employees: { module: 'hr', metric: 'employee-count' },
  inventory: { module: 'inventory', metric: 'inventory-value' },
};

export function parseNaturalQuery(
  query: string,
): { module: string; metric: string } | null {
  const lower = query.toLowerCase();
  for (const [keyword, result] of Object.entries(QUERY_PATTERNS)) {
    if (lower.includes(keyword)) return result;
  }
  return null;
}
