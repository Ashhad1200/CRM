import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number; // 0-100
  color?: string;
  dependencies?: string[];
  group?: string;
}

export interface GanttChartProps extends React.HTMLAttributes<HTMLDivElement> {
  tasks: GanttTask[];
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: GanttTask) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const COL_WIDTH = 36; // px per day column

function toDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((toDay(b).getTime() - toDay(a).getTime()) / DAY_MS);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function computeRange(
  tasks: GanttTask[],
  propStart?: Date,
  propEnd?: Date,
): { start: Date; end: Date; totalDays: number } {
  if (tasks.length === 0) {
    const now = toDay(new Date());
    const s = propStart ? toDay(propStart) : now;
    const e = propEnd ? toDay(propEnd) : addDays(s, 14);
    return { start: s, end: e, totalDays: daysBetween(s, e) + 1 };
  }

  let minDate = propStart ? toDay(propStart) : toDay(tasks[0]!.start);
  let maxDate = propEnd ? toDay(propEnd) : toDay(tasks[0]!.end);

  if (!propStart || !propEnd) {
    for (const t of tasks) {
      const s = toDay(t.start);
      const e = toDay(t.end);
      if (!propStart && s < minDate) minDate = s;
      if (!propEnd && e > maxDate) maxDate = e;
    }
  }

  // Add 1-day padding on each side
  const start = addDays(minDate, -1);
  const end = addDays(maxDate, 1);
  return { start, end, totalDays: daysBetween(start, end) + 1 };
}

/** Group tasks preserving order: ungrouped first, then grouped */
function groupTasks(tasks: GanttTask[]): { group: string | null; tasks: GanttTask[] }[] {
  const result: { group: string | null; tasks: GanttTask[] }[] = [];
  const groupMap = new Map<string, GanttTask[]>();
  const ungrouped: GanttTask[] = [];

  for (const t of tasks) {
    if (t.group) {
      let arr = groupMap.get(t.group);
      if (!arr) {
        arr = [];
        groupMap.set(t.group, arr);
      }
      arr.push(t);
    } else {
      ungrouped.push(t);
    }
  }

  if (ungrouped.length) result.push({ group: null, tasks: ungrouped });
  for (const [group, items] of groupMap) {
    result.push({ group, tasks: items });
  }
  return result;
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function TimelineHeader({
  rangeStart,
  totalDays,
}: {
  rangeStart: Date;
  totalDays: number;
}) {
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));

  // Month spans for upper header
  const months: { label: string; span: number }[] = [];
  let currentMonth = -1;
  for (const d of days) {
    const m = d.getMonth();
    if (m !== currentMonth) {
      months.push({ label: `${MONTH_NAMES_SHORT[m]} ${d.getFullYear()}`, span: 1 });
      currentMonth = m;
    } else {
      const last = months[months.length - 1];
      if (last) last.span++;
    }
  }

  return (
    <div className="sticky top-0 z-10">
      {/* Month row */}
      <div className="flex border-b border-neutral-200">
        {months.map((m, i) => (
          <div
            key={i}
            className="border-r border-neutral-200/60 px-1 py-1 text-center text-[10px] font-semibold text-neutral-600"
            style={{ width: m.span * COL_WIDTH }}
          >
            {m.label}
          </div>
        ))}
      </div>
      {/* Day row */}
      <div className="flex border-b border-neutral-200">
        {days.map((d, i) => {
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={i}
              className={cn(
                'shrink-0 border-r border-neutral-200/60 py-1 text-center text-[10px] text-neutral-400',
                isWeekend && 'bg-neutral-50',
              )}
              style={{ width: COL_WIDTH }}
              title={formatShortDate(d)}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskBar({
  task,
  rangeStart,
  totalDays,
  onClick,
}: {
  task: GanttTask;
  rangeStart: Date;
  totalDays: number;
  onClick?: (t: GanttTask) => void;
}) {
  const offsetDays = daysBetween(rangeStart, toDay(task.start));
  const durationDays = Math.max(1, daysBetween(toDay(task.start), toDay(task.end)) + 1);
  const progress = Math.max(0, Math.min(100, task.progress ?? 0));
  const barColor = task.color ?? '#6366f1';

  const left = offsetDays * COL_WIDTH;
  const width = durationDays * COL_WIDTH;

  return (
    <div
      className="absolute top-1 h-6"
      style={{ left, width }}
    >
      <button
        type="button"
        onClick={() => onClick?.(task)}
        className="group relative h-full w-full overflow-hidden rounded-md shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        title={`${task.name} (${formatShortDate(task.start)} – ${formatShortDate(task.end)})`}
        style={{ backgroundColor: `${barColor}33` }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-md transition-all"
          style={{ width: `${progress}%`, backgroundColor: barColor }}
        />
        {/* Label */}
        <span className="relative z-10 block truncate px-1.5 text-[10px] font-medium leading-6 text-neutral-900">
          {task.name}
        </span>
      </button>
    </div>
  );
}

// ── Gantt Chart ─────────────────────────────────────────────────────────────────

export function GanttChart({
  tasks,
  startDate,
  endDate,
  onTaskClick,
  className,
  ...props
}: GanttChartProps): React.ReactElement {
  const { start: rangeStart, totalDays } = React.useMemo(
    () => computeRange(tasks, startDate, endDate),
    [tasks, startDate, endDate],
  );

  const groups = React.useMemo(() => groupTasks(tasks), [tasks]);
  const timelineWidth = totalDays * COL_WIDTH;
  const taskListWidth = 180;

  // Build flat row list for synchronised rendering
  type Row = { kind: 'group'; label: string } | { kind: 'task'; task: GanttTask };
  const rows: Row[] = [];
  for (const g of groups) {
    if (g.group) rows.push({ kind: 'group', label: g.group });
    for (const t of g.tasks) rows.push({ kind: 'task', task: t });
  }

  return (
    <div
      className={cn('glass-2 overflow-hidden rounded-xl border border-neutral-200', className)}
      {...props}
    >
      <div className="flex">
        {/* ── Left: task names ─────────────────────────────── */}
        <div className="shrink-0 border-r border-neutral-200" style={{ width: taskListWidth }}>
          {/* Header placeholder */}
          <div className="border-b border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600">
            Task
          </div>
          <div className="border-b border-neutral-200 py-1" />

          {/* Rows */}
          {rows.map((row, i) => {
            if (row.kind === 'group') {
              return (
                <div
                  key={`g-${row.label}`}
                  className="flex h-8 items-center bg-neutral-100 px-3 text-xs font-semibold text-neutral-700"
                >
                  {row.label}
                </div>
              );
            }
            return (
              <div
                key={row.task.id}
                className={cn(
                  'glass-1 flex h-8 items-center truncate px-3 text-xs text-neutral-700',
                  i % 2 === 0 ? 'bg-white/40' : 'bg-neutral-50/50',
                )}
              >
                {row.task.name}
              </div>
            );
          })}
        </div>

        {/* ── Right: timeline (scrollable) ────────────────── */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth }}>
            <TimelineHeader rangeStart={rangeStart} totalDays={totalDays} />

            {rows.map((row, i) => {
              if (row.kind === 'group') {
                return (
                  <div
                    key={`tg-${row.label}`}
                    className="h-8 bg-neutral-100 border-b border-neutral-200/60"
                  />
                );
              }

              // Day column lines (weekend shading)
              return (
                <div
                  key={row.task.id}
                  className={cn(
                    'relative h-8 border-b border-neutral-200/40',
                    i % 2 === 0 ? 'bg-white/40' : 'bg-neutral-50/50',
                  )}
                  style={{ width: timelineWidth }}
                >
                  <TaskBar
                    task={row.task}
                    rangeStart={rangeStart}
                    totalDays={totalDays}
                    onClick={onTaskClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

GanttChart.displayName = 'GanttChart';
