import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../utils/cn.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  group?: string;
  onSelect: () => void;
  keywords?: string[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  emptyMessage?: string;
  recentItems?: CommandItem[];
  /** Initial search value when palette opens */
  initialSearch?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple fuzzy match: all characters of `query` appear in order in `target`. */
function fuzzyMatch(query: string, target: string): boolean {
  const lower = target.toLowerCase();
  let j = 0;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i]!;
    const idx = lower.indexOf(ch, j);
    if (idx === -1) return false;
    j = idx + 1;
  }
  return true;
}

function matchesItem(query: string, item: CommandItem): boolean {
  const q = query.toLowerCase();
  if (fuzzyMatch(q, item.label)) return true;
  if (item.description && fuzzyMatch(q, item.description)) return true;
  if (item.keywords?.some((kw) => fuzzyMatch(q, kw))) return true;
  return false;
}

/** Group items by their `group` field, preserving insertion order. */
function groupItems(items: CommandItem[]): Map<string, CommandItem[]> {
  const map = new Map<string, CommandItem[]>();
  for (const item of items) {
    const key = item.group ?? '';
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-5 w-5 shrink-0 text-neutral-400"
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
      clipRule="evenodd"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
  placeholder = 'Type a command…',
  emptyMessage = 'No results found.',
  recentItems,
  initialSearch = '',
}) => {
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Reset state when the dialog opens / closes
  React.useEffect(() => {
    if (open) {
      setQuery(initialSearch);
      setActiveIndex(0);
    }
  }, [open, initialSearch]);

  // Build the flat list of visible items
  const visibleItems = React.useMemo<CommandItem[]>(() => {
    if (query === '') {
      if (recentItems && recentItems.length > 0) return recentItems;
      return items;
    }
    return items.filter((item) => matchesItem(query, item));
  }, [query, items, recentItems]);

  // Clamp active index when results change
  React.useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(visibleItems.length - 1, 0)));
  }, [visibleItems.length]);

  // Scroll the active item into view
  React.useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Grouped items for rendering
  const groups = React.useMemo(() => {
    if (query === '' && recentItems && recentItems.length > 0) {
      return new Map([['Recent', recentItems]]);
    }
    return groupItems(visibleItems);
  }, [query, visibleItems, recentItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % visibleItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + visibleItems.length) % visibleItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      visibleItems[activeIndex]?.onSelect();
      onOpenChange(false);
    }
  };

  // Map from item id → flat index (so grouped rendering can set data-active)
  let flatIndex = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />

        <DialogPrimitive.Content
          aria-label="Command palette"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            'fixed left-[50%] top-[33%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'rounded-2xl glass-3 shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-4',
            'flex flex-col overflow-hidden',
          )}
          onKeyDown={handleKeyDown}
        >
          {/* ── Search input ─────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3">
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={placeholder}
              className={cn(
                'flex-1 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400',
                'outline-none border-none',
              )}
            />
          </div>

          {/* ── Separator ────────────────────────────────────── */}
          <div className="h-px bg-neutral-200/60" />

          {/* ── Results ──────────────────────────────────────── */}
          <div ref={listRef} className="max-h-72 overflow-y-auto p-2" role="listbox">
            {visibleItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">{emptyMessage}</p>
            ) : (
              Array.from(groups.entries()).map(([groupLabel, groupItems]) => (
                <div key={groupLabel} role="group" aria-label={groupLabel || undefined}>
                  {groupLabel && (
                    <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {groupLabel}
                    </p>
                  )}
                  {groupItems.map((item) => {
                    flatIndex++;
                    const isActive = flatIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        onClick={() => {
                          item.onSelect();
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => {
                          // Keep flatIndex in sync — recalculate from item id
                          const idx = visibleItems.findIndex((v) => v.id === item.id);
                          if (idx !== -1) setActiveIndex(idx);
                        }}
                        className={cn(
                          'flex w-full cursor-default select-none items-center gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors',
                          isActive
                            ? 'bg-brand-500/10 text-brand-700'
                            : 'text-neutral-700 hover:bg-neutral-100',
                        )}
                      >
                        {item.icon && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-neutral-500">
                            {item.icon}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">{item.label}</span>
                          {item.description && (
                            <span className="truncate text-xs text-neutral-500">
                              {item.description}
                            </span>
                          )}
                        </span>
                        {item.shortcut && (
                          <kbd
                            className={cn(
                              'ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-mono',
                              'glass-1 text-neutral-500',
                            )}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

CommandPalette.displayName = 'CommandPalette';
