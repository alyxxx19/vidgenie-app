import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const creditsRouter = createTRPCRouter({
  // Get user's current credit balance and usage
  getBalance: protectedProcedure
    .query(async ({ ctx }) => {

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          creditsBalance: true,
          planId: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Get current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyUsage = await ctx.db.creditLedger.aggregate({
        where: {
          userId: ctx.user.id,
          createdAt: { gte: startOfMonth },
          amount: { lt: 0 }, // Only debits
        },
        _sum: { amount: true },
      });

      const creditsUsedThisMonth = Math.abs(monthlyUsage._sum.amount || 0);

      return {
        balance: user.creditsBalance,
        planId: user.planId,
        usedThisMonth: creditsUsedThisMonth,
      };
    }),

  // Get credit transaction history
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      type: z.enum(['all', 'purchase', 'generation', 'publishing', 'refund']).default('all'),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        userId: ctx.user.id,
      };

      if (input.type !== 'all') {
        whereClause.type = input.type;
      }

      return await ctx.db.creditLedger.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      });
    }),

  // Deduct credits for an operation
  deductCredits: protectedProcedure
    .input(z.object({
      amount: z.number().min(1),
      type: z.enum(['generation', 'publishing', 'ai_request']),
      description: z.string(),
      jobId: z.string().optional(),
      costEur: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { creditsBalance: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (user.creditsBalance < input.amount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient credits. You have ${user.creditsBalance} credits but need ${input.amount}.`,
        });
      }

      // Create transaction record
      await ctx.db.creditLedger.create({
        data: {
          userId: ctx.user.id,
          amount: -input.amount, // Negative for debit
          type: input.type,
          description: input.description,
          jobId: input.jobId,
          costEur: input.costEur,
        },
      });

      // Update user balance
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { creditsBalance: { decrement: input.amount } },
        select: { creditsBalance: true },
      });

      return {
        success: true,
        newBalance: updatedUser.creditsBalance,
        deducted: input.amount,
      };
    }),

  // Add credits (for purchases, refunds, promotions)
  addCredits: protectedProcedure
    .input(z.object({
      amount: z.number().min(1),
      type: z.enum(['purchase', 'refund', 'promotion', 'bonus']),
      description: z.string(),
      costEur: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create transaction record
      await ctx.db.creditLedger.create({
        data: {
          userId: ctx.user.id,
          amount: input.amount, // Positive for credit
          type: input.type,
          description: input.description,
          costEur: input.costEur,
        },
      });

      // Update user balance
      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { creditsBalance: { increment: input.amount } },
        select: { creditsBalance: true },
      });

      return {
        success: true,
        newBalance: updatedUser.creditsBalance,
        added: input.amount,
      };
    }),

  // Get available plans
  getPlans: publicProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    }),

  // Purchase credits (mock implementation)
  purchaseCredits: protectedProcedure
    .input(z.object({
      planId: z.string(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.plan.findUnique({
        where: { id: input.planId, isActive: true },
      });

      if (!plan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Plan not found or inactive',
        });
      }

      // Mock payment processing
      const success = Math.random() > 0.1; // 90% success rate
      
      if (!success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment failed. Please try again.',
        });
      }

      // Add credits to user account
      await ctx.db.creditLedger.create({
        data: {
          userId: ctx.user.id,
          amount: plan.creditsPerMonth,
          type: 'purchase',
          description: `Purchase of ${plan.name} plan`,
          costEur: plan.price / 100, // Convert cents to euros
        },
      });

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          creditsBalance: { increment: plan.creditsPerMonth },
          planId: plan.id,
        },
        select: { creditsBalance: true, planId: true },
      });

      return {
        success: true,
        newBalance: updatedUser.creditsBalance,
        planName: plan.name,
        creditsAdded: plan.creditsPerMonth,
      };
    }),

  // Get credit consumption analytics
  getUsageAnalytics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const transactions = await ctx.db.creditLedger.findMany({
        where: {
          userId: ctx.user.id,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by type and date
      const dailyUsage = transactions.reduce((acc, transaction) => {
        const date = transaction.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { generation: 0, publishing: 0, total: 0 };
        }
        
        if (transaction.amount < 0) { // Only count debits
          const absAmount = Math.abs(transaction.amount);
          acc[date].total += absAmount;
          
          if (transaction.type === 'generation') {
            acc[date].generation += absAmount;
          } else if (transaction.type === 'publishing') {
            acc[date].publishing += absAmount;
          }
        }
        
        return acc;
      }, {} as Record<string, { generation: number; publishing: number; total: number }>);

      const totalUsed = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const totalAdded = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        dailyUsage,
        totalUsed,
        totalAdded,
        avgDailyUsage: totalUsed / input.days,
        transactionCount: transactions.length,
      };
    }),
});