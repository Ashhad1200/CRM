import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function toInputValue(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  (
    {
      startDate,
      endDate,
      onRangeChange,
      placeholder = 'Select date range',
      disabled = false,
      className,
    },
    ref,
  ) => {
    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const date = value ? new Date(value + 'T00:00:00') : null;
      onRangeChange(date, endDate);
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const date = value ? new Date(value + 'T00:00:00') : null;
      onRangeChange(startDate, date);
    };

    const hasValue = startDate || endDate;

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex min-w-[280px] items-center gap-2 rounded-lg glass-1 px-3 py-1.5 text-sm shadow-sm transition-colors',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-500',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <div className="relative flex-1">
          {!hasValue && !disabled && (
            <span className="pointer-events-none absolute inset-0 flex items-center text-neutral-400">
              {placeholder}
            </span>
          )}
          <input
            type="date"
            value={toInputValue(startDate)}
            onChange={handleStartChange}
            disabled={disabled}
            title={startDate ? formatDisplay(startDate) : 'Start date'}
            className={cn(
              'w-full bg-transparent text-sm focus:outline-none',
              'disabled:cursor-not-allowed',
              !startDate && 'text-transparent',
            )}
          />
        </div>

        <span className="shrink-0 text-neutral-400" aria-hidden="true">
          →
        </span>

        <div className="relative flex-1">
          <input
            type="date"
            value={toInputValue(endDate)}
            onChange={handleEndChange}
            disabled={disabled}
            title={endDate ? formatDisplay(endDate) : 'End date'}
            className={cn(
              'w-full bg-transparent text-sm focus:outline-none',
              'disabled:cursor-not-allowed',
              !endDate && 'text-transparent',
            )}
          />
        </div>
      </div>
    );
  },
);

DateRangePicker.displayName = 'DateRangePicker';
