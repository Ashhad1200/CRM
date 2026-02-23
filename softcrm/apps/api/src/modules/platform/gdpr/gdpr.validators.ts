import { z } from 'zod';

/** Params schema for GDPR erasure endpoint: DELETE /platform/users/:id/gdpr-erase */
export const gdprEraseParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

/** Optional body — allows a reason for the erasure */
export const gdprEraseBodySchema = z
  .object({
    reason: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe('Reason for GDPR erasure request'),
    confirmedBy: z
      .string()
      .email()
      .optional()
      .describe('Email of the person who authorized erasure'),
  })
  .optional();

export type GdprEraseParams = z.infer<typeof gdprEraseParamsSchema>;
export type GdprEraseBody = z.infer<typeof gdprEraseBodySchema>;
