'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { authService } from '@/lib/supabase/auth';
import { cn } from '@/lib/utils';

interface GoogleSignInButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  returnTo?: string;
  organizationId?: string;
  showText?: boolean;
  disabled?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export function GoogleSignInButton({
  variant = 'outline',
  size = 'default',
  className,
  returnTo,
  organizationId,
  showText = true,
  disabled = false,
  onError,
  onSuccess
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const _router = useRouter();
  const searchParams = useSearchParams();

  // Check for OAuth errors from URL params
  const urlError = searchParams.get('error');

  const handleGoogleSignIn = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use direct Supabase OAuth flow
      await authService.signInWithOAuth('google');
      
      // Success callback
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err.message || 'Échec de l\'authentification Google';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Google Sign-In error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = error || urlError;

  return (
    <div className="space-y-2">
      {displayError && (
        <Alert variant="destructive" className="text-sm">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
      
      <Button
        variant={variant}
        size={size}
        onClick={handleGoogleSignIn}
        disabled={isLoading || disabled}
        className={cn(
          'w-full relative transition-all duration-200 font-medium',
          'hover:shadow-lg hover:shadow-black/10 active:scale-[0.98] active:transition-transform active:duration-75',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          variant === 'default' 
            ? 'bg-[#4285F4] hover:bg-[#3367D6] text-white border-2 border-transparent shadow-sm' 
            : 'border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
          className
        )}
        aria-label="Se connecter avec Google"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <GoogleIcon className="h-4 w-4 mr-2" variant={variant} />
        )}
        
        {isLoading ? (
          'Connexion en cours...'
        ) : showText ? (
          'continue_with_google'
        ) : (
          'Google'
        )}
      </Button>
    </div>
  );
}

// Optimized Google icon component with variant support
function GoogleIcon({ className, variant = 'outline' }: { className?: string; variant?: 'default' | 'outline' | 'secondary' | 'ghost' }) {
  const isWhite = variant === 'default';
  
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill={isWhite ? "#ffffff" : "#4285F4"}
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill={isWhite ? "#ffffff" : "#34A853"}
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill={isWhite ? "#ffffff" : "#FBBC05"}
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill={isWhite ? "#ffffff" : "#EA4335"}
      />
    </svg>
  );
}

// Compact version for smaller spaces
export function GoogleSignInButtonCompact({
  className,
  returnTo,
  organizationId,
  disabled = false,
  onError,
  onSuccess
}: Omit<GoogleSignInButtonProps, 'variant' | 'size' | 'showText'>) {
  return (
    <GoogleSignInButton
      variant="outline"
      size="sm"
      className={cn('px-3', className)}
      returnTo={returnTo}
      organizationId={organizationId}
      showText={false}
      disabled={disabled}
      onError={onError}
      onSuccess={onSuccess}
    />
  );
}

// Large call-to-action version
export function GoogleSignInButtonCTA({
  className,
  returnTo,
  organizationId,
  disabled = false,
  onError,
  onSuccess
}: Omit<GoogleSignInButtonProps, 'variant' | 'size'>) {
  return (
    <GoogleSignInButton
      variant="default"
      size="lg"
      className={cn(
        'bg-[#4285F4] hover:bg-[#3367D6] text-white border-0',
        'shadow-lg hover:shadow-xl',
        'py-3 px-6 text-lg font-semibold',
        className
      )}
      returnTo={returnTo}
      organizationId={organizationId}
      disabled={disabled}
      onError={onError}
      onSuccess={onSuccess}
    />
  );
}