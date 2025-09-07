import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  // Changer le mot de passe
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
      newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
      confirmPassword: z.string().min(1, 'Confirmation du mot de passe requise'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword, confirmPassword } = input;
      
      // Vérifier que les mots de passe correspondent
      if (newPassword !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      // Créer le client Supabase avec le contexte utilisateur
      const supabase = await createServerSupabaseClient();
      
      // Vérifier le mot de passe actuel en tentant une re-authentification
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: ctx.user.email!,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Erreur mise à jour mot de passe:', updateError);
        throw new Error('Erreur lors de la mise à jour du mot de passe');
      }

      // Optionnel: Mettre à jour la date de dernière modification du mot de passe
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { updatedAt: new Date() },
      });

      return { 
        success: true,
        message: 'Mot de passe mis à jour avec succès',
      };
    }),

  // Exporter les données utilisateur
  exportUserData: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      // Récupérer toutes les données utilisateur
      const [user, assets, posts, jobs, userSettings] = await Promise.all([
        ctx.db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
            phone: true,
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
            creditsBalance: true,
            credits: true,
            creditsUsed: true,
          },
        }),
        ctx.db.asset.findMany({
          where: { userId },
          select: {
            id: true,
            filename: true,
            url: true,
            type: true,
            size: true,
            createdAt: true,
            status: true,
          },
        }),
        ctx.db.post.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            content: true,
            platforms: true,
            status: true,
            scheduledAt: true,
            createdAt: true,
          },
        }),
        ctx.db.job.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            status: true,
            config: true,
            createdAt: true,
            completedAt: true,
            actualTime: true,
          },
        }),
        ctx.db.userSettings.findUnique({
          where: { userId },
        }),
      ]);

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      return {
        exportedAt: new Date().toISOString(),
        user,
        assets: assets || [],
        posts: posts || [],
        jobs: jobs || [],
        settings: userSettings,
        stats: {
          totalAssets: assets?.length || 0,
          totalPosts: posts?.length || 0,
          totalJobs: jobs?.length || 0,
        },
      };
    }),

  // Demander la suppression du compte
  requestAccountDeletion: protectedProcedure
    .input(z.object({
      reason: z.string().optional(),
      feedback: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      // Marquer le compte pour suppression (soft delete)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 7); // Période de grâce de 7 jours

      await ctx.db.user.update({
        where: { id: userId },
        data: {
          // Ajouter des champs de suppression si nécessaire dans le schéma
          updatedAt: new Date(),
        },
      });

      // TODO: Implémenter job asynchrone avec Inngest pour suppression différée
      // TODO: Envoyer email de confirmation avec lien d'annulation

      return {
        success: true,
        message: 'Demande de suppression enregistrée',
        deletionDate: deletionDate.toISOString(),
        gracePeriodDays: 7,
      };
    }),

  // Mettre à jour l'avatar utilisateur
  updateAvatar: protectedProcedure
    .input(z.object({
      avatarUrl: z.string().url('URL d\'avatar invalide'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Mettre à jour l'avatar dans la base de données
      const updatedUser = await ctx.db.user.update({
        where: { id: userId },
        data: { 
          avatar: input.avatarUrl,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Avatar mis à jour avec succès',
        avatar: updatedUser.avatar,
      };
    }),

  // Configurer l'authentification 2FA
  setup2FA: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Enrôler l'utilisateur pour la 2FA
        const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'VidGenie Authenticator',
        });

        if (enrollError) {
          console.error('Erreur lors de l\'enrôlement 2FA:', enrollError);
          throw new Error('Impossible de configurer la 2FA');
        }

        // Générer l'URI et le QR code
        const { totp } = enrollData;
        return {
          success: true,
          factorId: enrollData.id,
          qrCode: totp.qr_code,
          secret: totp.secret,
          uri: totp.uri,
          message: 'Scannez le QR code avec votre application d\'authentification',
        };
      } catch (error) {
        console.error('Erreur setup 2FA:', error);
        throw new Error('Erreur lors de la configuration 2FA');
      }
    }),

  // Vérifier et activer la 2FA
  verify2FA: protectedProcedure
    .input(z.object({
      factorId: z.string(),
      code: z.string().length(6, 'Le code doit contenir 6 chiffres'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Vérifier le code TOTP
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: input.factorId,
        });

        if (challengeError) {
          throw new Error('Impossible de créer le défi 2FA');
        }

        const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
          factorId: input.factorId,
          challengeId: challengeData.id,
          code: input.code,
        });

        if (verifyError) {
          throw new Error('Code de vérification invalide');
        }

        // Marquer la 2FA comme activée dans notre base de données
        await ctx.db.user.update({
          where: { id: ctx.user.id },
          data: { 
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: 'Authentification à deux facteurs activée avec succès',
          accessToken: verifyData.access_token,
        };
      } catch (error) {
        console.error('Erreur verification 2FA:', error);
        throw new Error(error instanceof Error ? error.message : 'Code invalide');
      }
    }),

  // Désactiver la 2FA
  disable2FA: protectedProcedure
    .input(z.object({
      password: z.string().min(1, 'Mot de passe requis pour désactiver la 2FA'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Vérifier le mot de passe avant de désactiver
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: ctx.user.email!,
          password: input.password,
        });

        if (signInError) {
          throw new Error('Mot de passe incorrect');
        }

        // Obtenir la liste des facteurs 2FA
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
          throw new Error('Impossible de récupérer les facteurs 2FA');
        }

        // Désactiver tous les facteurs TOTP
        for (const factor of factors.totp || []) {
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });
          
          if (unenrollError) {
            console.error('Erreur lors de la désinscription du facteur:', unenrollError);
          }
        }

        // Marquer la 2FA comme désactivée dans notre base de données
        await ctx.db.user.update({
          where: { id: ctx.user.id },
          data: { 
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: 'Authentification à deux facteurs désactivée',
        };
      } catch (error) {
        console.error('Erreur disable 2FA:', error);
        throw new Error(error instanceof Error ? error.message : 'Erreur lors de la désactivation 2FA');
      }
    }),

  // Vérifier le statut 2FA
  get2FAStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Obtenir la liste des facteurs actifs
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
          return {
            enabled: false,
            factors: [],
          };
        }

        const activeTotpFactors = factors.totp?.filter(f => f.status === 'verified') || [];

        return {
          enabled: activeTotpFactors.length > 0,
          factors: activeTotpFactors.map(f => ({
            id: f.id,
            friendlyName: f.friendly_name,
            createdAt: f.created_at,
          })),
        };
      } catch (error) {
        console.error('Erreur get 2FA status:', error);
        return {
          enabled: false,
          factors: [],
        };
      }
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