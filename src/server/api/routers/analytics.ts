import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const analyticsRouter = createTRPCRouter({
  // Get user activation metrics
  getUserActivation: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) return null;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Check key activation events
      const generationEvents = await ctx.db.usageEvent.count({
        where: {
          userId,
          event: 'generation_succeeded',
          createdAt: { gte: sevenDaysAgo },
        },
      });

      const publishingEvents = await ctx.db.usageEvent.count({
        where: {
          userId,
          event: 'publishing_succeeded',
          createdAt: { gte: sevenDaysAgo },
        },
      });

      const apiConnectionEvents = await ctx.db.usageEvent.count({
        where: {
          userId,
          event: 'api_keys_connected',
        },
      });

      // Calculate activation score (0-100)
      let activationScore = 0;
      if (generationEvents > 0) activationScore += 40; // Generated content
      if (publishingEvents > 0) activationScore += 30; // Published content
      if (apiConnectionEvents > 0) activationScore += 20; // Connected APIs
      if (generationEvents >= 3) activationScore += 10; // Multiple generations

      const daysSinceSignup = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        activationScore,
        daysSinceSignup,
        generationsCount: generationEvents,
        publishingCount: publishingEvents,
        isActivated: activationScore >= 35, // PRD target: ≥35%
      };
    }),

  // Get generation success rate
  getGenerationMetrics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const totalJobs = await ctx.db.job.count({
        where: {
          userId: ctx.user.id,
          type: 'generation',
          createdAt: { gte: startDate },
        },
      });

      const successfulJobs = await ctx.db.job.count({
        where: {
          userId: ctx.user.id,
          type: 'generation',
          status: 'completed',
          createdAt: { gte: startDate },
        },
      });

      const failedJobs = await ctx.db.job.count({
        where: {
          userId: ctx.user.id,
          type: 'generation',
          status: 'failed',
          createdAt: { gte: startDate },
        },
      });

      // Average generation time
      const completedJobs = await ctx.db.job.findMany({
        where: {
          userId: ctx.user.id,
          type: 'generation',
          status: 'completed',
          actualTime: { not: null },
          createdAt: { gte: startDate },
        },
        select: { actualTime: true },
      });

      const avgGenerationTime = completedJobs.length > 0 
        ? completedJobs.reduce((sum, job) => sum + (job.actualTime || 0), 0) / completedJobs.length
        : 0;

      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

      return {
        totalJobs,
        successfulJobs,
        failedJobs,
        successRate,
        avgGenerationTime,
        isAboveTarget: successRate >= 95, // PRD target: ≥95%
        isTimeWithinTarget: avgGenerationTime <= 600, // PRD target: ≤10 min
      };
    }),

  // Get usage pattern analytics
  getUsagePatterns: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const usageEvents = await ctx.db.usageEvent.findMany({
        where: {
          userId: ctx.user.id,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group by day and count usage
      const dailyUsage = usageEvents.reduce((acc, event) => {
        const day = event.createdAt.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { generation: 0, publishing: 0, total: 0 };
        }
        
        acc[day].total++;
        if (event.event.includes('generation')) {
          acc[day].generation++;
        } else if (event.event.includes('publishing')) {
          acc[day].publishing++;
        }
        
        return acc;
      }, {} as Record<string, { generation: number; publishing: number; total: number }>);

      // Calculate content per user per week (PRD target: ≥3)
      const recentWeek = new Date();
      recentWeek.setDate(recentWeek.getDate() - 7);

      const weeklyContent = await ctx.db.asset.count({
        where: {
          userId: ctx.user.id,
          createdAt: { gte: recentWeek },
        },
      });

      return {
        dailyUsage,
        weeklyContent,
        isAboveTarget: weeklyContent >= 3, // PRD target
        avgDailyUsage: usageEvents.length / input.days,
      };
    }),

  // Record custom analytics event
  recordEvent: protectedProcedure
    .input(z.object({
      event: z.string(),
      platform: z.string().optional(),
      provider: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
      duration: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.usageEvent.create({
        data: {
          userId: ctx.user.id,
          event: input.event,
          platform: input.platform,
          provider: input.provider,
          metadata: input.metadata as any,
          duration: input.duration,
        },
      });

      return { success: true };
    }),

  // Get system-wide KPIs (for admin/monitoring)
  getSystemKPIs: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // User activation (7-day)
      const newUsersLast7Days = await ctx.db.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      });

      const activatedUsersLast7Days = await ctx.db.usageEvent.count({
        where: {
          event: 'generation_succeeded',
          createdAt: { gte: sevenDaysAgo },
        },
      });

      // Generation success rate
      const totalGenerations = await ctx.db.job.count({
        where: {
          type: 'generation',
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      const successfulGenerations = await ctx.db.job.count({
        where: {
          type: 'generation',
          status: 'completed',
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      // Content per user metrics
      const contentCreated = await ctx.db.asset.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      });

      const activeUsers = await ctx.db.usageEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: sevenDaysAgo } },
      });

      const activationRate = newUsersLast7Days > 0 
        ? (activatedUsersLast7Days / newUsersLast7Days) * 100 
        : 0;

      const generationSuccessRate = totalGenerations > 0 
        ? (successfulGenerations / totalGenerations) * 100 
        : 0;

      const contentPerUser = activeUsers.length > 0 
        ? contentCreated / activeUsers.length 
        : 0;

      return {
        activationRate,
        generationSuccessRate,
        contentPerUser,
        
        // Alert flags based on PRD targets
        alerts: {
          lowActivation: activationRate < 20, // Alert if <20%
          lowSuccessRate: generationSuccessRate < 90, // Alert if <90%
          lowUsage: contentPerUser < 1, // Alert if <1 content/user/week
        },
        
        // Raw metrics
        newUsers: newUsersLast7Days,
        activatedUsers: activatedUsersLast7Days,
        totalGenerations,
        successfulGenerations,
        activeUsers: activeUsers.length,
        contentCreated,
      };
    }),
});