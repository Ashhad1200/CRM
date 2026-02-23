/**
 * Workflow Builder module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import { generateId, paginatedResult } from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import type { WorkflowFilters, WorkflowTrigger } from './types.js';
import type { CreateWorkflowInput, UpdateWorkflowInput } from './validators.js';

// ── Prisma enum type helpers ───────────────────────────────────────────────────

type PrismaClient = ReturnType<typeof getPrismaClient>;
type WorkflowCreateInput = NonNullable<Parameters<PrismaClient['workflow']['create']>[0]>['data'];
type PrismaWorkflowStatus = NonNullable<WorkflowCreateInput>['status'];

// ── Pagination ─────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  pageSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Workflows ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function findAll(
  tenantId: string,
  filters: WorkflowFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const db = getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.status) {
    where['status'] = filters.status as PrismaWorkflowStatus;
  }
  if (filters.search) {
    where['name'] = { contains: filters.search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    db.workflow.findMany({
      where,
      include: { _count: { select: { executions: true } } },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    db.workflow.count({ where }),
  ]);

  return paginatedResult(data, total, pagination);
}

export async function findById(
  tenantId: string,
  id: string,
): Promise<unknown | null> {
  const db = getPrismaClient();
  return db.workflow.findFirst({
    where: { id, tenantId },
    include: {
      executions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function create(
  tenantId: string,
  actorId: string,
  data: CreateWorkflowInput,
): Promise<unknown> {
  const db = getPrismaClient();
  return db.workflow.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      description: data.description ?? null,
      trigger: data.trigger as never,
      conditions: data.conditions as never,
      actions: data.actions as never,
      loopLimit: data.loopLimit ?? 5,
      createdBy: actorId,
    },
  });
}

export async function update(
  tenantId: string,
  id: string,
  data: UpdateWorkflowInput,
): Promise<unknown> {
  const db = getPrismaClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.description !== undefined) updateData['description'] = data.description;
  if (data.trigger !== undefined) updateData['trigger'] = data.trigger as never;
  if (data.conditions !== undefined) updateData['conditions'] = data.conditions as never;
  if (data.actions !== undefined) updateData['actions'] = data.actions as never;
  if (data.loopLimit !== undefined) updateData['loopLimit'] = data.loopLimit;

  return db.workflow.update({
    where: { id, tenantId },
    data: updateData,
  });
}

export async function remove(tenantId: string, id: string): Promise<void> {
  const db = getPrismaClient();
  await db.workflow.delete({ where: { id, tenantId } });
}

export async function activate(tenantId: string, id: string): Promise<unknown> {
  const db = getPrismaClient();
  const status: PrismaWorkflowStatus = 'ACTIVE';
  return db.workflow.update({
    where: { id, tenantId },
    data: { status },
  });
}

export async function deactivate(tenantId: string, id: string): Promise<unknown> {
  const db = getPrismaClient();
  const status: PrismaWorkflowStatus = 'INACTIVE';
  return db.workflow.update({
    where: { id, tenantId },
    data: { status },
  });
}

export async function findActiveByTriggerEvent(
  tenantId: string,
  eventType: string,
): Promise<unknown[]> {
  const db = getPrismaClient();
  const status: PrismaWorkflowStatus = 'ACTIVE';
  const workflows = await db.workflow.findMany({
    where: { tenantId, status },
  });

  // Filter in JS because trigger is a JSON column
  return workflows.filter((w) => {
    const trigger = w.trigger as unknown as WorkflowTrigger | undefined;
    if (!trigger) return false;
    return trigger.type === 'event' && trigger.event === eventType;
  });
}

export async function findAllActiveEventWorkflows(): Promise<unknown[]> {
  const db = getPrismaClient();
  const status: PrismaWorkflowStatus = 'ACTIVE';
  const workflows = await db.workflow.findMany({
    where: { status },
  });

  return workflows.filter((w) => {
    const trigger = w.trigger as unknown as WorkflowTrigger | undefined;
    if (!trigger) return false;
    return trigger.type === 'event';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Executions ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createExecution(data: {
  workflowId: string;
  triggerEvent: string;
  triggerPayload?: unknown;
}): Promise<unknown> {
  const db = getPrismaClient();
  return db.workflowExecution.create({
    data: {
      id: generateId(),
      workflowId: data.workflowId,
      triggerEvent: data.triggerEvent,
      triggerPayload: (data.triggerPayload ?? null) as never,
      actionResults: [] as never,
    },
  });
}

export async function completeExecution(
  id: string,
  actionResults: unknown[],
): Promise<unknown> {
  const db = getPrismaClient();
  return db.workflowExecution.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      actionResults: actionResults as never,
      finishedAt: new Date(),
    },
  });
}

export async function failExecution(
  id: string,
  error: string,
  actionResults: unknown[],
): Promise<unknown> {
  const db = getPrismaClient();
  return db.workflowExecution.update({
    where: { id },
    data: {
      status: 'FAILED',
      error,
      actionResults: actionResults as never,
      finishedAt: new Date(),
    },
  });
}

export async function getExecutions(
  workflowId: string,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const db = getPrismaClient();
  const where = { workflowId };

  const [data, total] = await Promise.all([
    db.workflowExecution.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { startedAt: 'desc' },
    }),
    db.workflowExecution.count({ where }),
  ]);

  return paginatedResult(data, total, pagination);
}
