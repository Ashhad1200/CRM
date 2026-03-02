import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
}

const TrendArrow: React.FC<{ trend: 'up' | 'down' | 'flat' }> = ({ trend }) => {
  if (trend === 'up') {
    return (
      <svg className="inline-block h-3.5 w-3.5 text-success-600" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M8 3l4 4M8 3 4 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg className="inline-block h-3.5 w-3.5 text-danger-600" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 13V3M8 13l4-4M8 13l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="inline-block h-3.5 w-3.5 text-neutral-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, change, changeLabel, icon, trend, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('glass-2 relative rounded-xl p-5', className)}
        {...props}
      >
        {/* Top row: label + icon */}
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-neutral-500">{label}</span>
          {icon && <span className="text-neutral-400">{icon}</span>}
        </div>

        {/* Value */}
        <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          {value}
        </div>

        {/* Change + trend */}
        {(change !== undefined || trend) && (
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            {trend && <TrendArrow trend={trend} />}
            {change !== undefined && (
              <span
                className={cn(
                  'font-medium',
                  change > 0 && 'text-success-600',
                  change < 0 && 'text-danger-600',
                  change === 0 && 'text-neutral-500',
                )}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </span>
            )}
            {changeLabel && (
              <span className="text-neutral-400">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    );
  },
);

StatCard.displayName = 'StatCard';
