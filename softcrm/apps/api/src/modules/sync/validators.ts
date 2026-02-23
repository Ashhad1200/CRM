/**
 * Sync validators — Zod schemas for pull/push endpoints.
 */
import { z } from 'zod';

export const pullQuerySchema = z.object({
  since: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().min(0)),
});

const syncChangeSchema = z.object({
  id: z.string(),
}).passthrough();

const tableChangesSchema = z.object({
  created: z.array(syncChangeSchema).default([]),
  updated: z.array(syncChangeSchema).default([]),
  deleted: z.array(z.string()).default([]),
});

export const pushBodySchema = z.object({
  changes: z.object({
    contacts: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
    accounts: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
    deals: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
    tasks: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
    activities: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
    expenses: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
    checkins: tableChangesSchema.default({ created: [], updated: [], deleted: [] }),
  }),
  lastPulledAt: z.number().int().min(0),
});

export type PullQuery = z.infer<typeof pullQuerySchema>;
export type PushBody = z.infer<typeof pushBodySchema>;
