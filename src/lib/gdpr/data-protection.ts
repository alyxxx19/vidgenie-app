/**
 * Système de protection des données et conformité RGPD
 * PHASE 7.2 - Gestion des données personnelles et DPO
 */

import { PrismaClient } from '@prisma/client';
import { secureLog } from '../secure-logger';
import { encryptUserData, decryptUserData } from '../advanced-encryption';

// Types pour la gestion des données
export interface PersonalDataRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'deletion' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  description: string;
  requesterEmail: string;
  requestData?: any;
  response?: string;
  processedBy?: string;
}

export interface DataProcessingRecord {
  id: string;
  purpose: string;
  dataCategories: string[];
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataSubjects: string[];
  recipients: string[];
  retentionPeriod: string;
  securityMeasures: string[];
  transfersOutsideEU: boolean;
  lastUpdated: Date;
  isActive: boolean;
}

export interface DataBreachIncident {
  id: string;
  discoveryDate: Date;
  notificationDate?: Date;
  affectedUsers: number;
  dataTypes: string[];
  breachType: 'confidentiality' | 'integrity' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  containmentMeasures: string[];
  notificationRequired: boolean;
  notifiedAuthorities: boolean;
  notifiedUsers: boolean;
  status: 'open' | 'investigating' | 'contained' | 'closed';
  reportedBy: string;
}

/**
 * Gestionnaire de protection des données RGPD
 */
export class DataProtectionManager {
  private prisma: PrismaClient;
  private dpoEmail: string;

  constructor(prisma: PrismaClient, dpoEmail = process.env.DPO_EMAIL || 'dpo@vidgenie.com') {
    this.prisma = prisma;
    this.dpoEmail = dpoEmail;
  }

  /**
   * Traite une demande de données personnelles
   */
  async processDataRequest(
    userId: string,
    type: PersonalDataRequest['type'],
    description: string,
    requesterEmail: string,
    requestData?: any
  ): Promise<string> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Vérifier que l'email correspond (pour la sécurité)
      if (user.email !== requesterEmail) {
        secureLog.security('Data request email mismatch', {
          userId,
          userEmail: user.email,
          requesterEmail
        });
        throw new Error('Email verification failed');
      }

      const requestId = crypto.randomUUID();

      // Créer la demande (à adapter selon votre schéma de BDD)
      const request: PersonalDataRequest = {
        id: requestId,
        userId,
        type,
        status: 'pending',
        requestDate: new Date(),
        description,
        requesterEmail,
        requestData,
      };

      // Log sécurisé de la demande
      secureLog.security('Personal data request created', {
        requestId,
        userId,
        type,
        requesterEmail,
      });

      // Notifier le DPO
      await this.notifyDPO('new_data_request', {
        requestId,
        type,
        userId,
        requesterEmail,
        description,
      });

      // Traitement automatique selon le type
      switch (type) {
        case 'access':
          await this.processAccessRequest(request);
          break;
        case 'deletion':
          await this.processDeletionRequest(request);
          break;
        case 'portability':
          await this.processPortabilityRequest(request);
          break;
        default:
          // Les autres types nécessitent une intervention manuelle
          break;
      }

      return requestId;

    } catch (error) {
      secureLog.error('Failed to process data request', {
        userId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Traite une demande d'accès aux données
   */
  private async processAccessRequest(request: PersonalDataRequest): Promise<void> {
    try {
      // Collecter toutes les données de l'utilisateur
      const userData = await this.collectUserData(request.userId);

      // Chiffrer les données sensibles
      const encryptedData = encryptUserData(userData, request.userId);

      // Marquer comme complété
      request.status = 'completed';
      request.completionDate = new Date();
      request.response = 'Données collectées et préparées pour export';

      // Envoyer les données par email sécurisé ou lien de téléchargement
      await this.sendSecureDataExport(request.requesterEmail, encryptedData);

      secureLog.security('Access request completed', {
        requestId: request.id,
        userId: request.userId,
        dataSize: JSON.stringify(userData).length,
      });

    } catch (error) {
      request.status = 'rejected';
      request.response = 'Erreur lors de la collecte des données';
      secureLog.error('Access request failed', { requestId: request.id, error });
    }
  }

  /**
   * Traite une demande de suppression des données
   */
  private async processDeletionRequest(request: PersonalDataRequest): Promise<void> {
    try {
      // Vérifier les obligations légales de conservation
      const canDelete = await this.checkDeletionEligibility(request.userId);
      
      if (!canDelete.eligible) {
        request.status = 'rejected';
        request.response = `Suppression impossible: ${canDelete.reason}`;
        return;
      }

      // Pseudonymisation/suppression des données
      await this.anonymizeUserData(request.userId);

      request.status = 'completed';
      request.completionDate = new Date();
      request.response = 'Données supprimées avec succès';

      secureLog.security('Deletion request completed', {
        requestId: request.id,
        userId: request.userId,
      });

    } catch (error) {
      request.status = 'rejected';
      request.response = 'Erreur lors de la suppression';
      secureLog.error('Deletion request failed', { requestId: request.id, error });
    }
  }

  /**
   * Traite une demande de portabilité des données
   */
  private async processPortabilityRequest(request: PersonalDataRequest): Promise<void> {
    try {
      // Collecter les données portables (fournies par l'utilisateur)
      const portableData = await this.collectPortableData(request.userId);

      // Format JSON structuré
      const exportData = {
        user_id: request.userId,
        export_date: new Date().toISOString(),
        data_format: 'JSON',
        data: portableData,
      };

      // Créer un export sécurisé
      const exportLink = await this.createSecureExport(exportData, request.userId);

      request.status = 'completed';
      request.completionDate = new Date();
      request.response = `Export disponible: ${exportLink}`;

      secureLog.security('Portability request completed', {
        requestId: request.id,
        userId: request.userId,
      });

    } catch (error) {
      request.status = 'rejected';
      request.response = 'Erreur lors de l\'export';
      secureLog.error('Portability request failed', { requestId: request.id, error });
    }
  }

  /**
   * Collecte toutes les données d'un utilisateur
   */
  private async collectUserData(userId: string): Promise<any> {
    const [user, assets, jobs, transactions, apiKeys] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          planId: true,
          credits: true,
        }
      }),
      this.prisma.asset.findMany({
        where: { userId },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          fileSize: true,
          createdAt: true,
          tags: true,
          description: true,
        }
      }),
      this.prisma.job.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          completedAt: true,
        }
      }),
      this.prisma.creditTransaction.findMany({
        where: { userId },
        select: {
          id: true,
          amount: true,
          type: true,
          createdAt: true,
          reason: true,
        }
      }),
      this.prisma.userApiKeys.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          lastUpdated: true,
          validationStatus: true,
        }
      }),
    ]);

    return {
      profile: user,
      assets: assets,
      jobs: jobs,
      transactions: transactions,
      apiKeys: apiKeys,
      export_metadata: {
        generated_at: new Date().toISOString(),
        data_controller: 'VidGenie SAS',
        retention_notice: 'Ces données sont conservées selon notre politique de rétention',
      }
    };
  }

  /**
   * Collecte les données portables (créées par l'utilisateur)
   */
  private async collectPortableData(userId: string): Promise<any> {
    // Données portables = données fournies directement par l'utilisateur
    const [userProfile, userAssets] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          name: true,
          // Exclure les données générées par le système
        }
      }),
      this.prisma.asset.findMany({
        where: { 
          userId,
          // Uniquement les assets uploadés par l'utilisateur
        },
        select: {
          filename: true,
          originalName: true,
          tags: true,
          description: true,
          createdAt: true,
        }
      }),
    ]);

    return {
      profile: userProfile,
      uploaded_content: userAssets,
    };
  }

  /**
   * Vérifie l'éligibilité à la suppression
   */
  private async checkDeletionEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    // Vérifier les obligations légales
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { eligible: false, reason: 'Utilisateur non trouvé' };
    }

    // Vérifier les transactions récentes (obligation comptable)
    const recentTransactions = await this.prisma.creditTransaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 an
        }
      }
    });

    if (recentTransactions.length > 0) {
      return {
        eligible: false,
        reason: 'Obligations comptables - conservation 1 an minimum'
      };
    }

    // Vérifier les litiges en cours
    // TODO: Implémenter selon vos besoins

    return { eligible: true };
  }

  /**
   * Anonymise les données d'un utilisateur
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    // Supprimer ou pseudonymiser selon le type de données
    await Promise.all([
      // Pseudonymiser l'utilisateur
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_user_${Date.now()}@anonymized.local`,
          name: 'Utilisateur supprimé',
          // Garder l'ID pour les contraintes de clés étrangères
        }
      }),

      // Supprimer les assets
      this.prisma.asset.deleteMany({
        where: { userId }
      }),

      // Supprimer les jobs
      this.prisma.job.deleteMany({
        where: { userId }
      }),

      // Supprimer les clés API
      this.prisma.userApiKeys.deleteMany({
        where: { userId }
      }),
    ]);

    secureLog.security('User data anonymized', { userId });
  }

  /**
   * Crée un export sécurisé avec lien temporaire
   */
  private async createSecureExport(data: any, userId: string): Promise<string> {
    // Chiffrer les données
    const encrypted = encryptUserData(data, userId);
    
    // Créer un token temporaire (24h)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Stocker temporairement (Redis ou base de données)
    // TODO: Implémenter le stockage temporaire

    return `${process.env.NEXTAUTH_URL}/api/gdpr/export/${token}`;
  }

  /**
   * Envoie un export de données sécurisé
   */
  private async sendSecureDataExport(email: string, encryptedData: string): Promise<void> {
    // TODO: Intégrer avec votre service d'email
    secureLog.info('Secure data export sent', { email });
  }

  /**
   * Notifie le DPO
   */
  private async notifyDPO(type: string, data: any): Promise<void> {
    // TODO: Intégrer avec votre système de notification
    secureLog.info('DPO notified', { type, dpoEmail: this.dpoEmail, data });
  }

  /**
   * Enregistre un nouveau traitement de données
   */
  async registerDataProcessing(record: Omit<DataProcessingRecord, 'id' | 'lastUpdated'>): Promise<string> {
    const processingId = crypto.randomUUID();

    const fullRecord: DataProcessingRecord = {
      id: processingId,
      lastUpdated: new Date(),
      ...record,
    };

    // TODO: Stocker dans la base de données
    
    secureLog.security('Data processing registered', {
      processingId,
      purpose: record.purpose,
      legalBasis: record.legalBasis,
    });

    return processingId;
  }

  /**
   * Signale une violation de données
   */
  async reportDataBreach(breach: Omit<DataBreachIncident, 'id'>): Promise<string> {
    const breachId = crypto.randomUUID();

    const fullBreach: DataBreachIncident = {
      id: breachId,
      ...breach,
    };

    // Évaluer la nécessité de notification (72h pour les autorités)
    const requiresNotification = breach.severity === 'high' || breach.severity === 'critical';

    if (requiresNotification) {
      await this.scheduleBreachNotification(breachId);
    }

    secureLog.security('Data breach reported', {
      breachId,
      severity: breach.severity,
      affectedUsers: breach.affectedUsers,
      requiresNotification,
    });

    // Notifier le DPO immédiatement
    await this.notifyDPO('data_breach', {
      breachId,
      severity: breach.severity,
      affectedUsers: breach.affectedUsers,
    });

    return breachId;
  }

  /**
   * Programme la notification de violation dans les 72h
   */
  private async scheduleBreachNotification(breachId: string): Promise<void> {
    // TODO: Implémenter avec un système de queue/scheduler
    secureLog.warn('Breach notification required within 72h', { breachId });
  }

  /**
   * Audit de conformité RGPD
   */
  async performComplianceAudit(): Promise<{
    dataRequests: { pending: number; overdue: number };
    dataProcessing: { active: number; outdated: number };
    dataBreaches: { open: number; overdue: number };
    recommendations: string[];
  }> {
    // TODO: Implémenter les requêtes selon votre schéma
    
    const recommendations: string[] = [];

    // Exemple de logique d'audit
    const overdueRequests = 0; // TODO: Calculer
    const outdatedProcessing = 0; // TODO: Calculer
    const overdueBreach = 0; // TODO: Calculer

    if (overdueRequests > 0) {
      recommendations.push(`${overdueRequests} demandes de données en retard (>30 jours)`);
    }

    if (outdatedProcessing > 0) {
      recommendations.push(`${outdatedProcessing} traitements non mis à jour (>1 an)`);
    }

    return {
      dataRequests: { pending: 0, overdue: overdueRequests },
      dataProcessing: { active: 0, outdated: outdatedProcessing },
      dataBreaches: { open: 0, overdue: overdueBreach },
      recommendations,
    };
  }
}

/**
 * Configuration des bases légales RGPD
 */
export const LEGAL_BASIS_DESCRIPTIONS = {
  consent: 'Consentement libre, éclairé et spécifique de la personne concernée',
  contract: 'Exécution d\'un contrat ou mesures précontractuelles',
  legal_obligation: 'Respect d\'une obligation légale',
  vital_interests: 'Sauvegarde des intérêts vitaux',
  public_task: 'Mission d\'intérêt public ou exercice de l\'autorité publique',
  legitimate_interests: 'Intérêts légitimes poursuivis par le responsable du traitement',
};

/**
 * Périodes de rétention standard
 */
export const RETENTION_PERIODS = {
  user_accounts: '3 ans après dernière activité',
  transaction_data: '10 ans (obligations comptables)',
  marketing_data: '3 ans après dernier contact',
  analytics_data: '25 mois',
  logs_security: '1 an',
  consent_records: '3 ans après retrait',
};

/**
 * Templates d'emails RGPD
 */
export const EMAIL_TEMPLATES = {
  data_request_confirmation: {
    subject: 'Confirmation de votre demande de données personnelles',
    template: `
Bonjour,

Nous avons bien reçu votre demande concernant vos données personnelles.

Référence: {{requestId}}
Type de demande: {{type}}
Date: {{date}}

Nous traiterons votre demande dans un délai de 30 jours maximum conformément au RGPD.

Cordialement,
L'équipe VidGenie
    `.trim(),
  },
  
  data_breach_notification: {
    subject: 'Information importante concernant vos données',
    template: `
Bonjour,

Nous vous informons qu'un incident de sécurité a affecté certaines de vos données personnelles.

Nature de l'incident: {{description}}
Données concernées: {{dataTypes}}
Date de découverte: {{discoveryDate}}

Mesures prises:
{{containmentMeasures}}

Nous restons à votre disposition pour toute question.

Cordialement,
L'équipe VidGenie
    `.trim(),
  },
};

export default DataProtectionManager;