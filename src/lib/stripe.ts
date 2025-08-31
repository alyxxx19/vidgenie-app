import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  priceIds: {
    starter: process.env.STRIPE_PRICE_ID_STARTER!,
    pro: process.env.STRIPE_PRICE_ID_PRO!,
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
  },
} as const;

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    description: 'Pour commencer',
    price: 0,
    creditsPerMonth: 100,
    maxGenerationsDay: 3,
    maxStorageGB: 1,
    features: ['basic_generation', 'community_support'],
    stripePriceId: undefined,
  },
  starter: {
    name: 'Starter',
    description: 'Pour les créateurs individuels',
    price: 1900, // 19€
    creditsPerMonth: 1000,
    maxGenerationsDay: 20,
    maxStorageGB: 10,
    features: ['advanced_generation', 'scheduling', 'analytics', 'email_support'],
    stripePriceId: STRIPE_CONFIG.priceIds.starter,
  },
  pro: {
    name: 'Pro',
    description: 'Pour les créateurs professionnels',
    price: 4900, // 49€
    creditsPerMonth: 5000,
    maxGenerationsDay: 100,
    maxStorageGB: 50,
    features: ['premium_generation', 'advanced_scheduling', 'advanced_analytics', 'priority_support', 'api_access'],
    stripePriceId: STRIPE_CONFIG.priceIds.pro,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Pour les équipes et agences',
    price: 9900, // 99€
    creditsPerMonth: 15000,
    maxGenerationsDay: 500,
    maxStorageGB: 200,
    features: ['unlimited_generation', 'team_management', 'custom_ai_models', 'dedicated_support', 'sla'],
    stripePriceId: STRIPE_CONFIG.priceIds.enterprise,
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;