import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn.js';

const glassCardVariants = cva(
  'rounded-xl transition-all',
  {
    variants: {
      tier: {
        subtle: 'glass-1',
        medium: 'glass-2',
        strong: 'glass-3',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      tier: 'medium',
      padding: 'md',
    },
  },
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  hover?: boolean;
  glow?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, tier, padding, hover = true, glow, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          glassCardVariants({ tier, padding }),
          hover && 'hover:scale-[1.01] hover:brightness-110',
          glow && 'shadow-[0_0_20px_rgba(var(--color-brand-500),0.3)]',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassCard.displayName = 'GlassCard';

export { glassCardVariants };
