import * as React from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface KanbanColumn<TCard = unknown> {
  id: string;
  title: string;
  cards: TCard[];
  /** Optional aggregate value shown in header (e.g., sum of deal values) */
  headerValue?: string;
}

export interface KanbanBoardProps<TCard extends { id: string }> {
  columns: KanbanColumn<TCard>[];
  onCardMove: (cardId: string, fromColumnId: string, toColumnId: string) => void;
  renderCard: (card: TCard) => React.ReactNode;
  onQuickAdd?: (columnId: string, title: string) => void;
  className?: string;
}

// ── Sortable Card Wrapper ───────────────────────────────────────────────────────

function SortableCard<TCard extends { id: string }>({
  card,
  renderCard,
}: {
  card: TCard;
  renderCard: (card: TCard) => React.ReactNode;
}): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_12px_rgba(99,102,241,0.15)]"
    >
      <div className="hover:glass-2 rounded-lg transition-all duration-200">
        {renderCard(card)}
      </div>
    </div>
  );
}

// ── Column ──────────────────────────────────────────────────────────────────────

function QuickAddInput({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [value, setValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) {
          onAdd(value.trim());
          setValue('');
        }
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={onCancel}
      placeholder="Card title…"
      className="w-full rounded-md glass-1 border border-white/20 px-2.5 py-1.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
  );
}

function KanbanColumnComponent<TCard extends { id: string }>({
  column,
  renderCard,
  onQuickAdd,
}: {
  column: KanbanColumn<TCard>;
  renderCard: (card: TCard) => React.ReactNode;
  onQuickAdd?: (columnId: string, title: string) => void;
}): React.ReactElement {
  const [adding, setAdding] = React.useState(false);

  return (
    <div className="flex w-72 shrink-0 flex-col glass-1 rounded-xl border border-white/15">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/15">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-700">{column.title}</h3>
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full glass-2 bg-brand-500/10 px-1.5 text-xs font-semibold text-brand-600">
            {column.cards.length}
          </span>
        </div>
        {column.headerValue && (
          <span className="text-xs font-medium text-neutral-500">{column.headerValue}</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} renderCard={renderCard} />
          ))}
        </SortableContext>
      </div>

      {/* Quick Add */}
      {onQuickAdd && (
        <div className="px-2 pb-2">
          {adding ? (
            <QuickAddInput
              onAdd={(title) => {
                onQuickAdd(column.id, title);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm text-neutral-500 hover:bg-white/15 hover:text-neutral-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Board ───────────────────────────────────────────────────────────────────────

export function KanbanBoard<TCard extends { id: string }>({
  columns,
  onCardMove,
  renderCard,
  onQuickAdd,
  className,
}: KanbanBoardProps<TCard>): React.ReactElement {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const findColumnByCardId = (cardId: string): KanbanColumn<TCard> | undefined => {
    return columns.find((col) => col.cards.some((c) => c.id === cardId));
  };

  const activeCard = activeId
    ? columns.flatMap((col) => col.cards).find((c) => c.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const overItemId = over.id as string;

    const fromColumn = findColumnByCardId(activeCardId);
    // Determine target column: either the card's column or the column itself
    const toColumn = findColumnByCardId(overItemId) ?? columns.find((col) => col.id === overItemId);

    if (!fromColumn || !toColumn || fromColumn.id === toColumn.id) return;

    onCardMove(activeCardId, fromColumn.id, toColumn.id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
        {columns.map((column) => (
          <KanbanColumnComponent key={column.id} column={column} renderCard={renderCard} onQuickAdd={onQuickAdd} />
        ))}
      </div>
      <DragOverlay>{activeCard ? renderCard(activeCard) : null}</DragOverlay>
    </DndContext>
  );
}
