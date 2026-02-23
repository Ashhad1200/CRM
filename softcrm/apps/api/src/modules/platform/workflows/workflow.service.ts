/**
 * Workflow Builder module — business-logic / service layer.
 *
 * Pure domain logic sits here; persistence is delegated to `./workflow.repository.js`,
 * and cross-module integration is handled via domain events in `./workflow.events.js`.
 *
 * Every public function is explicitly scoped by `tenantId`.
 */

import { NotFoundError, paginatedResult } from '@softcrm/shared-kernel';
import type { PaginatedResult } from '@softcrm/shared-kernel';

import { logger } from '../../../logger.js';
import * as repo from './workflow.repository.js';
import * as events from './workflow.events.js';
import * as engine from './workflow.engine.js';
import type { Pagination } from './workflow.repository.js';

import type {
  WorkflowFilters,
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  ActionResult,
} from './types.js';
import type { CreateWorkflowInput, UpdateWorkflowInput } from './validators.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Workflow CRUD ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function listWorkflows(
  tenantId: string,
  filters: WorkflowFilters,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  return repo.findAll(tenantId, filters, pagination);
}

export async function getWorkflow(tenantId: string, id: string): Promise<unknown> {
  const workflow = await repo.findById(tenantId, id);
  if (!workflow) {
    throw new NotFoundError('Workflow', id);
  }
  return workflow;
}

export async function createWorkflow(
  tenantId: string,
  actorId: string,
  data: CreateWorkflowInput,
): Promise<unknown> {
  return repo.create(tenantId, actorId, data);
}

export async function updateWorkflow(
  tenantId: string,
  id: string,
  data: UpdateWorkflowInput,
): Promise<unknown> {
  const existing = await repo.findById(tenantId, id);
  if (!existing) {
    throw new NotFoundError('Workflow', id);
  }
  return repo.update(tenantId, id, data);
}

export async function deleteWorkflow(tenantId: string, id: string): Promise<void> {
  const existing = await repo.findById(tenantId, id);
  if (!existing) {
    throw new NotFoundError('Workflow', id);
  }
  await repo.remove(tenantId, id);
}

export async function activateWorkflow(tenantId: string, id: string): Promise<unknown> {
  const existing = await repo.findById(tenantId, id);
  if (!existing) {
    throw new NotFoundError('Workflow', id);
  }
  return repo.activate(tenantId, id);
}

export async function deactivateWorkflow(tenantId: string, id: string): Promise<unknown> {
  const existing = await repo.findById(tenantId, id);
  if (!existing) {
    throw new NotFoundError('Workflow', id);
  }
  return repo.deactivate(tenantId, id);
}

export async function getExecutions(
  workflowId: string,
  pagination: Pagination,
): Promise<PaginatedResult<unknown>> {
  return repo.getExecutions(workflowId, pagination);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Workflow Evaluation ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface WorkflowRecord {
  id: string;
  tenantId: string;
  name: string;
  trigger: unknown;
  conditions: unknown;
  actions: unknown;
  loopLimit: number;
  createdBy: string;
}

export async function evaluateWorkflow(
  workflowId: string,
  eventType: string,
  eventPayload: Record<string, unknown>,
  correlationId: string,
): Promise<void> {
  // Fetch workflow — we need to read across tenants for the listener use-case,
  // so we do a direct lookup. Since findById requires tenantId we use the
  // internal approach of fetching from the repo methods.
  const db = (await import('@softcrm/db')).getPrismaClient();
  const workflow = await db.workflow.findUnique({ where: { id: workflowId } }) as WorkflowRecord | null;

  if (!workflow) {
    logger.warn({ workflowId }, 'Workflow not found for evaluation');
    return;
  }

  // Loop depth check
  const canProceed = engine.checkLoopDepth(correlationId, workflow.loopLimit);
  if (!canProceed) {
    logger.warn(
      { workflowId, correlationId },
      'Workflow skipped — loop depth exceeded',
    );
    return;
  }

  const conditions = (workflow.conditions ?? []) as WorkflowCondition[];
  const actions = (workflow.actions ?? []) as WorkflowAction[];

  // Evaluate conditions
  const conditionsPass = engine.evaluateConditions(conditions, eventPayload);

  if (!conditionsPass) {
    logger.debug(
      { workflowId, eventType },
      'Workflow conditions not met — skipping execution',
    );
    return;
  }

  // Create execution record
  const execution = (await repo.createExecution({
    workflowId,
    triggerEvent: eventType,
    triggerPayload: eventPayload,
  })) as { id: string };

  let actionResults: ActionResult[] = [];

  try {
    actionResults = await engine.executeActions(actions, {
      tenantId: workflow.tenantId,
      actorId: workflow.createdBy,
      payload: eventPayload,
    });

    await repo.completeExecution(execution.id, actionResults);

    logger.info(
      { workflowId, executionId: execution.id, eventType },
      'Workflow execution completed',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repo.failExecution(execution.id, message, actionResults);

    logger.error(
      { workflowId, executionId: execution.id, error: message },
      'Workflow execution failed',
    );
  }

  // Publish WORKFLOW_EXECUTED event
  try {
    await events.publishWorkflowExecuted(workflow.tenantId, workflow.createdBy, {
      id: execution.id,
      workflowId,
      triggerEvent: eventType,
    });
  } catch (error) {
    logger.error(
      { workflowId, error },
      'Failed to publish WORKFLOW_EXECUTED event',
    );
  }
}

export async function evaluateWorkflowsForEvent(
  tenantId: string,
  eventType: string,
  eventPayload: Record<string, unknown>,
  correlationId: string,
): Promise<void> {
  const workflows = (await repo.findActiveByTriggerEvent(
    tenantId,
    eventType,
  )) as WorkflowRecord[];

  for (const workflow of workflows) {
    try {
      await evaluateWorkflow(workflow.id, eventType, eventPayload, correlationId);
    } catch (error) {
      logger.error(
        { workflowId: workflow.id, eventType, error },
        'Error evaluating workflow for event',
      );
    }
  }
}
