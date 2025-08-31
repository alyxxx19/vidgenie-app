import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { StripeCustomerService } from '@/lib/stripe/customer-service';
import { StripeSubscriptionService } from '@/lib/stripe/subscription-service';
import { PRICING_CONFIG, getPlanByPriceId, stripe } from '@/lib/stripe/config';
import { TRPCError } from '@trpc/server';

export const stripeRouter = createTRPCRouter({
  // Create Stripe customer and checkout session  
  createCheckoutSession: protectedProcedure
    .input(z.object({
      plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']),
      interval: z.enum(['month', 'year']),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Créer ou récupérer le customer Stripe
      const customerId = await StripeCustomerService.getOrCreateCustomer(user);

      // Mettre à jour l'utilisateur avec le customer ID si nécessaire
      if (customerId !== user.stripeCustomerId) {
        await ctx.db.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Obtenir l'ID du prix
      const planConfig = PRICING_CONFIG[input.plan];
      const priceId = input.interval === 'month' ? planConfig.priceIdMonthly : planConfig.priceIdYearly;

      if (!priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Price ID not configured for this plan',
        });
      }

      // URLs de redirection
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Créer la session de checkout
      const session = await StripeSubscriptionService.createCheckoutSession({
        customerId,
        priceId,
        userId: user.id,
        successUrl: `${baseUrl}/account/billing`,
        cancelUrl: `${baseUrl}/pricing`,
      });

      return { 
        sessionId: session.id, 
        url: session.url,
        customerId,
        priceId,
      };
    }),

  // Create customer portal session
  createPortalSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Stripe customer found. Please subscribe to a plan first.',
        });
      }

      const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account/billing`;
      
      const portalUrl = await StripeSubscriptionService.createCustomerPortalSession(
        user.stripeCustomerId,
        returnUrl
      );

      return { url: portalUrl };
    }),

  // Get subscription status
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user;
      
      if (!user.stripeCustomerId) {
        return null;
      }

      const stripeCustomer = await ctx.db.stripeCustomer.findUnique({
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
          planName: getPlanByPriceId(subscription.items.data[0]?.price.id || '') || 'unknown',
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
      
      // Get subscription ID from Stripe customer
      const stripeCustomer = await ctx.db.stripeCustomer.findUnique({
        where: { userId: user.id }
      });
      
      if (!stripeCustomer?.subscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No subscription found',
        });
      }

      const subscription = await stripe.subscriptions.update(stripeCustomer.subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local data
      await ctx.db.stripeCustomer.update({
        where: { userId: user.id },
        data: { cancelAtPeriodEnd: true },
      });

      return { success: true, cancelAtPeriodEnd: subscription.cancel_at_period_end };
    }),

  // Reactivate subscription
  reactivateSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = ctx.user;
      
      // Get subscription ID from Stripe customer
      const stripeCustomer = await ctx.db.stripeCustomer.findUnique({
        where: { userId: user.id }
      });
      
      if (!stripeCustomer?.subscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No subscription found',
        });
      }

      const subscription = await stripe.subscriptions.update(stripeCustomer.subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local data
      await ctx.db.stripeCustomer.update({
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
      const payments = await ctx.db.stripePayment.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      return payments;
    }),

  // Get available plans
  getPlans: protectedProcedure
    .query(async () => {
      return Object.entries(PRICING_CONFIG).map(([key, plan]) => ({
        id: key,
        ...plan,
      }));
    }),
});