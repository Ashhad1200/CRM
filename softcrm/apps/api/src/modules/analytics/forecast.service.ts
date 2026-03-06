/**
 * E098 — AI Forecasting Service.
 *
 * Simple linear regression for revenue forecasting.
 */

export function linearRegression(data: number[]): {
  slope: number;
  intercept: number;
  forecast: number[];
} {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] ?? 0, forecast: [] };

  const sumX = data.reduce((s, _, i) => s + i, 0);
  const sumY = data.reduce((s, v) => s + v, 0);
  const sumXY = data.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = data.reduce((s, _, i) => s + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const forecast = Array.from(
    { length: 3 },
    (_, i) => Math.round((slope * (n + i) + intercept) * 100) / 100,
  );

  return { slope, intercept, forecast };
}

export async function getRevenueForecast(tenantId: string) {
  const { getPrismaClient } = await import('@softcrm/db');
  const db = getPrismaClient();

  const now = new Date();
  const months: number[] = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const invoices = await db.invoice.findMany({
      where: {
        tenantId,
        status: 'PAID',
        paidAt: { gte: start, lte: end },
      },
      select: { total: true },
    });
    months.push(invoices.reduce((s, inv) => s + Number(inv.total), 0));
  }

  const result = linearRegression(months);
  return { historical: months, ...result };
}
