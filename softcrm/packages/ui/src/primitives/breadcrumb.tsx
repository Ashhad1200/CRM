import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation href (optional - last item typically has no href) */
  href?: string;
  /** Icon (optional) */
  icon?: React.ReactNode;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between items (default: /) */
  separator?: React.ReactNode;
  /** Custom navigation handler */
  onNavigate?: (href: string) => void;
  /** Max items to show (collapses middle items if exceeded) */
  maxItems?: number;
}

const ChevronRight = () => (
  <svg
    className="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator,
  onNavigate,
  maxItems = 5,
  className,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent, href: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
    }
  };

  // Collapse middle items if too many
  let displayItems = items;
  let collapsed = false;
  if (maxItems && items.length > maxItems) {
    const first = items.slice(0, 1);
    const last = items.slice(-(maxItems - 2));
    displayItems = [...first, { label: '...', href: undefined }, ...last];
    collapsed = true;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-sm', className)}
      {...props}
    >
      <ol className="flex items-center gap-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isCollapsed = collapsed && index === 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span className="mx-1" aria-hidden="true">
                  {separator || <ChevronRight />}
                </span>
              )}
              {isCollapsed ? (
                <span className="text-neutral-400 dark:text-neutral-500 px-1">
                  {item.label}
                </span>
              ) : item.href && !isLast ? (
                <a
                  href={item.href}
                  onClick={(e) => handleClick(e, item.href!)}
                  className={cn(
                    'flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors',
                    'text-neutral-600 dark:text-neutral-400',
                    'hover:text-neutral-900 dark:hover:text-neutral-100',
                    'hover:bg-neutral-100 dark:hover:bg-white/10',
                  )}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </a>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1.5 px-1.5 py-0.5',
                    isLast
                      ? 'font-medium text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-600 dark:text-neutral-400',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumb.displayName = 'Breadcrumb';
