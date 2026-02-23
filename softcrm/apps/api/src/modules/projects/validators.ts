/**
 * Projects module — Zod validation schemas.
 */

import { z } from 'zod';

// ── Shared ─────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

// ── Enum schemas ───────────────────────────────────────────────────────────────

export const projectStatusSchema = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

export const taskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
]);

export const taskPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

// ── Template schemas ───────────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  tasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: taskPrioritySchema,
    order: z.number().int().min(0),
  })),
  milestones: z.array(z.object({
    name: z.string().min(1),
    taskIndices: z.array(z.number().int().min(0)),
    offsetDays: z.number().int().min(0),
  })),
  defaultAssignees: z.array(z.record(z.unknown())).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ── Project schemas ────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  dealId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: projectStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ── Task schemas ───────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  dueDate: z.string().optional(),
  order: z.number().int().min(0).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ── Time entry schemas ─────────────────────────────────────────────────────────

export const logTimeSchema = z.object({
  hours: z.number().min(0.01).max(24),
  isBillable: z.boolean().optional().default(true),
  description: z.string().max(500).optional(),
  date: z.string(),
});

export type LogTimeInput = z.infer<typeof logTimeSchema>;

// ── Move task schema ───────────────────────────────────────────────────────────

export const moveTaskSchema = z.object({
  status: taskStatusSchema,
});

export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

// ── List queries ───────────────────────────────────────────────────────────────

export const listProjectsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: projectStatusSchema.optional(),
  dealId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  assigneeId: z.string().uuid().optional(),
  priority: taskPrioritySchema.optional(),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
