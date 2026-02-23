/**
 * Workflow Builder module — Zod validation schemas.
 */

import { z } from 'zod';

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Trigger ────────────────────────────────────────────────────────────────────

export const triggerSchema = z.object({
  type: z.enum(['event', 'cron']),
  event: z.string().optional(),
  cron: z.string().optional(),
});

// ── Condition ──────────────────────────────────────────────────────────────────

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    'equals',
    'not_equals',
    'gt',
    'lt',
    'gte',
    'lte',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'is_empty',
    'is_not_empty',
  ]),
  value: z.unknown(),
  logic: z.enum(['AND', 'OR']).optional(),
});

// ── Action ─────────────────────────────────────────────────────────────────────

export const actionSchema = z.object({
  type: z.enum([
    'field_update',
    'record_create',
    'email_send',
    'webhook_call',
    'notification',
  ]),
  config: z.record(z.unknown()),
});

// ── Workflow CRUD ──────────────────────────────────────────────────────────────

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema,
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1),
  loopLimit: z.number().int().min(1).max(100).optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1).optional(),
  loopLimit: z.number().int().min(1).max(100).optional(),
});

export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

// ── Query ──────────────────────────────────────────────────────────────────────

export const listWorkflowsQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
