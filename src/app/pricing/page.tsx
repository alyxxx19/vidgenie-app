'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Building } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  
  const { data: plans } = api.stripe.getPlans.useQuery();
  const { data: currentSubscription } = api.stripe.getSubscription.useQuery();
  const createCheckout = api.stripe.createCheckoutSession.useMutation();

  const handleSubscribe = async (planId: string, priceId?: string) => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (!priceId) {
      toast.error('Plan non disponible');
      return;
    }

    setLoading(planId);

    try {
      const { url } = await createCheckout.mutateAsync({
        priceId,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`,
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error('Erreur lors de la création du checkout');
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Zap className="w-6 h-6" />;
      case 'pro': return <Crown className="w-6 h-6" />;
      case 'enterprise': return <Building className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const getCurrentPlanStatus = (planId: string) => {
    if (currentSubscription?.planName === planId) {
      return currentSubscription.status === 'active' ? 'current' : 'inactive';
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-mono text-lg text-foreground">
              vidgenie
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href="/auth/signin">Se connecter</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sélectionnez le plan qui correspond à vos besoins de création de contenu
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans?.map((plan) => {
            const isCurrentPlan = getCurrentPlanStatus(plan.id);
            const isPopular = plan.id === 'pro';
            
            return (
              <Card 
                key={plan.id} 
                className={`relative bg-card border-border hover:border-foreground/20 transition-all duration-300 ${
                  isPopular ? 'border-primary shadow-lg scale-105' : ''
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Populaire
                  </Badge>
                )}
                
                {isCurrentPlan === 'current' && (
                  <Badge variant="outline" className="absolute -top-3 right-4 bg-background">
                    Plan actuel
                  </Badge>
                )}

                <CardHeader className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-primary/10 rounded-lg">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {plan.price === 0 ? 'Gratuit' : `${plan.price / 100}€`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/mois</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{plan.creditsPerMonth.toLocaleString()} crédits/mois</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{plan.maxGenerationsDay} générations/jour</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{plan.maxStorageGB} GB de stockage</span>
                    </div>
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm capitalize">{feature.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan === 'current' ? 'outline' : 'default'}
                    disabled={loading === plan.id || isCurrentPlan === 'current'}
                    onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                  >
                    {loading === plan.id ? (
                      'Redirection...'
                    ) : isCurrentPlan === 'current' ? (
                      'Plan actuel'
                    ) : plan.id === 'free' ? (
                      'Commencer gratuitement'
                    ) : (
                      'S&apos;abonner'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Customer Portal Link */}
        {user && currentSubscription && (
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-4">
              Besoin de gérer votre abonnement ?
            </p>
            <Button asChild variant="outline">
              <Link href="/account/billing">
                Gérer mon abonnement
              </Link>
            </Button>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-12">Questions fréquentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">Puis-je changer de plan à tout moment ?</h3>
              <p className="text-muted-foreground text-sm">
                Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. 
                Les changements prennent effet immédiatement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Que se passe-t-il si j'annule ?</h3>
              <p className="text-muted-foreground text-sm">
                Votre abonnement reste actif jusqu'à la fin de la période payée. 
                Vous gardez accès à toutes vos créations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Les crédits non utilisés roulent-ils ?</h3>
              <p className="text-muted-foreground text-sm">
                Non, les crédits sont remis à zéro chaque mois pour encourager 
                une utilisation régulière de la plateforme.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Support client inclus ?</h3>
              <p className="text-muted-foreground text-sm">
                Tous les plans incluent un support par email. Les plans Pro et Enterprise 
                bénéficient d'un support prioritaire.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}