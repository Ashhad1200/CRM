import { useState, useMemo } from 'react';
import {
  useProductionSchedule,
  useWorkCenters,
  useRescheduleEntry,
  type ProductionScheduleEntry,
  type WorkCenter,
} from '../api';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(date: Date | undefined): string {
  if (!date) return new Date().toISOString().split('T')[0]!; return date.toISOString().split('T')[0]!;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(start, i));
  }
  return dates;
}

interface ScheduleBarProps {
  entry: ProductionScheduleEntry;
  weekStart: Date;
  onReschedule: (entry: ProductionScheduleEntry) => void;
}

function ScheduleBar({ entry, weekStart, onReschedule }: ScheduleBarProps) {
  const start = new Date(entry.scheduledStart);
  const end = new Date(entry.scheduledEnd);

  // Calculate position within the week (7 days)
  const weekStartTime = weekStart.getTime();
  const weekEndTime = addDays(weekStart, 7).getTime();

  const barStart = Math.max(start.getTime(), weekStartTime);
  const barEnd = Math.min(end.getTime(), weekEndTime);

  if (barEnd <= barStart) return null;

  const totalWeekMs = weekEndTime - weekStartTime;
  const leftPercent = ((barStart - weekStartTime) / totalWeekMs) * 100;
  const widthPercent = ((barEnd - barStart) / totalWeekMs) * 100;

  const colors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    delayed: 'bg-red-500',
  };

  const bgColor = colors[entry.status.toLowerCase()] ?? 'bg-gray-400';

  return (
    <div
      className={`absolute h-6 rounded cursor-pointer ${bgColor} hover:opacity-80 transition-opacity`}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 1)}%`,
        top: '4px',
      }}
      onClick={() => onReschedule(entry)}
      title={`${entry.workOrder?.workOrderNumber ?? 'WO'} - ${formatTime(entry.scheduledStart)} to ${formatTime(entry.scheduledEnd)}`}
    >
      <span className="truncate text-xs font-medium text-white px-1 leading-6 block">
        {entry.workOrder?.workOrderNumber ?? entry.workOrderId.slice(0, 6)}
      </span>
    </div>
  );
}

function GanttChart({
  entries,
  workCenters,
  weekStart,
  onReschedule,
}: {
  entries: ProductionScheduleEntry[];
  workCenters: WorkCenter[];
  weekStart: Date;
  onReschedule: (entry: ProductionScheduleEntry) => void;
}) {
  const weekDates = getWeekDates(weekStart);

  const entriesByWorkCenter = useMemo(() => {
    const map = new Map<string, ProductionScheduleEntry[]>();
    for (const wc of workCenters) {
      map.set(wc.id, []);
    }
    for (const entry of entries) {
      const list = map.get(entry.workCenterId);
      if (list) {
        list.push(entry);
      }
    }
    return map;
  }, [entries, workCenters]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="flex border-b border-gray-200">
          <div className="w-40 shrink-0 border-r border-gray-200 p-2 text-xs font-semibold text-gray-500">
            Work Center
          </div>
          <div className="flex flex-1">
            {weekDates.map((date) => (
              <div
                key={date.toISOString()}
                className={`flex-1 border-r border-gray-200 p-2 text-center text-xs font-semibold ${
                  date.getDay() === 0 || date.getDay() === 6
                    ? 'bg-gray-50 text-gray-400'
                    : 'text-gray-700'
                }`}
              >
                <div>{DAY_NAMES[date.getDay()]}</div>
                <div>{date.getDate()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {workCenters.map((wc) => (
          <div key={wc.id} className="flex border-b border-gray-100">
            <div className="w-40 shrink-0 border-r border-gray-200 p-2 text-sm font-medium text-gray-900">
              {wc.name}
            </div>
            <div className="relative flex-1 h-10">
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {weekDates.map((date, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 border-r border-gray-100 ${
                      date.getDay() === 0 || date.getDay() === 6
                        ? 'bg-gray-50'
                        : ''
                    }`}
                  />
                ))}
              </div>
              {/* Schedule bars */}
              {entriesByWorkCenter.get(wc.id)?.map((entry) => (
                <ScheduleBar
                  key={entry.id}
                  entry={entry}
                  weekStart={weekDates[0]!}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
          </div>
        ))}

        {workCenters.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            No work centers configured.
          </div>
        )}
      </div>
    </div>
  );
}

function RescheduleDialog({
  entry,
  onClose,
  onSave,
}: {
  entry: ProductionScheduleEntry;
  onClose: () => void;
  onSave: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(entry.scheduledStart.slice(0, 16));
  const [end, setEnd] = useState(entry.scheduledEnd.slice(0, 16));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(new Date(start).toISOString(), new Date(end).toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Reschedule Entry
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Work Order:{' '}
          <span className="font-medium">
            {entry.workOrder?.workOrderNumber ?? entry.workOrderId.slice(0, 8)}
          </span>
        </p>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Start
        </label>
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
          className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          End
        </label>
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function CalendarView({
  entries,
  currentDate,
  onDateClick,
}: {
  entries: ProductionScheduleEntry[];
  currentDate: Date;
  onDateClick: (date: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const entriesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const date = new Date(entry.scheduledStart).toDateString();
      map.set(date, (map.get(date) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-4 text-center text-lg font-semibold text-gray-900">
        {currentDate.toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
        {DAY_NAMES.map((day) => (
          <div key={day} className="p-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="h-16" />;
          }
          const date = new Date(year, month, day);
          const count = entriesByDate.get(date.toDateString()) ?? 0;
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={idx}
              onClick={() => onDateClick(date)}
              className={`h-16 cursor-pointer rounded border p-1 text-sm hover:bg-blue-50 ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-700">{day}</div>
              {count > 0 && (
                <div className="mt-1 rounded bg-blue-100 px-1 text-xs text-blue-700">
                  {count} scheduled
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductionSchedulePage() {
  const [viewMode, setViewMode] = useState<'gantt' | 'calendar'>('gantt');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rescheduleEntry, setRescheduleEntry] =
    useState<ProductionScheduleEntry | null>(null);

  const { data: scheduleData, isLoading, isError, error, refetch } =
    useProductionSchedule();
  const { data: workCentersData } = useWorkCenters();
  const reschedule = useRescheduleEntry();

  const entries = scheduleData?.data ?? [];
  const workCenters = (workCentersData?.data ?? []).filter(
    (wc) => wc.status === 'ACTIVE'
  );

  const handlePrevWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleReschedule = (start: string, end: string) => {
    if (rescheduleEntry) {
      reschedule.mutate(
        { id: rescheduleEntry.id, scheduledStart: start, scheduledEnd: end },
        {
          onSuccess: () => {
            setRescheduleEntry(null);
            void refetch();
          },
        }
      );
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Production Schedule</h1>

        <div className="flex items-center gap-4">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'gantt'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Gantt
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Calendar
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'gantt' ? handlePrevWeek : handlePrevMonth}
              className="rounded border border-gray-300 p-1.5 hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={handleToday}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={viewMode === 'gantt' ? handleNextWeek : handleNextMonth}
              className="rounded border border-gray-300 p-1.5 hover:bg-gray-50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-500" />
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500" />
          <span className="text-gray-600">Delayed</span>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {isError && <p className="text-red-600">{error.message}</p>}

      {rescheduleEntry && (
        <RescheduleDialog
          entry={rescheduleEntry}
          onClose={() => setRescheduleEntry(null)}
          onSave={handleReschedule}
        />
      )}

      {!isLoading && viewMode === 'gantt' && (
        <div className="rounded-lg border bg-white">
          <GanttChart
            entries={entries}
            workCenters={workCenters}
            weekStart={currentDate}
            onReschedule={setRescheduleEntry}
          />
        </div>
      )}

      {!isLoading && viewMode === 'calendar' && (
        <CalendarView
          entries={entries}
          currentDate={currentDate}
          onDateClick={(date) => {
            setCurrentDate(date);
            setViewMode('gantt');
          }}
        />
      )}

      {/* Summary */}
      {!isLoading && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
            <p className="text-sm text-gray-500">Total Scheduled</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {entries.filter((e) => e.status === 'SCHEDULED').length}
            </p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {entries.filter((e) => e.status === 'IN_PROGRESS').length}
            </p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
          <div className="rounded-lg border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {entries.filter((e) => e.status === 'COMPLETED').length}
            </p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      )}
    </div>
  );
}
