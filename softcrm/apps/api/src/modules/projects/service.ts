/**
 * Projects module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./repository.js`,
 * and cross-module integration is handled via domain events in `./events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { getPrismaClient } from '@softcrm/db';
import {
  NotFoundError,
  paginatedResult,
} from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import { logger } from '../../logger.js';
import * as repo from './repository.js';
import * as events from './events.js';

import type {
  ProjectFilters,
  TaskFilters,
  ProjectProgress,
  TemplateTask,
  TemplateMilestone,
} from './types.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  LogTimeInput,
} from './validators.js';
import type { Pagination } from './repository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Projects from Template ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createProjectFromTemplate(
  tenantId: string,
  actorId: string,
  templateId: string,
  data: { name: string; dealId?: string; accountId?: string; startDate?: string; endDate?: string },
) {
  const template = await repo.findTemplateById(tenantId, templateId);
  if (!template) {
    throw new NotFoundError('ProjectTemplate', templateId);
  }

  const db = getPrismaClient();

  const result = await db.$transaction(async (tx) => {
    // Create project
    const project = await repo.createProject(
      tenantId,
      {
        name: data.name,
        dealId: data.dealId,
        accountId: data.accountId,
        templateId,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      tx,
    );

    // Expand template tasks
    const templateTasks = (template.tasks as unknown as TemplateTask[]) ?? [];
    const createdTasks: Array<{ id: string; title: string }> = [];

    for (const tplTask of templateTasks) {
      const task = await repo.createTask(
        project.id,
        {
          title: tplTask.title,
          description: tplTask.description,
          priority: tplTask.priority as CreateTaskInput['priority'],
          order: tplTask.order,
        },
        tx,
      );
      createdTasks.push({ id: task.id, title: task.title });
    }

    // Expand template milestones
    const templateMilestones = (template.milestones as unknown as TemplateMilestone[]) ?? [];
    const startDate = data.startDate ? new Date(data.startDate) : new Date();

    for (const tplMilestone of templateMilestones) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + tplMilestone.offsetDays);

      const milestone = await repo.createMilestone(
        project.id,
        { name: tplMilestone.name, dueDate },
        tx,
      );

      // Link tasks to milestone by index
      for (const taskIndex of tplMilestone.taskIndices) {
        const linkedTask = createdTasks[taskIndex];
        if (linkedTask) {
          await repo.createMilestoneTask(milestone.id, linkedTask.id, tx);
        }
      }
    }

    return project;
  });

  // Publish event outside transaction
  await events.publishProjectCreated(tenantId, actorId, {
    id: result.id,
    name: result.name,
    dealId: result.dealId,
    accountId: result.accountId,
  });

  // Return full details
  return repo.findProjectByIdWithDetails(tenantId, result.id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Projects ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createProject(
  tenantId: string,
  actorId: string,
  data: CreateProjectInput,
) {
  const project = await repo.createProject(tenantId, data);

  await events.publishProjectCreated(tenantId, actorId, {
    id: project.id,
    name: project.name,
    dealId: project.dealId,
    accountId: project.accountId,
  });

  return project;
}

export async function getProjects(
  tenantId: string,
  filters: ProjectFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  const { data, total } = await repo.findProjects(tenantId, filters, pagination);
  return paginatedResult(data, total, { page: pagination.page, pageSize: pagination.limit });
}

export async function getProject(tenantId: string, projectId: string) {
  const project = await repo.findProjectByIdWithDetails(tenantId, projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }
  return project;
}

export async function updateProject(
  tenantId: string,
  _actorId: string,
  projectId: string,
  data: UpdateProjectInput,
) {
  const existing = await repo.findProjectById(tenantId, projectId);
  if (!existing) {
    throw new NotFoundError('Project', projectId);
  }
  return repo.updateProject(tenantId, projectId, data);
}

export async function deleteProject(
  tenantId: string,
  _actorId: string,
  projectId: string,
) {
  return repo.deleteProject(tenantId, projectId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Tasks ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTask(
  tenantId: string,
  _actorId: string,
  projectId: string,
  data: CreateTaskInput,
) {
  // Verify project exists and belongs to tenant
  const project = await repo.findProjectById(tenantId, projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }
  return repo.createTask(projectId, data);
}

export async function moveTask(
  tenantId: string,
  actorId: string,
  taskId: string,
  status: string,
) {
  const task = await repo.findTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }

  // Verify task belongs to a project in this tenant
  const project = await repo.findProjectById(tenantId, task.projectId);
  if (!project) {
    throw new NotFoundError('Project', task.projectId);
  }

  const updated = await repo.updateTask(taskId, { status } as UpdateTaskInput);

  // Check if any milestone with this task is now fully complete
  if (status === 'DONE') {
    const milestoneTasks = task.milestoneTasks ?? [];
    for (const mt of milestoneTasks) {
      const milestone = await repo.findMilestoneById(mt.milestoneId);
      if (milestone && !milestone.completedAt) {
        const allDone = milestone.milestoneTasks.every((mTask: { taskId: string; task: { status: string } }) =>
          mTask.taskId === taskId
            ? true // This task is now DONE
            : mTask.task.status === 'DONE',
        );
        if (allDone) {
          await repo.updateMilestone(milestone.id, {
            completedAt: new Date(),
          });
          await events.publishMilestoneCompleted(tenantId, actorId, {
            id: milestone.id,
            name: milestone.name,
            projectId: milestone.projectId,
          });
          logger.info(
            { milestoneId: milestone.id, milestoneName: milestone.name },
            'Milestone auto-completed: all tasks done',
          );
        }
      }
    }
  }

  return updated;
}

export async function updateTask(
  tenantId: string,
  _actorId: string,
  taskId: string,
  data: UpdateTaskInput,
) {
  const task = await repo.findTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }
  const project = await repo.findProjectById(tenantId, task.projectId);
  if (!project) {
    throw new NotFoundError('Project', task.projectId);
  }
  return repo.updateTask(taskId, data);
}

export async function deleteTask(
  tenantId: string,
  _actorId: string,
  taskId: string,
) {
  const task = await repo.findTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }
  const project = await repo.findProjectById(tenantId, task.projectId);
  if (!project) {
    throw new NotFoundError('Project', task.projectId);
  }
  return repo.deleteTask(taskId);
}

export async function listTasks(
  tenantId: string,
  projectId: string,
  filters?: TaskFilters,
) {
  const project = await repo.findProjectById(tenantId, projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }
  return repo.findTasksByProject(projectId, filters);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Time Entries ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function logTime(
  tenantId: string,
  actorId: string,
  taskId: string,
  data: { userId: string; hours: number; isBillable: boolean; description?: string; date: string },
) {
  const task = await repo.findTaskById(taskId);
  if (!task) {
    throw new NotFoundError('Task', taskId);
  }
  const project = await repo.findProjectById(tenantId, task.projectId);
  if (!project) {
    throw new NotFoundError('Project', task.projectId);
  }

  const entry = await repo.createTimeEntry(taskId, data);

  await events.publishTimeLogged(tenantId, actorId, {
    id: entry.id,
    taskId: entry.taskId,
    hours: Number(entry.hours),
    isBillable: entry.isBillable,
  });

  return entry;
}

export async function getTimeEntries(tenantId: string, projectId: string) {
  const project = await repo.findProjectById(tenantId, projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }
  return repo.findTimeEntriesByProject(projectId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Milestones ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getMilestones(tenantId: string, projectId: string) {
  const project = await repo.findProjectById(tenantId, projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }
  return repo.findMilestonesByProject(projectId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Project Progress ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function getProjectProgress(
  tenantId: string,
  projectId: string,
): Promise<ProjectProgress> {
  const project = await repo.findProjectByIdWithDetails(tenantId, projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const tasks = project.tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: { status: string }) => t.status === 'DONE').length;
  const percentComplete = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const milestoneStatus = (project.milestones ?? []).map((m: { name: string; completedAt: Date | null; dueDate: Date | null }) => ({
    name: m.name,
    completed: m.completedAt !== null,
    dueDate: m.dueDate,
  }));

  return {
    totalTasks,
    completedTasks,
    percentComplete,
    milestoneStatus,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Templates (passthrough) ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTemplate(
  tenantId: string,
  data: import('./validators.js').CreateTemplateInput,
) {
  return repo.createTemplate(tenantId, data);
}

export async function listTemplates(tenantId: string) {
  return repo.findTemplates(tenantId);
}
