import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { db } from '@/server/api/db';
import { getCreditsManager } from '@/lib/services/credits-manager';
import Stripe from 'stripe';
import { secureLog } from '@/lib/secure-logger';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
  } catch (err) {
    secureLog.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Check if event already processed
  const existingWebhook = await db.stripeWebhook.findUnique({
    where: { stripeEventId: event.id }
  });

  if (existingWebhook?.processed) {
    return NextResponse.json({ received: true });
  }

  // Log webhook
  const webhook = await db.stripeWebhook.upsert({
    where: { stripeEventId: event.id },
    create: {
      stripeEventId: event.id,
      eventType: event.type,
      data: event.data as any,
    },
    update: {
      attempts: { increment: 1 },
    },
  });

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      default:
        secureLog.info(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await db.stripeWebhook.update({
      where: { id: webhook.id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    secureLog.error('Webhook processing failed:', error);
    
    // Log error
    await db.stripeWebhook.update({
      where: { id: webhook.id },
      data: {
        lastError: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  
  // Find plan
  const planKey = Object.entries(STRIPE_CONFIG.priceIds).find(
    ([_, id]) => id === priceId
  )?.[0];

  // Update user and customer data
  await db.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      stripePriceId: priceId,
      planId: planKey || 'free',
    },
  });

  await db.stripeCustomer.update({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
    },
  });

  // Add credits for new period if subscription is active
  if (subscription.status === 'active') {
    const plan = planKey ? SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS] : null;
    if (plan) {
      const user = await db.user.findUnique({ where: { stripeCustomerId: customerId } });
      if (user) {
        const creditsManager = getCreditsManager(db);
        
        // Utiliser le système de crédits centralisé
        await creditsManager.addCredits(
          user.id,
          plan.creditsPerMonth,
          'subscription',
          `${plan.name} plan renewal - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          {
            planName: plan.name,
          }
        );
        
        secureLog.info(`[STRIPE-WEBHOOK] Added ${plan.creditsPerMonth} credits for user ${user.email} (${plan.name} plan)`);
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await db.user.update({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: null,
      stripeCurrentPeriodEnd: null,
      stripePriceId: null,
      planId: 'free',
    },
  });

  await db.stripeCustomer.update({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionId: null,
      subscriptionStatus: 'canceled',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await db.user.findUnique({
    where: { stripeCustomerId: customerId }
  });

  if (!user) return;

  await db.stripePayment.create({
    data: {
      userId: user.id,
      stripePaymentId: (invoice as any).payment_intent || 'unknown',
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      description: invoice.description || 'Subscription payment',
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await db.user.findUnique({
    where: { stripeCustomerId: customerId }
  });

  if (!user) return;

  await db.stripePayment.create({
    data: {
      userId: user.id,
      stripePaymentId: (invoice as any).payment_intent || 'failed',
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: invoice.description || 'Failed subscription payment',
    },
  });

  // TODO: Send notification email for failed payment
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  // This is handled in the checkout session creation
  // but we can log it for audit purposes
  secureLog.info(`Stripe customer created: ${customer.id}`);
}