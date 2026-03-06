import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '../utils/cn.js';

// ── Inline Edit Cell ────────────────────────────────────────────────────────────

function InlineEditCell({
  value,
  onSave,
}: {
  value: unknown;
  onSave: (value: unknown) => void;
}): React.ReactElement {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value ?? ''));
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <span
        onDoubleClick={() => {
          setDraft(String(value ?? ''));
          setEditing(true);
        }}
        className="cursor-text"
      >
        {String(value ?? '')}
      </span>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft !== String(value ?? '')) onSave(draft);
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      className="h-7 w-full rounded border border-brand-300 bg-white/80 px-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  );
}

// ── Types ───────────────────────────────────────────────────────────────────────

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: TData[]) => void;
  onCellEdit?: (rowIndex: number, columnId: string, value: unknown) => void;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  onExport?: (data: TData[]) => void;
  pageSize?: number;
  /** Enable virtual scrolling for large datasets (renders visible rows only) */
  virtualRows?: boolean;
  /** Height of the virtual scroll container in px (default 500) */
  virtualHeight?: number;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  enableRowSelection = false,
  onRowSelectionChange,
  onCellEdit,
  renderExpandedRow,
  onExport,
  pageSize = 10,
  virtualRows = false,
  virtualHeight = 500,
  className,
}: DataTableProps<TData>): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [colVisOpen, setColVisOpen] = React.useState(false);

  const totalColumns = (renderExpandedRow ? 1 : 0) + columns.length;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    enableRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
    },
    initialState: {
      pagination: { pageSize },
    },
  });

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, onRowSelectionChange, table]);

  // Virtual scrolling state
  const ROW_HEIGHT = 40;
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const allRows = table.getRowModel().rows;
  const visibleStart = virtualRows ? Math.floor(scrollTop / ROW_HEIGHT) : 0;
  const visibleCount = virtualRows ? Math.ceil(virtualHeight / ROW_HEIGHT) + 2 : allRows.length;
  const visibleRows = virtualRows
    ? allRows.slice(visibleStart, visibleStart + visibleCount)
    : allRows;
  const totalHeight = virtualRows ? allRows.length * ROW_HEIGHT : 0;
  const offsetY = virtualRows ? visibleStart * ROW_HEIGHT : 0;

  return (
    <div className={cn('glass-2 rounded-xl space-y-4 p-4', className)}>
      {/* Toolbar */}
      {(searchKey || onExport || true) && (
        <div className="flex items-center gap-2">
          {searchKey && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
              className="flex h-9 w-full max-w-sm rounded-md glass-1 border border-white/20 px-3 py-1.5 text-sm shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}
          <div className="ml-auto flex items-center gap-2">
            {/* Column visibility toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setColVisOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md glass-1 border border-white/20 px-3 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Columns
              </button>
              {colVisOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg glass-2 border border-white/20 p-2 shadow-lg">
                  {table.getAllLeafColumns().map((col) => (
                    <label key={col.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        className="accent-brand-500"
                      />
                      {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {onExport && (
              <button
                type="button"
                onClick={() => onExport(data)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md glass-1 border border-white/20 px-3 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="rounded-lg border border-white/15 overflow-auto"
        style={virtualRows ? { maxHeight: virtualHeight } : undefined}
        onScroll={virtualRows ? (e) => setScrollTop((e.target as HTMLDivElement).scrollTop) : undefined}
      >
        <table className="w-full caption-bottom text-sm" role="grid" aria-label="Data table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="glass-1 border-b border-white/15 transition-colors" role="row">
                {renderExpandedRow && <th className="w-8" role="columnheader" />}
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="h-10 px-4 text-left align-middle font-medium text-neutral-500 [&:has([role=checkbox])]:pr-0"
                      role="columnheader"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                      tabIndex={canSort ? 0 : undefined}
                      onKeyDown={canSort ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.column.toggleSorting(); } } : undefined}
                      style={canSort ? { cursor: 'pointer' } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0" role="rowgroup" style={virtualRows ? { height: totalHeight, position: 'relative' } : undefined}>
            {virtualRows && offsetY > 0 && (
              <tr style={{ height: offsetY }} aria-hidden="true"><td /></tr>
            )}
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    role="row"
                    aria-selected={row.getIsSelected() || undefined}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    className="border-b border-white/10 transition-colors hover:bg-white/5 data-[state=selected]:bg-brand-50/20"
                  >
                    {renderExpandedRow && (
                      <td className="w-8 px-2 align-middle">
                        <button
                          type="button"
                          onClick={() => row.toggleExpanded()}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/10 transition-transform"
                        >
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className={cn('transition-transform', row.getIsExpanded() && 'rotate-90')}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} role="gridcell" className="px-4 py-2.5 align-middle [&:has([role=checkbox])]:pr-0">
                        {onCellEdit ? (
                          <InlineEditCell
                            value={cell.getValue()}
                            onSave={(v) => onCellEdit(row.index, cell.column.id, v)}
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    ))}
                  </tr>
                  {renderExpandedRow && row.getIsExpanded() && (
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <td colSpan={totalColumns} className="px-4 py-3">
                        {renderExpandedRow(row.original)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={totalColumns} className="h-24 text-center text-neutral-500">
                  No results.
                </td>
              </tr>
            )}
            {virtualRows && (totalHeight - offsetY - visibleRows.length * ROW_HEIGHT) > 0 && (
              <tr style={{ height: totalHeight - offsetY - visibleRows.length * ROW_HEIGHT }} aria-hidden="true"><td /></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-neutral-500">
          {enableRowSelection && (
            <span>
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex h-8 items-center justify-center rounded-md glass-1 border border-white/20 px-3 text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-600">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex h-8 items-center justify-center rounded-md glass-1 border border-white/20 px-3 text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
