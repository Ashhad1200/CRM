import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

const shimmerStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'text',
      width,
      height,
      lines = 1,
      animate = true,
      style,
      ...props
    },
    ref,
  ) => {
    const sizeStyle: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    if (variant === 'text' && lines > 1) {
      return (
        <div
          ref={ref}
          className={cn('flex flex-col gap-2', className)}
          role="status"
          aria-label="Loading"
          {...props}
        >
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 rounded bg-gray-200 dark:bg-gray-700',
                animate && 'overflow-hidden',
              )}
              style={{
                width: i === lines - 1 ? '60%' : '100%',
              }}
            >
              {animate && (
                <div className="h-full w-full" style={shimmerStyle} />
              )}
            </div>
          ))}
          <span className="sr-only">Loading…</span>
        </div>
      );
    }

    const variantClasses = {
      text: 'h-4 w-full rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
    };

    const defaultSizes: Record<string, React.CSSProperties> = {
      circular: { width: width ?? 40, height: height ?? 40 },
      rectangular: { width: width ?? '100%', height: height ?? 120 },
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cn(
          'bg-gray-200 dark:bg-gray-700',
          variantClasses[variant],
          animate && 'overflow-hidden',
          className,
        )}
        style={{
          ...(variant !== 'text' ? defaultSizes[variant] : {}),
          ...sizeStyle,
        }}
        {...props}
      >
        {animate && <div className="h-full w-full" style={shimmerStyle} />}
        <span className="sr-only">Loading…</span>
      </div>
    );
  },
);

Skeleton.displayName = 'Skeleton';
