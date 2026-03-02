import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlassCard } from '../primitives/glass-card.js';
import { StatCard } from '../primitives/stat-card.js';
import { ProgressRing } from '../primitives/progress-ring.js';
import { Switch } from '../primitives/switch.js';
import { Skeleton } from '../primitives/skeleton.js';
import { SearchInput } from '../primitives/search-input.js';

/* ------------------------------------------------------------------ */
/*  GlassCard                                                         */
/* ------------------------------------------------------------------ */
describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Hello</GlassCard>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it.each([
    ['subtle', 'glass-1'],
    ['medium', 'glass-2'],
    ['strong', 'glass-3'],
  ] as const)('applies %s tier → %s class', (tier, expected) => {
    const { container } = render(<GlassCard tier={tier}>x</GlassCard>);
    expect(container.firstElementChild?.className).toContain(expected);
  });

  it('applies hover classes when hover is true', () => {
    const { container } = render(<GlassCard hover>x</GlassCard>);
    expect(container.firstElementChild?.className).toContain('hover:scale-[1.01]');
  });

  it('omits hover classes when hover is false', () => {
    const { container } = render(<GlassCard hover={false}>x</GlassCard>);
    expect(container.firstElementChild?.className).not.toContain('hover:scale-[1.01]');
  });

  it('applies glow class when glow is true', () => {
    const { container } = render(<GlassCard glow>x</GlassCard>);
    expect(container.firstElementChild?.className).toContain('shadow-[0_0_20px');
  });

  it('forwards ref and className', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(<GlassCard ref={ref} className="custom">x</GlassCard>);
    expect(ref.current).toBe(container.firstElementChild);
    expect(container.firstElementChild?.className).toContain('custom');
  });
});

/* ------------------------------------------------------------------ */
/*  StatCard                                                          */
/* ------------------------------------------------------------------ */
describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Revenue" value="$1,234" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,234')).toBeInTheDocument();
  });

  it('shows positive change in green with + prefix', () => {
    render(<StatCard label="Users" value={100} change={12} />);
    const change = screen.getByText('+12%');
    expect(change.className).toContain('text-success-600');
  });

  it('shows negative change in red', () => {
    render(<StatCard label="Churn" value={5} change={-8} />);
    const change = screen.getByText('-8%');
    expect(change.className).toContain('text-danger-600');
  });

  it('renders icon when provided', () => {
    render(<StatCard label="L" value="V" icon={<span data-testid="icon">★</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------------ */
/*  ProgressRing                                                      */
/* ------------------------------------------------------------------ */
describe('ProgressRing', () => {
  it('renders with correct ARIA attributes', () => {
    render(<ProgressRing value={42} />);
    const ring = screen.getByRole('progressbar');
    expect(ring).toHaveAttribute('aria-valuenow', '42');
    expect(ring).toHaveAttribute('aria-valuemin', '0');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders label inside the ring', () => {
    render(<ProgressRing value={50} label="50%" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('clamps value to 0-100', () => {
    const { rerender } = render(<ProgressRing value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    rerender(<ProgressRing value={-20} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

/* ------------------------------------------------------------------ */
/*  Switch                                                            */
/* ------------------------------------------------------------------ */
describe('Switch', () => {
  it('has role="switch" and correct aria-checked', () => {
    render(<Switch checked={true} onCheckedChange={() => {}} />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles checked state on click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Switch checked={false} onCheckedChange={handler} />);
    await user.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onCheckedChange with toggled value', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Switch checked={true} onCheckedChange={handler} />);
    await user.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(false);
  });

  it('respects disabled state', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Switch checked={false} onCheckedChange={handler} disabled />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeDisabled();
    await user.click(sw);
    expect(handler).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */
describe('Skeleton', () => {
  it('renders correct number of lines for text variant', () => {
    const { container } = render(<Skeleton variant="text" lines={3} />);
    // The wrapper contains 3 skeleton line divs + 1 sr-only span
    const lines = container.querySelectorAll('.bg-gray-200, .dark\\:bg-gray-700');
    expect(lines.length).toBe(3);
  });

  it('applies circular styling for circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstElementChild?.className).toContain('rounded-full');
  });

  it('disables animation when animate is false', () => {
    const { container } = render(<Skeleton animate={false} />);
    // No shimmer child should be rendered
    const shimmer = container.querySelector('[style*="shimmer"]');
    expect(shimmer).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  SearchInput                                                       */
/* ------------------------------------------------------------------ */
describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput onSearch={() => {}} placeholder="Find stuff…" />);
    expect(screen.getByPlaceholderText('Find stuff…')).toBeInTheDocument();
  });

  it('calls onSearch after debounce delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

    render(<SearchInput onSearch={onSearch} debounceMs={200} />);
    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');

    // Clear calls from intermediate keystrokes / initial mount
    onSearch.mockClear();

    // Advance past debounce
    await vi.advanceTimersByTimeAsync(250);
    expect(onSearch).toHaveBeenCalledWith('test');

    vi.useRealTimers();
  });

  it('shows shortcut badge when shortcut prop provided', () => {
    render(<SearchInput onSearch={() => {}} shortcut="⌘K" />);
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});
