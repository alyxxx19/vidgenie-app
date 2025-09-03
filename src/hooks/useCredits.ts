import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/providers';
import { toast } from 'sonner';

export interface CreditsInfo {
  balance: number;
  planId: string;
  monthlyUsage: number;
  hasActiveSubscription: boolean;
  subscriptionEndsAt?: Date | null;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    createdAt: Date;
  }>;
}

export interface CreditCosts {
  IMAGE_GENERATION: number;
  VIDEO_GENERATION: number;
  GPT_ENHANCEMENT: number;
  IMAGE_TO_VIDEO: number;
  PROMPT_ANALYSIS: number;
}

export const CREDIT_COSTS: CreditCosts = {
  IMAGE_GENERATION: 5,
  VIDEO_GENERATION: 15,
  GPT_ENHANCEMENT: 1,
  IMAGE_TO_VIDEO: 20,
  PROMPT_ANALYSIS: 0.5,
};

export function useCredits() {
  const [creditsInfo, setCreditsInfo] = useState<CreditsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queries TRPC
  const balanceQuery = api.credits.getBalance.useQuery(undefined, {
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    refetchOnWindowFocus: true,
  });

  const historyQuery = api.credits.getHistory.useQuery({
    limit: 10,
    type: 'all',
  });

  // Mutations
  const deductCreditsMutation = api.credits.deductCredits.useMutation({
    onSuccess: () => {
      balanceQuery.refetch();
      historyQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addCreditsMutation = api.credits.addCredits.useMutation({
    onSuccess: () => {
      balanceQuery.refetch();
      historyQuery.refetch();
      toast.success('Credits added successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Mettre à jour les infos de crédits
  useEffect(() => {
    if (balanceQuery.data && historyQuery.data) {
      setCreditsInfo({
        balance: balanceQuery.data.balance,
        planId: balanceQuery.data.planId,
        monthlyUsage: balanceQuery.data.usedThisMonth,
        hasActiveSubscription: balanceQuery.data.planId !== 'free',
        subscriptionEndsAt: null,
        recentTransactions: historyQuery.data.map(t => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          description: t.description || '',
          createdAt: new Date(t.createdAt),
        })),
      });
      setIsLoading(false);
      setError(null);
    }
  }, [balanceQuery.data, historyQuery.data]);

  // Gestion des erreurs
  useEffect(() => {
    if (balanceQuery.error) {
      setError(balanceQuery.error.message);
      setIsLoading(false);
    }
  }, [balanceQuery.error]);

  // Rafraîchir manuellement
  const refreshCredits = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        balanceQuery.refetch(),
        historyQuery.refetch(),
      ]);
      toast.success('Credits refreshed');
    } catch (error) {
      toast.error('Failed to refresh credits');
    } finally {
      setIsRefreshing(false);
    }
  }, [balanceQuery, historyQuery]);

  // Vérifier si l'utilisateur a assez de crédits
  const hasEnoughCredits = useCallback((operation: keyof CreditCosts, additionalCost = 0) => {
    if (!creditsInfo) return false;
    const totalCost = CREDIT_COSTS[operation] + additionalCost;
    return creditsInfo.balance >= totalCost;
  }, [creditsInfo]);

  // Estimer le coût d'une opération
  const estimateCost = useCallback((operations: Partial<Record<keyof CreditCosts, number>>) => {
    let totalCost = 0;
    for (const [operation, count] of Object.entries(operations)) {
      if (count && CREDIT_COSTS[operation as keyof CreditCosts]) {
        totalCost += CREDIT_COSTS[operation as keyof CreditCosts] * count;
      }
    }
    return totalCost;
  }, []);

  // Calculer combien d'opérations possibles
  const calculateRemainingOperations = useCallback((operation: keyof CreditCosts) => {
    if (!creditsInfo) return 0;
    return Math.floor(creditsInfo.balance / CREDIT_COSTS[operation]);
  }, [creditsInfo]);

  // Vérifier et déduire des crédits
  const checkAndDeductCredits = useCallback(async (
    operation: keyof CreditCosts,
    description: string,
    metadata?: { jobId?: string; costEur?: number }
  ) => {
    if (!hasEnoughCredits(operation)) {
      const shortage = CREDIT_COSTS[operation] - (creditsInfo?.balance || 0);
      toast.error(`Insufficient credits. You need ${shortage} more credits for this operation.`);
      return { success: false, shortage };
    }

    try {
      const result = await deductCreditsMutation.mutateAsync({
        amount: CREDIT_COSTS[operation],
        type: 'generation',
        description,
        ...metadata,
      });

      toast.success(`${CREDIT_COSTS[operation]} credits used. Balance: ${result.newBalance}`);
      return { success: true, newBalance: result.newBalance };
    } catch (error: any) {
      toast.error(error.message || 'Failed to deduct credits');
      return { success: false, error: error.message };
    }
  }, [hasEnoughCredits, creditsInfo, deductCreditsMutation]);

  // Observer pour alertes de crédits faibles
  useEffect(() => {
    if (creditsInfo && creditsInfo.balance < 20 && creditsInfo.balance > 0) {
      toast.warning(`Low credits warning! Only ${creditsInfo.balance} credits remaining.`, {
        duration: 5000,
      });
    } else if (creditsInfo && creditsInfo.balance === 0) {
      toast.error('You have no credits remaining. Please purchase more to continue.', {
        duration: 5000,
      });
    }
  }, [creditsInfo?.balance]);

  return {
    // État
    creditsInfo,
    balance: creditsInfo?.balance || 0,
    planId: creditsInfo?.planId || 'free',
    monthlyUsage: creditsInfo?.monthlyUsage || 0,
    recentTransactions: creditsInfo?.recentTransactions || [],
    isLoading,
    error,
    isRefreshing,

    // Actions
    refreshCredits,
    hasEnoughCredits,
    estimateCost,
    calculateRemainingOperations,
    checkAndDeductCredits,

    // Mutations directes (pour cas avancés)
    deductCredits: deductCreditsMutation.mutate,
    addCredits: addCreditsMutation.mutate,

    // Constantes
    CREDIT_COSTS,
  };
}

// Hook pour vérification rapide avant action
export function useCreditsCheck(operation: keyof CreditCosts) {
  const { hasEnoughCredits, balance, isLoading } = useCredits();
  const cost = CREDIT_COSTS[operation];
  const canPerform = hasEnoughCredits(operation);
  const shortage = canPerform ? 0 : cost - balance;

  return {
    canPerform,
    cost,
    balance,
    shortage,
    isLoading,
    message: canPerform 
      ? `This operation will cost ${cost} credits` 
      : `You need ${shortage} more credits for this operation`,
  };
}

// Hook pour affichage formaté des crédits
export function useFormattedCredits() {
  const { balance, planId, isLoading } = useCredits();

  const formatCredits = (credits: number) => {
    if (credits >= 1000) {
      return `${(credits / 1000).toFixed(1)}k`;
    }
    return credits.toString();
  };

  const getCreditsColor = () => {
    if (balance === 0) return 'text-red-500';
    if (balance < 20) return 'text-orange-500';
    if (balance < 100) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressPercentage = () => {
    const maxCredits = {
      free: 100,
      starter: 1000,
      pro: 5000,
      enterprise: 15000,
    }[planId] || 100;

    return Math.min((balance / maxCredits) * 100, 100);
  };

  return {
    formatted: formatCredits(balance),
    color: getCreditsColor(),
    progressPercentage: getProgressPercentage(),
    isLoading,
  };
}