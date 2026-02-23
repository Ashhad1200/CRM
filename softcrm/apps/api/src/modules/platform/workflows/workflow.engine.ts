/**
 * Workflow Builder module — execution engine.
 *
 * Evaluates conditions against an event payload and executes configured
 * actions. Includes loop-depth detection to prevent runaway recursive
 * workflow triggers.
 */

import { logger } from '../../../logger.js';
import type {
  WorkflowCondition,
  WorkflowAction,
  ActionResult,
  ActionType,
  ConditionOperator,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ── Loop Depth Tracking (in-memory, TTL-based) ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const LOOP_TTL_MS = 60_000; // 1 minute

interface LoopEntry {
  count: number;
  expiresAt: number;
}

const loopCounters = new Map<string, LoopEntry>();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of loopCounters) {
    if (entry.expiresAt <= now) {
      loopCounters.delete(key);
    }
  }
}

/**
 * Check whether the correlation chain has exceeded the max loop depth.
 * Returns `true` if execution should proceed, `false` if a loop is detected.
 */
export function checkLoopDepth(correlationId: string, maxDepth: number): boolean {
  cleanupExpiredEntries();

  const existing = loopCounters.get(correlationId);
  const now = Date.now();

  if (existing) {
    existing.count += 1;
    existing.expiresAt = now + LOOP_TTL_MS;
    if (existing.count > maxDepth) {
      logger.warn(
        { correlationId, count: existing.count, maxDepth },
        'Workflow loop depth exceeded — aborting',
      );
      return false;
    }
    return true;
  }

  loopCounters.set(correlationId, { count: 1, expiresAt: now + LOOP_TTL_MS });
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Condition Evaluation ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve a nested field from a payload using dot-notation (e.g. "amount.amount").
 */
function resolveField(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = payload;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    const obj = current as Record<string, unknown>;
    current = obj[part];
  }

  return current;
}

function applyOperator(fieldValue: unknown, operator: ConditionOperator, conditionValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === conditionValue;

    case 'not_equals':
      return fieldValue !== conditionValue;

    case 'gt':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        ? fieldValue > conditionValue
        : String(fieldValue) > String(conditionValue);

    case 'lt':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        ? fieldValue < conditionValue
        : String(fieldValue) < String(conditionValue);

    case 'gte':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        ? fieldValue >= conditionValue
        : String(fieldValue) >= String(conditionValue);

    case 'lte':
      return typeof fieldValue === 'number' && typeof conditionValue === 'number'
        ? fieldValue <= conditionValue
        : String(fieldValue) <= String(conditionValue);

    case 'contains':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        ? fieldValue.includes(conditionValue)
        : false;

    case 'not_contains':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        ? !fieldValue.includes(conditionValue)
        : true;

    case 'starts_with':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        ? fieldValue.startsWith(conditionValue)
        : false;

    case 'ends_with':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        ? fieldValue.endsWith(conditionValue)
        : false;

    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';

    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

    default:
      return false;
  }
}

/**
 * Evaluate an array of conditions against a payload.
 * First condition is always evaluated. Subsequent conditions use their `logic`
 * field (AND / OR) — defaulting to AND.
 */
export function evaluateConditions(
  conditions: WorkflowCondition[],
  payload: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) return true;

  let result = false;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    if (!condition) continue;

    const fieldValue = resolveField(payload, condition.field);
    const conditionResult = applyOperator(fieldValue, condition.operator, condition.value);

    if (i === 0) {
      result = conditionResult;
    } else {
      const logic = condition.logic ?? 'AND';
      if (logic === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Action Execution ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ActionContext {
  tenantId: string;
  actorId: string;
  payload: Record<string, unknown>;
}

async function executeFieldUpdate(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<unknown> {
  logger.info(
    { tenantId: ctx.tenantId, config },
    'Workflow action: field_update (intent logged — cross-module update via service)',
  );
  return { action: 'field_update', config };
}

async function executeRecordCreate(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<unknown> {
  logger.info(
    { tenantId: ctx.tenantId, config },
    'Workflow action: record_create (intent logged — cross-module create via service)',
  );
  return { action: 'record_create', config };
}

async function executeEmailSend(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<unknown> {
  logger.info(
    { tenantId: ctx.tenantId, config },
    'Workflow action: email_send (intent logged — would call comms module)',
  );
  return { action: 'email_send', config };
}

async function executeWebhookCall(
  config: Record<string, unknown>,
  _ctx: ActionContext,
): Promise<unknown> {
  const url = config['url'];
  if (typeof url !== 'string') {
    throw new Error('webhook_call action requires a "url" in config');
  }

  const method = typeof config['method'] === 'string' ? config['method'] : 'POST';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const customHeaders = config['headers'];
  if (customHeaders && typeof customHeaders === 'object' && !Array.isArray(customHeaders)) {
    for (const [k, v] of Object.entries(customHeaders as Record<string, unknown>)) {
      if (typeof v === 'string') {
        headers[k] = v;
      }
    }
  }

  const body = config['body'] !== undefined ? JSON.stringify(config['body']) : undefined;

  const response = await fetch(url, { method, headers, body });
  return { status: response.status, statusText: response.statusText };
}

async function executeNotification(
  config: Record<string, unknown>,
  ctx: ActionContext,
): Promise<unknown> {
  logger.info(
    { tenantId: ctx.tenantId, config },
    'Workflow action: notification (intent logged)',
  );
  return { action: 'notification', config };
}

/**
 * Execute an array of workflow actions. Each action is executed independently;
 * per-action errors are captured in the ActionResult array.
 */
export async function executeActions(
  actions: WorkflowAction[],
  context: ActionContext,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (!action) continue;

    const actionType: ActionType = action.type;
    try {
      let result: unknown;

      switch (actionType) {
        case 'field_update':
          result = await executeFieldUpdate(action.config, context);
          break;
        case 'record_create':
          result = await executeRecordCreate(action.config, context);
          break;
        case 'email_send':
          result = await executeEmailSend(action.config, context);
          break;
        case 'webhook_call':
          result = await executeWebhookCall(action.config, context);
          break;
        case 'notification':
          result = await executeNotification(action.config, context);
          break;
        default: {
          const _exhaustive: never = actionType;
          throw new Error(`Unknown action type: ${String(_exhaustive)}`);
        }
      }

      results.push({ actionIndex: i, type: actionType, status: 'success', result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        { actionIndex: i, actionType, error: message },
        'Workflow action failed',
      );
      results.push({ actionIndex: i, type: actionType, status: 'failed', error: message });
    }
  }

  return results;
}
