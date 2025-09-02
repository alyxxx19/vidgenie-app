'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { api } from '@/app/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  Zap, 
  Crown, 
  Building, 
  Sparkles,
  ChevronDown,
  Shield,
  Clock,
  Users,
  Headphones,
  Globe,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { PRICING_CONFIG } from '@/lib/stripe/config';

const PLAN_ICONS = {
  FREE: Sparkles,
  STARTER: Zap,
  PRO: Crown,
  ENTERPRISE: Building,
} as const;

interface PlanFeature {
  name: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

const FEATURES_COMPARISON: PlanFeature[] = [
  { name: 'Vidéos par mois', free: '10', starter: '30', pro: '150', enterprise: 'Illimité' },
  { name: 'Qualité vidéo', free: 'SD', starter: 'HD', pro: '4K', enterprise: '4K+' },
  { name: 'Templates', free: 'Basique', starter: 'Tous', pro: 'Tous + Premium', enterprise: 'Custom' },
  { name: 'Plateformes', free: '2', starter: 'Toutes', pro: 'Toutes', enterprise: 'Toutes' },
  { name: 'Analytics', free: false, starter: true, pro: true, enterprise: true },
  { name: 'API Access', free: false, starter: false, pro: true, enterprise: true },
  { name: 'Support', free: 'Email', starter: 'Email', pro: 'Priorité', enterprise: '24/7 Dédié' },
  { name: 'Stockage', free: '1GB', starter: '10GB', pro: '100GB', enterprise: '500GB+' },
  { name: 'Export HD', free: false, starter: true, pro: true, enterprise: true },
  { name: 'Filigrane', free: true, starter: false, pro: false, enterprise: false },
  { name: 'Collaboration', free: false, starter: false, pro: '5 membres', enterprise: 'Illimité' },
  { name: 'Branding custom', free: false, starter: false, pro: true, enterprise: true },
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Get params from URL
  useEffect(() => {
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    
    if (plan) {
      setSelectedPlan(plan.toUpperCase());
    }
    if (billing === 'yearly') {
      setBillingCycle('yearly');
    }
  }, [searchParams]);
  
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
      router.push(`/auth/signin?redirectTo=${encodeURIComponent(`/pricing?plan=${planKey}&billing=${billingCycle}`)}`);
      return;
    }

    setLoading(planKey);

    try {
      const { url } = await createCheckout.mutateAsync({
        plan: planKey,
        interval: billingCycle === 'yearly' ? 'year' : 'month',
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la session de paiement',
        variant: 'destructive',
      });
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      key: 'FREE',
      name: 'Free',
      description: 'Parfait pour découvrir',
      price: billingCycle === 'monthly' ? '0' : '0',
      features: [
        '10 vidéos/mois',
        'Templates basiques',
        '2 plateformes',
        '1GB stockage',
        'Support communauté'
      ],
      limitations: ['Filigrane VidGenie', 'Qualité SD uniquement'],
      cta: 'Commencer gratuitement',
      featured: false
    },
    {
      key: 'STARTER',
      name: 'Starter',
      description: 'Pour les créateurs individuels',
      price: billingCycle === 'monthly' ? '19' : '190',
      originalPrice: billingCycle === 'yearly' ? '228' : null,
      features: [
        '30 vidéos/mois',
        'Tous les templates',
        'Toutes les plateformes',
        '10GB stockage',
        'Analytics basique',
        'Support email',
        'Export HD',
        'Sans filigrane'
      ],
      cta: 'Choisir Starter',
      featured: false
    },
    {
      key: 'PRO',
      name: 'Professional',
      description: 'Pour les pros et entreprises',
      price: billingCycle === 'monthly' ? '49' : '490',
      originalPrice: billingCycle === 'yearly' ? '588' : null,
      features: [
        '150 vidéos/mois',
        'Templates premium',
        'Génération 4K',
        '100GB stockage',
        'Analytics avancées',
        'API Access',
        'Support prioritaire',
        'Branding personnalisé',
        'Collaboration (5 membres)'
      ],
      cta: 'Passer Pro',
      featured: true
    },
    {
      key: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Pour les équipes et agences',
      price: billingCycle === 'monthly' ? '99' : '990',
      originalPrice: billingCycle === 'yearly' ? '1188' : null,
      features: [
        'Vidéos illimitées',
        'Templates custom',
        'Qualité 4K+',
        '500GB+ stockage',
        'Analytics complètes',
        'API dédiée',
        'Support 24/7',
        'Formation dédiée',
        'Collaboration illimitée',
        'SLA garanti'
      ],
      cta: 'Contacter les ventes',
      featured: false
    }
  ];

  const isCurrentPlan = (planKey: string) => {
    return currentSubscription?.planName === planKey.toLowerCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 opacity-50" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-foreground mb-4">
              Plans & Tarifs
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-mono">
              Choisissez le plan parfait pour vos besoins. 
              Commencez gratuitement, évoluez avec votre croissance.
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center mt-8 gap-3">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 text-sm font-mono transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                mensuel
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 text-sm font-mono transition-all relative ${
                  billingCycle === 'yearly'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                annuel
                {billingCycle === 'yearly' && (
                  <span className="absolute -top-2 -right-12 bg-success text-background text-xs px-2 py-1 font-mono">
                    -17%
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map((plan, index) => {
              const IconComponent = PLAN_ICONS[plan.key as keyof typeof PLAN_ICONS];
              const isCurrent = isCurrentPlan(plan.key);
              const isSelected = selectedPlan === plan.key;
              
              return (
                <Card 
                  key={plan.key}
                  className={`relative transition-all duration-300 hover:scale-[1.02] ${
                    plan.featured 
                      ? 'border-primary shadow-lg scale-[1.03]' 
                      : 'border-border'
                  } ${isCurrent ? 'bg-card/50' : ''} ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-mono">
                      POPULAIRE
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-success text-background px-3 py-1 text-xs font-mono">
                      ACTUEL
                    </div>
                  )}

                  <CardContent className="p-6">
                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        <div className={`p-3 rounded-full ${
                          plan.featured ? 'bg-primary/10' : 'bg-secondary'
                        }`}>
                          <IconComponent className={`w-6 h-6 ${
                            plan.featured ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-mono mb-2">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-mono font-bold">€{plan.price}</span>
                        <span className="text-muted-foreground text-sm font-mono">
                          /{billingCycle === 'monthly' ? 'mois' : 'an'}
                        </span>
                      </div>
                      {plan.originalPrice && (
                        <div className="mt-1">
                          <span className="text-sm text-muted-foreground line-through font-mono">
                            €{plan.originalPrice}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            -17%
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-sm text-muted-foreground font-mono">
                          + {plan.features.length - 5} autres
                        </li>
                      )}
                      {plan.limitations?.map((limitation, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSubscribe(plan.key as keyof typeof PRICING_CONFIG)}
                      disabled={loading === plan.key || isCurrent}
                      className={`w-full font-mono lowercase ${
                        plan.featured
                          ? 'bg-primary hover:bg-primary/90'
                          : 'bg-foreground hover:bg-foreground/90'
                      } ${isCurrent ? 'bg-success hover:bg-success' : ''}`}
                    >
                      {loading === plan.key ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                          traitement...
                        </div>
                      ) : isCurrent ? (
                        'plan actuel'
                      ) : (
                        <span className="flex items-center justify-center">
                          {plan.cta}
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Features Comparison Toggle */}
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={() => setShowComparison(!showComparison)}
              className="font-mono lowercase text-muted-foreground hover:text-foreground"
            >
              {showComparison ? 'masquer' : 'voir'} la comparaison complète
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${
                showComparison ? 'rotate-180' : ''
              }`} />
            </Button>
          </div>

          {/* Features Comparison Table */}
          {showComparison && (
            <Card className="mb-16 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left p-4 font-mono text-sm">Fonctionnalités</th>
                        <th className="text-center p-4 font-mono text-sm">Free</th>
                        <th className="text-center p-4 font-mono text-sm">Starter</th>
                        <th className="text-center p-4 font-mono text-sm bg-primary/5">Pro</th>
                        <th className="text-center p-4 font-mono text-sm">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURES_COMPARISON.map((feature, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-secondary/20">
                          <td className="p-4 text-sm font-mono">{feature.name}</td>
                          <td className="text-center p-4">
                            {renderFeatureValue(feature.free)}
                          </td>
                          <td className="text-center p-4">
                            {renderFeatureValue(feature.starter)}
                          </td>
                          <td className="text-center p-4 bg-primary/5">
                            {renderFeatureValue(feature.pro)}
                          </td>
                          <td className="text-center p-4">
                            {renderFeatureValue(feature.enterprise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trust Badges */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-mono text-sm mb-1">Paiement Sécurisé</h4>
              <p className="text-xs text-muted-foreground">Via Stripe, 100% sécurisé</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-mono text-sm mb-1">Garantie 30 jours</h4>
              <p className="text-xs text-muted-foreground">Satisfait ou remboursé</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-mono text-sm mb-1">+50K Créateurs</h4>
              <p className="text-xs text-muted-foreground">Nous font confiance</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-mono text-sm mb-1">Support Réactif</h4>
              <p className="text-xs text-muted-foreground">Équipe dédiée 7j/7</p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-mono text-center mb-8">FAQ</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-mono text-sm mb-2">Puis-je changer de plan ?</h3>
                  <p className="text-sm text-muted-foreground">
                    Oui, vous pouvez upgrader ou downgrader à tout moment. Les changements sont immédiats avec facturation au prorata.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-mono text-sm mb-2">Comment fonctionnent les crédits ?</h3>
                  <p className="text-sm text-muted-foreground">
                    1 crédit = 1 seconde de vidéo générée. Les crédits se renouvellent chaque mois selon votre plan.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-mono text-sm mb-2">Puis-je annuler à tout moment ?</h3>
                  <p className="text-sm text-muted-foreground">
                    Absolument. Aucun engagement, annulez quand vous voulez depuis votre dashboard.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-mono text-sm mb-2">Y a-t-il des frais cachés ?</h3>
                  <p className="text-sm text-muted-foreground">
                    Non, tous les prix sont transparents. Pas de frais de setup ni de coûts cachés.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-mono mb-4">Prêt à créer du contenu viral ?</h3>
            <p className="text-muted-foreground mb-6 font-mono">
              Rejoignez des milliers de créateurs qui utilisent VidGenie
            </p>
            <Button asChild size="lg" className="font-mono lowercase">
              <Link href="/auth/signup">
                commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderFeatureValue(value: boolean | string) {
  if (typeof value === 'string') {
    return <span className="text-sm font-mono text-foreground">{value}</span>;
  }
  if (value === true) {
    return <Check className="w-4 h-4 text-success mx-auto" />;
  }
  return <X className="w-4 h-4 text-muted-foreground mx-auto" />;
}