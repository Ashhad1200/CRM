import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mock declarations ───────────────────────────────────────────────────────────

const mockListTemplates = vi.fn();
const mockCreateTemplate = vi.fn();
const mockCreateProjectFromTemplate = vi.fn();
const mockCreateProject = vi.fn();
const mockGetProjects = vi.fn();
const mockGetProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockCreateTask = vi.fn();
const mockMoveTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();
const mockListTasks = vi.fn();
const mockLogTime = vi.fn();
const mockGetTimeEntries = vi.fn();
const mockGetMilestones = vi.fn();
const mockGetProjectProgress = vi.fn();

vi.mock('../service.js', () => ({
  listTemplates: (...args: unknown[]) => mockListTemplates(...args),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
  createProjectFromTemplate: (...args: unknown[]) => mockCreateProjectFromTemplate(...args),
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  getProjects: (...args: unknown[]) => mockGetProjects(...args),
  getProject: (...args: unknown[]) => mockGetProject(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  moveTask: (...args: unknown[]) => mockMoveTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  listTasks: (...args: unknown[]) => mockListTasks(...args),
  logTime: (...args: unknown[]) => mockLogTime(...args),
  getTimeEntries: (...args: unknown[]) => mockGetTimeEntries(...args),
  getMilestones: (...args: unknown[]) => mockGetMilestones(...args),
  getProjectProgress: (...args: unknown[]) => mockGetProjectProgress(...args),
}));

vi.mock('../../../middleware/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/rbac.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: Function) => next(),
}));

vi.mock('../../../middleware/auth.js', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: Function) => next(),
}));

import { projectsRouter } from '../routes.js';

// ── Test helpers ────────────────────────────────────────────────────────────────

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: Function) => {
    req.user = { tid: 'tenant-1', sub: 'user-1', roles: ['admin'] };
    next();
  });
  app.use('/projects', projectsRouter);
  return app;
}

const UUID = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Templates ────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('GET /projects/templates', () => {
  it('returns templates list', async () => {
    const templates = [{ id: 'tpl-1', name: 'Onboarding' }];
    mockListTemplates.mockResolvedValue(templates);

    const res = await request(createTestApp()).get('/projects/templates');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: templates });
    expect(mockListTemplates).toHaveBeenCalledWith('tenant-1');
  });
});

describe('POST /projects/templates', () => {
  it('creates template and returns 201', async () => {
    const template = { id: 'tpl-1', name: 'New Template' };
    mockCreateTemplate.mockResolvedValue(template);

    const res = await request(createTestApp())
      .post('/projects/templates')
      .send({ name: 'New Template', tasks: [], milestones: [] });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: template });
    expect(mockCreateTemplate).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Projects ─────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('GET /projects/', () => {
  it('returns paginated projects', async () => {
    const result = { data: [{ id: UUID, name: 'Proj' }], total: 1, page: 1, pageSize: 20, totalPages: 1 };
    mockGetProjects.mockResolvedValue(result);

    const res = await request(createTestApp()).get('/projects/');

    expect(res.status).toBe(200);
    expect(mockGetProjects).toHaveBeenCalled();
  });
});

describe('POST /projects/', () => {
  it('creates project and returns 201', async () => {
    const project = { id: UUID, name: 'New Project' };
    mockCreateProject.mockResolvedValue(project);

    const res = await request(createTestApp())
      .post('/projects/')
      .send({ name: 'New Project' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: project });
    expect(mockCreateProject).toHaveBeenCalled();
  });
});

describe('POST /projects/from-template', () => {
  it('creates project from template and returns 201', async () => {
    const project = { id: UUID, name: 'From Template' };
    mockCreateProjectFromTemplate.mockResolvedValue(project);

    const res = await request(createTestApp())
      .post('/projects/from-template')
      .send({ templateId: UUID, name: 'From Template' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: project });
    expect(mockCreateProjectFromTemplate).toHaveBeenCalled();
  });
});

describe('GET /projects/:id', () => {
  it('returns project by id', async () => {
    const project = { id: UUID, name: 'Project A' };
    mockGetProject.mockResolvedValue(project);

    const res = await request(createTestApp()).get(`/projects/${UUID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: project });
    expect(mockGetProject).toHaveBeenCalledWith('tenant-1', UUID);
  });
});

describe('PATCH /projects/:id', () => {
  it('updates project', async () => {
    const project = { id: UUID, name: 'Updated' };
    mockUpdateProject.mockResolvedValue(project);

    const res = await request(createTestApp())
      .patch(`/projects/${UUID}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: project });
    expect(mockUpdateProject).toHaveBeenCalled();
  });
});

describe('DELETE /projects/:id', () => {
  it('deletes project', async () => {
    mockDeleteProject.mockResolvedValue(undefined);

    const res = await request(createTestApp()).delete(`/projects/${UUID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { success: true } });
    expect(mockDeleteProject).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Tasks ────────────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('POST /projects/:id/tasks', () => {
  it('creates task and returns 201', async () => {
    const task = { id: 'task-1', title: 'Write tests' };
    mockCreateTask.mockResolvedValue(task);

    const res = await request(createTestApp())
      .post(`/projects/${UUID}/tasks`)
      .send({ title: 'Write tests', priority: 'HIGH' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: task });
    expect(mockCreateTask).toHaveBeenCalled();
  });
});

describe('GET /projects/:id/tasks', () => {
  it('lists tasks', async () => {
    const tasks = [{ id: 'task-1', title: 'Task A' }];
    mockListTasks.mockResolvedValue(tasks);

    const res = await request(createTestApp()).get(`/projects/${UUID}/tasks`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: tasks });
    expect(mockListTasks).toHaveBeenCalled();
  });
});

describe('PATCH /projects/tasks/:taskId', () => {
  it('updates task', async () => {
    const task = { id: UUID, title: 'Updated task' };
    mockUpdateTask.mockResolvedValue(task);

    const res = await request(createTestApp())
      .patch(`/projects/tasks/${UUID}`)
      .send({ title: 'Updated task' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: task });
    expect(mockUpdateTask).toHaveBeenCalled();
  });
});

describe('PATCH /projects/tasks/:taskId/move', () => {
  it('moves task to new status', async () => {
    const task = { id: UUID, status: 'DONE' };
    mockMoveTask.mockResolvedValue(task);

    const res = await request(createTestApp())
      .patch(`/projects/tasks/${UUID}/move`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: task });
    expect(mockMoveTask).toHaveBeenCalled();
  });
});

describe('DELETE /projects/tasks/:taskId', () => {
  it('deletes task', async () => {
    mockDeleteTask.mockResolvedValue(undefined);

    const res = await request(createTestApp()).delete(`/projects/tasks/${UUID}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { success: true } });
    expect(mockDeleteTask).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Milestones ───────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('GET /projects/:id/milestones', () => {
  it('returns milestones', async () => {
    const milestones = [{ id: 'ms-1', name: 'Milestone 1' }];
    mockGetMilestones.mockResolvedValue(milestones);

    const res = await request(createTestApp()).get(`/projects/${UUID}/milestones`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: milestones });
    expect(mockGetMilestones).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Time Entries ─────────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('POST /projects/:id/time-entries', () => {
  it('logs time entry and returns 201', async () => {
    const project = { id: UUID, name: 'Project' };
    mockGetProject.mockResolvedValue(project);
    const entry = { id: 'te-1', taskId: 'task-1', hours: 3 };
    mockLogTime.mockResolvedValue(entry);

    const res = await request(createTestApp())
      .post(`/projects/${UUID}/time-entries`)
      .send({ taskId: 'task-1', hours: 3, isBillable: true, date: '2026-01-15' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: entry });
    expect(mockGetProject).toHaveBeenCalledWith('tenant-1', UUID);
    expect(mockLogTime).toHaveBeenCalled();
  });
});

describe('GET /projects/:id/time-entries', () => {
  it('returns time entries', async () => {
    const entries = [{ id: 'te-1', hours: 2 }];
    mockGetTimeEntries.mockResolvedValue(entries);

    const res = await request(createTestApp()).get(`/projects/${UUID}/time-entries`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: entries });
    expect(mockGetTimeEntries).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════
// ── Project Progress ─────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════════

describe('GET /projects/:id/progress', () => {
  it('returns project progress', async () => {
    const progress = { totalTasks: 5, completedTasks: 3, percentComplete: 60, milestoneStatus: [] };
    mockGetProjectProgress.mockResolvedValue(progress);

    const res = await request(createTestApp()).get(`/projects/${UUID}/progress`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: progress });
    expect(mockGetProjectProgress).toHaveBeenCalledWith('tenant-1', UUID);
  });
});
