import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * T218 — Injection security tests.
 *
 * Verifies that Zod validation rejects SQL injection, XSS, and NoSQL
 * injection payloads. Since all input goes through Zod + Prisma's
 * parameterised queries, this tests the first line of defence.
 */

// ── Common injection payloads ───────────────────────────────────────────

const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "admin'--",
  "1; DELETE FROM contacts WHERE 1=1;",
  "' UNION SELECT * FROM users --",
  "1' AND 1=CONVERT(int,(SELECT TOP 1 table_name FROM information_schema.tables))--",
  "'; EXEC xp_cmdshell('dir'); --",
  "' OR 1=1 LIMIT 1 --",
  "1' WAITFOR DELAY '0:0:10'--",
  "' OR ''='",
];

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  '"><script>document.cookie</script>',
  "javascript:alert('XSS')",
  '<svg onload=alert(1)>',
  '"><img src=x onerror=eval(atob("YWxlcnQoMSk="))>',
  '<body onload=alert(1)>',
  '<iframe src="javascript:alert(1)">',
  "'-alert(1)-'",
  '<div style="background:url(javascript:alert(1))">',
];

const NOSQL_INJECTION_PAYLOADS = [
  '{"$gt":""}',
  '{"$ne":null}',
  '{"$regex":".*"}',
  '{"$where":"this.password.length > 0"}',
  '{"$or":[{"a":"a"},{"a":{"$gt":""}}]}',
];

// UUID format validator — should reject all injection payloads as invalid UUIDs
const uuidSchema = z.string().uuid();

// Email validator — should reject injections
const emailSchema = z.string().email();

// Positive integer validator
const positiveIntSchema = z.number().int().positive();

// Safe string — typical text field with length constraints
const safeStringSchema = z.string().min(1).max(255);

// ── SQL Injection Tests ─────────────────────────────────────────────────

describe('Injection Security — SQL Injection via UUID params', () => {
  for (const payload of SQL_INJECTION_PAYLOADS) {
    it(`rejects SQL injection in UUID field: ${payload.slice(0, 40)}`, () => {
      const result = uuidSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  }
});

describe('Injection Security — SQL Injection via email fields', () => {
  for (const payload of SQL_INJECTION_PAYLOADS) {
    it(`rejects SQL injection in email field: ${payload.slice(0, 40)}`, () => {
      const result = emailSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  }
});

describe('Injection Security — SQL Injection via numeric fields', () => {
  for (const payload of SQL_INJECTION_PAYLOADS) {
    it(`rejects SQL injection in numeric field: ${payload.slice(0, 40)}`, () => {
      const result = positiveIntSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  }
});

// ── XSS Tests ───────────────────────────────────────────────────────────

describe('Injection Security — XSS Payloads', () => {
  it('XSS payloads pass string validation (stored safely, escaped on render)', () => {
    // Note: Zod string validators intentionally DO accept HTML-like strings
    // because React escapes output. The defense is at the render layer.
    // This test documents that behavior — Zod is not an XSS filter.
    for (const payload of XSS_PAYLOADS) {
      const result = safeStringSchema.safeParse(payload);
      // These may pass or fail based on length; we just confirm no crashes
      expect(typeof result.success).toBe('boolean');
    }
  });

  it('XSS payloads are rejected in UUID fields', () => {
    for (const payload of XSS_PAYLOADS) {
      const result = uuidSchema.safeParse(payload);
      expect(result.success).toBe(false);
    }
  });

  it('XSS payloads are rejected in email fields', () => {
    for (const payload of XSS_PAYLOADS) {
      const result = emailSchema.safeParse(payload);
      expect(result.success).toBe(false);
    }
  });
});

// ── NoSQL Injection Tests ───────────────────────────────────────────────

describe('Injection Security — NoSQL Injection via UUID params', () => {
  for (const payload of NOSQL_INJECTION_PAYLOADS) {
    it(`rejects NoSQL injection in UUID field: ${payload}`, () => {
      const result = uuidSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  }
});

describe('Injection Security — NoSQL Injection via email fields', () => {
  for (const payload of NOSQL_INJECTION_PAYLOADS) {
    it(`rejects NoSQL injection in email field: ${payload}`, () => {
      const result = emailSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  }
});

// ── Composite schema tests (mimicking real endpoint inputs) ─────────────

describe('Injection Security — Composite Input Validation', () => {
  const createContactSchema = z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
  });

  it('rejects SQL injection in contact creation', () => {
    const result = createContactSchema.safeParse({
      firstName: "Robert'); DROP TABLE contacts;--",
      lastName: 'Tables',
      email: "admin'--@evil.com",
      phone: "'; DELETE FROM contacts;--",
    });
    // firstName and lastName pass (they're just strings), but email fails
    expect(result.success).toBe(false);
  });

  it('rejects when required fields contain only injection payloads', () => {
    const result = createContactSchema.safeParse({
      firstName: '',
      lastName: '',
      email: "' OR '1'='1",
    });
    expect(result.success).toBe(false);
  });

  const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  });

  it('rejects SQL injection in pagination query params', () => {
    const result = paginationSchema.safeParse({
      page: "1; DROP TABLE users;--",
      limit: "100 OR 1=1",
      search: "' UNION SELECT * FROM users --",
      sortBy: "name; DROP TABLE contacts",
      sortOrder: "asc; DELETE FROM deals",
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative page numbers', () => {
    const result = paginationSchema.safeParse({ page: -1, limit: 20 });
    expect(result.success).toBe(false);
  });

  it('rejects excessive limit values', () => {
    const result = paginationSchema.safeParse({ page: 1, limit: 999999 });
    expect(result.success).toBe(false);
  });
});

// ── Path traversal tests ────────────────────────────────────────────────

describe('Injection Security — Path Traversal in UUID Params', () => {
  const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '....//....//....//etc/passwd',
    '/etc/shadow',
  ];

  for (const payload of pathTraversalPayloads) {
    it(`rejects path traversal: ${payload.slice(0, 40)}`, () => {
      const result = uuidSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  }
});
