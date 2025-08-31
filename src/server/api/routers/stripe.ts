import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { stripe, SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/api/db';
import type { User as _User } from '@prisma/client';

export const stripeRouter = createTRPCRouter({
  // Create Stripe customer and checkout session
  createCheckoutSession: protectedProcedure
    .input(z.object({
      priceId: z.string(),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      // Get or create Stripe customer
      let stripeCustomer = await db.stripeCustomer.findUnique({
        where: { userId: user.id }
      });

      if (!stripeCustomer) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name || undefined,
          metadata: {
            userId: user.id,
          },
        });

        stripeCustomer = await db.stripeCustomer.create({
          data: {
            userId: user.id,
            stripeCustomerId: customer.id,
            email: user.email,
            name: user.name,
          },
        });

        // Update user with Stripe customer ID
        await db.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customer.id },
        });
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomer.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          userId: user.id,
        },
      });

      return { sessionId: session.id, url: session.url };
    }),

  // Create customer portal session
  createPortalSession: protectedProcedure
    .input(z.object({
      returnUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      
      if (!user.stripeCustomerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Stripe customer found',
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: input.returnUrl,
      });

      return { url: session.url };
    }),

  // Get subscription status
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user;
      
      if (!user.stripeCustomerId) {
        return null;
      }

      const stripeCustomer = await db.stripeCustomer.findUnique({
        where: { userId: user.id }
      });

      if (!stripeCustomer?.subscriptionId) {
        return null;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(stripeCustomer.subscriptionId);
        
        return {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          priceId: subscription.items.data[0]?.price.id,
          planName: Object.entries(SUBSCRIPTION_PLANS).find(
            ([_, plan]) => (plan as any).stripePriceId === subscription.items.data[0]?.price.id
          )?.[0] || 'unknown',
        };
      } catch (error) {
        console.error('Failed to retrieve subscription:', error);
        return null;
      }
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = ctx.user;
      
      if (!user.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No subscription found',
        });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local data
      await db.stripeCustomer.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: true },
      });

      return { success: true, cancelAtPeriodEnd: subscription.cancel_at_period_end };
    }),

  // Reactivate subscription
  reactivateSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = ctx.user;
      
      if (!user.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No subscription found',
        });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local data
      await db.stripeCustomer.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: false },
      });

      return { success: true, cancelAtPeriodEnd: subscription.cancel_at_period_end };
    }),

  // Get payment history
  getPaymentHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const payments = await db.stripePayment.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      return payments;
    }),

  // Get available plans
  getPlans: protectedProcedure
    .query(async () => {
      return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        ...plan,
      }));
    }),
});