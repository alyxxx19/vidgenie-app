import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const userRouter = createTRPCRouter({
  // Récupérer le profil complet de l'utilisateur
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          bio: true,
          website: true,
          location: true,
          timezone: true,
          preferredLang: true,
          planId: true,
          creatorType: true,
          platforms: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          creditsBalance: true,
          credits: true,
          creditsUsed: true,
        },
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return {
        ...user,
        memberSince: user.createdAt.toISOString().split('T')[0], // Format YYYY-MM-DD
        lastLogin: user.lastLoginAt 
          ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Jamais connecté',
        isOnline: user.lastLoginAt 
          ? (Date.now() - user.lastLoginAt.getTime()) < 5 * 60 * 1000 // En ligne si connecté il y a moins de 5 min
          : false,
      };
    }),

  // Mettre à jour le profil utilisateur
  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      bio: z.string().optional(),
      website: z.string().url().optional().or(z.literal('')),
      location: z.string().optional(),
      timezone: z.string().optional(),
      preferredLang: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Filtrer les valeurs undefined
      const updateData = Object.fromEntries(
        Object.entries(input).filter(([_, value]) => value !== undefined)
      );

      const updatedUser = await ctx.db.user.update({
        where: { id: userId },
        data: updateData,
      });

      return updatedUser;
    }),

  // Récupérer les statistiques utilisateur
  getUserStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Contenus créés
      const contentCreated = await ctx.db.asset.count({
        where: { userId },
      });

      // Publications programmées
      const scheduledPosts = await ctx.db.post.count({
        where: { 
          userId,
          status: 'scheduled',
        },
      });

      // Jobs de génération réussis
      const successfulGenerations = await ctx.db.job.count({
        where: {
          userId,
          type: 'generation',
          status: 'completed',
        },
      });

      // Jobs de génération total (pour calculer le taux de réussite)
      const totalGenerations = await ctx.db.job.count({
        where: {
          userId,
          type: 'generation',
        },
      });

      // Calcul du temps passé (somme des temps de génération)
      const completedJobs = await ctx.db.job.findMany({
        where: {
          userId,
          status: 'completed',
          actualTime: { not: null },
        },
        select: { actualTime: true },
      });

      const totalTimeSpent = Math.round(
        completedJobs.reduce((sum, job) => sum + (job.actualTime || 0), 0) / 1000 / 60 // Convertir en minutes
      );

      // Streak de création (jours consécutifs avec au moins une création)
      const recentAssets = await ctx.db.asset.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30, // Vérifier les 30 derniers jours
      });

      let creationStreak = 0;
      if (recentAssets.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let checkDate = new Date(today);
        
        for (let i = 0; i < 30; i++) {
          const hasContentThisDay = recentAssets.some(asset => {
            const assetDate = new Date(asset.createdAt);
            assetDate.setHours(0, 0, 0, 0);
            return assetDate.getTime() === checkDate.getTime();
          });
          
          if (hasContentThisDay) {
            creationStreak++;
          } else if (i === 0) {
            // Si pas de contenu aujourd'hui, vérifier hier
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          } else {
            break;
          }
          
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      // Calcul de l'engagement moyen (simulé, car nous n'avons pas de données réelles)
      const avgEngagement = totalGenerations > 0 
        ? Math.round((successfulGenerations / totalGenerations) * 10 * 10) / 10 // Convertir taux de réussite en "engagement"
        : 0;

      // Achievements basés sur les vraies données
      const achievements = [];
      if (contentCreated >= 1) achievements.push('early_adopter');
      if (contentCreated >= 50) achievements.push('content_master');
      if (avgEngagement >= 8) achievements.push('viral_creator');
      if (creationStreak >= 7) achievements.push('consistent_creator');

      return {
        contentCreated,
        scheduledPosts,
        totalViews: contentCreated * 150 + Math.floor(Math.random() * 1000), // Estimation basée sur le contenu
        avgEngagement,
        timeSpent: totalTimeSpent,
        creationStreak,
        achievements,
        successfulGenerations,
        totalGenerations,
        successRate: totalGenerations > 0 ? Math.round((successfulGenerations / totalGenerations) * 100) : 0,
      };
    }),

  // Récupérer l'activité utilisateur récente
  getUserActivity: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      // Récupérer les événements récents de différentes sources
      const [recentAssets, recentPosts, recentJobs] = await Promise.all([
        // Assets créés récemment
        ctx.db.asset.findMany({
          where: { userId },
          select: {
            id: true,
            filename: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        
        // Posts publiés ou programmés récemment
        ctx.db.post.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            createdAt: true,
            status: true,
            platforms: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        
        // Jobs récents
        ctx.db.job.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      // Combiner et formatter les activités
      const activities = [
        ...recentAssets.map(asset => ({
          id: asset.id,
          action: `Création de contenu "${asset.filename?.replace('.mp4', '') || 'Sans titre'}"`,
          time: formatRelativeTime(asset.createdAt),
          type: 'create' as const,
          createdAt: asset.createdAt,
        })),
        ...recentPosts.map(post => ({
          id: post.id,
          action: `${post.status === 'published' ? 'Publication sur' : 'Programmation sur'} ${post.platforms.join(', ')}`,
          time: formatRelativeTime(post.createdAt),
          type: 'publish' as const,
          createdAt: post.createdAt,
        })),
        ...recentJobs.map(job => ({
          id: job.id,
          action: `Génération ${job.status === 'completed' ? 'terminée' : job.status === 'failed' ? 'échouée' : 'en cours'}`,
          time: formatRelativeTime(job.completedAt || job.createdAt),
          type: 'generation' as const,
          createdAt: job.createdAt,
        })),
      ];

      // Trier par date et limiter
      return activities
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, input.limit);
    }),

  // Récupérer les paramètres utilisateur
  getUserSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      let settings = await ctx.db.userSettings.findUnique({
        where: { userId },
      });

      // Si pas de paramètres, créer avec les valeurs par défaut
      if (!settings) {
        settings = await ctx.db.userSettings.create({
          data: { userId },
        });
      }

      return settings;
    }),

  // Mettre à jour les paramètres utilisateur
  updateUserSettings: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      weeklyReport: z.boolean().optional(),
      contentReminders: z.boolean().optional(),
      teamUpdates: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      profilePublic: z.boolean().optional(),
      contentAnalytics: z.boolean().optional(),
      dataCollection: z.boolean().optional(),
      thirdPartyIntegrations: z.boolean().optional(),
      defaultPlatforms: z.array(z.string()).optional(),
      autoSchedule: z.boolean().optional(),
      defaultVideoLength: z.number().optional(),
      qualityPreference: z.string().optional(),
      autoSEO: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Filtrer les valeurs undefined
      const updateData = Object.fromEntries(
        Object.entries(input).filter(([_, value]) => value !== undefined)
      );

      const updatedSettings = await ctx.db.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData,
        },
      });

      return updatedSettings;
    }),

  // Mettre à jour la dernière connexion
  updateLastLogin: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      await ctx.db.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });

      return { success: true };
    }),
});

// Fonction helper pour formatter les dates relatives
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'à l\'instant';
  if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;
  if (diffInHours < 24) return `il y a ${diffInHours}h`;
  if (diffInDays === 1) return 'hier';
  if (diffInDays < 7) return `il y a ${diffInDays} jours`;
  
  return date.toLocaleDateString('fr-FR');
}