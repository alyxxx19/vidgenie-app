/**
 * Webhook d'intégration pour les alertes externes
 * PHASE 8.2 - Intégrations Slack, Teams, Discord, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { secureLog } from '@/lib/secure-logger';

// Types de webhooks supportés
type WebhookType = 'slack' | 'discord' | 'teams' | 'generic';

interface SlackPayload {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments: Array<{
    color: 'good' | 'warning' | 'danger';
    title: string;
    text: string;
    fields: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
    footer: string;
    ts: number;
  }>;
}

interface DiscordPayload {
  content?: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{
      name: string;
      value: string;
      inline: boolean;
    }>;
    footer: {
      text: string;
    };
    timestamp: string;
  }>;
}

interface TeamsPayload {
  "@type": "MessageCard";
  "@context": "https://schema.org/extensions";
  summary: string;
  themeColor: string;
  sections: Array<{
    activityTitle: string;
    activitySubtitle: string;
    facts: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

const webhookSchema = z.object({
  type: z.enum(['slack', 'discord', 'teams', 'generic']),
  url: z.string().url(),
  alert: z.object({
    id: z.string(),
    title: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'critical']),
    metricValue: z.number(),
    threshold: z.number(),
    metricPath: z.string(),
    timestamp: z.string(),
  }),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/alerts/webhook
 * Envoie une alerte via webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = webhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, url, alert, metadata } = validation.data;

    // Générer le payload selon le type de webhook
    const payload = generateWebhookPayload(type, alert, metadata);

    // Envoyer le webhook
    const success = await sendWebhook(url, payload, type);

    if (success) {
      secureLog.security('Webhook alert sent successfully', {
        alertId: alert.id,
        webhookType: type,
        severity: alert.severity,
        url: url.replace(/\/[^\/]*$/, '/***'), // Masquer les tokens
      });

      return NextResponse.json({
        success: true,
        message: 'Alerte envoyée avec succès',
      });
    } else {
      throw new Error('Webhook delivery failed');
    }

  } catch (error) {
    secureLog.error('Webhook alert failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/webhook
 * Test de connectivité webhook
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const webhookUrl = url.searchParams.get('url');
    const type = url.searchParams.get('type') as WebhookType;

    if (!webhookUrl || !type) {
      return NextResponse.json(
        { error: 'URL et type requis' },
        { status: 400 }
      );
    }

    // Créer un message de test
    const testAlert = {
      id: 'test-' + Date.now(),
      title: 'Test de Connexion VidGenie',
      message: 'Ceci est un test de la configuration webhook',
      severity: 'info' as const,
      metricValue: 42,
      threshold: 40,
      metricPath: 'system.test',
      timestamp: new Date().toISOString(),
    };

    const payload = generateWebhookPayload(type, testAlert, { test: true });
    const success = await sendWebhook(webhookUrl, payload, type);

    if (success) {
      secureLog.info('Webhook test successful', { type, url: webhookUrl.replace(/\/[^\/]*$/, '/***') });
      return NextResponse.json({
        success: true,
        message: 'Test réussi - Webhook configuré correctement',
      });
    } else {
      throw new Error('Test webhook failed');
    }

  } catch (error) {
    secureLog.error('Webhook test failed', { error });
    return NextResponse.json(
      { error: 'Test échoué - Vérifier la configuration' },
      { status: 400 }
    );
  }
}

/**
 * Génère le payload selon le type de webhook
 */
function generateWebhookPayload(
  type: WebhookType,
  alert: any,
  metadata?: Record<string, any>
): any {
  const severityColors = {
    info: { slack: 'good', discord: 0x36a64f, teams: '28a745', hex: '#36a64f' },
    warning: { slack: 'warning', discord: 0xffc107, teams: 'ffc107', hex: '#ffc107' },
    critical: { slack: 'danger', discord: 0xdc3545, teams: 'dc3545', hex: '#dc3545' },
  };

  const color = severityColors[alert.severity as keyof typeof severityColors] || severityColors.info;
  const isTest = metadata?.test === true;

  switch (type) {
    case 'slack':
      return generateSlackPayload(alert, color, isTest);
    
    case 'discord':
      return generateDiscordPayload(alert, color, isTest);
    
    case 'teams':
      return generateTeamsPayload(alert, color, isTest);
    
    case 'generic':
    default:
      return {
        alert: {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          timestamp: alert.timestamp,
          metric: {
            path: alert.metricPath,
            value: alert.metricValue,
            threshold: alert.threshold,
          },
        },
        source: 'VidGenie Alert System',
        version: '1.0',
        test: isTest,
      };
  }
}

/**
 * Génère un payload Slack
 */
function generateSlackPayload(alert: any, color: any, isTest: boolean): SlackPayload {
  const emoji = isTest ? ':white_check_mark:' : (
    alert.severity === 'critical' ? ':rotating_light:' :
    alert.severity === 'warning' ? ':warning:' : ':information_source:'
  );

  return {
    username: 'VidGenie Alerts',
    icon_emoji: emoji,
    attachments: [
      {
        color: color.slack,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Métrique',
            value: alert.metricPath,
            short: true,
          },
          {
            title: 'Valeur',
            value: `${alert.metricValue} (seuil: ${alert.threshold})`,
            short: true,
          },
          {
            title: 'Sévérité',
            value: alert.severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Timestamp',
            value: new Date(alert.timestamp).toLocaleString('fr-FR'),
            short: true,
          },
        ],
        footer: isTest ? 'Test VidGenie' : 'VidGenie Alert System',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
      },
    ],
  };
}

/**
 * Génère un payload Discord
 */
function generateDiscordPayload(alert: any, color: any, isTest: boolean): DiscordPayload {
  const title = isTest ? `🧪 ${alert.title}` : (
    alert.severity === 'critical' ? `🚨 ${alert.title}` :
    alert.severity === 'warning' ? `⚠️ ${alert.title}` : `ℹ️ ${alert.title}`
  );

  return {
    embeds: [
      {
        title,
        description: alert.message,
        color: color.discord,
        fields: [
          {
            name: 'Métrique',
            value: `\`${alert.metricPath}\``,
            inline: true,
          },
          {
            name: 'Valeur Actuelle',
            value: `**${alert.metricValue}**`,
            inline: true,
          },
          {
            name: 'Seuil',
            value: `**${alert.threshold}**`,
            inline: true,
          },
          {
            name: 'Sévérité',
            value: `**${alert.severity.toUpperCase()}**`,
            inline: true,
          },
        ],
        footer: {
          text: isTest ? 'Test VidGenie Alert System' : 'VidGenie Alert System',
        },
        timestamp: alert.timestamp,
      },
    ],
  };
}

/**
 * Génère un payload Microsoft Teams
 */
function generateTeamsPayload(alert: any, color: any, isTest: boolean): TeamsPayload {
  return {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: alert.title,
    themeColor: color.teams,
    sections: [
      {
        activityTitle: isTest ? `🧪 ${alert.title}` : alert.title,
        activitySubtitle: alert.message,
        facts: [
          {
            name: 'Métrique',
            value: alert.metricPath,
          },
          {
            name: 'Valeur',
            value: `${alert.metricValue} (seuil: ${alert.threshold})`,
          },
          {
            name: 'Sévérité',
            value: alert.severity.toUpperCase(),
          },
          {
            name: 'Timestamp',
            value: new Date(alert.timestamp).toLocaleString('fr-FR'),
          },
        ],
      },
    ],
  };
}

/**
 * Envoie le webhook
 */
async function sendWebhook(url: string, payload: any, type: WebhookType): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'VidGenie-Alert-System/1.0',
    };

    // Headers spécifiques selon le type
    if (type === 'slack') {
      // Slack accepte les payloads JSON standard
    } else if (type === 'teams') {
      // Teams utilise aussi JSON standard
    } else if (type === 'discord') {
      // Discord accepte JSON standard
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      // Timeout de 10 secondes
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      secureLog.error('Webhook HTTP error', {
        status: response.status,
        statusText: response.statusText,
        type,
      });
      return false;
    }

    // Slack peut retourner des codes d'erreur spécifiques
    if (type === 'slack') {
      const responseText = await response.text();
      if (responseText !== 'ok') {
        secureLog.error('Slack webhook error', { response: responseText });
        return false;
      }
    }

    return true;

  } catch (error) {
    secureLog.error('Webhook sending failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type,
    });
    return false;
  }
}

/**
 * Valide une URL de webhook
 */
function validateWebhookUrl(url: string, type: WebhookType): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    switch (type) {
      case 'slack':
        if (!parsedUrl.hostname.includes('slack.com')) {
          return { valid: false, error: 'URL Slack invalide' };
        }
        if (!parsedUrl.pathname.includes('/services/')) {
          return { valid: false, error: 'URL webhook Slack invalide' };
        }
        break;

      case 'discord':
        if (!parsedUrl.hostname.includes('discord.com') && !parsedUrl.hostname.includes('discordapp.com')) {
          return { valid: false, error: 'URL Discord invalide' };
        }
        if (!parsedUrl.pathname.includes('/webhooks/')) {
          return { valid: false, error: 'URL webhook Discord invalide' };
        }
        break;

      case 'teams':
        if (!parsedUrl.hostname.includes('outlook.office.com')) {
          return { valid: false, error: 'URL Teams invalide' };
        }
        if (!parsedUrl.pathname.includes('/webhook/')) {
          return { valid: false, error: 'URL webhook Teams invalide' };
        }
        break;

      case 'generic':
        // Pas de validation spécifique pour les webhooks génériques
        break;
    }

    return { valid: true };

  } catch (error) {
    return { valid: false, error: 'URL invalide' };
  }
}

/**
 * Exemples de configuration webhooks
 */
const WEBHOOK_EXAMPLES = {
  slack: {
    name: 'Slack',
    description: 'Notifications dans un canal Slack',
    urlExample: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
    setup: [
      '1. Aller dans votre workspace Slack',
      '2. Ajouter l\'app "Incoming Webhooks"',
      '3. Choisir le canal de destination',
      '4. Copier l\'URL du webhook généré',
    ],
  },
  discord: {
    name: 'Discord',
    description: 'Messages dans un canal Discord',
    urlExample: 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz',
    setup: [
      '1. Aller dans les paramètres du canal Discord',
      '2. Intégrations > Webhooks',
      '3. Créer un nouveau webhook',
      '4. Copier l\'URL du webhook',
    ],
  },
  teams: {
    name: 'Microsoft Teams',
    description: 'Cartes adaptatives dans Teams',
    urlExample: 'https://outlook.office.com/webhook/xxx/IncomingWebhook/yyy/zzz',
    setup: [
      '1. Dans votre équipe Teams, cliquer sur "..."',
      '2. Connecteurs > Webhook entrant',
      '3. Configurer et créer',
      '4. Copier l\'URL générée',
    ],
  },
  generic: {
    name: 'Webhook générique',
    description: 'Format JSON standard pour intégrations custom',
    urlExample: 'https://votre-api.com/webhooks/alerts',
    setup: [
      '1. Créer un endpoint HTTP POST sur votre serveur',
      '2. Accepter du JSON avec Content-Type: application/json',
      '3. Traiter les données d\'alerte reçues',
    ],
  },
};