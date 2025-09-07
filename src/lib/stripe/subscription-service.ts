import { stripe, getPlanByPriceId, PRICING_CONFIG } from './config';
import { secureLog } from '@/lib/secure-logger';
import type { PricingPlan } from './config';

export interface CreateCheckoutSessionParams {
  customerId: string | null;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionData {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  plan: PricingPlan;
  interval: 'month' | 'year';
  amount: number;
  cancelAtPeriodEnd: boolean;
}

export class StripeSubscriptionService {
  // Créer une session de checkout
  static async createCheckoutSession({
    customerId,
    priceId,
    userId,
    successUrl,
    cancelUrl,
  }: CreateCheckoutSessionParams) {
    const sessionParams: any = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    };

    // Only add customer if customerId is provided and not null/empty
    if (customerId && customerId.trim() !== '') {
      sessionParams.customer = customerId;
      sessionParams.customer_update = {
        address: 'auto',
        name: 'auto',
      };
    }
    // For subscriptions, Stripe will automatically create a customer if none provided

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session;
  }

  // Récupérer les détails d'une subscription
  static async getSubscription(subscriptionId: string): Promise<SubscriptionData | null> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });

      const priceId = subscription.items.data[0]?.price?.id;
      if (!priceId) return null;

      const plan = getPlanByPriceId(priceId);
      if (!plan) return null;

      const price = subscription.items.data[0].price;
      const interval = price.recurring?.interval as 'month' | 'year';
      const amount = (price.unit_amount || 0) / 100;

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        plan,
        interval,
        amount,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      secureLog.error('Error retrieving subscription:', error);
      return null;
    }
  }

  // Changer de plan
  static async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<void> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  // Annuler une subscription (à la fin de la période)
  static async cancelSubscription(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Réactiver une subscription annulée
  static async reactivateSubscription(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Créer un lien vers le Customer Portal
  static async createCustomerPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  // Récupérer l'historique des factures
  static async getInvoiceHistory(customerId: string, limit = 10) {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
      status: 'paid',
    });

    return invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency,
      date: new Date(invoice.created * 1000),
      pdfUrl: invoice.hosted_invoice_url,
      status: invoice.status,
    }));
  }
}