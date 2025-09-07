'use client';

import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface AuthButtonProps extends ButtonProps {
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
  icon?: React.ReactNode;
  loadingText?: string;
  loadingIcon?: React.ReactNode;
}

const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  (
    {
      children,
      isLoading = false,
      icon,
      loadingText = 'Chargement...',
      loadingIcon,
      className,
      disabled,
      onClick,
      variant,
      size = 'lg',
      type,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        type={type}
        onClick={onClick}
        variant={variant}
        disabled={isLoading || disabled}
        size={size}
        className={cn(
          // Base styles
          'w-full transition-all duration-200 font-medium',
          // Hover effects
          'hover:shadow-lg hover:shadow-black/10',
          // Active effects
          'active:scale-[0.98] active:transition-transform active:duration-75',
          // Focus styles
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Loading state
          isLoading && 'cursor-not-allowed',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            {loadingIcon || <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loadingText}
          </>
        ) : (
          <>
            {icon && <span className="mr-2 flex items-center">{icon}</span>}
            {children}
          </>
        )}
      </Button>
    );
  }
);

AuthButton.displayName = 'AuthButton';

export { AuthButton };