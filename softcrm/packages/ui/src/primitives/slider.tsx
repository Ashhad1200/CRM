import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled,
      showValue = false,
      ...props
    },
    ref,
  ) => {
    const percent = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn('relative w-full', className)}>
        {/* Custom track */}
        <div className="pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-100"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Value tooltip */}
        {showValue && (
          <div
            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-white"
            style={{ left: `${percent}%` }}
          >
            {value}
          </div>
        )}

        {/* Native range input (transparent, layered on top for interaction) */}
        <input
          ref={ref}
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className={cn(
            'relative z-10 h-5 w-full cursor-pointer appearance-none bg-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Thumb styling (Webkit + Firefox)
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]',
            '[&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-brand-500/30',
            '[&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:hover:shadow-md',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]',
            '[&::-moz-range-track]:bg-transparent',
            'focus-visible:outline-none [&::-webkit-slider-thumb:focus-visible]:ring-2 [&::-webkit-slider-thumb:focus-visible]:ring-brand-500',
          )}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          {...props}
        />
      </div>
    );
  },
);

Slider.displayName = 'Slider';
