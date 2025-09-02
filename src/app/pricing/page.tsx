'use client';

import { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  Star
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

// Enhanced Pricing Card Component with animations
const EnhancedPricingCard = ({ 
  plan, 
  index, 
  billingCycle, 
  isCurrentPlan, 
  isSelectedPlan, 
  isLoading, 
  onSubscribe 
}: { 
  plan: any; 
  index: number; 
  billingCycle: 'monthly' | 'yearly';
  isCurrentPlan: boolean;
  isSelectedPlan: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), index * 200);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [index]);

  const IconComponent = PLAN_ICONS[plan.key as keyof typeof PLAN_ICONS];

  return (
    <div 
      ref={cardRef}
      className={`pricing-card-container relative transition-all duration-700 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-8 opacity-0'
      }`}
      style={{ 
        transitionDelay: `${index * 100}ms`,
        animationDelay: `${index * 100}ms`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card 
        className={`relative overflow-hidden transition-all duration-500 hover:scale-[1.02] cursor-pointer group h-full ${
          plan.featured 
            ? 'border-foreground pricing-card-featured' 
            : 'border-border hover:border-foreground/30'
        } ${
          isCurrentPlan ? 'bg-card/50 border-success' : ''
        } ${
          isSelectedPlan ? 'ring-2 ring-primary' : ''
        } ${
          isHovered ? 'shadow-glow glow-white' : ''
        }`}
      >
        {/* Animated Background Effects */}
        {plan.featured && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/5 opacity-50" />
            <div className="absolute inset-0 texture-dots opacity-20" />
          </>
        )}


        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <div className="absolute -top-4 right-4 z-20">
            <div className="bg-success text-background px-3 py-1 text-xs font-mono uppercase tracking-wider animate-pulse">
              ACTUEL
            </div>
          </div>
        )}

        <CardContent className="p-6 relative z-10 flex flex-col h-full">
          {/* Plan Header with Icon Animation - Fixed Height */}
          <div className="text-center mb-6 h-32 flex flex-col justify-center">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full transition-all duration-500 ${
                plan.featured 
                  ? 'bg-foreground/10 animate-float' 
                  : 'bg-secondary group-hover:bg-foreground/10'
              } ${
                isHovered ? 'animate-glow-pulse' : ''
              }`}>
                <IconComponent className={`w-8 h-8 transition-all duration-300 ${
                  plan.featured 
                    ? 'text-foreground animate-pulse' 
                    : 'text-muted-foreground group-hover:text-foreground'
                } ${
                  isHovered ? 'scale-110' : ''
                }`} />
              </div>
            </div>
            
            <h3 className="text-xl font-mono mb-2 transition-all duration-300 group-hover:text-foreground">
              {plan.name}
            </h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
              {plan.description}
            </p>
          </div>

          {/* Price with Glow Animation - Fixed Height */}
          <div className="text-center mb-6 h-20 flex flex-col justify-center">
            <div className={`flex items-baseline justify-center gap-1 ${
              plan.featured ? 'animate-price-glow' : ''
            }`}>
              <span className={`text-4xl font-mono font-bold transition-all duration-500 ${
                isVisible ? 'animate-price-scale' : ''
              } ${
                plan.featured ? 'text-foreground' : 'text-foreground group-hover:text-foreground'
              }`}>
                €{plan.price}
              </span>
              <span className="text-muted-foreground text-sm font-mono">
                /{billingCycle === 'monthly' ? 'mois' : 'an'}
              </span>
            </div>
            {plan.originalPrice && (
              <div className="mt-2 animate-slide-in">
                <span className="text-sm text-muted-foreground line-through font-mono">
                  €{plan.originalPrice}
                </span>
                <Badge variant="secondary" className="ml-2 text-xs animate-shimmer">
                  -17%
                </Badge>
              </div>
            )}
          </div>

          {/* Features with Stagger Animation - Fixed Height */}
          <div className="flex-1 mb-6">
            <ul className="space-y-3 h-48 overflow-hidden">
              {plan.features.slice(0, 6).map((feature: string, idx: number) => (
                <li 
                  key={idx} 
                  className={`flex items-start gap-2 transition-all duration-500 ${
                    isVisible 
                      ? 'translate-x-0 opacity-100' 
                      : 'translate-x-4 opacity-0'
                  }`}
                  style={{ 
                    transitionDelay: `${400 + (idx * 100)}ms` 
                  }}
                >
                  <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0 animate-pulse" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors duration-300">
                    {feature}
                  </span>
                </li>
              ))}
              {plan.features.length > 6 && (
                <li className="text-sm text-muted-foreground font-mono opacity-60 animate-fade-in-up">
                  + {plan.features.length - 6} autres
                </li>
              )}
              {plan.limitations?.map((limitation: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 animate-fade-in-up">
                  <X className="w-4 h-4 text-destructive/60 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground/60">{limitation}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Enhanced CTA Button */}
          <Button
            onClick={onSubscribe}
            disabled={isLoading || isCurrentPlan}
            className={`w-full font-mono lowercase transition-all duration-500 transform hover:scale-105 hover:shadow-glow shine-effect ${
              plan.featured
                ? 'bg-foreground hover:bg-foreground/90 text-background glow-white'
                : 'bg-foreground hover:bg-foreground/90 text-background'
            } ${
              isCurrentPlan 
                ? 'bg-success hover:bg-success text-background' 
                : ''
            } ${
              isHovered 
                ? 'animate-glow-pulse shadow-glow' 
                : ''
            }`}
          >
            {isLoading ? (
              <div className="flex items-center animate-pulse">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2" />
                traitement...
              </div>
            ) : isCurrentPlan ? (
              'plan actuel'
            ) : (
              <span className="flex items-center justify-center group">
                {plan.cta}
                <ArrowRight className="ml-2 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get params from URL
  useEffect(() => {
    if (!mounted) return;
    
    const plan = searchParams.get('plan');
    const billing = searchParams.get('billing');
    
    if (plan) {
      setSelectedPlan(plan.toUpperCase());
    }
    if (billing === 'yearly') {
      setBillingCycle('yearly');
    }
  }, [searchParams, mounted]);
  
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

  // Don't render on server to avoid hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
          <div className="text-center mb-12">
            <div className="h-16 bg-card/20 animate-pulse mb-4" />
            <div className="h-6 bg-card/20 animate-pulse max-w-2xl mx-auto mb-8" />
            <div className="h-8 bg-card/20 animate-pulse max-w-sm mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-card/20 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background with Grid Pattern like Landing Page */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
      }} />
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        )`
      }} />
      
      {/* Floating Particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="particle particle-dot"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            animationDuration: `${15 + Math.random() * 10}s`
          }}
        />
      ))}
      
      <div className="relative z-10">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-8 relative z-10">
          <div className="text-center mb-12">
            {/* Header with Animation */}
            <div className="reveal-up stagger-1">
              <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-foreground mb-4 animate-fade-in-up">
                Plans & Tarifs
              </h1>
            </div>
            <div className="reveal-up stagger-2">
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-mono">
                Choisissez le plan parfait pour vos besoins. 
                Commencez gratuitement, évoluez avec votre croissance.
              </p>
            </div>
            
            {/* Enhanced Billing Toggle */}
            <div className="reveal-up stagger-3 mt-8">
              <div className="inline-flex items-center gap-0 bg-card/50 backdrop-blur-md border border-border/50 overflow-hidden glass-card">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-3 text-sm font-mono lowercase transition-all duration-500 hover:scale-105 shine-effect ${
                    billingCycle === 'monthly'
                      ? 'bg-foreground text-background shadow-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/10'
                  }`}
                >
                  mensuel
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-3 text-sm font-mono lowercase transition-all duration-500 relative hover:scale-105 shine-effect ${
                    billingCycle === 'yearly'
                      ? 'bg-foreground text-background shadow-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/10'
                  }`}
                >
                  annuel
                  <span className="absolute -top-2 -right-1 bg-foreground text-background text-xs px-2 py-1 font-mono animate-bounce">
                    -17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Pricing Cards with 3D Effect */}
          <div className="pricing-grid-container grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 mt-12 items-stretch">
            {plans.map((plan, index) => {
              const isCurrent = isCurrentPlan(plan.key);
              const isSelected = selectedPlan === plan.key;
              
              return (
                <EnhancedPricingCard
                  key={plan.key}
                  plan={plan}
                  index={index}
                  billingCycle={billingCycle}
                  isCurrentPlan={isCurrent}
                  isSelectedPlan={isSelected}
                  isLoading={loading === plan.key}
                  onSubscribe={() => handleSubscribe(plan.key as keyof typeof PRICING_CONFIG)}
                />
              );
            })}
          </div>

          {/* Enhanced Features Comparison Toggle */}
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={() => setShowComparison(!showComparison)}
              className="font-mono lowercase text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 hover:shadow-glow shine-effect"
            >
              {showComparison ? 'masquer' : 'voir'} la comparaison complète
              <ChevronDown className={`ml-2 h-4 w-4 transition-all duration-500 ${
                showComparison ? 'rotate-180' : ''
              }`} />
            </Button>
          </div>

          {/* Enhanced Features Comparison Table */}
          {showComparison && (
            <div className="animate-fade-in-up">
              <Card className="mb-16 overflow-hidden glass-card-premium border-glow">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50 backdrop-blur-sm">
                          <th className="text-left p-4 font-mono text-sm uppercase tracking-wider">Fonctionnalités</th>
                          <th className="text-center p-4 font-mono text-sm uppercase tracking-wider">Free</th>
                          <th className="text-center p-4 font-mono text-sm uppercase tracking-wider">Starter</th>
                          <th className="text-center p-4 font-mono text-sm uppercase tracking-wider bg-foreground/5 glow-white">Pro</th>
                          <th className="text-center p-4 font-mono text-sm uppercase tracking-wider">Enterprise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FEATURES_COMPARISON.map((feature, idx) => (
                          <tr key={idx} className={`border-b border-border hover:bg-secondary/20 transition-all duration-300 reveal-up`} style={{ animationDelay: `${idx * 50}ms` }}>
                            <td className="p-4 text-sm font-mono font-medium">{feature.name}</td>
                            <td className="text-center p-4 transition-all duration-300 hover:scale-105">
                              {renderFeatureValue(feature.free)}
                            </td>
                            <td className="text-center p-4 transition-all duration-300 hover:scale-105">
                              {renderFeatureValue(feature.starter)}
                            </td>
                            <td className="text-center p-4 bg-foreground/5 glow-white transition-all duration-300 hover:scale-105 hover:shadow-glow">
                              {renderFeatureValue(feature.pro)}
                            </td>
                            <td className="text-center p-4 transition-all duration-300 hover:scale-105">
                              {renderFeatureValue(feature.enterprise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Trust Badges */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {[
              { icon: Shield, title: 'Paiement Sécurisé', desc: 'Via Stripe, 100% sécurisé', delay: 0 },
              { icon: Clock, title: 'Garantie 30 jours', desc: 'Satisfait ou remboursé', delay: 100 },
              { icon: Users, title: '+50K Créateurs', desc: 'Nous font confiance', delay: 200 },
              { icon: Headphones, title: 'Support Réactif', desc: 'Équipe dédiée 7j/7', delay: 300 }
            ].map((badge, index) => (
              <div key={index} className={`text-center group cursor-pointer reveal-up`} style={{ animationDelay: `${badge.delay}ms` }}>
                <div className="flex justify-center mb-3">
                  <div className="p-4 rounded-full bg-card/50 backdrop-blur-md border border-border/50 transition-all duration-500 group-hover:scale-110 group-hover:shadow-glow group-hover:border-foreground/30 animate-float">
                    <badge.icon className="w-6 h-6 text-foreground transition-all duration-300 group-hover:text-foreground" />
                  </div>
                </div>
                <h4 className="font-mono text-sm mb-1 transition-all duration-300 group-hover:text-foreground">
                  {badge.title}
                </h4>
                <p className="text-xs text-muted-foreground transition-all duration-300 group-hover:text-foreground/80">
                  {badge.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Enhanced FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 reveal-up">
              <h2 className="text-3xl font-mono mb-4 animate-fade-in-up">FAQ</h2>
              <p className="text-muted-foreground font-mono lowercase">questions fréquemment posées</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  question: 'Puis-je changer de plan ?',
                  answer: 'Oui, vous pouvez upgrader ou downgrader à tout moment. Les changements sont immédiats avec facturation au prorata.',
                  delay: 0
                },
                {
                  question: 'Comment fonctionnent les crédits ?',
                  answer: '1 crédit = 1 seconde de vidéo générée. Les crédits se renouvellent chaque mois selon votre plan.',
                  delay: 100
                },
                {
                  question: 'Puis-je annuler à tout moment ?',
                  answer: 'Absolument. Aucun engagement, annulez quand vous voulez depuis votre dashboard.',
                  delay: 200
                },
                {
                  question: 'Y a-t-il des frais cachés ?',
                  answer: 'Non, tous les prix sont transparents. Pas de frais de setup ni de coûts cachés.',
                  delay: 300
                }
              ].map((faq, index) => (
                <Card key={index} className={`group hover:shadow-glow transition-all duration-500 hover:scale-[1.02] glass-card reveal-up shine-effect`} style={{ animationDelay: `${faq.delay}ms` }}>
                  <CardContent className="p-6">
                    <h3 className="font-mono text-sm mb-3 font-medium group-hover:text-foreground transition-colors duration-300">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Enhanced Bottom CTA */}
          <div className="text-center mt-16 reveal-up">
            <div className="relative p-12 glass-card-premium border-glow shine-effect group">
              <div className="absolute inset-0 glow-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <h3 className="text-3xl font-mono mb-4 animate-fade-in-up group-hover:animate-price-glow">
                  Prêt à créer du contenu viral ?
                </h3>
                <p className="text-muted-foreground mb-8 font-mono lowercase group-hover:text-foreground/80 transition-colors duration-300">
                  Rejoignez des milliers de créateurs qui utilisent VidGenie
                </p>
                <Button 
                  asChild 
                  size="lg" 
                  className="font-mono lowercase bg-foreground hover:bg-foreground/90 text-background hover:scale-110 hover:shadow-glow transition-all duration-500 shine-effect glow-white"
                >
                  <Link href="/auth/signup" className="group/cta">
                    commencer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-2" />
                  </Link>
                </Button>
              </div>
            </div>
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