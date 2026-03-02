import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: React.ReactNode;
}

export const ProgressRing = React.forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    {
      className,
      value,
      size = 48,
      strokeWidth = 4,
      color = 'currentColor',
      trackColor = '#e5e7eb',
      label,
      ...props
    },
    ref,
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(100, Math.max(0, value));
    const offset = circumference - (clamped / 100) * circumference;

    return (
      <svg
        ref={ref}
        className={cn('inline-block', className)}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.35s ease',
          }}
        />
        {/* Centered label */}
        {label && (
          <foreignObject x={0} y={0} width={size} height={size}>
            <div
              className="flex h-full w-full items-center justify-center text-xs font-medium"
            >
              {label}
            </div>
          </foreignObject>
        )}
      </svg>
    );
  },
);

ProgressRing.displayName = 'ProgressRing';
