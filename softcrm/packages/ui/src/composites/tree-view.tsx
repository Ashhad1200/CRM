import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: unknown;
  disabled?: boolean;
}

export interface TreeViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'onToggle'> {
  nodes: TreeNode[];
  expandedIds?: Set<string>;
  onToggle?: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string, node: TreeNode) => void;
  defaultExpandAll?: boolean;
  showLines?: boolean;
  indent?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function collectAllIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      if (n.children?.length) {
        ids.push(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

/** Flatten tree in document order for keyboard navigation. */
function flattenVisible(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const flat: TreeNode[] = [];
  const walk = (list: TreeNode[]) => {
    for (const n of list) {
      flat.push(n);
      if (n.children?.length && expanded.has(n.id)) {
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return flat;
}

// ── Chevron Icon ────────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn(
        'h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200',
        open && 'rotate-90',
      )}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Tree Item ───────────────────────────────────────────────────────────────────

function TreeItem({
  node,
  depth,
  expanded,
  selected,
  showLines,
  indent,
  focusedId,
  onToggle,
  onSelect,
  onFocus,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  selected?: string;
  showLines: boolean;
  indent: number;
  focusedId: string | null;
  onToggle: (id: string) => void;
  onSelect?: (id: string, node: TreeNode) => void;
  onFocus: (id: string) => void;
}) {
  const hasChildren = !!node.children?.length;
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const isFocused = focusedId === node.id;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected}>
      <div
        data-tree-id={node.id}
        tabIndex={isFocused ? 0 : -1}
        className={cn(
          'group flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors outline-none',
          isSelected
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'text-neutral-700 hover:glass-1 hover:bg-neutral-500/5',
          node.disabled && 'pointer-events-none opacity-40',
          'focus-visible:ring-2 focus-visible:ring-brand-500/40',
        )}
        style={{ paddingLeft: `${depth * indent + 8}px` }}
        onClick={() => {
          if (node.disabled) return;
          if (hasChildren) onToggle(node.id);
          onSelect?.(node.id, node);
          onFocus(node.id);
        }}
        onFocus={() => onFocus(node.id)}
      >
        {/* Toggle chevron or spacer */}
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            className="flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            <Chevron open={isExpanded} />
          </button>
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}

        {node.icon && <span className="shrink-0">{node.icon}</span>}
        <span className="truncate">{node.label}</span>
      </div>

      {/* Children with animated expand/collapse */}
      {hasChildren && (
        <ul
          role="group"
          className={cn(
            'overflow-hidden transition-[max-height] duration-200 ease-in-out',
            isExpanded ? 'max-h-[9999px]' : 'max-h-0',
            showLines && 'relative',
          )}
        >
          {/* Connector line */}
          {showLines && isExpanded && (
            <span
              className="absolute top-0 bottom-0 border-l border-neutral-200"
              style={{ left: `${depth * indent + 16}px` }}
              aria-hidden
            />
          )}
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selected={selected}
              showLines={showLines}
              indent={indent}
              focusedId={focusedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── TreeView ────────────────────────────────────────────────────────────────────

export function TreeView({
  nodes,
  expandedIds: controlledExpanded,
  onToggle: controlledToggle,
  selectedId,
  onSelect,
  defaultExpandAll = false,
  showLines = true,
  indent = 20,
  className,
  ...rest
}: TreeViewProps): React.ReactElement {
  // Uncontrolled expanded state
  const [internalExpanded, setInternalExpanded] = React.useState<Set<string>>(
    () => (defaultExpandAll ? new Set(collectAllIds(nodes)) : new Set()),
  );

  const expanded = controlledExpanded ?? internalExpanded;

  const handleToggle = (id: string) => {
    if (controlledToggle) {
      controlledToggle(id);
    } else {
      setInternalExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  // Keyboard focus tracking
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLUListElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedId) return;

    const visible = flattenVisible(nodes, expanded);
    const idx = visible.findIndex((n) => n.id === focusedId);
    if (idx === -1) return;

    const current = visible[idx];
    if (!current) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = visible[idx + 1];
        if (next) focusNode(next.id);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = visible[idx - 1];
        if (prev) focusNode(prev.id);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (current.children?.length && !expanded.has(current.id)) {
          handleToggle(current.id);
        } else if (current.children?.length) {
          // Move to first child
          const firstChild = current.children[0];
          if (firstChild) focusNode(firstChild.id);
        }
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (current.children?.length && expanded.has(current.id)) {
          handleToggle(current.id);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (!current.disabled) {
          onSelect?.(current.id, current);
        }
        break;
      }
    }
  };

  const focusNode = (id: string) => {
    setFocusedId(id);
    const el = rootRef.current?.querySelector(`[data-tree-id="${id}"]`) as HTMLElement | null;
    el?.focus();
  };

  return (
    <div className={cn('text-sm', className)} {...rest}>
      <ul
        ref={rootRef}
        role="tree"
        onKeyDown={handleKeyDown}
        className="space-y-0.5"
      >
        {nodes.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            selected={selectedId}
            showLines={showLines}
            indent={indent}
            focusedId={focusedId}
            onToggle={handleToggle}
            onSelect={onSelect}
            onFocus={setFocusedId}
          />
        ))}
      </ul>
    </div>
  );
}
