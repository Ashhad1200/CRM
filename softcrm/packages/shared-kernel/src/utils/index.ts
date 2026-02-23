import type { Pagination, PaginatedResult, DateRange, Money } from '../types/index.js';

// ── UUID v7 Generation ─────────────────────────────────────────────────────────

/**
 * Generate a UUID v7 (time-ordered, random suffix).
 * Uses the native crypto.randomUUID spec as a fallback pattern,
 * but encodes millisecond timestamp in the first 48 bits per RFC 9562.
 */
export function generateId(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Encode 48-bit millisecond timestamp
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // Variant 10xx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  return formatUuid(bytes);
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ── Slugify ────────────────────────────────────────────────────────────────────

/** Convert a string to a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Date Range Parsing ─────────────────────────────────────────────────────────

/**
 * Parse a date range from string pair.
 * @throws if start > end or either date is invalid.
 */
export function parseDateRange(startStr: string, endStr: string): DateRange {
  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime())) {
    throw new Error(`Invalid start date: "${startStr}"`);
  }
  if (isNaN(end.getTime())) {
    throw new Error(`Invalid end date: "${endStr}"`);
  }
  if (start > end) {
    throw new Error(`Start date must be before or equal to end date`);
  }

  return { start, end };
}

// ── Exhaustiveness Check ───────────────────────────────────────────────────────

/**
 * Type-level exhaustiveness check for switch/if chains.
 * Usage: `default: assertNever(value)` — compile error if not all cases handled.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// ── Paginate Helper ────────────────────────────────────────────────────────────

/**
 * Compute `skip` and `take` from pagination parameters for Prisma.
 */
export function paginateQuery(pagination: Pagination): { skip: number; take: number } {
  const page = Math.max(1, pagination.page);
  const pageSize = Math.max(1, Math.min(100, pagination.pageSize));
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Build the paginated result envelope.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: Pagination,
): PaginatedResult<T> {
  const pageSize = Math.max(1, Math.min(100, pagination.pageSize));
  return {
    data,
    total,
    page: Math.max(1, pagination.page),
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ── Retry Helper ───────────────────────────────────────────────────────────────

export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  backoffFactor?: number;
}

/**
 * Retry an async function with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { attempts = 3, delayMs = 200, backoffFactor = 2 } = options;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await sleep(delayMs * backoffFactor ** i);
      }
    }
  }
  throw lastError;
}

/** Sleep for a given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Format Money (re-export from types for convenience) ────────────────────────

export { formatMoney } from '../types/index.js';
