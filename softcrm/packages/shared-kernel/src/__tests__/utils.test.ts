import { describe, it, expect } from 'vitest';
import {
  generateId,
  slugify,
  parseDateRange,
  assertNever,
  paginateQuery,
  buildPaginatedResult,
} from '../utils/index.js';

describe('Utils', () => {
  describe('generateId()', () => {
    it('returns a valid UUID-like string', () => {
      const id = generateId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('produces unique values', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });

    it('generates time-ordered IDs', async () => {
      const id1 = generateId();
      // Ensure at least 1 ms passes so timestamp segment differs
      await new Promise((r) => setTimeout(r, 2));
      const id2 = generateId();
      // UUID v7 first segment encodes time — lexicographic order = chronological
      expect(id1 < id2).toBe(true);
    });
  });

  describe('slugify()', () => {
    it('converts text to a URL-safe slug', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
    });

    it('handles multiple spaces and special characters', () => {
      expect(slugify('  My   Great  Title!! ')).toBe('my-great-title');
    });

    it('handles already-slugified text', () => {
      expect(slugify('hello-world')).toBe('hello-world');
    });
  });

  describe('parseDateRange()', () => {
    it('parses valid ISO date strings', () => {
      const range = parseDateRange('2026-01-01', '2026-12-31');
      expect(range.start.getFullYear()).toBe(2026);
      expect(range.end.getMonth()).toBe(11); // 0-indexed
    });

    it('throws on invalid start date', () => {
      expect(() => parseDateRange('not-a-date', '2026-12-31')).toThrow('Invalid start date');
    });

    it('throws on invalid end date', () => {
      expect(() => parseDateRange('2026-01-01', 'not-a-date')).toThrow('Invalid end date');
    });

    it('throws when start is after end', () => {
      expect(() => parseDateRange('2026-12-31', '2026-01-01')).toThrow(
        'Start date must be before',
      );
    });
  });

  describe('assertNever()', () => {
    it('throws for unexpected values', () => {
      expect(() => assertNever('unexpected' as never)).toThrow('Unexpected value');
    });
  });

  describe('paginateQuery()', () => {
    it('computes correct skip and take', () => {
      expect(paginateQuery({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
      expect(paginateQuery({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
    });

    it('clamps page to 1 minimum', () => {
      expect(paginateQuery({ page: 0, pageSize: 10 })).toEqual({ skip: 0, take: 10 });
      expect(paginateQuery({ page: -5, pageSize: 10 })).toEqual({ skip: 0, take: 10 });
    });

    it('clamps pageSize to 1–100 range', () => {
      expect(paginateQuery({ page: 1, pageSize: 0 })).toEqual({ skip: 0, take: 1 });
      expect(paginateQuery({ page: 1, pageSize: 500 })).toEqual({ skip: 0, take: 100 });
    });
  });

  describe('buildPaginatedResult()', () => {
    it('builds correct envelope', () => {
      const result = buildPaginatedResult(['a', 'b', 'c'], 25, { page: 2, pageSize: 10 });
      expect(result).toEqual({
        data: ['a', 'b', 'c'],
        total: 25,
        page: 2,
        pageSize: 10,
        totalPages: 3,
      });
    });
  });
});
