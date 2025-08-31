'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cyberButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-glow transform hover:scale-[1.02]',
        destructive: 'bg-error text-white shadow-md hover:bg-error/90 hover:shadow-[0_0_20px_rgba(224,36,36,0.4)] transform hover:scale-[1.02]',
        outline: 'border border-secondary bg-transparent text-cyber-textMuted hover:bg-secondary/50 hover:text-white hover:border-primary/50',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md',
        ghost: 'text-cyber-textMuted hover:bg-secondary/50 hover:text-white',
        accent: 'bg-accent text-white shadow-md hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(127,90,240,0.4)] transform hover:scale-[1.02]',
        glow: 'bg-primary text-primary-foreground shadow-glow hover:shadow-glow-strong animate-glow-pulse',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface CyberButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof cyberButtonVariants> {
  asChild?: boolean;
}

const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(cyberButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

CyberButton.displayName = 'CyberButton';

export { CyberButton, cyberButtonVariants };