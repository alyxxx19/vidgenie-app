import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StripeCustomerService } from '@/lib/stripe/customer-service';
import { StripeSubscriptionService } from '@/lib/stripe/subscription-service';
import { getPriceId, isPlanAvailable, PRICING_CONFIG } from '@/lib/stripe/config';
import { db } from '@/server/api/db';
import { secureLog } from '@/lib/secure-logger';
import type { PricingPlan } from '@/lib/stripe/config';

interface CheckoutRequest {
  plan: PricingPlan;
  interval: 'month' | 'year';
}

export async function POST(request: NextRequest) {
  try {
    secureLog.info('[STRIPE-CHECKOUT] Starting checkout process...');
    
    const { plan, interval }: CheckoutRequest = await request.json();
    
    // Validation des paramètres
    if (!plan || !interval) {
      return NextResponse.json(
        { error: 'Plan and interval are required' },
        { status: 400 }
      );
    }

    if (!['month', 'year'].includes(interval)) {
      return NextResponse.json(
        { error: 'Interval must be "month" or "year"' },
        { status: 400 }
      );
    }

    // Vérifier que le plan est disponible
    if (!isPlanAvailable(plan, interval)) {
      return NextResponse.json(
        { error: `Plan ${plan} not available for ${interval}ly billing` },
        { status: 400 }
      );
    }

    secureLog.info(`[STRIPE-CHECKOUT] Creating checkout for ${plan} plan (${interval}ly)`);

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await db.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Vérifier que le plan n'est pas FREE
    if (plan === 'FREE') {
      return NextResponse.json(
        { error: 'Cannot create checkout for free plan' },
        { status: 400 }
      );
    }

    // Obtenir l'ID du prix Stripe
    const priceId = getPriceId(plan, interval);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan or interval' },
        { status: 400 }
      );
    }

    // Créer ou récupérer le customer Stripe
    const customerId = await StripeCustomerService.getOrCreateCustomer(user);

    // Mettre à jour l'utilisateur avec le customer ID si nécessaire
    if (customerId !== user.stripeCustomerId) {
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // URLs de redirection
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const successUrl = `${baseUrl}/account/billing?success=true&plan=${plan}&interval=${interval}`;
    const cancelUrl = `${baseUrl}/pricing?canceled=true`;

    secureLog.info(`[STRIPE-CHECKOUT] Price ID: ${priceId}`);
    secureLog.info(`[STRIPE-CHECKOUT] Customer ID: ${customerId}`);

    // Créer la session de checkout avec métadonnées enrichies
    const session = await StripeSubscriptionService.createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
      successUrl,
      cancelUrl,
    });

    // Logger pour debugging
    secureLog.info(`[STRIPE-CHECKOUT] Session created: ${session.id}`);
    secureLog.info(`[STRIPE-CHECKOUT] Redirect URL: ${session.url}`);

    // Informations sur le plan pour le client
    const planInfo = PRICING_CONFIG[plan];
    const monthlyPrice = planInfo.price;
    const yearlyPrice = Math.round(monthlyPrice * 12 * 0.83); // 17% de réduction

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      plan: {
        name: planInfo.name,
        description: planInfo.description,
        credits: planInfo.credits,
        storage: planInfo.storage,
        interval,
        price: interval === 'month' ? monthlyPrice : yearlyPrice,
        currency: 'EUR',
      },
    });

  } catch (error) {
    secureLog.error('Checkout creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Checkout creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}