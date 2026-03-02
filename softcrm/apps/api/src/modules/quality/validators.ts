/**
 * Quality Control module — Zod validation schemas.
 *
 * Each schema corresponds to a request body, query, or param shape.
 * Schemas are used by the `validate` middleware in routes.
 */

import { z } from 'zod';

// ── Enum schemas (mirror Prisma enums) ─────────────────────────────────────────

export const inspectionTypeSchema = z.enum([
  'INCOMING',
  'IN_PROCESS',
  'FINAL',
  'SUPPLIER',
]);

export const checklistItemTypeSchema = z.enum(['PASS_FAIL', 'NUMERIC', 'TEXT']);

export const inspectionStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
  'WAIVED',
]);

export const ncrSeveritySchema = z.enum(['MINOR', 'MAJOR', 'CRITICAL']);

export const ncrStatusSchema = z.enum([
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
]);

export const correctiveActionTypeSchema = z.enum(['CORRECTIVE', 'PREVENTIVE']);

export const correctiveActionStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
  'OVERDUE',
]);

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const supplierIdParamSchema = z.object({
  supplierId: z.string().uuid(),
});

// ── Checklist item sub-schema ──────────────────────────────────────────────────

export const checklistItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1).max(1000),
  type: checklistItemTypeSchema,
  required: z.boolean(),
  acceptableRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
});

// ── Inspection Template schemas ────────────────────────────────────────────────

export const createInspectionTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: inspectionTypeSchema,
  description: z.string().max(2000).optional(),
  checklistItems: z.array(checklistItemSchema).min(1),
  isActive: z.boolean().optional().default(true),
});

export type CreateInspectionTemplateInput = z.infer<
  typeof createInspectionTemplateSchema
>;

export const updateInspectionTemplateSchema =
  createInspectionTemplateSchema.partial();

export type UpdateInspectionTemplateInput = z.infer<
  typeof updateInspectionTemplateSchema
>;

export const listInspectionTemplatesQuerySchema = paginationSchema.extend({
  type: inspectionTypeSchema.optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

// ── Inspection schemas ─────────────────────────────────────────────────────────

export const createInspectionSchema = z.object({
  templateId: z.string().uuid(),
  type: inspectionTypeSchema,
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().max(100).optional(),
  productId: z.string().uuid().optional(),
  lotNumber: z.string().max(100).optional(),
  batchSize: z.number().int().positive().optional(),
  sampledUnits: z.number().int().positive().optional(),
  inspectorId: z.string().uuid(),
  scheduledDate: z.coerce.date(),
  notes: z.string().max(5000).optional(),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;

export const listInspectionsQuerySchema = paginationSchema.extend({
  status: inspectionStatusSchema.optional(),
  type: inspectionTypeSchema.optional(),
  productId: z.string().uuid().optional(),
  inspectorId: z.string().uuid().optional(),
});

// ── Inspection result sub-schema ───────────────────────────────────────────────

export const recordResultItemSchema = z
  .object({
    checklistItemId: z.string().min(1),
    question: z.string().min(1).max(1000),
    resultType: checklistItemTypeSchema,
    passFail: z.boolean().optional(),
    numericValue: z.number().optional(),
    textValue: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (val) => {
      if (val.resultType === 'PASS_FAIL') return val.passFail !== undefined;
      if (val.resultType === 'NUMERIC') return val.numericValue !== undefined;
      if (val.resultType === 'TEXT') return val.textValue !== undefined;
      return true;
    },
    { message: 'Result value must match the resultType' },
  );

export const recordResultsSchema = z.object({
  results: z.array(recordResultItemSchema).min(1),
  conductedDate: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
});

export type RecordResultsInput = z.infer<typeof recordResultsSchema>;

// ── NCR schemas ────────────────────────────────────────────────────────────────

export const createNcrSchema = z.object({
  inspectionId: z.string().uuid().optional(),
  title: z.string().min(3).max(500),
  description: z.string().min(1).max(5000),
  severity: ncrSeveritySchema,
  productId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  rootCause: z.string().max(5000).optional(),
  immediateAction: z.string().max(5000).optional(),
  detectedAt: z.coerce.date().optional(),
});

export type CreateNcrInput = z.infer<typeof createNcrSchema>;

export const updateNcrSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  description: z.string().min(1).max(5000).optional(),
  severity: ncrSeveritySchema.optional(),
  status: ncrStatusSchema.optional(),
  rootCause: z.string().max(5000).optional(),
  immediateAction: z.string().max(5000).optional(),
});

export type UpdateNcrInput = z.infer<typeof updateNcrSchema>;

export const resolveNcrSchema = z.object({
  rootCause: z.string().min(1).max(5000),
  immediateAction: z.string().min(1).max(5000),
});

export type ResolveNcrInput = z.infer<typeof resolveNcrSchema>;

export const listNcrsQuerySchema = paginationSchema.extend({
  status: ncrStatusSchema.optional(),
  severity: ncrSeveritySchema.optional(),
  supplierId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

// ── Corrective Action schemas ──────────────────────────────────────────────────

export const createCorrectiveActionSchema = z.object({
  actionType: correctiveActionTypeSchema,
  description: z.string().min(1).max(5000),
  assignedTo: z.string().uuid(),
  dueDate: z.coerce.date(),
});

export type CreateCorrectiveActionInput = z.infer<
  typeof createCorrectiveActionSchema
>;

export const updateCorrectiveActionSchema =
  createCorrectiveActionSchema.partial().extend({
    status: correctiveActionStatusSchema.optional(),
  });

export type UpdateCorrectiveActionInput = z.infer<
  typeof updateCorrectiveActionSchema
>;

export const completeCorrectiveActionSchema = z.object({
  completedDate: z.coerce.date().optional(),
});

export type CompleteCorrectiveActionInput = z.infer<
  typeof completeCorrectiveActionSchema
>;

export const listCorrectiveActionsQuerySchema = paginationSchema.extend({
  status: correctiveActionStatusSchema.optional(),
  assignedTo: z.string().uuid().optional(),
});

// ── Supplier quality ───────────────────────────────────────────────────────────

export const calculateQualityScoreSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Period must be in format YYYY-MM (e.g. 2026-02)'),
});

export type CalculateQualityScoreInput = z.infer<
  typeof calculateQualityScoreSchema
>;
