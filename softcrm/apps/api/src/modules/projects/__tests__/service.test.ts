import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations (must be before vi.mock calls) ────────────────────────────

const mockFindTemplateById = vi.fn();
const mockCreateProject = vi.fn();
const mockCreateTask = vi.fn();
const mockCreateMilestone = vi.fn();
const mockCreateMilestoneTask = vi.fn();
const mockFindProjectByIdWithDetails = vi.fn();
const mockFindProjectById = vi.fn();
const mockFindProjects = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockFindTaskById = vi.fn();
const mockFindTasksByProject = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockFindMilestoneById = vi.fn();
const mockUpdateMilestone = vi.fn();
const mockFindMilestonesByProject = vi.fn();
const mockCreateTimeEntry = vi.fn();
const mockFindTimeEntriesByProject = vi.fn();
const mockCreateTemplate = vi.fn();
const mockFindTemplates = vi.fn();

const mockPublishProjectCreated = vi.fn();
const mockPublishMilestoneCompleted = vi.fn();
const mockPublishTimeLogged = vi.fn();

vi.mock('../repository.js', () => ({
  findTemplateById: (...args: unknown[]) => mockFindTemplateById(...args),
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
  createMilestoneTask: (...args: unknown[]) => mockCreateMilestoneTask(...args),
  findProjectByIdWithDetails: (...args: unknown[]) => mockFindProjectByIdWithDetails(...args),
  findProjectById: (...args: unknown[]) => mockFindProjectById(...args),
  findProjects: (...args: unknown[]) => mockFindProjects(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
  findTaskById: (...args: unknown[]) => mockFindTaskById(...args),
  findTasksByProject: (...args: unknown[]) => mockFindTasksByProject(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  findMilestoneById: (...args: unknown[]) => mockFindMilestoneById(...args),
  updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
  findMilestonesByProject: (...args: unknown[]) => mockFindMilestonesByProject(...args),
  createTimeEntry: (...args: unknown[]) => mockCreateTimeEntry(...args),
  findTimeEntriesByProject: (...args: unknown[]) => mockFindTimeEntriesByProject(...args),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
  findTemplates: (...args: unknown[]) => mockFindTemplates(...args),
}));

vi.mock('../events.js', () => ({
  publishProjectCreated: (...args: unknown[]) => mockPublishProjectCreated(...args),
  publishMilestoneCompleted: (...args: unknown[]) => mockPublishMilestoneCompleted(...args),
  publishTimeLogged: (...args: unknown[]) => mockPublishTimeLogged(...args),
}));

vi.mock('@softcrm/db', () => ({
  getPrismaClient: () => ({
    $transaction: (fn: Function) => fn({}),
  }),
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Import module under test AFTER mocks ──────────────────────────────────────
import * as svc from '../service.js';
import { NotFoundError } from '@softcrm/shared-kernel';

const T = 'tenant-1';
const ACTOR = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Templates ────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('createTemplate', () => {
  it('delegates to repository', async () => {
    const input = { name: 'Onboarding', tasks: [], milestones: [] };
    const created = { id: 'tpl-1', tenantId: T, ...input };
    mockCreateTemplate.mockResolvedValue(created);

    const result = await svc.createTemplate(T, input as any);

    expect(mockCreateTemplate).toHaveBeenCalledWith(T, input);
    expect(result).toEqual(created);
  });
});

describe('listTemplates', () => {
  it('delegates to repository', async () => {
    const templates = [{ id: 'tpl-1', name: 'Onboarding' }];
    mockFindTemplates.mockResolvedValue(templates);

    const result = await svc.listTemplates(T);

    expect(mockFindTemplates).toHaveBeenCalledWith(T);
    expect(result).toEqual(templates);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── createProjectFromTemplate ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('createProjectFromTemplate', () => {
  const templateData = {
    id: 'tpl-1',
    tenantId: T,
    name: 'Template',
    tasks: [{ title: 'Task 1', priority: 'HIGH', order: 0 }],
    milestones: [{ name: 'M1', taskIndices: [0], offsetDays: 30 }],
  };

  it('throws NotFoundError when template not found', async () => {
    mockFindTemplateById.mockResolvedValue(null);

    await expect(
      svc.createProjectFromTemplate(T, ACTOR, 'tpl-missing', { name: 'Proj' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('creates project, tasks, milestones from template and publishes event', async () => {
    mockFindTemplateById.mockResolvedValue(templateData);
    const project = { id: 'proj-1', name: 'New Project', dealId: null, accountId: null };
    mockCreateProject.mockResolvedValue(project);
    mockCreateTask.mockResolvedValue({ id: 'task-1', title: 'Task 1' });
    mockCreateMilestone.mockResolvedValue({ id: 'ms-1', name: 'M1' });
    mockCreateMilestoneTask.mockResolvedValue({});
    mockFindProjectByIdWithDetails.mockResolvedValue({ ...project, tasks: [], milestones: [] });

    const result = await svc.createProjectFromTemplate(T, ACTOR, 'tpl-1', { name: 'New Project' });

    expect(mockFindTemplateById).toHaveBeenCalledWith(T, 'tpl-1');
    expect(mockCreateProject).toHaveBeenCalled();
    expect(mockCreateTask).toHaveBeenCalled();
    expect(mockCreateMilestone).toHaveBeenCalled();
    expect(mockCreateMilestoneTask).toHaveBeenCalledWith('ms-1', 'task-1', expect.anything());
    expect(mockPublishProjectCreated).toHaveBeenCalledWith(T, ACTOR, expect.objectContaining({ id: 'proj-1' }));
    expect(result).toBeDefined();
  });

  it('handles template with no tasks or milestones', async () => {
    const emptyTemplate = { id: 'tpl-2', tenantId: T, name: 'Empty', tasks: [], milestones: [] };
    mockFindTemplateById.mockResolvedValue(emptyTemplate);
    const project = { id: 'proj-2', name: 'Empty Proj', dealId: null, accountId: null };
    mockCreateProject.mockResolvedValue(project);
    mockFindProjectByIdWithDetails.mockResolvedValue({ ...project, tasks: [], milestones: [] });

    const result = await svc.createProjectFromTemplate(T, ACTOR, 'tpl-2', { name: 'Empty Proj' });

    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockCreateMilestone).not.toHaveBeenCalled();
    expect(mockPublishProjectCreated).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── createProject ────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('createProject', () => {
  it('creates and publishes PROJECT_CREATED', async () => {
    const project = { id: 'proj-1', name: 'My Project', dealId: null, accountId: null };
    mockCreateProject.mockResolvedValue(project);

    const result = await svc.createProject(T, ACTOR, { name: 'My Project' } as any);

    expect(mockCreateProject).toHaveBeenCalledWith(T, { name: 'My Project' });
    expect(mockPublishProjectCreated).toHaveBeenCalledWith(
      T,
      ACTOR,
      expect.objectContaining({ id: 'proj-1', name: 'My Project' }),
    );
    expect(result).toEqual(project);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── getProjects ──────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('getProjects', () => {
  it('returns paginated result', async () => {
    const projects = [{ id: 'proj-1', name: 'Project A' }];
    mockFindProjects.mockResolvedValue({ data: projects, total: 1 });

    const result = await svc.getProjects(T, {}, { page: 1, limit: 20 });

    expect(mockFindProjects).toHaveBeenCalledWith(T, {}, { page: 1, limit: 20 });
    expect(result).toMatchObject({
      data: projects,
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── getProject ───────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('getProject', () => {
  it('returns project with details', async () => {
    const project = { id: 'proj-1', name: 'Project A', tasks: [], milestones: [] };
    mockFindProjectByIdWithDetails.mockResolvedValue(project);

    const result = await svc.getProject(T, 'proj-1');

    expect(mockFindProjectByIdWithDetails).toHaveBeenCalledWith(T, 'proj-1');
    expect(result).toEqual(project);
  });

  it('throws NotFoundError when not found', async () => {
    mockFindProjectByIdWithDetails.mockResolvedValue(null);

    await expect(svc.getProject(T, 'proj-missing')).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── updateProject ────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('updateProject', () => {
  it('updates project', async () => {
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const updated = { id: 'proj-1', name: 'Renamed' };
    mockUpdateProject.mockResolvedValue(updated);

    const result = await svc.updateProject(T, ACTOR, 'proj-1', { name: 'Renamed' } as any);

    expect(mockFindProjectById).toHaveBeenCalledWith(T, 'proj-1');
    expect(mockUpdateProject).toHaveBeenCalledWith(T, 'proj-1', { name: 'Renamed' });
    expect(result).toEqual(updated);
  });

  it('throws NotFoundError when not found', async () => {
    mockFindProjectById.mockResolvedValue(null);

    await expect(
      svc.updateProject(T, ACTOR, 'proj-missing', { name: 'X' } as any),
    ).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── deleteProject ────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('deleteProject', () => {
  it('deletes project', async () => {
    mockDeleteProject.mockResolvedValue({ id: 'proj-1' });

    await svc.deleteProject(T, ACTOR, 'proj-1');

    expect(mockDeleteProject).toHaveBeenCalledWith(T, 'proj-1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── createTask ───────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('createTask', () => {
  it('creates task in existing project', async () => {
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const task = { id: 'task-1', title: 'Write tests', projectId: 'proj-1' };
    mockCreateTask.mockResolvedValue(task);

    const result = await svc.createTask(T, ACTOR, 'proj-1', { title: 'Write tests' } as any);

    expect(mockFindProjectById).toHaveBeenCalledWith(T, 'proj-1');
    expect(mockCreateTask).toHaveBeenCalledWith('proj-1', { title: 'Write tests' });
    expect(result).toEqual(task);
  });

  it('throws NotFoundError when project not found', async () => {
    mockFindProjectById.mockResolvedValue(null);

    await expect(
      svc.createTask(T, ACTOR, 'proj-missing', { title: 'X' } as any),
    ).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── moveTask ─────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('moveTask', () => {
  it('moves task to new status', async () => {
    const task = { id: 'task-1', projectId: 'proj-1', milestoneTasks: [] };
    mockFindTaskById.mockResolvedValue(task);
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const updated = { ...task, status: 'IN_PROGRESS' };
    mockUpdateTask.mockResolvedValue(updated);

    const result = await svc.moveTask(T, ACTOR, 'task-1', 'IN_PROGRESS');

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'IN_PROGRESS' });
    expect(result).toEqual(updated);
  });

  it('auto-completes milestone when all tasks done', async () => {
    const task = {
      id: 'task-1',
      projectId: 'proj-1',
      milestoneTasks: [{ milestoneId: 'ms-1' }],
    };
    mockFindTaskById.mockResolvedValue(task);
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    mockUpdateTask.mockResolvedValue({ ...task, status: 'DONE' });
    mockFindMilestoneById.mockResolvedValue({
      id: 'ms-1',
      name: 'Milestone 1',
      projectId: 'proj-1',
      completedAt: null,
      milestoneTasks: [{ taskId: 'task-1', task: { status: 'DONE' } }],
    });
    mockUpdateMilestone.mockResolvedValue({});

    await svc.moveTask(T, ACTOR, 'task-1', 'DONE');

    expect(mockUpdateMilestone).toHaveBeenCalledWith('ms-1', { completedAt: expect.any(Date) });
    expect(mockPublishMilestoneCompleted).toHaveBeenCalledWith(
      T,
      ACTOR,
      expect.objectContaining({ id: 'ms-1', name: 'Milestone 1', projectId: 'proj-1' }),
    );
  });

  it('throws NotFoundError when task not found', async () => {
    mockFindTaskById.mockResolvedValue(null);

    await expect(svc.moveTask(T, ACTOR, 'task-missing', 'DONE')).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── updateTask ───────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('updateTask', () => {
  it('updates task', async () => {
    const task = { id: 'task-1', projectId: 'proj-1' };
    mockFindTaskById.mockResolvedValue(task);
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const updated = { ...task, title: 'Updated title' };
    mockUpdateTask.mockResolvedValue(updated);

    const result = await svc.updateTask(T, ACTOR, 'task-1', { title: 'Updated title' } as any);

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated title' });
    expect(result).toEqual(updated);
  });

  it('throws NotFoundError when task not found', async () => {
    mockFindTaskById.mockResolvedValue(null);

    await expect(
      svc.updateTask(T, ACTOR, 'task-missing', { title: 'X' } as any),
    ).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── deleteTask ───────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('deleteTask', () => {
  it('deletes task', async () => {
    const task = { id: 'task-1', projectId: 'proj-1' };
    mockFindTaskById.mockResolvedValue(task);
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    mockDeleteTask.mockResolvedValue(task);

    await svc.deleteTask(T, ACTOR, 'task-1');

    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── listTasks ────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('listTasks', () => {
  it('lists tasks for project', async () => {
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const tasks = [{ id: 'task-1', title: 'Task A' }];
    mockFindTasksByProject.mockResolvedValue(tasks);

    const result = await svc.listTasks(T, 'proj-1');

    expect(mockFindProjectById).toHaveBeenCalledWith(T, 'proj-1');
    expect(mockFindTasksByProject).toHaveBeenCalledWith('proj-1', undefined);
    expect(result).toEqual(tasks);
  });

  it('throws when project not found', async () => {
    mockFindProjectById.mockResolvedValue(null);

    await expect(svc.listTasks(T, 'proj-missing')).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── logTime ──────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('logTime', () => {
  it('logs time entry and publishes TIME_LOGGED', async () => {
    const task = { id: 'task-1', projectId: 'proj-1' };
    mockFindTaskById.mockResolvedValue(task);
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const entry = { id: 'te-1', taskId: 'task-1', hours: 2, isBillable: true };
    mockCreateTimeEntry.mockResolvedValue(entry);

    const result = await svc.logTime(T, ACTOR, 'task-1', {
      userId: ACTOR,
      hours: 2,
      isBillable: true,
      date: '2026-01-15',
    });

    expect(mockCreateTimeEntry).toHaveBeenCalledWith('task-1', {
      userId: ACTOR,
      hours: 2,
      isBillable: true,
      date: '2026-01-15',
    });
    expect(mockPublishTimeLogged).toHaveBeenCalledWith(
      T,
      ACTOR,
      expect.objectContaining({ id: 'te-1', taskId: 'task-1', hours: 2 }),
    );
    expect(result).toEqual(entry);
  });

  it('throws when task not found', async () => {
    mockFindTaskById.mockResolvedValue(null);

    await expect(
      svc.logTime(T, ACTOR, 'task-missing', {
        userId: ACTOR,
        hours: 1,
        isBillable: false,
        date: '2026-01-15',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── getTimeEntries ───────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('getTimeEntries', () => {
  it('returns time entries', async () => {
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const entries = [{ id: 'te-1', hours: 3 }];
    mockFindTimeEntriesByProject.mockResolvedValue(entries);

    const result = await svc.getTimeEntries(T, 'proj-1');

    expect(mockFindProjectById).toHaveBeenCalledWith(T, 'proj-1');
    expect(mockFindTimeEntriesByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toEqual(entries);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── getMilestones ────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('getMilestones', () => {
  it('returns milestones', async () => {
    mockFindProjectById.mockResolvedValue({ id: 'proj-1' });
    const milestones = [{ id: 'ms-1', name: 'Milestone 1' }];
    mockFindMilestonesByProject.mockResolvedValue(milestones);

    const result = await svc.getMilestones(T, 'proj-1');

    expect(mockFindProjectById).toHaveBeenCalledWith(T, 'proj-1');
    expect(mockFindMilestonesByProject).toHaveBeenCalledWith('proj-1');
    expect(result).toEqual(milestones);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── getProjectProgress ───────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('getProjectProgress', () => {
  it('calculates progress with tasks', async () => {
    const project = {
      id: 'proj-1',
      tasks: [
        { id: 'task-1', status: 'DONE' },
        { id: 'task-2', status: 'TODO' },
        { id: 'task-3', status: 'DONE' },
        { id: 'task-4', status: 'IN_PROGRESS' },
      ],
      milestones: [
        { name: 'M1', completedAt: new Date('2026-01-10'), dueDate: new Date('2026-01-15') },
        { name: 'M2', completedAt: null, dueDate: new Date('2026-02-01') },
      ],
    };
    mockFindProjectByIdWithDetails.mockResolvedValue(project);

    const result = await svc.getProjectProgress(T, 'proj-1');

    expect(result).toEqual({
      totalTasks: 4,
      completedTasks: 2,
      percentComplete: 50,
      milestoneStatus: [
        { name: 'M1', completed: true, dueDate: new Date('2026-01-15') },
        { name: 'M2', completed: false, dueDate: new Date('2026-02-01') },
      ],
    });
  });

  it('returns 0% when no tasks', async () => {
    const project = { id: 'proj-1', tasks: [], milestones: [] };
    mockFindProjectByIdWithDetails.mockResolvedValue(project);

    const result = await svc.getProjectProgress(T, 'proj-1');

    expect(result).toEqual({
      totalTasks: 0,
      completedTasks: 0,
      percentComplete: 0,
      milestoneStatus: [],
    });
  });
});
