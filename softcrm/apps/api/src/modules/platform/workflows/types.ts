/**
 * Workflow Builder module — domain types.
 */

// ── Trigger ────────────────────────────────────────────────────────────────────

export interface WorkflowTrigger {
  type: 'event' | 'cron';
  event?: string;
  cron?: string;
}

// ── Conditions ─────────────────────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export type ConditionLogic = 'AND' | 'OR';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: ConditionLogic;
}

// ── Actions ────────────────────────────────────────────────────────────────────

export type ActionType =
  | 'field_update'
  | 'record_create'
  | 'email_send'
  | 'webhook_call'
  | 'notification';

export interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
}

export interface ActionResult {
  actionIndex: number;
  type: ActionType;
  status: 'success' | 'failed';
  error?: string;
  result?: unknown;
}

// ── Composite types ────────────────────────────────────────────────────────────

export interface WorkflowWithExecutions {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  status: string;
  loopLimit: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  executions: Array<{
    id: string;
    workflowId: string;
    triggerEvent: string;
    triggerPayload: unknown;
    status: string;
    actionResults: ActionResult[];
    error: string | null;
    startedAt: Date;
    finishedAt: Date | null;
  }>;
}

// ── Filters ────────────────────────────────────────────────────────────────────

export interface WorkflowFilters {
  status?: string;
  search?: string;
}
