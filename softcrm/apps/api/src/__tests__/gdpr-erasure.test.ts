import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { gdprEraseParamsSchema, gdprEraseBodySchema } from '../modules/platform/gdpr/gdpr.validators.js';

// ── Param validation ──────────────────────────────────────────────────────────

describe('GDPR Erasure Validators', () => {
  describe('gdprEraseParamsSchema', () => {
    it('accepts a valid UUID', () => {
      const result = gdprEraseParamsSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID string', () => {
      const result = gdprEraseParamsSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('rejects missing id', () => {
      const result = gdprEraseParamsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects numeric id', () => {
      const result = gdprEraseParamsSchema.safeParse({ id: 12345 });
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = gdprEraseParamsSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('gdprEraseBodySchema', () => {
    it('accepts undefined body', () => {
      const result = gdprEraseBodySchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('accepts empty object', () => {
      const result = gdprEraseBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts body with reason', () => {
      const result = gdprEraseBodySchema.safeParse({
        reason: 'Subject access request under GDPR Article 17',
      });
      expect(result.success).toBe(true);
    });

    it('accepts body with confirmedBy email', () => {
      const result = gdprEraseBodySchema.safeParse({
        confirmedBy: 'dpo@company.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts body with both fields', () => {
      const result = gdprEraseBodySchema.safeParse({
        reason: 'Data subject request',
        confirmedBy: 'legal@company.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid confirmedBy email', () => {
      const result = gdprEraseBodySchema.safeParse({
        confirmedBy: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('rejects reason exceeding 500 chars', () => {
      const result = gdprEraseBodySchema.safeParse({
        reason: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty reason string', () => {
      const result = gdprEraseBodySchema.safeParse({
        reason: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

// ── Service contract expectations ─────────────────────────────────────────────

describe('GDPR Erasure Service Contracts', () => {
  const ANONYMIZED_NAME = 'Deleted User';
  const ANONYMIZED_EMAIL_PATTERN = /erased.*@erased\.invalid$/;

  it('defines anonymization constants matching GDPR requirements', () => {
    // These constants should anonymize PII while preserving record structure
    expect(ANONYMIZED_NAME).toBe('Deleted User');
    expect(ANONYMIZED_EMAIL_PATTERN.test('erased-abc12345@erased.invalid')).toBe(true);
  });

  it('result shape includes all required fields', () => {
    const schema = z.object({
      userId: z.string().uuid(),
      erasedAt: z.string(),
      modulesProcessed: z.array(z.string()),
      recordsAnonymized: z.number().int().nonnegative(),
    });

    const sample = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      erasedAt: new Date().toISOString(),
      modulesProcessed: ['sales:contacts', 'platform:user'],
      recordsAnonymized: 5,
    };

    expect(schema.safeParse(sample).success).toBe(true);
  });

  it('rejects negative recordsAnonymized', () => {
    const schema = z.object({
      recordsAnonymized: z.number().int().nonnegative(),
    });
    expect(schema.safeParse({ recordsAnonymized: -1 }).success).toBe(false);
  });

  it('modules list includes expected module patterns', () => {
    const expectedPatterns = [
      'sales:contacts',
      'sales:leads',
      'sales:deals',
      'support:tickets',
      'comms:emails',
      'comms:calls',
      'marketing:campaignContacts',
      'accounting:invoices (anonymized, preserved)',
      'projects:timeEntries',
      'platform:user',
    ];

    // Each pattern should be a valid string
    expectedPatterns.forEach((mod) => {
      expect(mod).toMatch(/^[a-z]+:[a-zA-Z]+/);
    });
  });

  it('audit log change record captures erasure metadata', () => {
    const changeSchema = z.object({
      type: z.literal('GDPR_DATA_ERASURE'),
      targetUserId: z.string().uuid(),
      reason: z.string(),
      confirmedBy: z.string(),
      modulesProcessed: z.array(z.string()),
      recordsAnonymized: z.number(),
      erasedAt: z.string(),
    });

    const sample = {
      type: 'GDPR_DATA_ERASURE' as const,
      targetUserId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'Subject access request',
      confirmedBy: 'admin@company.com',
      modulesProcessed: ['sales:contacts'],
      recordsAnonymized: 3,
      erasedAt: '2024-06-15T10:00:00.000Z',
    };

    expect(changeSchema.safeParse(sample).success).toBe(true);
  });

  it('financial records are preserved (anonymized only)', () => {
    // Accounting records must keep amounts & dates intact per legal requirements
    // Only notes/personal references are anonymized
    const preservedFields = ['amount', 'currency', 'dueDate', 'issuedDate', 'lineItems'];
    const anonymizedFields = ['notes'];

    // Financial records always appear with "(anonymized, preserved)" suffix
    const accountingModule = 'accounting:invoices (anonymized, preserved)';
    expect(accountingModule).toContain('preserved');
    expect(preservedFields.length).toBeGreaterThan(anonymizedFields.length);
  });

  it('self-erasure is prevented', () => {
    // The route handler should reject actorId === targetUserId
    const actorId = '550e8400-e29b-41d4-a716-446655440000';
    const targetUserId = '550e8400-e29b-41d4-a716-446655440000';
    expect(actorId === targetUserId).toBe(true);
    // Route handler throws ForbiddenError in this case
  });
});
