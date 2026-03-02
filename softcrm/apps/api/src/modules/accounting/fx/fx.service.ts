import { getPrismaClient, type Prisma } from '@softcrm/db';
import { generateId, NotFoundError } from '@softcrm/shared-kernel';

type Decimal = Prisma.Decimal;

/**
 * List exchange rates, optionally filtered by currency pair.
 */
export async function getExchangeRates(
  tenantId: string,
  companyId: string,
  fromCurrency?: string,
  toCurrency?: string,
) {
  const db = getPrismaClient();

  const where: Record<string, unknown> = { tenantId, companyId };

  if (fromCurrency) {
    where['fromCurrency'] = fromCurrency;
  }
  if (toCurrency) {
    where['toCurrency'] = toCurrency;
  }

  return db.exchangeRate.findMany({
    where,
    orderBy: { effectiveDate: 'desc' },
  });
}

/**
 * Create or update an exchange rate for a currency pair + date.
 */
export async function setExchangeRate(
  tenantId: string,
  companyId: string,
  data: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveDate: Date | string;
    source?: string;
  },
  actorId: string,
) {
  const db = getPrismaClient();

  const effectiveDate =
    typeof data.effectiveDate === 'string'
      ? new Date(data.effectiveDate)
      : data.effectiveDate;

  // Check for existing rate on this date + pair
  const existing = await db.exchangeRate.findFirst({
    where: {
      tenantId,
      companyId,
      fromCurrency: data.fromCurrency as never,
      toCurrency: data.toCurrency as never,
      effectiveDate,
    },
  });

  if (existing) {
    return db.exchangeRate.update({
      where: { id: existing.id },
      data: {
        rate: data.rate,
        ...(data.source ? { source: data.source } : {}),
      },
    });
  }

  return db.exchangeRate.create({
    data: {
      id: generateId(),
      tenantId,
      companyId,
      fromCurrency: data.fromCurrency as never,
      toCurrency: data.toCurrency as never,
      rate: data.rate,
      effectiveDate,
      source: data.source ?? 'manual',
    },
  });
}

/**
 * Get the most recent exchange rate for a currency pair.
 */
export async function getLatestRate(
  tenantId: string,
  companyId: string,
  fromCurrency: string,
  toCurrency: string,
) {
  const db = getPrismaClient();

  const rate = await db.exchangeRate.findFirst({
    where: {
      tenantId,
      companyId,
      fromCurrency: fromCurrency as never,
      toCurrency: toCurrency as never,
    },
    orderBy: { effectiveDate: 'desc' },
  });

  if (!rate) {
    throw new NotFoundError(
      'ExchangeRate',
      `${fromCurrency}→${toCurrency}`,
    );
  }

  return rate;
}

/**
 * Simple multiplication conversion.
 */
export function convertAmount(
  amount: number | Decimal,
  _fromCurrency: string,
  _toCurrency: string,
  rate: number | Decimal,
): number {
  return Number(amount) * Number(rate);
}
