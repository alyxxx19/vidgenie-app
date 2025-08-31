import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StripeSubscriptionService } from '@/lib/stripe/subscription-service';
import { db } from '@/server/api/db';

export async function POST(_request: NextRequest) {
  try {
    // Vérifier l'authentification
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur avec son customer ID Stripe
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      select: { 
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // URL de retour vers la page billing
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account/billing`;

    // Créer la session Customer Portal
    const portalUrl = await StripeSubscriptionService.createCustomerPortalSession(
      user.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({
      url: portalUrl,
    });

  } catch (error) {
    console.error('Customer Portal creation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Portal creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}