import { NextResponse } from 'next/server';
import { validateStripeConfig, getAllConfiguredPrices, stripe } from '@/lib/stripe/config';

export async function GET() {
  try {
    // Validation de base
    const validation = validateStripeConfig();
    
    // Obtenir les prix configurés
    const configuredPrices = getAllConfiguredPrices();
    
    // Tester la connexion Stripe (si les clés sont valides)
    let stripeConnection = null;
    if (validation.isValid && stripe) {
      try {
        const account = await stripe.accounts.retrieve();
        stripeConnection = {
          connected: true,
          accountId: account.id,
          country: account.country,
          defaultCurrency: account.default_currency,
          businessType: account.business_type,
        };
      } catch (error: any) {
        stripeConnection = {
          connected: false,
          error: error.message,
        };
      }
    }

    // Vérifier les produits Stripe existants
    let stripeProducts = null;
    if (stripe && validation.isValid) {
      try {
        const products = await stripe.products.list({ 
          limit: 10,
          active: true,
        });
        
        const vidgenieProducts = products.data.filter(p => 
          p.name.toLowerCase().includes('vidgenie') || 
          p.metadata.planKey
        );

        stripeProducts = {
          total: products.data.length,
          vidgenieProducts: vidgenieProducts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            planKey: p.metadata.planKey,
          })),
        };
      } catch (error: any) {
        stripeProducts = {
          error: error.message,
        };
      }
    }

    return NextResponse.json({
      validation,
      configuredPrices,
      stripeConnection,
      stripeProducts,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'live' : 'test',
      },
      recommendations: getRecommendations(validation),
    });

  } catch (error: any) {
    console.error('[STRIPE-CONFIG-API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check Stripe configuration',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function getRecommendations(validation: ReturnType<typeof validateStripeConfig>): string[] {
  const recommendations: string[] = [];
  
  if (!validation.isValid) {
    recommendations.push('🔧 Exécutez `tsx scripts/setup-stripe-products.ts` pour créer automatiquement les produits');
  }
  
  if (validation.warnings.length > 0) {
    recommendations.push('⚠️ Vérifiez les Price IDs dans Stripe Dashboard');
  }
  
  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')) {
    recommendations.push('🧪 Mode test actif - configurez les clés live pour la production');
  }
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    recommendations.push('🔗 Configurez STRIPE_WEBHOOK_SECRET pour les webhooks');
  }
  
  return recommendations;
}