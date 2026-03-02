import * as React from 'react';
import { cn } from '../utils/cn.js';
import { Button } from '../primitives/button.js';

export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error state */
  resetError?: () => void;
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Whether to show error details (stack trace) */
  showDetails?: boolean;
  /** Size variant */
  variant?: 'page' | 'section' | 'inline';
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  message,
  showDetails = false,
  variant = 'section',
}) => {
  const [showStack, setShowStack] = React.useState(false);

  const variantStyles = {
    page: 'min-h-screen',
    section: 'min-h-[400px]',
    inline: 'p-6',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-center',
        variantStyles[variant],
      )}
      role="alert"
    >
      <div className="rounded-full bg-danger-100 dark:bg-danger-900/30 p-4">
        <svg
          className="h-12 w-12 text-danger-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <div className="max-w-md">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {message || error.message || 'An unexpected error occurred.'}
        </p>
      </div>

      <div className="flex items-center gap-3 mt-4">
        {resetError && (
          <Button onClick={resetError} variant="primary">
            Try Again
          </Button>
        )}
        {showDetails && error.stack && (
          <Button
            variant="secondary"
            onClick={() => setShowStack(!showStack)}
          >
            {showStack ? 'Hide Details' : 'Show Details'}
          </Button>
        )}
      </div>

      {showStack && showDetails && error.stack && (
        <pre
          className="mt-4 max-w-2xl overflow-auto rounded-lg bg-neutral-100 dark:bg-neutral-900 p-4 text-left text-xs text-neutral-700 dark:text-neutral-300"
        >
          {error.stack}
        </pre>
      )}
    </div>
  );
};

ErrorFallback.displayName = 'ErrorFallback';

export interface ErrorBoundaryProps {
  /** Children to render */
  children: React.ReactNode;
  /** Custom fallback component */
  fallback?: React.ReactNode;
  /** Fallback render function for more control */
  fallbackRender?: (props: {
    error: Error;
    resetError: () => void;
  }) => React.ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Callback when error is reset */
  onReset?: () => void;
  /** Keys that trigger reset when changed */
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (
      hasError &&
      resetKeys &&
      prevProps.resetKeys &&
      !this.areKeysEqual(prevProps.resetKeys, resetKeys)
    ) {
      this.resetError();
    }
  }

  private areKeysEqual(a: unknown[], b: unknown[]): boolean {
    return (
      a.length === b.length &&
      a.every((item, index) => Object.is(item, b[index]))
    );
  }

  resetError = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, fallbackRender } = this.props;

    if (hasError && error) {
      if (fallbackRender) {
        return fallbackRender({ error, resetError: this.resetError });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallback
          error={error}
          resetError={this.resetError}
          showDetails={process.env['NODE_ENV'] === 'development'}
        />
      );
    }

    return children;
  }
}
