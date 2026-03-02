import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { track: 'h-4 w-7', thumb: 'h-3 w-3', translate: 'translate-x-3' },
  md: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4' },
  lg: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5' },
} as const;

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, size = 'md', disabled, ...props }, ref) => {
    const s = sizeMap[size];

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent',
          'shadow-inner transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          s.track,
          checked ? 'bg-brand-500' : 'bg-neutral-300',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-md ring-0',
            'transition-transform duration-200 ease-in-out',
            'shadow-[0_1px_3px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.6)]',
            s.thumb,
            checked ? s.translate : 'translate-x-0.5',
          )}
        />
      </button>
    );
  },
);

Switch.displayName = 'Switch';
