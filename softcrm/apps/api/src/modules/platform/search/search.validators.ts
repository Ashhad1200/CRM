import { z } from 'zod';

export const SEARCHABLE_MODULES = [
  'contacts',
  'deals',
  'invoices',
  'tickets',
  'products',
  'employees',
  'projects',
] as const;

export type SearchableModule = (typeof SEARCHABLE_MODULES)[number];

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  modules: z
    .union([
      z.array(z.enum(SEARCHABLE_MODULES)),
      z
        .string()
        .transform((s) => s.split(',').map((m) => m.trim()) as SearchableModule[])
        .pipe(z.array(z.enum(SEARCHABLE_MODULES))),
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
