import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  useWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useActivateWorkflow,
  useDeactivateWorkflow,
  useWorkflowExecutions,
} from '../api-workflows';
import type {
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowAction,
  WorkflowExecution,
} from '../api-workflows';

/* ───────── Constants ───────── */

const EVENT_TYPES = [
  'lead.created',
  'lead.qualified',
  'lead.converted',
  'deal.created',
  'deal.stage_changed',
  'deal.won',
  'deal.lost',
  'quote.accepted',
  'contact.created',
  'contact.updated',
  'invoice.created',
  'invoice.paid',
  'invoice.overdue',
  'payment.received',
  'ticket.created',
  'ticket.resolved',
  'ticket.sla_breached',
  'stock.low',
  'order.fulfilled',
  'email.received',
  'call.completed',
  'campaign.sent',
  'project.created',
  'milestone.completed',
  'time.logged',
] as const;

const OPERATORS = [
  'equals',
  'not_equals',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
] as const;

const ACTION_TYPES = [
  'field_update',
  'record_create',
  'email_send',
  'webhook_call',
  'notification',
] as const;

/* ───────── Helpers ───────── */

function emptyTrigger(): WorkflowTrigger {
  return { type: 'event', event: EVENT_TYPES[0] };
}

function emptyCondition(): WorkflowCondition {
  return { field: '', operator: 'equals', value: '', logic: 'AND' };
}

function emptyAction(): WorkflowAction {
  return { type: 'field_update', config: {} };
}

/* ───────── Sub-components ───────── */

function TriggerCard({
  trigger,
  onChange,
}: {
  trigger: WorkflowTrigger;
  onChange: (t: WorkflowTrigger) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Trigger</h3>

      <div className="mb-3 flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="triggerType"
            value="event"
            checked={trigger.type === 'event'}
            onChange={() => onChange({ type: 'event', event: EVENT_TYPES[0] })}
          />
          Event
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="triggerType"
            value="cron"
            checked={trigger.type === 'cron'}
            onChange={() => onChange({ type: 'cron', cron: '0 9 * * *' })}
          />
          Cron
        </label>
      </div>

      {trigger.type === 'event' ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Event Type</label>
          <select
            value={trigger.event ?? ''}
            onChange={(e) => onChange({ ...trigger, event: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {EVENT_TYPES.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Cron Expression
          </label>
          <input
            type="text"
            value={trigger.cron ?? ''}
            onChange={(e) => onChange({ ...trigger, cron: e.target.value })}
            placeholder="0 9 * * *"
            className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function ConditionCard({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: WorkflowCondition;
  index: number;
  onChange: (c: WorkflowCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Condition {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-500 hover:underline">
          Remove
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Field</label>
          <input
            type="text"
            value={condition.field}
            onChange={(e) => onChange({ ...condition, field: e.target.value })}
            placeholder="e.g. deal.amount"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => onChange({ ...condition, operator: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Value</label>
          <input
            type="text"
            value={String(condition.value ?? '')}
            onChange={(e) => onChange({ ...condition, value: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Logic</label>
          <select
            value={condition.logic ?? 'AND'}
            onChange={(e) =>
              onChange({ ...condition, logic: e.target.value as 'AND' | 'OR' })
            }
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  index,
  onChange,
  onRemove,
}: {
  action: WorkflowAction;
  index: number;
  onChange: (a: WorkflowAction) => void;
  onRemove: () => void;
}) {
  const [configText, setConfigText] = useState(JSON.stringify(action.config, null, 2));

  const handleConfigBlur = () => {
    try {
      const parsed = JSON.parse(configText) as Record<string, unknown>;
      onChange({ ...action, config: parsed });
    } catch {
      // keep raw text; user will fix
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Action {index + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-500 hover:underline">
          Remove
        </button>
      </div>

      <div className="mb-2">
        <label className="mb-1 block text-xs text-gray-500">Action Type</label>
        <select
          value={action.type}
          onChange={(e) => onChange({ ...action, type: e.target.value })}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          {ACTION_TYPES.map((at) => (
            <option key={at} value={at}>
              {at.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-gray-500">Config (JSON)</label>
        <textarea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          onBlur={handleConfigBlur}
          rows={4}
          className="w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function ExecutionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-700',
    FAILURE: 'bg-red-100 text-red-700',
    RUNNING: 'bg-blue-100 text-blue-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

function ExecutionSidebar({ workflowId }: { workflowId: string }) {
  const [exPage, setExPage] = useState(1);
  const { data, isLoading } = useWorkflowExecutions(workflowId, { page: exPage });

  const executions: WorkflowExecution[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">
        Execution Log
      </h3>

      {isLoading && <p className="text-xs text-gray-400">Loading…</p>}

      {executions.length === 0 && !isLoading && (
        <p className="text-xs text-gray-400">No executions yet.</p>
      )}

      {executions.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-1 pr-2">Event</th>
              <th className="pb-1 pr-2">Status</th>
              <th className="pb-1">Started</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((ex) => (
              <tr key={ex.id} className="border-b border-gray-50">
                <td className="py-1.5 pr-2 font-mono">{ex.triggerEvent}</td>
                <td className="py-1.5 pr-2">
                  <ExecutionStatusBadge status={ex.status} />
                </td>
                <td className="py-1.5 text-gray-500">
                  {new Date(ex.startedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div className="mt-2 flex justify-between">
          <button
            onClick={() => setExPage((p) => Math.max(1, p - 1))}
            disabled={exPage <= 1}
            className="text-xs text-blue-600 hover:underline disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-gray-400">
            {exPage}/{totalPages}
          </span>
          <button
            onClick={() => setExPage((p) => Math.min(totalPages, p + 1))}
            disabled={exPage >= totalPages}
            className="text-xs text-blue-600 hover:underline disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────── Main Page ───────── */

export default function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: existing, isLoading } = useWorkflow(id ?? '');
  const createMut = useCreateWorkflow();
  const updateMut = useUpdateWorkflow(id ?? '');
  const activateMut = useActivateWorkflow();
  const deactivateMut = useDeactivateWorkflow();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<WorkflowTrigger>(emptyTrigger());
  const [conditions, setConditions] = useState<WorkflowCondition[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([emptyAction()]);
  const [loopLimit, setLoopLimit] = useState(10);
  const [status, setStatus] = useState('INACTIVE');

  // Populate form when existing workflow loads
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setTrigger(existing.trigger);
      setConditions(existing.conditions);
      setActions(existing.actions.length > 0 ? existing.actions : [emptyAction()]);
      setLoopLimit(existing.loopLimit);
      setStatus(existing.status);
    }
  }, [existing]);

  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    const payload = {
      name,
      description: description || null,
      trigger,
      conditions,
      actions,
      loopLimit,
    };

    if (isNew) {
      createMut.mutate(payload, {
        onSuccess: (res) => navigate(`/admin/workflows/${res.data.id}`),
      });
    } else {
      updateMut.mutate(payload);
    }
  };

  const handleToggleStatus = () => {
    if (!id || isNew) return;
    if (status === 'ACTIVE') {
      deactivateMut.mutate(id, { onSuccess: () => setStatus('INACTIVE') });
    } else {
      activateMut.mutate(id, { onSuccess: () => setStatus('ACTIVE') });
    }
  };

  const updateCondition = (index: number, updated: WorkflowCondition) => {
    setConditions((prev) => prev.map((c, i) => (i === index ? updated : c)));
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updated: WorkflowAction) => {
    setActions((prev) => prev.map((a, i) => (i === index ? updated : a)));
  };

  const removeAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isNew && isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-gray-500">Loading workflow…</p>
      </div>
    );
  }

  const isActive = status === 'ACTIVE';
  const toggling = activateMut.isPending || deactivateMut.isPending;

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/workflows"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? 'New Workflow' : 'Edit Workflow'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                isActive
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {toggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {(createMut.isError || updateMut.isError) && (
        <p className="mb-4 text-sm text-red-600">
          {(createMut.error ?? updateMut.error)?.message}
        </p>
      )}

      <div className="flex gap-6">
        {/* Main editor */}
        <div className="flex-1 space-y-5">
          {/* Name & Description */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workflow name"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional description"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Loop Limit
              </label>
              <input
                type="number"
                value={loopLimit}
                onChange={(e) => setLoopLimit(Number(e.target.value))}
                min={1}
                max={1000}
                className="w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Trigger */}
          <TriggerCard trigger={trigger} onChange={setTrigger} />

          {/* Conditions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-gray-500">Conditions</h3>
              <button
                onClick={() => setConditions((prev) => [...prev, emptyCondition()])}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Add Condition
              </button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs text-gray-400">
                No conditions — workflow triggers on every matching event.
              </p>
            )}
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <ConditionCard
                  key={i}
                  condition={c}
                  index={i}
                  onChange={(updated) => updateCondition(i, updated)}
                  onRemove={() => removeCondition(i)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase text-gray-500">Actions</h3>
              <button
                onClick={() => setActions((prev) => [...prev, emptyAction()])}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                + Add Action
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((a, i) => (
                <ActionCard
                  key={i}
                  action={a}
                  index={i}
                  onChange={(updated) => updateAction(i, updated)}
                  onRemove={() => removeAction(i)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar — execution log */}
        {!isNew && id && (
          <div className="w-80 shrink-0">
            <ExecutionSidebar workflowId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
