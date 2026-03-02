import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface DashboardWidget {
  id: string;
  title: string;
  /** Number of columns to span (1-4, default 1) */
  colSpan?: number;
  /** Number of rows to span (1-3, default 1) */
  rowSpan?: number;
  content: React.ReactNode;
}

export interface DashboardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  widgets: DashboardWidget[];
  /** Number of grid columns (default 4) */
  columns?: number;
  /** Gap between widgets in px (default 16) */
  gap?: number;
  /** Shows drag handles and remove buttons */
  editable?: boolean;
  onRemoveWidget?: (id: string) => void;
}

// ── Icons ───────────────────────────────────────────────────────────────────────

const DragHandleIcon: React.FC = () => (
  <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="3" r="1.5" />
    <circle cx="11" cy="3" r="1.5" />
    <circle cx="5" cy="8" r="1.5" />
    <circle cx="11" cy="8" r="1.5" />
    <circle cx="5" cy="13" r="1.5" />
    <circle cx="11" cy="13" r="1.5" />
  </svg>
);

const RemoveIcon: React.FC = () => (
  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

// ── Widget Card ─────────────────────────────────────────────────────────────────

interface WidgetCardProps {
  widget: DashboardWidget;
  editable: boolean;
  onRemove?: () => void;
}

const WidgetCard: React.FC<WidgetCardProps> = ({ widget, editable, onRemove }) => {
  return (
    <div
      className="glass-2 flex flex-col rounded-xl"
      style={{
        gridColumn: `span ${Math.min(widget.colSpan ?? 1, 4)}`,
        gridRow: `span ${Math.min(widget.rowSpan ?? 1, 3)}`,
      }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-neutral-200/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-700">{widget.title}</h3>
        {editable && (
          <div className="flex items-center gap-1.5">
            <span className="cursor-grab p-1" aria-label="Drag to reorder">
              <DragHandleIcon />
            </span>
            <button
              type="button"
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-danger-600"
              onClick={onRemove}
              aria-label={`Remove ${widget.title}`}
            >
              <RemoveIcon />
            </button>
          </div>
        )}
      </div>

      {/* Widget content */}
      <div className="flex-1 overflow-auto p-4">{widget.content}</div>
    </div>
  );
};

// ── Dashboard Grid ──────────────────────────────────────────────────────────────

export const DashboardGrid = React.forwardRef<HTMLDivElement, DashboardGridProps>(
  (
    { widgets, columns = 4, gap = 16, editable = false, onRemoveWidget, className, style, ...props },
    ref,
  ) => {
    const gridId = React.useId();

    return (
      <>
        <style>{`
          @media (min-width: 1024px) {
            #${CSS.escape(gridId)} {
              grid-template-columns: repeat(${columns}, minmax(0, 1fr)) !important;
            }
          }
        `}</style>
        <div
          ref={ref}
          id={gridId}
          className={cn(
            'grid grid-cols-1 md:grid-cols-2',
            className,
          )}
          style={{ gap: `${gap}px`, ...style }}
          {...props}
        >
          {widgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              editable={editable}
              onRemove={onRemoveWidget ? () => onRemoveWidget(widget.id) : undefined}
            />
          ))}
        </div>
      </>
    );
  },
);

DashboardGrid.displayName = 'DashboardGrid';
