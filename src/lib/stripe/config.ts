import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Configuration serveur Stripe - only initialize if valid key exists
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const isValidStripeKey = stripeSecretKey && 
                        stripeSecretKey !== 'sk_test_your-stripe-secret-key' &&
                        stripeSecretKey.startsWith('sk_');

export const stripe = isValidStripeKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
      telemetry: false,
    })
  : null;

// Configuration client
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export const getStripe = () => {
  if (!stripePublicKey || stripePublicKey === 'pk_test_your-stripe-public-key') {
    console.warn('Stripe public key not configured');
    return null;
  }
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
    priceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
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
    priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
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
    priceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    priceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
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

// Validation de la configuration Stripe
export function validateStripeConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier les clés API
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_your-stripe-secret-key') {
    errors.push('STRIPE_SECRET_KEY manquante ou invalide');
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'pk_test_your-stripe-public-key') {
    warnings.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante');
  }

  // Vérifier les price IDs
  const plans = ['STARTER', 'PRO', 'ENTERPRISE'] as const;
  const intervals = ['MONTHLY', 'YEARLY'] as const;

  for (const plan of plans) {
    for (const interval of intervals) {
      const envVar = `STRIPE_${plan}_${interval}_PRICE_ID`;
      const value = process.env[envVar];
      
      if (!value) {
        errors.push(`${envVar} manquant`);
      } else if (!value.startsWith('price_')) {
        warnings.push(`${envVar} ne semble pas être un ID Stripe valide`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper pour obtenir tous les price IDs configurés
export function getAllConfiguredPrices(): Array<{ plan: PricingPlan; interval: 'month' | 'year'; priceId: string | null }> {
  const result: Array<{ plan: PricingPlan; interval: 'month' | 'year'; priceId: string | null }> = [];
  
  for (const [planKey, planConfig] of Object.entries(PRICING_CONFIG)) {
    if (planKey !== 'FREE') {
      result.push({
        plan: planKey as PricingPlan,
        interval: 'month',
        priceId: planConfig.priceIdMonthly || null,
      });
      
      result.push({
        plan: planKey as PricingPlan,
        interval: 'year', 
        priceId: planConfig.priceIdYearly || null,
      });
    }
  }
  
  return result;
}

// Helper pour vérifier si un plan est disponible
export function isPlanAvailable(plan: PricingPlan, interval: 'month' | 'year' = 'month'): boolean {
  if (plan === 'FREE') return true;
  
  const priceId = getPriceId(plan, interval);
  return !!priceId && priceId.startsWith('price_');
}