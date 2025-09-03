#!/usr/bin/env node

/**
 * MCP Database Server pour VidGenie
 * Interface avec les bases de données Prisma et Supabase
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const prisma = new PrismaClient();

// Requêtes autorisées (lecture seule pour sécurité)
const ALLOWED_QUERIES = {
  // Utilisateurs
  'get_user': 'SELECT id, email, name, plan FROM "User" WHERE id = $1',
  'get_users_count': 'SELECT COUNT(*) as total FROM "User"',
  
  // Crédits
  'get_user_credits': 'SELECT balance, lastResetAt FROM "User" WHERE id = $1',
  'get_credit_history': 'SELECT * FROM "CreditTransaction" WHERE userId = $1 ORDER BY createdAt DESC LIMIT $2',
  
  // Jobs de génération
  'get_user_jobs': 'SELECT id, type, status, createdAt FROM "GenerationJob" WHERE userId = $1 ORDER BY createdAt DESC LIMIT $2',
  'get_job_details': 'SELECT * FROM "GenerationJob" WHERE id = $1',
  
  // Analytics
  'get_generation_stats': 'SELECT type, COUNT(*) as count FROM "GenerationJob" WHERE createdAt > $1 GROUP BY type',
  'get_usage_by_day': 'SELECT DATE(createdAt) as date, COUNT(*) as count FROM "GenerationJob" WHERE createdAt > $1 GROUP BY DATE(createdAt)',
  
  // Stripe
  'get_stripe_customers': 'SELECT userId, stripeCustomerId, plan FROM "StripeCustomer" WHERE userId = $1',
  'get_payments': 'SELECT * FROM "StripePayment" WHERE userId = $1 ORDER BY createdAt DESC LIMIT $2',
};

class VidGenieDatabaseServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vidgenie-database-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Lister les outils disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'query_database',
            description: 'Exécuter une requête prédéfinie sur la base de données',
            inputSchema: {
              type: 'object',
              properties: {
                query_name: {
                  type: 'string',
                  description: 'Nom de la requête prédéfinie',
                  enum: Object.keys(ALLOWED_QUERIES),
                },
                params: {
                  type: 'array',
                  description: 'Paramètres pour la requête',
                  items: { type: 'string' },
                },
              },
              required: ['query_name'],
            },
          },
          {
            name: 'get_user_dashboard_data',
            description: 'Récupérer toutes les données nécessaires pour le dashboard utilisateur',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'ID de l\'utilisateur',
                },
              },
              required: ['userId'],
            },
          },
          {
            name: 'get_admin_stats',
            description: 'Récupérer les statistiques d\'administration',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Nombre de jours à analyser',
                  default: 30,
                },
              },
            },
          },
          {
            name: 'check_user_credits',
            description: 'Vérifier le solde de crédits d\'un utilisateur',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'ID de l\'utilisateur',
                },
              },
              required: ['userId'],
            },
          },
        ],
      };
    });

    // Exécuter les outils
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'query_database':
            return await this.queryDatabase(args.query_name, args.params || []);
          case 'get_user_dashboard_data':
            return await this.getUserDashboardData(args.userId);
          case 'get_admin_stats':
            return await this.getAdminStats(args.days || 30);
          case 'check_user_credits':
            return await this.checkUserCredits(args.userId);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Outil inconnu: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Erreur lors de l'exécution de ${name}: ${error.message}`
        );
      }
    });
  }

  async queryDatabase(queryName, params) {
    const query = ALLOWED_QUERIES[queryName];
    if (!query) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Requête non autorisée: ${queryName}`
      );
    }

    try {
      const result = await prisma.$queryRawUnsafe(query, ...params);
      
      return {
        content: [
          {
            type: 'text',
            text: `Résultat de la requête ${queryName}:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur lors de l'exécution de la requête: ${error.message}`
      );
    }
  }

  async getUserDashboardData(userId) {
    try {
      const [user, credits, recentJobs, recentTransactions] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, plan: true, credits: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        }),
        prisma.generationJob.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, type: true, status: true, createdAt: true },
        }),
        prisma.creditTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      const dashboardData = {
        user,
        credits: credits?.credits || 0,
        recentJobs,
        recentTransactions,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Données du dashboard pour l'utilisateur ${userId}:\n${JSON.stringify(dashboardData, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur lors de la récupération des données dashboard: ${error.message}`
      );
    }
  }

  async getAdminStats(days) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalUsers,
        totalJobs,
        jobsByType,
        jobsByDay,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.generationJob.count({
          where: { createdAt: { gte: startDate } },
        }),
        prisma.generationJob.groupBy({
          by: ['type'],
          where: { createdAt: { gte: startDate } },
          _count: true,
        }),
        prisma.generationJob.groupBy({
          by: ['createdAt'],
          where: { createdAt: { gte: startDate } },
          _count: true,
        }),
      ]);

      const stats = {
        totalUsers,
        totalJobs,
        jobsByType,
        jobsByDay: jobsByDay.slice(0, 30), // Limiter à 30 jours
        period: `${days} derniers jours`,
      };

      return {
        content: [
          {
            type: 'text',
            text: `Statistiques d'administration (${days} jours):\n${JSON.stringify(stats, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur lors de la récupération des statistiques: ${error.message}`
      );
    }
  }

  async checkUserCredits(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, plan: true },
      });

      if (!user) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Utilisateur non trouvé: ${userId}`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Crédits pour l'utilisateur ${userId}:\nSolde: ${user.credits}\nPlan: ${user.plan}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur lors de la vérification des crédits: ${error.message}`
      );
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('VidGenie Database MCP Server démarré');
  }
}

// Démarrer le serveur
const server = new VidGenieDatabaseServer();
server.start().catch((error) => {
  console.error('Erreur lors du démarrage du serveur:', error);
  process.exit(1);
});