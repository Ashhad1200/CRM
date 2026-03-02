import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette, type CommandItem } from '../composites/command-palette.js';
import { Timeline, type TimelineItem } from '../composites/timeline.js';
import { StepWizard, type WizardStep } from '../composites/step-wizard.js';
import { TreeView, type TreeNode } from '../composites/tree-view.js';
import { DashboardGrid, type DashboardWidget } from '../composites/dashboard-grid.js';

/* ------------------------------------------------------------------ */
/*  CommandPalette                                                     */
/* ------------------------------------------------------------------ */
describe('CommandPalette', () => {
  const items: CommandItem[] = [
    { id: '1', label: 'Create project', description: 'Start a new project', onSelect: vi.fn() },
    { id: '2', label: 'Open settings', description: 'App settings', onSelect: vi.fn() },
    { id: '3', label: 'Delete account', description: 'Remove your account', onSelect: vi.fn() },
  ];

  it('renders items when open=true', () => {
    render(<CommandPalette open={true} onOpenChange={() => {}} items={items} />);
    expect(screen.getByText('Create project')).toBeInTheDocument();
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    expect(screen.getByText('Delete account')).toBeInTheDocument();
  });

  it('hides when open=false', () => {
    render(<CommandPalette open={false} onOpenChange={() => {}} items={items} />);
    expect(screen.queryByText('Create project')).not.toBeInTheDocument();
  });

  it('filters items matching search query', async () => {
    const user = userEvent.setup();
    render(<CommandPalette open={true} onOpenChange={() => {}} items={items} />);
    const input = screen.getByPlaceholderText('Type a command…');
    await user.type(input, 'settings');
    expect(screen.getByText('Open settings')).toBeInTheDocument();
    expect(screen.queryByText('Create project')).not.toBeInTheDocument();
  });

  it('calls onSelect when item is clicked', async () => {
    const onSelect = vi.fn();
    const testItems: CommandItem[] = [
      { id: '1', label: 'Run test', onSelect },
    ];
    const user = userEvent.setup();
    render(<CommandPalette open={true} onOpenChange={() => {}} items={testItems} />);
    await user.click(screen.getByText('Run test'));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

/* ------------------------------------------------------------------ */
/*  Timeline                                                           */
/* ------------------------------------------------------------------ */
describe('Timeline', () => {
  const items: TimelineItem[] = [
    { id: '1', title: 'Created', description: 'Project created', timestamp: new Date(), type: 'success' },
    { id: '2', title: 'Updated', description: 'Config changed', timestamp: new Date(), type: 'warning' },
    { id: '3', title: 'Error', description: 'Build failed', timestamp: new Date(), type: 'error' },
  ];

  it('renders all timeline items', () => {
    render(<Timeline items={items} />);
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('shows title and description for each item', () => {
    render(<Timeline items={items} />);
    expect(screen.getByText('Project created')).toBeInTheDocument();
    expect(screen.getByText('Config changed')).toBeInTheDocument();
    expect(screen.getByText('Build failed')).toBeInTheDocument();
  });

  it('applies type-specific styles', () => {
    const { container } = render(<Timeline items={items} />);
    expect(container.querySelector('.bg-emerald-500')).toBeTruthy();
    expect(container.querySelector('.bg-amber-500')).toBeTruthy();
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/*  StepWizard                                                         */
/* ------------------------------------------------------------------ */
describe('StepWizard', () => {
  const steps: WizardStep[] = [
    { id: 's1', title: 'Account', content: <p>Account form</p> },
    { id: 's2', title: 'Profile', content: <p>Profile form</p> },
    { id: 's3', title: 'Confirm', content: <p>Confirm details</p> },
  ];

  it('renders step indicators', () => {
    render(<StepWizard steps={steps} activeStep={0} onStepChange={() => {}} />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('shows active step content', () => {
    render(<StepWizard steps={steps} activeStep={1} onStepChange={() => {}} />);
    expect(screen.getByText('Profile form')).toBeInTheDocument();
  });

  it('calls onStepChange when Next is clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<StepWizard steps={steps} activeStep={0} onStepChange={handler} />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(handler).toHaveBeenCalledWith(1);
  });
});

/* ------------------------------------------------------------------ */
/*  TreeView                                                           */
/* ------------------------------------------------------------------ */
describe('TreeView', () => {
  const nodes: TreeNode[] = [
    {
      id: 'root1',
      label: 'Documents',
      children: [
        { id: 'child1', label: 'Resume.pdf' },
        { id: 'child2', label: 'Cover.pdf' },
      ],
    },
    { id: 'root2', label: 'Photos' },
  ];

  it('renders root nodes', () => {
    render(<TreeView nodes={nodes} />);
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
  });

  it('expands and collapses on toggle click', async () => {
    const user = userEvent.setup();
    render(<TreeView nodes={nodes} />);
    // Children hidden initially (max-h-0)
    expect(screen.getByText('Resume.pdf')).toBeInTheDocument(); // in DOM but hidden via CSS
    const toggle = screen.getByRole('button', { name: /expand documents/i });
    await user.click(toggle);
    // After expand, collapse button should appear
    expect(screen.getByRole('button', { name: /collapse documents/i })).toBeInTheDocument();
  });

  it('calls onSelect when node is clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<TreeView nodes={nodes} onSelect={handler} defaultExpandAll />);
    await user.click(screen.getByText('Resume.pdf'));
    expect(handler).toHaveBeenCalledWith('child1', expect.objectContaining({ label: 'Resume.pdf' }));
  });
});

/* ------------------------------------------------------------------ */
/*  DashboardGrid                                                      */
/* ------------------------------------------------------------------ */
describe('DashboardGrid', () => {
  const widgets: DashboardWidget[] = [
    { id: 'w1', title: 'Revenue', content: <p>$10k</p> },
    { id: 'w2', title: 'Users', content: <p>500</p> },
  ];

  it('renders all widgets', () => {
    render(<DashboardGrid widgets={widgets} />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows remove button when editable', () => {
    render(<DashboardGrid widgets={widgets} editable onRemoveWidget={() => {}} />);
    expect(screen.getByRole('button', { name: /remove revenue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove users/i })).toBeInTheDocument();
  });

  it('hides remove button when not editable', () => {
    render(<DashboardGrid widgets={widgets} />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});
