'use client';

import React from 'react';
import { useCredits, useFormattedCredits, CREDIT_COSTS } from '@/hooks/useCredits';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Coins, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle,
  ShoppingCart,
  Zap,
  Image,
  Video,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CreditsDisplayProps {
  variant?: 'compact' | 'detailed' | 'navbar';
  showRefresh?: boolean;
  showActions?: boolean;
  className?: string;
}

export function CreditsDisplay({ 
  variant = 'compact', 
  showRefresh = true,
  showActions = true,
  className 
}: CreditsDisplayProps) {
  const { 
    balance, 
    planId, 
    monthlyUsage,
    isLoading, 
    refreshCredits, 
    isRefreshing,
    calculateRemainingOperations 
  } = useCredits();
  
  const { formatted, color, progressPercentage } = useFormattedCredits();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 animate-pulse", className)}>
        <div className="w-4 h-4 bg-gray-300 rounded" />
        <div className="w-12 h-4 bg-gray-300 rounded" />
      </div>
    );
  }

  // Version pour navbar - ultra compact
  if (variant === 'navbar') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className={cn("font-mono text-sm font-medium", color)}>
          {formatted}
        </span>
        {balance < 20 && (
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        )}
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshCredits}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  // Version compacte
  if (variant === 'compact') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Coins className="w-5 h-5 text-yellow-500" />
                {balance === 0 && (
                  <AlertTriangle className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono text-lg font-bold", color)}>
                    {balance}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {planId}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyUsage} used this month
                </p>
              </div>
            </div>
            
            {showActions && (
              <div className="flex items-center gap-2">
                {showRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshCredits}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                  </Button>
                )}
                {balance < 50 && (
                  <Button asChild size="sm">
                    <Link href="/credits">
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Buy More
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {progressPercentage < 100 && (
            <div className="mt-3">
              <Progress value={progressPercentage} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Version détaillée
  const imageOps = calculateRemainingOperations('IMAGE_GENERATION');
  const videoOps = calculateRemainingOperations('VIDEO_GENERATION');
  const enhancementOps = calculateRemainingOperations('GPT_ENHANCEMENT');

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-500" />
          Credits Balance
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshCredits}
              disabled={isRefreshing}
              className="ml-auto"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Solde principal */}
        <div className="text-center">
          <div className={cn("text-3xl font-bold font-mono", color)}>
            {balance}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="outline">{planId.toUpperCase()}</Badge>
            {balance === 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Empty
              </Badge>
            )}
            {balance < 20 && balance > 0 && (
              <Badge variant="secondary">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Low
              </Badge>
            )}
          </div>
        </div>

        {/* Usage du mois */}
        {monthlyUsage > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            {monthlyUsage} credits used this month
          </div>
        )}

        {/* Barre de progression */}
        <div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>
              {planId === 'free' && '100'}
              {planId === 'starter' && '1k'}
              {planId === 'pro' && '5k'}
              {planId === 'enterprise' && '15k'}
            </span>
          </div>
        </div>

        {/* Operations possibles */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center p-2 bg-secondary/30 rounded">
            <Image className="w-4 h-4 text-blue-500 mb-1" />
            <div className="text-sm font-medium">{imageOps}</div>
            <div className="text-xs text-muted-foreground">Images</div>
          </div>
          
          <div className="flex flex-col items-center p-2 bg-secondary/30 rounded">
            <Video className="w-4 h-4 text-purple-500 mb-1" />
            <div className="text-sm font-medium">{videoOps}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </div>
          
          <div className="flex flex-col items-center p-2 bg-secondary/30 rounded">
            <Sparkles className="w-4 h-4 text-green-500 mb-1" />
            <div className="text-sm font-medium">{enhancementOps}</div>
            <div className="text-xs text-muted-foreground">Enhance</div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {balance < 100 && (
              <Button asChild className="flex-1">
                <Link href="/credits">
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Buy Credits
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild className="flex-1">
              <Link href="/credits">
                <Zap className="w-4 h-4 mr-1" />
                View History
              </Link>
            </Button>
          </div>
        )}

        {/* Alerte si crédits faibles */}
        {balance === 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">No credits remaining</span>
            </div>
            <p className="text-xs text-destructive/80 mt-1">
              Purchase credits to continue using AI generation features.
            </p>
          </div>
        )}
        
        {balance > 0 && balance < 20 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 rounded-lg">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Low credits warning</span>
            </div>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
              Consider purchasing more credits to avoid interruptions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Composant pour afficher le coût estimé
interface CostEstimatorProps {
  operations: Partial<Record<keyof typeof CREDIT_COSTS, number>>;
  className?: string;
}

export function CostEstimator({ operations, className }: CostEstimatorProps) {
  const { estimateCost, hasEnoughCredits } = useCredits();
  
  const totalCost = estimateCost(operations);
  const canAfford = Object.keys(operations).every(op => 
    hasEnoughCredits(op as keyof typeof CREDIT_COSTS, (operations[op as keyof typeof CREDIT_COSTS] || 1) - 1)
  );

  if (totalCost === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Coins className="w-4 h-4 text-yellow-500" />
      <span>Cost: {totalCost} credits</span>
      {!canAfford && (
        <Badge variant="destructive" className="text-xs">
          Insufficient
        </Badge>
      )}
    </div>
  );
}