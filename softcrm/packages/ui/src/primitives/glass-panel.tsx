import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn.js';

const glassPanelVariants = cva(
  'rounded-2xl overflow-hidden flex flex-col',
  {
    variants: {
      tier: {
        subtle: 'glass-1',
        medium: 'glass-2',
        strong: 'glass-3',
      },
    },
    defaultVariants: {
      tier: 'medium',
    },
  },
);

export interface GlassPanelProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof glassPanelVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const GlassPanel = React.forwardRef<HTMLElement, GlassPanelProps>(
  ({ className, tier, header, footer, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(glassPanelVariants({ tier }), className)}
        {...props}
      >
        {header && (
          <div className="sticky top-0 z-10 border-b border-white/10 px-5 py-3">
            {header}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="border-t border-white/10 px-5 py-3">{footer}</div>
        )}
      </section>
    );
  },
);

GlassPanel.displayName = 'GlassPanel';

export { glassPanelVariants };
