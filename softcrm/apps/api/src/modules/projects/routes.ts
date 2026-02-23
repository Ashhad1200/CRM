/**
 * Projects module — HTTP route definitions.
 *
 * All routes are mounted under `/api/v1/projects/` by server.ts.
 * Each handler extracts tenantId / actorId from `req.user`, delegates to the
 * service layer, and returns a consistent JSON envelope.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { validate } from '../../middleware/validate.js';
import { requirePermission } from '../../middleware/rbac.js';

import * as svc from './service.js';
import {
  createTemplateSchema,
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  logTimeSchema,
  listProjectsQuerySchema,
  listTasksQuerySchema,
} from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Helpers ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/** Safely extract a single string param from Express 5's `string | string[]`. */
function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0]! : v!;
}

/** Wrap an async route handler so rejected promises forward to Express error middleware. */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// ── Inline param schemas ───────────────────────────────────────────────────────

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const taskIdParamSchema = z.object({
  taskId: z.string().uuid(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Router ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const router: Router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ── Templates ────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/templates',
  requirePermission({ module: 'projects', action: 'read' }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const templates = await svc.listTemplates(tenantId);
    res.json({ data: templates });
  }),
);

router.post(
  '/templates',
  requirePermission({ module: 'projects', action: 'create' }),
  validate({ body: createTemplateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const template = await svc.createTemplate(tenantId, req.body);
    res.status(201).json({ data: template });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Projects ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/',
  requirePermission({ module: 'projects', action: 'read' }),
  validate({ query: listProjectsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const { page, limit, ...filters } = req.query as unknown as z.infer<
      typeof listProjectsQuerySchema
    >;
    const result = await svc.getProjects(tenantId, filters, { page, limit });
    res.json(result);
  }),
);

router.post(
  '/',
  requirePermission({ module: 'projects', action: 'create' }),
  validate({ body: createProjectSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const project = await svc.createProject(tenantId, actorId, req.body);
    res.status(201).json({ data: project });
  }),
);

router.post(
  '/from-template',
  requirePermission({ module: 'projects', action: 'create' }),
  validate({
    body: z.object({
      templateId: z.string().uuid(),
      name: z.string().min(1).max(255),
      dealId: z.string().uuid().optional(),
      accountId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const { templateId, ...data } = req.body as {
      templateId: string;
      name: string;
      dealId?: string;
      accountId?: string;
      startDate?: string;
      endDate?: string;
    };
    const project = await svc.createProjectFromTemplate(
      tenantId,
      actorId,
      templateId,
      data,
    );
    res.status(201).json({ data: project });
  }),
);

router.get(
  '/:id',
  requirePermission({ module: 'projects', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const id = param(req, 'id');
    const project = await svc.getProject(tenantId, id);
    res.json({ data: project });
  }),
);

router.patch(
  '/:id',
  requirePermission({ module: 'projects', action: 'update' }),
  validate({ params: uuidParamSchema, body: updateProjectSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    const project = await svc.updateProject(tenantId, actorId, id, req.body);
    res.json({ data: project });
  }),
);

router.delete(
  '/:id',
  requirePermission({ module: 'projects', action: 'delete' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const id = param(req, 'id');
    await svc.deleteProject(tenantId, actorId, id);
    res.json({ data: { success: true } });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Tasks ────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/:id/tasks',
  requirePermission({ module: 'projects', action: 'create' }),
  validate({ params: uuidParamSchema, body: createTaskSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const projectId = param(req, 'id');
    const task = await svc.createTask(tenantId, actorId, projectId, req.body);
    res.status(201).json({ data: task });
  }),
);

router.get(
  '/:id/tasks',
  requirePermission({ module: 'projects', action: 'read' }),
  validate({ params: uuidParamSchema, query: listTasksQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const projectId = param(req, 'id');
    const filters = req.query as unknown as z.infer<typeof listTasksQuerySchema>;
    const tasks = await svc.listTasks(tenantId, projectId, filters);
    res.json({ data: tasks });
  }),
);

router.patch(
  '/tasks/:taskId',
  requirePermission({ module: 'projects', action: 'update' }),
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const taskId = param(req, 'taskId');
    const task = await svc.updateTask(tenantId, actorId, taskId, req.body);
    res.json({ data: task });
  }),
);

router.patch(
  '/tasks/:taskId/move',
  requirePermission({ module: 'projects', action: 'update' }),
  validate({ params: taskIdParamSchema, body: moveTaskSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const taskId = param(req, 'taskId');
    const { status } = req.body as { status: string };
    const task = await svc.moveTask(tenantId, actorId, taskId, status);
    res.json({ data: task });
  }),
);

router.delete(
  '/tasks/:taskId',
  requirePermission({ module: 'projects', action: 'delete' }),
  validate({ params: taskIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const taskId = param(req, 'taskId');
    await svc.deleteTask(tenantId, actorId, taskId);
    res.json({ data: { success: true } });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Milestones ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:id/milestones',
  requirePermission({ module: 'projects', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const projectId = param(req, 'id');
    const milestones = await svc.getMilestones(tenantId, projectId);
    res.json({ data: milestones });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Time Entries ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/:id/time-entries',
  requirePermission({ module: 'projects', action: 'create' }),
  validate({ params: uuidParamSchema, body: logTimeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId, sub: actorId } = req.user!;
    const projectId = param(req, 'id');

    // The task ID for time logging is determined by the project context.
    // Clients should use the task-level time entry endpoint; this route
    // accepts a taskId in the body for convenience.
    const { hours, isBillable, description, date } = req.body as {
      hours: number;
      isBillable: boolean;
      description?: string;
      date: string;
      taskId?: string;
    };

    // Validate that the project exists
    const project = await svc.getProject(tenantId, projectId);

    // Use the first task by default if no taskId specified in body
    const taskId = (req.body as { taskId?: string }).taskId;
    if (!taskId) {
      res.status(400).json({ error: 'taskId is required in the request body' });
      return;
    }

    const entry = await svc.logTime(tenantId, actorId, taskId, {
      userId: actorId,
      hours,
      isBillable,
      description,
      date,
    });
    res.status(201).json({ data: entry });
  }),
);

router.get(
  '/:id/time-entries',
  requirePermission({ module: 'projects', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const projectId = param(req, 'id');
    const entries = await svc.getTimeEntries(tenantId, projectId);
    res.json({ data: entries });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// ── Project Progress ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:id/progress',
  requirePermission({ module: 'projects', action: 'read' }),
  validate({ params: uuidParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { tid: tenantId } = req.user!;
    const projectId = param(req, 'id');
    const progress = await svc.getProjectProgress(tenantId, projectId);
    res.json({ data: progress });
  }),
);

// ═══════════════════════════════════════════════════════════════════════════════
// ── Export ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const projectsRouter = router;
