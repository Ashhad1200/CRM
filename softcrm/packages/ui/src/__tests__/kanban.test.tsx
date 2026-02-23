import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KanbanBoard, type KanbanColumn } from '../composites/kanban.js';

interface TestCard {
  id: string;
  title: string;
}

const columns: KanbanColumn<TestCard>[] = [
  {
    id: 'col-1',
    title: 'To Do',
    cards: [
      { id: 'card-1', title: 'Task 1' },
      { id: 'card-2', title: 'Task 2' },
    ],
  },
  {
    id: 'col-2',
    title: 'In Progress',
    cards: [{ id: 'card-3', title: 'Task 3' }],
    headerValue: '$5,000',
  },
  {
    id: 'col-3',
    title: 'Done',
    cards: [],
  },
];

const renderCard = (card: TestCard) => (
  <div className="rounded border bg-white p-2 shadow-sm">{card.title}</div>
);

describe('KanbanBoard', () => {
  it('renders all column headers', () => {
    render(
      <KanbanBoard columns={columns} onCardMove={vi.fn()} renderCard={renderCard} />,
    );
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders card count badges', () => {
    render(
      <KanbanBoard columns={columns} onCardMove={vi.fn()} renderCard={renderCard} />,
    );
    // "To Do" has 2 cards
    expect(screen.getByText('2')).toBeInTheDocument();
    // "In Progress" has 1 card
    expect(screen.getByText('1')).toBeInTheDocument();
    // "Done" has 0 cards
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders cards using renderCard prop', () => {
    render(
      <KanbanBoard columns={columns} onCardMove={vi.fn()} renderCard={renderCard} />,
    );
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('renders header value when provided', () => {
    render(
      <KanbanBoard columns={columns} onCardMove={vi.fn()} renderCard={renderCard} />,
    );
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });
});
