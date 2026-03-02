import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch: (query: string) => void;
  shortcut?: string;
  onShortcutClick?: () => void;
  loading?: boolean;
  debounceMs?: number;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      onSearch,
      shortcut,
      onShortcutClick,
      loading = false,
      debounceMs = 300,
      placeholder = 'Search...',
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = React.useState('');

    React.useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(value);
      }, debounceMs);
      return () => clearTimeout(timer);
    }, [value, debounceMs, onSearch]);

    return (
      <div
        className={cn(
          'relative inline-flex w-full items-center rounded-lg glass-1 shadow-sm transition-colors',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-500',
          props.disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {/* Search icon / loading spinner */}
        <span className="pointer-events-none absolute left-3 flex items-center text-neutral-400">
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          )}
        </span>

        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'h-9 w-full bg-transparent py-1.5 pl-9 text-sm',
            'placeholder:text-neutral-400',
            'focus:outline-none',
            'disabled:cursor-not-allowed',
            shortcut ? 'pr-14' : 'pr-3',
          )}
          {...props}
        />

        {shortcut && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onShortcutClick}
            className={cn(
              'absolute right-2 inline-flex items-center rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500',
              onShortcutClick && 'cursor-pointer hover:bg-neutral-200',
              !onShortcutClick && 'pointer-events-none',
            )}
          >
            {shortcut}
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
