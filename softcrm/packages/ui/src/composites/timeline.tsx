import * as React from 'react';
import { cn } from '../utils/cn.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  icon?: React.ReactNode;
  type?: 'default' | 'success' | 'warning' | 'error' | 'info';
  user?: { name: string; avatar?: string };
  metadata?: Record<string, string>;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[];
  orientation?: 'vertical' | 'horizontal';
  showConnector?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const dotColors: Record<NonNullable<TimelineItem['type']>, string> = {
  default: 'bg-neutral-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const dotRingColors: Record<NonNullable<TimelineItem['type']>, string> = {
  default: 'ring-neutral-500/20',
  success: 'ring-emerald-500/20',
  warning: 'ring-amber-500/20',
  error: 'ring-red-500/20',
  info: 'ring-blue-500/20',
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

const TimelineDot: React.FC<{ type: NonNullable<TimelineItem['type']>; icon?: React.ReactNode }> = ({
  type,
  icon,
}) => (
  <div
    className={cn(
      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4',
      dotColors[type],
      dotRingColors[type],
    )}
  >
    {icon ? (
      <span className="text-white [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
    ) : (
      <span className={cn('block h-2.5 w-2.5 rounded-full bg-white/80')} />
    )}
  </div>
);
TimelineDot.displayName = 'TimelineDot';

const TimelineContentCard: React.FC<{
  item: TimelineItem;
  index: number;
}> = ({ item, index }) => (
  <div
    className={cn(
      'glass-1 rounded-lg border border-white/10 p-4 transition-all',
      'animate-in fade-in slide-in-from-bottom-2',
    )}
    style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
  >
    <p className="text-sm font-medium text-neutral-100">{item.title}</p>
    {item.description && (
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{item.description}</p>
    )}

    {/* User */}
    {item.user && (
      <div className="mt-3 flex items-center gap-2">
        {item.user.avatar ? (
          <img
            src={item.user.avatar}
            alt={item.user.name}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-medium text-white">
            {item.user.name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-xs text-neutral-400">{item.user.name}</span>
      </div>
    )}

    {/* Metadata badges */}
    {item.metadata && Object.keys(item.metadata).length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(item.metadata).map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400"
          >
            <span className="mr-1 font-medium text-neutral-300">{key}:</span>
            {value}
          </span>
        ))}
      </div>
    )}
  </div>
);
TimelineContentCard.displayName = 'TimelineContentCard';

/* ------------------------------------------------------------------ */
/*  Vertical layout                                                   */
/* ------------------------------------------------------------------ */

const VerticalTimeline: React.FC<{
  items: TimelineItem[];
  showConnector: boolean;
}> = ({ items, showConnector }) => (
  <div className="relative">
    {/* Connector line */}
    {showConnector && items.length > 1 && (
      <div className="absolute left-[calc(5rem+0.9375rem)] top-4 bottom-4 w-px bg-white/10" />
    )}

    <div className="space-y-6">
      {items.map((item, index) => {
        const type = item.type ?? 'default';
        return (
          <div key={item.id} className="flex items-start gap-4">
            {/* Timestamp */}
            <div className="w-20 shrink-0 pt-1.5 text-right">
              <span className="text-xs text-neutral-500">{formatTimestamp(item.timestamp)}</span>
            </div>

            {/* Dot */}
            <TimelineDot type={type} icon={item.icon} />

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <TimelineContentCard item={item} index={index} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
VerticalTimeline.displayName = 'VerticalTimeline';

/* ------------------------------------------------------------------ */
/*  Horizontal layout                                                 */
/* ------------------------------------------------------------------ */

const HorizontalTimeline: React.FC<{
  items: TimelineItem[];
  showConnector: boolean;
}> = ({ items, showConnector }) => (
  <div className="relative overflow-x-auto pb-4">
    <div className="inline-flex items-start gap-6">
      {items.map((item, index) => {
        const type = item.type ?? 'default';
        return (
          <div key={item.id} className="relative flex w-64 shrink-0 flex-col items-center gap-3">
            {/* Connector */}
            {showConnector && index < items.length - 1 && (
              <div className="absolute left-[calc(50%+1rem)] top-4 h-px w-[calc(100%-2rem+1.5rem)] bg-white/10" />
            )}

            {/* Dot */}
            <TimelineDot type={type} icon={item.icon} />

            {/* Timestamp */}
            <span className="text-xs text-neutral-500">{formatTimestamp(item.timestamp)}</span>

            {/* Content card */}
            <TimelineContentCard item={item} index={index} />
          </div>
        );
      })}
    </div>
  </div>
);
HorizontalTimeline.displayName = 'HorizontalTimeline';

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ items, orientation = 'vertical', showConnector = true, className, ...props }, ref) => (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {orientation === 'vertical' ? (
        <VerticalTimeline items={items} showConnector={showConnector} />
      ) : (
        <HorizontalTimeline items={items} showConnector={showConnector} />
      )}
    </div>
  ),
);
Timeline.displayName = 'Timeline';
