'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CyberCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'accent';
  animated?: boolean;
}

const CyberCard = forwardRef<HTMLDivElement, CyberCardProps>(
  ({ className, variant = 'default', animated = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border backdrop-blur-sm transition-all duration-300',
          {
            'bg-card/80 border-secondary hover:border-primary/50 hover:shadow-glow': variant === 'default',
            'bg-card/90 border-primary shadow-glow': variant === 'glow',
            'bg-gradient-to-br from-accent/20 to-primary/20 border-accent/50 shadow-glow-strong': variant === 'accent',
          },
          {
            'hover:scale-[1.02] hover:-translate-y-1': animated,
          },
          className
        )}
        {...props}
      />
    );
  }
);

CyberCard.displayName = 'CyberCard';

const CyberCardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);

CyberCardHeader.displayName = 'CyberCardHeader';

const CyberCardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-[var(--font-poppins)] text-2xl font-semibold leading-none tracking-tight text-white',
        className
      )}
      {...props}
    />
  )
);

CyberCardTitle.displayName = 'CyberCardTitle';

const CyberCardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-cyber-textMuted', className)}
      {...props}
    />
  )
);

CyberCardDescription.displayName = 'CyberCardDescription';

const CyberCardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);

CyberCardContent.displayName = 'CyberCardContent';

export {
  CyberCard,
  CyberCardHeader,
  CyberCardTitle,
  CyberCardDescription,
  CyberCardContent,
};