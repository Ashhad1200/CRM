import * as React from 'react';
import { cn } from '../utils/cn.js';
import { Skeleton } from '../primitives/skeleton.js';

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether loading is active */
  loading?: boolean;
  /** Loading text to display */
  text?: string;
  /** Variant of loader to show */
  variant?: 'spinner' | 'skeleton' | 'pulse';
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to overlay existing content or replace it */
  overlay?: boolean;
  /** Children to show when not loading (or underneath overlay) */
  children?: React.ReactNode;
  /** Number of skeleton lines for skeleton variant */
  skeletonLines?: number;
}

const Spinner: React.FC<{ size: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size,
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-transparent border-t-brand-500 border-r-brand-500',
        sizeClasses[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
};

export const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      loading = true,
      text,
      variant = 'spinner',
      size = 'md',
      overlay = true,
      children,
      skeletonLines = 3,
      className,
      ...props
    },
    ref,
  ) => {
    if (!loading) {
      return children ? <>{children}</> : null;
    }

    const loadingContent = (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center gap-3',
          overlay && 'absolute inset-0 z-50',
          overlay && 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm',
          !overlay && 'min-h-[200px]',
          className,
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        {variant === 'spinner' && <Spinner size={size} />}

        {variant === 'pulse' && (
          <div
            className={cn(
              'rounded-full bg-brand-500 animate-pulse',
              size === 'sm' && 'h-4 w-4',
              size === 'md' && 'h-8 w-8',
              size === 'lg' && 'h-12 w-12',
            )}
          />
        )}

        {variant === 'skeleton' && (
          <div className="w-full max-w-md space-y-3 px-4">
            <Skeleton variant="rectangular" height={120} />
            <Skeleton lines={skeletonLines} />
          </div>
        )}

        {text && (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {text}
          </span>
        )}
        <span className="sr-only">Loading content</span>
      </div>
    );

    if (overlay && children) {
      return (
        <div className="relative">
          {children}
          {loadingContent}
        </div>
      );
    }

    return loadingContent;
  },
);

LoadingOverlay.displayName = 'LoadingOverlay';
