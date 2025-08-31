import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StripeCustomerService } from '@/lib/stripe/customer-service';
import { StripeSubscriptionService } from '@/lib/stripe/subscription-service';
import { getPriceId } from '@/lib/stripe/config';
import { db } from '@/server/api/db';
import type { PricingPlan } from '@/lib/stripe/config';

interface CheckoutRequest {
  plan: PricingPlan;
  interval: 'month' | 'year';
}

export async function POST(request: NextRequest) {
  try {
    const { plan, interval }: CheckoutRequest = await request.json();

    // Vérifier l'authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/account/billing?success=true`;
    const cancelUrl = `${baseUrl}/pricing?canceled=true`;

    // Créer la session de checkout
    const session = await StripeSubscriptionService.createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Checkout creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}