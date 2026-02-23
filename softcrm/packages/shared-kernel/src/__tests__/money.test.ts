import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  money,
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatMoney,
  isZeroMoney,
} from '../types/index.js';

describe('Money', () => {
  describe('money()', () => {
    it('creates a Money value from number', () => {
      const m = money(100.5, 'USD');
      expect(m.amount.equals(new Decimal('100.5'))).toBe(true);
      expect(m.currency).toBe('USD');
    });

    it('creates a Money value from string', () => {
      const m = money('99.99', 'EUR');
      expect(m.amount.equals(new Decimal('99.99'))).toBe(true);
      expect(m.currency).toBe('EUR');
    });

    it('normalizes currency to uppercase', () => {
      const m = money(50, 'usd');
      expect(m.currency).toBe('USD');
    });

    it('throws on non-finite amount', () => {
      expect(() => money(Infinity, 'USD')).toThrow('Money amount must be finite');
      expect(() => money(NaN, 'USD')).toThrow('Money amount must be finite');
    });

    it('throws on invalid currency code', () => {
      expect(() => money(100, 'US')).toThrow('3-letter ISO 4217 code');
      expect(() => money(100, 'ABCD')).toThrow('3-letter ISO 4217 code');
    });
  });

  describe('arithmetic', () => {
    const usd100 = money(100, 'USD');
    const usd50 = money(50, 'USD');

    it('adds two Money values', () => {
      const result = addMoney(usd100, usd50);
      expect(result.amount.equals(new Decimal(150))).toBe(true);
      expect(result.currency).toBe('USD');
    });

    it('subtracts two Money values', () => {
      const result = subtractMoney(usd100, usd50);
      expect(result.amount.equals(new Decimal(50))).toBe(true);
    });

    it('multiplies Money by a scalar', () => {
      const result = multiplyMoney(usd100, 3);
      expect(result.amount.equals(new Decimal(300))).toBe(true);
    });

    it('throws on currency mismatch (add)', () => {
      const eur50 = money(50, 'EUR');
      expect(() => addMoney(usd100, eur50)).toThrow('Currency mismatch');
    });

    it('throws on currency mismatch (subtract)', () => {
      const eur50 = money(50, 'EUR');
      expect(() => subtractMoney(usd100, eur50)).toThrow('Currency mismatch');
    });
  });

  describe('formatMoney()', () => {
    it('formats USD', () => {
      const m = money(1234.56, 'USD');
      const formatted = formatMoney(m, 'en-US');
      expect(formatted).toContain('1,234.56');
    });
  });

  describe('isZeroMoney()', () => {
    it('returns true for zero', () => {
      expect(isZeroMoney(money(0, 'USD'))).toBe(true);
    });

    it('returns false for non-zero', () => {
      expect(isZeroMoney(money(1, 'USD'))).toBe(false);
    });
  });
});
