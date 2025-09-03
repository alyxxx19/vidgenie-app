#!/usr/bin/env node

/**
 * MCP API Integration Server pour VidGenie
 * Interface avec les services externes (OpenAI, Stripe, Replicate, etc.)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenAI } from 'openai';
import Stripe from 'stripe';

// Configuration des services
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
}) : null;

class VidGenieAPIServer {
  constructor() {
    this.server = new Server(
      {
        name: 'vidgenie-api-server',
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
          // Outils OpenAI
          {
            name: 'enhance_prompt',
            description: 'Améliorer un prompt avec GPT-4',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Prompt à améliorer',
                },
                style: {
                  type: 'string',
                  description: 'Style d\'amélioration (créatif, technique, marketing, etc.)',
                  default: 'créatif',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'test_openai_connection',
            description: 'Tester la connexion à l\'API OpenAI',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          
          // Outils Stripe
          {
            name: 'get_stripe_customer',
            description: 'Récupérer les informations d\'un client Stripe',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: {
                  type: 'string',
                  description: 'ID du client Stripe',
                },
              },
              required: ['customerId'],
            },
          },
          {
            name: 'list_stripe_products',
            description: 'Lister les produits Stripe VidGenie',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Nombre de produits à récupérer',
                  default: 10,
                },
              },
            },
          },
          {
            name: 'test_stripe_connection',
            description: 'Tester la connexion à l\'API Stripe',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          
          // Outils généraux
          {
            name: 'check_service_health',
            description: 'Vérifier l\'état de santé des services externes',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_api_usage_stats',
            description: 'Récupérer les statistiques d\'usage des APIs',
            inputSchema: {
              type: 'object',
              properties: {
                service: {
                  type: 'string',
                  description: 'Service à analyser',
                  enum: ['openai', 'stripe', 'all'],
                  default: 'all',
                },
              },
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
          // OpenAI tools
          case 'enhance_prompt':
            return await this.enhancePrompt(args.prompt, args.style);
          case 'test_openai_connection':
            return await this.testOpenAIConnection();
          
          // Stripe tools
          case 'get_stripe_customer':
            return await this.getStripeCustomer(args.customerId);
          case 'list_stripe_products':
            return await this.listStripeProducts(args.limit);
          case 'test_stripe_connection':
            return await this.testStripeConnection();
          
          // General tools
          case 'check_service_health':
            return await this.checkServiceHealth();
          case 'get_api_usage_stats':
            return await this.getAPIUsageStats(args.service);
            
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

  async enhancePrompt(prompt, style = 'créatif') {
    if (!openai) {
      throw new McpError(
        ErrorCode.InternalError,
        'OpenAI non configuré - vérifiez OPENAI_API_KEY'
      );
    }

    try {
      const systemPrompt = `Tu es un expert en amélioration de prompts pour la génération d'images et vidéos. 
      Style demandé: ${style}.
      Améliore le prompt suivant en le rendant plus détaillé, créatif et optimisé pour la génération d'IA.
      Garde le prompt en français et assure-toi qu'il soit clair et inspirant.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Prompt à améliorer: "${prompt}"` },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const enhancedPrompt = response.choices[0]?.message?.content || prompt;

      return {
        content: [
          {
            type: 'text',
            text: `Prompt original: "${prompt}"\n\nPrompt amélioré (${style}):\n"${enhancedPrompt}"`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur OpenAI: ${error.message}`
      );
    }
  }

  async testOpenAIConnection() {
    if (!openai) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ OpenAI non configuré - OPENAI_API_KEY manquante',
          },
        ],
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test de connexion' }],
        max_tokens: 10,
      });

      return {
        content: [
          {
            type: 'text',
            text: '✅ Connexion OpenAI réussie\nModèles disponibles: GPT-3.5-turbo, GPT-4o, DALL-E 3',
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erreur de connexion OpenAI: ${error.message}`,
          },
        ],
      };
    }
  }

  async getStripeCustomer(customerId) {
    if (!stripe) {
      throw new McpError(
        ErrorCode.InternalError,
        'Stripe non configuré - vérifiez STRIPE_SECRET_KEY'
      );
    }

    try {
      const customer = await stripe.customers.retrieve(customerId);
      
      const customerData = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000).toISOString(),
        subscriptions: customer.subscriptions?.data || [],
      };

      return {
        content: [
          {
            type: 'text',
            text: `Informations client Stripe:\n${JSON.stringify(customerData, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur Stripe: ${error.message}`
      );
    }
  }

  async listStripeProducts(limit = 10) {
    if (!stripe) {
      throw new McpError(
        ErrorCode.InternalError,
        'Stripe non configuré'
      );
    }

    try {
      const products = await stripe.products.list({ 
        limit,
        active: true,
      });

      const vidgenieProducts = products.data.filter(p => 
        p.name.toLowerCase().includes('vidgenie') || 
        p.metadata.planKey
      );

      return {
        content: [
          {
            type: 'text',
            text: `Produits VidGenie dans Stripe:\n${JSON.stringify(vidgenieProducts, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Erreur Stripe: ${error.message}`
      );
    }
  }

  async testStripeConnection() {
    if (!stripe) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Stripe non configuré - STRIPE_SECRET_KEY manquante',
          },
        ],
      };
    }

    try {
      const account = await stripe.accounts.retrieve();
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Connexion Stripe réussie\nCompte: ${account.id}\nPays: ${account.country}\nDevise: ${account.default_currency}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Erreur de connexion Stripe: ${error.message}`,
          },
        ],
      };
    }
  }

  async checkServiceHealth() {
    const services = {
      openai: openai ? '✅ Configuré' : '❌ Non configuré',
      stripe: stripe ? '✅ Configuré' : '❌ Non configuré',
      supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configuré' : '❌ Non configuré',
      fal: process.env.FAL_KEY ? '✅ Configuré' : '❌ Non configuré',
      replicate: process.env.REPLICATE_API_TOKEN ? '✅ Configuré' : '❌ Non configuré',
    };

    return {
      content: [
        {
          type: 'text',
          text: `État des services VidGenie:\n${JSON.stringify(services, null, 2)}`,
        },
      ],
    };
  }

  async getAPIUsageStats(service = 'all') {
    // Cette fonction pourrait être étendue pour récupérer des vraies métriques
    const stats = {
      openai: {
        status: openai ? 'actif' : 'inactif',
        modeles: ['gpt-4o', 'gpt-3.5-turbo', 'dall-e-3', 'gpt-image-1'],
      },
      stripe: {
        status: stripe ? 'actif' : 'inactif',
        produits: 3, // Starter, Pro, Enterprise
      },
      note: 'Les statistiques détaillées nécessitent une intégration avec les dashboards des services',
    };

    const result = service === 'all' ? stats : stats[service] || `Service ${service} non trouvé`;

    return {
      content: [
        {
          type: 'text',
          text: `Statistiques d'usage API (${service}):\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('VidGenie API Integration MCP Server démarré');
  }
}

// Démarrer le serveur
const server = new VidGenieAPIServer();
server.start().catch((error) => {
  console.error('Erreur lors du démarrage du serveur:', error);
  process.exit(1);
});