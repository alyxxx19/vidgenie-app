'use client';

/**
 * Wrapper générique pour le lazy loading avec gestion d'erreurs et fallback
 * PHASE 3.1 - Code Splitting & Performance Frontend
 */

import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  name?: string;
  className?: string;
  retryable?: boolean;
}

// Fallback par défaut pour les composants en cours de chargement
const DefaultSkeleton = ({ name }: { name?: string }) => (
  <Card className="bg-card border border-border animate-pulse">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32 bg-secondary" />
        <Skeleton className="h-8 w-8 bg-secondary rounded" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-8 w-20 bg-secondary" />
        <Skeleton className="h-4 w-48 bg-secondary" />
        <div className="space-y-2">
          <Skeleton className="h-2 w-full bg-secondary" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16 bg-secondary" />
            <Skeleton className="h-3 w-8 bg-secondary" />
          </div>
        </div>
      </div>
    </CardContent>
    {name && (
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <span className="text-xs font-mono text-muted-foreground">
          chargement {name}...
        </span>
      </div>
    )}
  </Card>
);

// Fallback d'erreur avec bouton de retry
const DefaultErrorFallback = ({ 
  error, 
  resetErrorBoundary, 
  name, 
  retryable 
}: { 
  error: Error;
  resetErrorBoundary: () => void;
  name?: string;
  retryable?: boolean;
}) => (
  <Card className="bg-card border border-red-800/50">
    <CardContent className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-900/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="font-mono text-foreground">
            Erreur de chargement{name && ` - ${name}`}
          </h3>
          <p className="text-xs font-mono text-muted-foreground">
            {error.message || 'Erreur inconnue'}
          </p>
        </div>
      </div>
      {retryable && (
        <Button 
          onClick={resetErrorBoundary}
          variant="outline"
          size="sm"
          className="border-border text-muted-foreground hover:text-foreground font-mono text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          réessayer
        </Button>
      )}
    </CardContent>
  </Card>
);

/**
 * Wrapper intelligent pour le lazy loading avec:
 * - Suspense pour les composants dynamiques
 * - Error Boundary avec retry
 * - Fallback personnalisable
 * - Gestion d'erreurs gracieuse
 */
export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  name,
  className,
  retryable = true,
}) => {
  const defaultFallback = fallback || <DefaultSkeleton name={name} />;

  return (
    <div className={className}>
      <ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) =>
          errorFallback || (
            <DefaultErrorFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
              name={name}
              retryable={retryable}
            />
          )
        }
        onReset={() => {
          // Optionnel: logic de reset personnalisée
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      >
        <Suspense fallback={defaultFallback}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

/**
 * Hook pour lazy loader des composants avec préchargement intelligent
 */
export const useLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  preload = false
) => {
  const LazyComponent = React.lazy(importFn);

  // Préchargement conditionnel
  React.useEffect(() => {
    if (preload) {
      importFn();
    }
  }, [preload]);

  return LazyComponent;
};

/**
 * HOC pour wrapper automatiquement les composants lazy
 */
export const withLazy = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<LazyWrapperProps, 'children'>
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <LazyWrapper {...options}>
      <Component {...props} ref={ref} />
    </LazyWrapper>
  ));
};

export default LazyWrapper;