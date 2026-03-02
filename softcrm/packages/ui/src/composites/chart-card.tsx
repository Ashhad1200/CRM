import * as React from 'react';
import { cn } from '../utils/cn.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'donut';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  type: ChartType;
  data: ChartDataPoint[];
  /** Chart area height in px (default 200) */
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
  footer?: React.ReactNode;
}

// ── Fallback brand palette ──────────────────────────────────────────────────────

const BRAND_COLORS = [
  '#3b82f6', // brand-500
  '#22c55e', // success-500
  '#f59e0b', // warning-500
  '#ef4444', // danger-500
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
];

function resolveColor(point: ChartDataPoint, index: number): string {
  return point.color ?? BRAND_COLORS[index % BRAND_COLORS.length] ?? '#3b82f6';
}

// ── Skeleton Shimmer ────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ height: number }> = ({ height }) => (
  <div
    className="animate-pulse rounded-lg bg-neutral-200/60"
    style={{ height: `${height}px` }}
  />
);

// ── SVG Chart Renderers ─────────────────────────────────────────────────────────

const PADDING = 24;

function BarChart({ data, width, height }: { data: ChartDataPoint[]; width: number; height: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(
    8,
    (width - PADDING * 2 - (data.length - 1) * 6) / data.length,
  );

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Bar chart">
      {data.map((point, i) => {
        const barHeight = ((point.value / max) * (height - PADDING * 2));
        const x = PADDING + i * (barWidth + 6);
        const y = height - PADDING - barHeight;
        return (
          <g key={point.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={resolveColor(point, i)}
              opacity={0.85}
            />
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              className="fill-neutral-500"
              fontSize={10}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, width, height }: { data: ChartDataPoint[]; width: number; height: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (width - PADDING * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: PADDING + i * stepX,
    y: height - PADDING - (d.value / max) * (height - PADDING * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Line chart">
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const d = data[i]!;
        return (
          <g key={d.label}>
            <circle cx={p.x} cy={p.y} r={4} fill={resolveColor(d, i)} />
            <text x={p.x} y={height - 6} textAnchor="middle" className="fill-neutral-500" fontSize={10}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AreaChart({ data, width, height }: { data: ChartDataPoint[]; width: number; height: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const stepX = (width - PADDING * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: PADDING + i * stepX,
    y: height - PADDING - (d.value / max) * (height - PADDING * 2),
  }));

  const baseline = height - PADDING;
  const firstPt = points[0]!;
  const lastPt = points[points.length - 1]!;
  const areaD = [
    `M${firstPt.x},${baseline}`,
    ...points.map((p) => `L${p.x},${p.y}`),
    `L${lastPt.x},${baseline}`,
    'Z',
  ].join(' ');

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Area chart">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#area-grad)" />
      <path d={lineD} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const d = data[i]!;
        return (
          <text key={d.label} x={p.x} y={height - 6} textAnchor="middle" className="fill-neutral-500" fontSize={10}>
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

function PieDonutChart({
  data,
  width,
  height,
  donut,
}: {
  data: ChartDataPoint[];
  width: number;
  height: number;
  donut: boolean;
}) {
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - PADDING;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={donut ? 'Donut chart' : 'Pie chart'}>
      {data.map((point, i) => {
        const ratio = point.value / total;
        const dashLength = ratio * circumference;
        const dashOffset = -accumulated * circumference;
        accumulated += ratio;

        return (
          <circle
            key={point.label}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={resolveColor(point, i)}
            strokeWidth={donut ? radius * 0.4 : radius}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

// ── Chart Card ──────────────────────────────────────────────────────────────────

export const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  (
    {
      title,
      description,
      type,
      data,
      height = 200,
      loading = false,
      emptyMessage = 'No data available',
      footer,
      className,
      ...props
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = React.useState(400);

    React.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setChartWidth(entry.contentRect.width);
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const renderChart = () => {
      if (loading) return <Skeleton height={height} />;
      if (data.length === 0) {
        return (
          <div
            className="flex items-center justify-center text-sm text-neutral-400"
            style={{ height: `${height}px` }}
          >
            {emptyMessage}
          </div>
        );
      }

      const shared = { data, width: chartWidth, height };
      switch (type) {
        case 'bar':
          return <BarChart {...shared} />;
        case 'line':
          return <LineChart {...shared} />;
        case 'area':
          return <AreaChart {...shared} />;
        case 'pie':
          return <PieDonutChart {...shared} donut={false} />;
        case 'donut':
          return <PieDonutChart {...shared} donut />;
      }
    };

    return (
      <div
        ref={ref}
        className={cn('glass-2 flex flex-col rounded-xl', className)}
        {...props}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-neutral-200/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
          {description && (
            <span className="text-xs text-neutral-400">{description}</span>
          )}
        </div>

        {/* Chart area */}
        <div ref={containerRef} className="flex-1 px-4 py-3">
          {renderChart()}
        </div>

        {/* Footer slot */}
        {footer && (
          <div className="border-t border-neutral-200/60 px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

ChartCard.displayName = 'ChartCard';
