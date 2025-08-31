import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import { db } from '@/server/api/db';
import Stripe from 'stripe';

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
    console.error('Webhook signature verification failed:', err);
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
      data: event.data,
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
        console.log(`Unhandled event type: ${event.type}`);
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
    console.error('Webhook processing failed:', error);
    
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
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      stripePriceId: priceId,
      planId: planKey || 'free',
    },
  });

  await db.stripeCustomer.update({
    where: { stripeCustomerId: customerId },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  // Add credits for new period if subscription is active
  if (subscription.status === 'active') {
    const plan = planKey ? SUBSCRIPTION_PLANS[planKey as keyof typeof SUBSCRIPTION_PLANS] : null;
    if (plan) {
      await db.creditLedger.create({
        data: {
          userId: (await db.user.findUnique({ where: { stripeCustomerId: customerId } }))!.id,
          amount: plan.creditsPerMonth,
          type: 'subscription_renewal',
          description: `Crédits ${plan.name} - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        },
      });

      // Update user credits balance
      await db.user.update({
        where: { stripeCustomerId: customerId },
        data: {
          creditsBalance: { increment: plan.creditsPerMonth },
        },
      });
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
      stripePaymentId: invoice.payment_intent as string,
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
      stripePaymentId: invoice.payment_intent as string || 'failed',
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
  console.log(`Stripe customer created: ${customer.id}`);
}