'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Zap, Crown, Building, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PRICING_CONFIG, getPlanPrice, getSavingsPercentage } from '@/lib/stripe/config';

const PLAN_ICONS = {
  FREE: Sparkles,
  STARTER: Zap,
  PRO: Crown,
  ENTERPRISE: Building,
} as const;

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  
  const { data: currentSubscription } = api.stripe.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });
  const createCheckout = api.stripe.createCheckoutSession.useMutation();

  const handleSubscribe = async (planKey: keyof typeof PRICING_CONFIG) => {
    if (planKey === 'FREE') {
      router.push('/auth/signup');
      return;
    }

    if (!user) {
      router.push(`/auth/signin?redirectTo=${encodeURIComponent(`/pricing?plan=${planKey}&interval=${billingInterval}`)}`);
      return;
    }

    setLoading(planKey);

    try {
      const { url } = await createCheckout.mutateAsync({
        plan: planKey,
        interval: billingInterval,
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

  const getPrice = (planKey: keyof typeof PRICING_CONFIG) => {
    return getPlanPrice(planKey, billingInterval);
  };

  const getSavings = (planKey: keyof typeof PRICING_CONFIG) => {
    return getSavingsPercentage(planKey);
  };

  const isCurrentPlan = (planKey: string) => {
    return currentSubscription?.planName === planKey.toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
            Plans & Tarifs
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Choisissez le plan parfait pour vos besoins de création vidéo. 
            Commencez gratuitement et upgrader à tout moment.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            <span className={`text-sm font-medium ${billingInterval === 'month' ? 'text-gray-900' : 'text-gray-500'}`}>
              Mensuel
            </span>
            <Switch
              checked={billingInterval === 'year'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'year' : 'month')}
            />
            <span className={`text-sm font-medium ${billingInterval === 'year' ? 'text-gray-900' : 'text-gray-500'}`}>
              Annuel
            </span>
            {billingInterval === 'year' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Économisez 17%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(PRICING_CONFIG).map(([planKey, plan]) => {
            const IconComponent = PLAN_ICONS[planKey as keyof typeof PLAN_ICONS];
            const price = getPrice(planKey as keyof typeof PRICING_CONFIG);
            const savings = getSavings(planKey as keyof typeof PRICING_CONFIG);
            const isPopular = planKey === 'STARTER';
            const isCurrent = isCurrentPlan(planKey);

            return (
              <Card 
                key={planKey}
                className={`relative ${
                  isPopular 
                    ? 'border-blue-500 shadow-lg scale-105 ring-2 ring-blue-500 ring-opacity-50' 
                    : 'border-gray-200'
                } ${isCurrent ? 'bg-blue-50' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Le Plus Populaire
                  </Badge>
                )}

                {isCurrent && (
                  <Badge className="absolute -top-3 right-4 bg-green-500">
                    Plan Actuel
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      isPopular ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        isPopular ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        €{price}
                      </span>
                      {price > 0 && (
                        <span className="text-lg text-gray-500 ml-2">
                          /{billingInterval === 'month' ? 'mois' : 'an'}
                        </span>
                      )}
                    </div>
                    
                    {billingInterval === 'year' && savings > 0 && (
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                        Économisez {savings}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.limitations?.map((limitation, index) => (
                      <div key={index} className="flex items-start">
                        <div className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0">
                          <div className="w-1 h-3 bg-gray-300 rounded mx-auto mt-1"></div>
                        </div>
                        <span className="text-sm text-gray-500">{limitation}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSubscribe(planKey as keyof typeof PRICING_CONFIG)}
                    disabled={loading === planKey || isCurrent}
                    className={`w-full mt-6 ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-900 hover:bg-gray-800'
                    } ${isCurrent ? 'bg-green-600 hover:bg-green-600' : ''}`}
                  >
                    {loading === planKey ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Traitement...
                      </div>
                    ) : isCurrent ? (
                      'Plan Actuel'
                    ) : planKey === 'FREE' ? (
                      'Commencer Gratuitement'
                    ) : user ? (
                      'Choisir ce Plan'
                    ) : (
                      'S&apos;inscrire'
                    )}
                  </Button>
                  
                  {planKey === 'ENTERPRISE' && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      <Link href="/contact" className="text-blue-600 hover:text-blue-800">
                        Contactez-nous pour un devis personnalisé
                      </Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Current Subscription Info */}
        {currentSubscription && (
          <div className="mt-12 text-center">
            <Card className="max-w-md mx-auto bg-blue-50">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 mb-2">Votre abonnement actuel</p>
                <p className="font-semibold text-gray-900">
                  {currentSubscription.planName} - {currentSubscription.status}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Renouvellement le {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
                </p>
                <Link href="/account/billing">
                  <Button variant="outline" className="mt-3">
                    Gérer l&apos;abonnement
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Questions Fréquentes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Que sont les crédits ?
              </h3>
              <p className="text-gray-600 text-sm">
                Les crédits permettent de générer des vidéos. Différents types de vidéos consomment différents montants selon la durée et la complexité.
              </p>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Puis-je changer de plan à tout moment ?
              </h3>
              <p className="text-gray-600 text-sm">
                Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement avec facturation au prorata.
              </p>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Y a-t-il un essai gratuit ?
              </h3>
              <p className="text-gray-600 text-sm">
                Notre plan Gratuit vous donne 100 crédits mensuels pour essayer Vidgenie. Aucune carte bancaire requise pour commencer.
              </p>
            </div>
            
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                Quels moyens de paiement acceptez-vous ?
              </h3>
              <p className="text-gray-600 text-sm">
                Nous acceptons toutes les principales cartes bancaires via notre processeur de paiement sécurisé Stripe.
              </p>
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="mt-16 text-center">
          <div className="bg-gray-50 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Garantie Satisfait ou Remboursé 30 jours
            </h3>
            <p className="text-gray-600 text-sm">
              Essayez Vidgenie sans risque. Si vous n&apos;êtes pas entièrement satisfait, 
              nous vous remboursons intégralement sous 30 jours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}