import { stripe } from './config';
import type { User } from '@prisma/client';

export class StripeCustomerService {
  // Créer ou récupérer un customer Stripe
  static async getOrCreateCustomer(user: User): Promise<string> {
    // Si l'utilisateur a déjà un customer ID Stripe
    if (user.stripeCustomerId) {
      try {
        // Vérifier que le customer existe toujours
        await stripe.customers.retrieve(user.stripeCustomerId);
        return user.stripeCustomerId;
      } catch (error) {
        console.error('Stripe customer not found, creating new one:', error);
      }
    }

    // Créer un nouveau customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
        plan: user.planId,
        createdAt: user.createdAt.toISOString(),
      },
    });

    return customer.id;
  }

  // Mettre à jour les informations du customer
  static async updateCustomer(
    customerId: string,
    updates: {
      email?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    await stripe.customers.update(customerId, {
      email: updates.email,
      name: updates.name,
      metadata: updates.metadata,
    });
  }

  // Récupérer les détails complets d'un customer
  static async getCustomerDetails(customerId: string) {
    const [customer, subscriptions, paymentMethods] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 10,
      }),
      stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      }),
    ]);

    return {
      customer,
      subscriptions: subscriptions.data,
      paymentMethods: paymentMethods.data,
    };
  }

  // Supprimer un customer (GDPR compliance)
  static async deleteCustomer(customerId: string): Promise<void> {
    await stripe.customers.del(customerId);
  }
}