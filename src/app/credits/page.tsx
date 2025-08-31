'use client';

import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  CreditCard, 
  TrendingUp, 
  History,
  ShoppingCart,
  Gift,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus
} from 'lucide-react';
import { api } from '@/app/providers';
import { toast } from 'sonner';

export default function CreditsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const { data: creditBalance } = api.credits.getBalance.useQuery();
  const { data: creditHistory } = api.credits.getHistory.useQuery({ limit: 20 });
  const { data: plans } = api.credits.getPlans.useQuery();
  const { data: usageAnalytics } = api.credits.getUsageAnalytics.useQuery({ days: 30 });

  const purchaseCredits = api.credits.purchaseCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.creditsAdded} crédits ajoutés à votre compte`);
    },
    onError: (error) => {
      toast.error(`Erreur de paiement: ${error.message}`);
    },
  });

  const handlePurchase = (planId: string) => {
    purchaseCredits.mutate({ planId });
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <Plus className="w-4 h-4 text-green-600" />;
    }
    
    switch (type) {
      case 'generation':
        return <Zap className="w-4 h-4 text-blue-600" />;
      case 'publishing':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      default:
        return <Minus className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Crédits & Facturation</h1>
          <p className="text-slate-600">Gérez vos crédits et votre abonnement</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Credit Balance Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Solde actuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {creditBalance?.balance || 0}
                </div>
                <p className="text-sm text-slate-600">Crédits disponibles</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {creditBalance?.usedThisMonth || 0}
                </div>
                <p className="text-sm text-slate-600">Utilisés ce mois</p>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {Math.floor((usageAnalytics?.avgDailyUsage || 0) * 30)}
                </div>
                <p className="text-sm text-slate-600">Estimation mensuelle</p>
              </div>
            </div>
            
            {creditBalance?.balance && creditBalance?.balance < 50 && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Solde faible</p>
                  <p className="text-sm text-orange-600">
                    Il vous reste moins de 50 crédits. Rechargez votre compte pour continuer à créer.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Plans & Recharge
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytiques
            </TabsTrigger>
          </TabsList>

          {/* Plans & Recharge Tab */}
          <TabsContent value="plans">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans?.map((plan) => {
                const isCurrentPlan = creditBalance?.planId === plan.id;
                const isPopular = plan.name.toLowerCase().includes('pro');
                
                return (
                  <Card key={plan.id} className={`relative ${isPopular ? 'border-blue-500 shadow-lg' : ''}`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-blue-600 text-white">
                          Populaire
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        {plan.price === 0 ? 'Gratuit' : `${plan.price / 100}€`}
                      </div>
                      <CardDescription>
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {plan.creditsPerMonth}
                        </div>
                        <p className="text-sm text-slate-600">crédits/mois</p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{plan.maxGenerationsDay} générations/jour</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{plan.maxStorageGB}GB de stockage</span>
                        </div>
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="capitalize">{feature.replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button
                        className="w-full"
                        variant={isCurrentPlan ? 'outline' : 'default'}
                        disabled={isCurrentPlan || purchaseCredits.isPending}
                        onClick={() => handlePurchase(plan.id)}
                      >
                        {isCurrentPlan ? (
                          'Plan actuel'
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            {plan.price === 0 ? 'Gratuit' : 'Acheter'}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des transactions</CardTitle>
                <CardDescription>
                  Toutes vos transactions de crédits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {creditHistory && creditHistory.length > 0 ? (
                  <div className="space-y-4">
                    {creditHistory.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            {getTransactionIcon(transaction.type, transaction.amount)}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(transaction.createdAt).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount} crédits
                          </div>
                          {transaction.costEur && (
                            <p className="text-xs text-slate-500">
                              {String(transaction.costEur)}€
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucune transaction</h3>
                    <p className="text-slate-500">
                      Vos transactions de crédits apparaîtront ici
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Consommation mensuelle</CardTitle>
                  <CardDescription>
                    Analyse de votre utilisation des crédits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Génération de contenu</span>
                      <div className="flex items-center gap-2">
                        <Progress value={60} className="w-20" />
                        <span className="text-sm font-medium">60%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Publication automatique</span>
                      <div className="flex items-center gap-2">
                        <Progress value={30} className="w-20" />
                        <span className="text-sm font-medium">30%</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Fonctions premium</span>
                      <div className="flex items-center gap-2">
                        <Progress value={10} className="w-20" />
                        <span className="text-sm font-medium">10%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommandations</CardTitle>
                  <CardDescription>
                    Optimisez votre utilisation des crédits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Gift className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Bonus de fidélité</p>
                        <p className="text-sm text-blue-700">
                          Utilisez l'app 7 jours consécutifs pour gagner 50 crédits bonus
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Optimisation suggérée</p>
                        <p className="text-sm text-green-700">
                          Réutilisez vos prompts sauvegardés pour économiser des crédits
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">Prévision</p>
                        <p className="text-sm text-yellow-700">
                          À ce rythme, vous consommerez {Math.ceil((usageAnalytics?.avgDailyUsage || 0) * 30)} crédits ce mois
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}