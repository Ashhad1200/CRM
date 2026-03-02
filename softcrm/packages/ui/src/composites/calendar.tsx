import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  allDay?: boolean;
}

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  events?: CalendarEvent[];
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const days: Date[] = [];
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    days.push(new Date(year, month, 1 + i));
  }
  return days;
}

function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => {
    const s = new Date(e.start);
    const end = new Date(e.end);
    s.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const d = new Date(day);
    d.setHours(12, 0, 0, 0);
    return d >= s && d <= end;
  });
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {children}
    </button>
  );
}

function ViewToggle({
  current,
  onChange,
}: {
  current: CalendarView;
  onChange: (v: CalendarView) => void;
}) {
  const views: CalendarView[] = ['month', 'week', 'day'];
  return (
    <div className="inline-flex rounded-md bg-neutral-100 p-0.5">
      {views.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-xs font-medium capitalize transition-colors',
            v === current
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function EventPill({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-opacity hover:opacity-80"
      style={{ backgroundColor: event.color ?? '#6366f1', color: '#fff' }}
      title={event.title}
    >
      <span className="truncate">{event.title}</span>
    </button>
  );
}

// ── Month View ──────────────────────────────────────────────────────────────────

function MonthView({
  date,
  events,
  selectedDate,
  today,
  onDateSelect,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  today: Date;
  onDateSelect?: (d: Date) => void;
  onEventClick?: (e: CalendarEvent) => void;
}) {
  const grid = getMonthGrid(date.getFullYear(), date.getMonth());

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 border-b border-neutral-200">
        {DAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-neutral-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const isCurrentMonth = day.getMonth() === date.getMonth();
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const dayEvents = eventsForDay(events, day);

          return (
            <button
              type="button"
              key={i}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'glass-1 flex min-h-[5rem] flex-col border-b border-r border-neutral-200/60 p-1 text-left transition-colors hover:bg-neutral-50',
                !isCurrentMonth && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isSelected && 'bg-brand-500 text-white',
                  isToday && !isSelected && 'ring-2 ring-brand-500 text-brand-600',
                  !isSelected && !isToday && 'text-neutral-700',
                )}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventPill key={ev.id} event={ev} onClick={onEventClick} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[10px] text-neutral-400">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ───────────────────────────────────────────────────────────────────

function WeekView({
  date,
  events,
  selectedDate,
  today,
  onDateSelect,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  today: Date;
  onDateSelect?: (d: Date) => void;
  onEventClick?: (e: CalendarEvent) => void;
}) {
  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-neutral-200">
        <div />
        {weekDays.map((d, i) => {
          const isToday = isSameDay(d, today);
          const isSelected = isSameDay(d, selectedDate);
          return (
            <button
              type="button"
              key={i}
              onClick={() => onDateSelect?.(d)}
              className="flex flex-col items-center py-2 text-center"
            >
              <span className="text-xs text-neutral-500">{DAY_LABELS[d.getDay()]}</span>
              <span
                className={cn(
                  'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                  isSelected && 'bg-brand-500 text-white',
                  isToday && !isSelected && 'ring-2 ring-brand-500 text-brand-600',
                  !isSelected && !isToday && 'text-neutral-700',
                )}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid max-h-[32rem] grid-cols-[3.5rem_repeat(7,1fr)] overflow-y-auto">
        {HOURS.map((h) => (
          <React.Fragment key={h}>
            <div className="border-b border-neutral-200/60 px-1 py-2 text-right text-[10px] text-neutral-400">
              {formatHour(h)}
            </div>
            {weekDays.map((d, di) => {
              const slotEvents = eventsForDay(events, d).filter((e) => {
                const start = new Date(e.start);
                return start.getHours() === h;
              });
              return (
                <div
                  key={di}
                  className="glass-1 border-b border-r border-neutral-200/60 p-0.5"
                >
                  {slotEvents.map((ev) => (
                    <EventPill key={ev.id} event={ev} onClick={onEventClick} />
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Day View ────────────────────────────────────────────────────────────────────

function DayView({
  date,
  events,
  today,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  today: Date;
  onEventClick?: (e: CalendarEvent) => void;
}) {
  const isToday = isSameDay(date, today);
  const dayEvents = eventsForDay(events, date);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2">
        <span className="text-xs text-neutral-500">{DAY_LABELS[date.getDay()]}</span>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
            isToday && 'ring-2 ring-brand-500 text-brand-600',
          )}
        >
          {date.getDate()}
        </span>
      </div>
      <div className="max-h-[32rem] overflow-y-auto">
        {HOURS.map((h) => {
          const slotEvents = dayEvents.filter((e) => new Date(e.start).getHours() === h);
          return (
            <div key={h} className="grid grid-cols-[3.5rem_1fr] border-b border-neutral-200/60">
              <div className="px-1 py-3 text-right text-[10px] text-neutral-400">
                {formatHour(h)}
              </div>
              <div className="glass-1 flex flex-col gap-0.5 p-1">
                {slotEvents.map((ev) => (
                  <EventPill key={ev.id} event={ev} onClick={onEventClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Calendar ────────────────────────────────────────────────────────────────────

export function Calendar({
  events = [],
  view: controlledView,
  onViewChange,
  selectedDate: controlledSelected,
  onDateChange,
  onEventClick,
  onDateSelect,
  className,
  ...props
}: CalendarProps): React.ReactElement {
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [internalView, setInternalView] = React.useState<CalendarView>('month');
  const view = controlledView ?? internalView;
  const handleViewChange = (v: CalendarView) => {
    setInternalView(v);
    onViewChange?.(v);
  };

  const [internalDate, setInternalDate] = React.useState<Date>(today);
  const currentDate = controlledSelected ?? internalDate;
  const handleDateChange = (d: Date) => {
    setInternalDate(d);
    onDateChange?.(d);
  };

  const handleDateSelect = (d: Date) => {
    handleDateChange(d);
    onDateSelect?.(d);
  };

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    handleDateChange(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    handleDateChange(d);
  };

  const title =
    view === 'day'
      ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
      : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div
      className={cn('glass-2 overflow-hidden rounded-xl border border-neutral-200', className)}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-1">
          <NavButton onClick={navigatePrev} label="Previous">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NavButton>
          <h2 className="min-w-[10rem] text-center text-sm font-semibold text-neutral-800">
            {title}
          </h2>
          <NavButton onClick={navigateNext} label="Next">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NavButton>
        </div>
        <ViewToggle current={view} onChange={handleViewChange} />
      </div>

      {/* Body */}
      {view === 'month' && (
        <MonthView
          date={currentDate}
          events={events}
          selectedDate={currentDate}
          today={today}
          onDateSelect={handleDateSelect}
          onEventClick={onEventClick}
        />
      )}
      {view === 'week' && (
        <WeekView
          date={currentDate}
          events={events}
          selectedDate={currentDate}
          today={today}
          onDateSelect={handleDateSelect}
          onEventClick={onEventClick}
        />
      )}
      {view === 'day' && (
        <DayView
          date={currentDate}
          events={events}
          today={today}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}

Calendar.displayName = 'Calendar';
