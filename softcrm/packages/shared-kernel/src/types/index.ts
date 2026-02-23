import Decimal from 'decimal.js';

// ── Branded Types ──────────────────────────────────────────────────────────────

/** Nominal/branded type utility for strong typing of string identifiers. */
type Brand<T, B extends string> = T & { readonly __brand: B };

/** UUID v7 user identifier */
export type UserId = Brand<string, 'UserId'>;

/** UUID v7 tenant identifier */
export type TenantId = Brand<string, 'TenantId'>;

/** UUID v7 generic entity identifier */
export type EntityId = Brand<string, 'EntityId'>;

// ── Money ──────────────────────────────────────────────────────────────────────

/**
 * Monetary value with currency — uses Decimal.js for arbitrary precision.
 * Invariant: amount is finite, currency is uppercase ISO 4217.
 */
export interface Money {
  readonly amount: Decimal;
  readonly currency: string;
}

/** Create a Money value (validated). */
export function money(amount: number | string | Decimal, currency: string): Money {
  const d = new Decimal(amount);
  if (!d.isFinite()) {
    throw new Error(`Money amount must be finite, got: ${String(amount)}`);
  }
  const cur = currency.toUpperCase().trim();
  if (cur.length !== 3) {
    throw new Error(`Currency must be a 3-letter ISO 4217 code, got: "${currency}"`);
  }
  return { amount: d, currency: cur };
}

/** Add two Money values (must share currency). */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount.plus(b.amount), currency: a.currency };
}

/** Subtract b from a (must share currency). */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount.minus(b.amount), currency: a.currency };
}

/** Multiply Money by a scalar. */
export function multiplyMoney(m: Money, factor: number | string | Decimal): Money {
  return { amount: m.amount.times(new Decimal(factor)), currency: m.currency };
}

/** Check if two Money values have the same currency. */
function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: cannot operate on ${a.currency} and ${b.currency}`);
  }
}

/** Format money for display (locale-aware). */
export function formatMoney(m: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(m.amount.toNumber());
}

/** Check if money is zero. */
export function isZeroMoney(m: Money): boolean {
  return m.amount.isZero();
}

// ── Address ────────────────────────────────────────────────────────────────────

export interface Address {
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string; // ISO 3166-1 alpha-2
}

// ── Phone Number ───────────────────────────────────────────────────────────────

export interface PhoneNumber {
  readonly countryCode: string; // e.g., "+1"
  readonly number: string; // digits only
  readonly label?: 'mobile' | 'work' | 'home' | 'fax';
}

// ── Email Address ──────────────────────────────────────────────────────────────

export type EmailAddress = Brand<string, 'EmailAddress'>;

/** Validate and create an EmailAddress. */
export function emailAddress(raw: string): EmailAddress {
  const trimmed = raw.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error(`Invalid email address: "${raw}"`);
  }
  return trimmed as EmailAddress;
}

// ── Date Range ─────────────────────────────────────────────────────────────────

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

/** Create a validated DateRange (start must be before or equal to end). */
export function dateRange(start: Date, end: Date): DateRange {
  if (start > end) {
    throw new Error(`Invalid date range: start (${start.toISOString()}) is after end (${end.toISOString()})`);
  }
  return { start, end };
}

// ── Pagination & Sorting ───────────────────────────────────────────────────────

export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortOrder {
  readonly field: string;
  readonly direction: SortDirection;
}

export interface PaginatedResult<T> {
  readonly data: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

/** Create a paginated result envelope. */
export function paginatedResult<T>(
  data: T[],
  total: number,
  pagination: Pagination,
): PaginatedResult<T> {
  return {
    data,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}

// ── CRUD Action ────────────────────────────────────────────────────────────────

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

// ── Ownership Scope ────────────────────────────────────────────────────────────

export type OwnershipScope = 'own' | 'team' | 'all';
