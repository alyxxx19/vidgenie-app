import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Configuration serveur Stripe
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: '2025-08-27.basil',
    typescript: true,
    telemetry: false,
  }
);

// Configuration client
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

export const getStripe = () => {
  return loadStripe(stripePublicKey);
};

// Configuration des plans avec prix réels
export const PRICING_CONFIG = {
  FREE: {
    name: 'Free',
    description: 'Parfait pour découvrir Vidgenie',
    price: 0,
    priceIdMonthly: null,
    priceIdYearly: null,
    credits: 100,
    storage: 1,
    maxGenerationsDay: 3,
    features: [
      'Génération vidéo basique',
      '100 crédits/mois',
      '1GB stockage',
      'Support communauté',
      'Templates de base',
    ],
    limitations: [
      'Filigrane sur les vidéos',
      'Qualité standard uniquement',
    ],
  },
  STARTER: {
    name: 'Starter',
    description: 'Idéal pour les créateurs individuels',
    price: 19,
    priceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly',
    priceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly',
    credits: 1000,
    storage: 10,
    maxGenerationsDay: 20,
    features: [
      'Génération HD',
      '1000 crédits/mois',
      '10GB stockage',
      'Support email',
      'Tous les templates',
      'Pas de filigrane',
    ],
    limitations: [],
  },
  PRO: {
    name: 'Pro',
    description: 'Pour les professionnels et entreprises',
    price: 49,
    priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
    credits: 5000,
    storage: 100,
    maxGenerationsDay: 100,
    features: [
      'Génération 4K',
      '5000 crédits/mois',
      '100GB stockage',
      'Support prioritaire',
      'Templates premium',
      'Accès API',
      'Branding personnalisé',
    ],
    limitations: [],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'Pour les équipes et organisations',
    price: 99,
    priceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
    priceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
    credits: 15000,
    storage: 500,
    maxGenerationsDay: 500,
    features: [
      'Solutions vidéo sur mesure',
      '15000+ crédits/mois',
      '500GB+ stockage',
      'Support dédié',
      'SLA garanti',
      'Options white label',
      'Intégrations personnalisées',
      'Gestion d\'équipe',
    ],
    limitations: [],
  },
} as const;

export type PricingPlan = keyof typeof PRICING_CONFIG;

// Helper functions
export function getPlanByPriceId(priceId: string): PricingPlan | null {
  for (const [planKey, plan] of Object.entries(PRICING_CONFIG)) {
    if (plan.priceIdMonthly === priceId || plan.priceIdYearly === priceId) {
      return planKey as PricingPlan;
    }
  }
  return null;
}

export function getPriceId(plan: PricingPlan, interval: 'month' | 'year'): string | null {
  const planConfig = PRICING_CONFIG[plan];
  return interval === 'month' ? planConfig.priceIdMonthly : planConfig.priceIdYearly;
}

export function getPlanPrice(plan: PricingPlan, interval: 'month' | 'year'): number {
  const planConfig = PRICING_CONFIG[plan];
  if (interval === 'year') {
    return Math.round(planConfig.price * 12 * 0.83); // 17% de réduction
  }
  return planConfig.price;
}

export function getSavingsPercentage(plan: PricingPlan): number {
  const planConfig = PRICING_CONFIG[plan];
  if (planConfig.price === 0) return 0;
  return 17; // 17% de réduction sur l'abonnement annuel
}