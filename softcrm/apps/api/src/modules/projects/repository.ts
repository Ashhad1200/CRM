/**
 * Projects module — data-access layer (repository).
 *
 * Every function is explicitly scoped by `tenantId` as a belt-and-suspenders
 * approach on top of PostgreSQL Row-Level Security (RLS) that is already
 * enforced by the Prisma client extension in `@softcrm/db`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  generateId,
} from '@softcrm/shared-kernel';

// Prisma enum type helpers — we extract enum types from the Prisma client
// to safely cast validated string inputs without importing @prisma/client directly.
type PrismaClient = ReturnType<typeof getPrismaClient>;
type ProjectCreateInput = NonNullable<Parameters<PrismaClient['project']['create']>[0]>['data'];
type PrismaProjectStatus = NonNullable<ProjectCreateInput>['status'];
type TaskCreateInput = NonNullable<Parameters<PrismaClient['task']['create']>[0]>['data'];
type PrismaTaskStatus = NonNullable<TaskCreateInput>['status'];
type PrismaTaskPriority = NonNullable<TaskCreateInput>['priority'];

import type {
  ProjectFilters,
  TaskFilters,
} from './types.js';
import type {
  CreateTemplateInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  LogTimeInput,
} from './validators.js';

// ── Local helper types ─────────────────────────────────────────────────────────

/** Standard pagination parameters. */
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/** Transaction client for use in multi-step operations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any;

// ── Prisma include fragments ───────────────────────────────────────────────────

const projectWithDetailsInclude = {
  tasks: { orderBy: { order: 'asc' as const } },
  milestones: {
    include: {
      milestoneTasks: {
        include: {
          task: true,
        },
      },
    },
  },
  template: true,
} as const;

const taskWithTimeEntriesInclude = {
  timeEntries: true,
  milestoneTasks: true,
} as const;

const milestoneWithTasksInclude = {
  milestoneTasks: {
    include: {
      task: {
        select: { id: true, title: true, status: true },
      },
    },
  },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function paginationArgs(pagination: Pagination): {
  skip: number;
  take: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
} {
  const skip = (pagination.page - 1) * pagination.limit;
  const orderBy = pagination.sortBy
    ? { [pagination.sortBy]: pagination.sortDir ?? 'asc' }
    : undefined;
  return { skip, take: pagination.limit, ...(orderBy ? { orderBy } : {}) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Templates ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTemplate(
  tenantId: string,
  data: CreateTemplateInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.projectTemplate.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      tasks: data.tasks as never,
      milestones: data.milestones as never,
      defaultAssignees: (data.defaultAssignees ?? []) as never,
    },
  });
}

export async function findTemplateById(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.projectTemplate.findFirst({
    where: { id, tenantId },
  });
}

export async function findTemplates(
  tenantId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.projectTemplate.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTemplate(
  tenantId: string,
  id: string,
  data: Partial<CreateTemplateInput>,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.projectTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.tasks !== undefined && { tasks: data.tasks as never }),
      ...(data.milestones !== undefined && { milestones: data.milestones as never }),
      ...(data.defaultAssignees !== undefined && { defaultAssignees: data.defaultAssignees as never }),
    },
  });
}

export async function deleteTemplate(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const template = await client.projectTemplate.findFirst({
    where: { id, tenantId },
  });
  if (!template) {
    throw new NotFoundError('ProjectTemplate', id);
  }
  return client.projectTemplate.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Projects ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createProject(
  tenantId: string,
  data: CreateProjectInput & { templateId?: string; status?: string },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.project.create({
    data: {
      id: generateId(),
      tenantId,
      name: data.name,
      dealId: data.dealId ?? null,
      accountId: data.accountId ?? null,
      templateId: data.templateId ?? null,
      status: (data.status ?? 'PLANNING') as PrismaProjectStatus,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
}

export async function findProjectById(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.project.findFirst({
    where: { id, tenantId },
  });
}

export async function findProjectByIdWithDetails(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.project.findFirst({
    where: { id, tenantId },
    include: projectWithDetailsInclude,
  });
}

export async function findProjects(
  tenantId: string,
  filters: ProjectFilters,
  pagination: Pagination,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { tenantId };

  if (filters.search) {
    where['name'] = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters.status) {
    where['status'] = filters.status as PrismaProjectStatus;
  }
  if (filters.dealId) {
    where['dealId'] = filters.dealId;
  }
  if (filters.accountId) {
    where['accountId'] = filters.accountId;
  }

  const { skip, take, orderBy } = paginationArgs(pagination);

  const [data, total] = await Promise.all([
    client.project.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      include: { tasks: { select: { id: true, status: true } }, milestones: true },
    }),
    client.project.count({ where }),
  ]);

  return { data, total };
}

export async function updateProject(
  tenantId: string,
  id: string,
  data: UpdateProjectInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.project.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status as PrismaProjectStatus }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
    },
    include: projectWithDetailsInclude,
  });
}

export async function deleteProject(
  tenantId: string,
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const project = await client.project.findFirst({
    where: { id, tenantId },
  });
  if (!project) {
    throw new NotFoundError('Project', id);
  }

  // Delete related entities in correct order
  await client.milestoneTask.deleteMany({
    where: { milestone: { projectId: id } },
  });
  await client.timeEntry.deleteMany({
    where: { task: { projectId: id } },
  });
  await client.milestone.deleteMany({
    where: { projectId: id },
  });
  await client.task.deleteMany({
    where: { projectId: id },
  });

  return client.project.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tasks ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTask(
  projectId: string,
  data: CreateTaskInput & { title: string },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.task.create({
    data: {
      id: generateId(),
      projectId,
      title: data.title,
      description: data.description ?? null,
      assigneeId: data.assigneeId ?? null,
      priority: (data.priority ?? 'MEDIUM') as PrismaTaskPriority,
      status: 'TODO' as PrismaTaskStatus,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      order: data.order ?? 0,
    },
  });
}

export async function findTaskById(
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.task.findFirst({
    where: { id },
    include: taskWithTimeEntriesInclude,
  });
}

export async function findTasksByProject(
  projectId: string,
  filters?: TaskFilters,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  const where: Record<string, unknown> = { projectId };

  if (filters?.status) {
    where['status'] = filters.status as PrismaTaskStatus;
  }
  if (filters?.assigneeId) {
    where['assigneeId'] = filters.assigneeId;
  }
  if (filters?.priority) {
    where['priority'] = filters.priority as PrismaTaskPriority;
  }

  return client.task.findMany({
    where,
    orderBy: { order: 'asc' },
  });
}

export async function updateTask(
  id: string,
  data: UpdateTaskInput,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(data.priority !== undefined && { priority: data.priority as PrismaTaskPriority }),
      ...(data.status !== undefined && { status: data.status as PrismaTaskStatus }),
      ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
}

export async function deleteTask(
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();

  // Remove milestone links and time entries first
  await client.milestoneTask.deleteMany({ where: { taskId: id } });
  await client.timeEntry.deleteMany({ where: { taskId: id } });

  return client.task.delete({ where: { id } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Milestones ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createMilestone(
  projectId: string,
  data: { name: string; dueDate?: Date | null },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.milestone.create({
    data: {
      id: generateId(),
      projectId,
      name: data.name,
      dueDate: data.dueDate ?? null,
    },
  });
}

export async function findMilestonesByProject(
  projectId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.milestone.findMany({
    where: { projectId },
    include: milestoneWithTasksInclude,
    orderBy: { createdAt: 'asc' },
  });
}

export async function findMilestoneById(
  id: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.milestone.findFirst({
    where: { id },
    include: milestoneWithTasksInclude,
  });
}

export async function updateMilestone(
  id: string,
  data: { name?: string; dueDate?: Date | null; completedAt?: Date | null },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.milestone.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
    },
    include: milestoneWithTasksInclude,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MilestoneTasks ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createMilestoneTask(
  milestoneId: string,
  taskId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.milestoneTask.create({
    data: {
      id: generateId(),
      milestoneId,
      taskId,
    },
  });
}

export async function findMilestoneTasksByMilestone(
  milestoneId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.milestoneTask.findMany({
    where: { milestoneId },
    include: {
      task: {
        select: { id: true, title: true, status: true },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── TimeEntries ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTimeEntry(
  taskId: string,
  data: { userId: string; hours: number; isBillable: boolean; description?: string; date: string },
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.timeEntry.create({
    data: {
      id: generateId(),
      taskId,
      userId: data.userId,
      hours: data.hours,
      isBillable: data.isBillable,
      description: data.description ?? null,
      date: new Date(data.date),
    },
  });
}

export async function findTimeEntriesByTask(
  taskId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.timeEntry.findMany({
    where: { taskId },
    orderBy: { date: 'desc' },
  });
}

export async function findTimeEntriesByProject(
  projectId: string,
  tx?: TransactionClient,
) {
  const client = tx ?? getPrismaClient();
  return client.timeEntry.findMany({
    where: {
      task: { projectId },
    },
    include: {
      task: {
        select: { id: true, title: true, projectId: true },
      },
    },
    orderBy: { date: 'desc' },
  });
}
