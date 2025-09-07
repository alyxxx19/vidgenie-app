/**
 * Gestionnaire de consentement RGPD complet
 * PHASE 7.1 - Conformité RGPD et gestion des cookies
 */

import { secureLog } from '../secure-logger';

// Types de consentement
export type ConsentType = 
  | 'necessary'      // Cookies techniques nécessaires
  | 'functional'     // Cookies fonctionnels (préférences, etc.)
  | 'analytics'      // Analytics (Google Analytics, etc.)
  | 'marketing'      // Marketing et publicité
  | 'personalization'; // Personnalisation de contenu

export interface ConsentSettings {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

export interface ConsentRecord {
  userId?: string;
  sessionId: string;
  consent: ConsentSettings;
  timestamp: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  source: 'banner' | 'preferences' | 'api' | 'implicit';
}

export interface CookieInfo {
  name: string;
  purpose: string;
  category: ConsentType;
  duration: string;
  domain: string;
  isThirdParty: boolean;
  description: string;
}

// Configuration des cookies par catégorie
export const COOKIE_REGISTRY: CookieInfo[] = [
  // Cookies nécessaires
  {
    name: 'auth-token',
    purpose: 'Authentification utilisateur',
    category: 'necessary',
    duration: '7 jours',
    domain: 'vidgenie.com',
    isThirdParty: false,
    description: 'Token de session pour maintenir la connexion utilisateur'
  },
  {
    name: 'csrf-token',
    purpose: 'Protection CSRF',
    category: 'necessary',
    duration: 'Session',
    domain: 'vidgenie.com',
    isThirdParty: false,
    description: 'Token de protection contre les attaques CSRF'
  },
  {
    name: 'consent-preferences',
    purpose: 'Préférences de consentement',
    category: 'necessary',
    duration: '1 an',
    domain: 'vidgenie.com',
    isThirdParty: false,
    description: 'Stockage des préférences de consentement RGPD'
  },

  // Cookies fonctionnels
  {
    name: 'user-preferences',
    purpose: 'Préférences utilisateur',
    category: 'functional',
    duration: '30 jours',
    domain: 'vidgenie.com',
    isThirdParty: false,
    description: 'Thème, langue et autres préférences d\'interface'
  },
  {
    name: 'accessibility-settings',
    purpose: 'Paramètres d\'accessibilité',
    category: 'functional',
    duration: '1 an',
    domain: 'vidgenie.com',
    isThirdParty: false,
    description: 'Paramètres d\'accessibilité (contraste, taille police, etc.)'
  },

  // Cookies analytics
  {
    name: '_ga',
    purpose: 'Google Analytics',
    category: 'analytics',
    duration: '2 ans',
    domain: '.google.com',
    isThirdParty: true,
    description: 'Identifiant unique pour Google Analytics'
  },
  {
    name: '_ga_*',
    purpose: 'Google Analytics 4',
    category: 'analytics',
    duration: '2 ans',
    domain: '.google.com',
    isThirdParty: true,
    description: 'Données de mesure pour Google Analytics 4'
  },

  // Cookies marketing (exemples)
  {
    name: '_fbp',
    purpose: 'Facebook Pixel',
    category: 'marketing',
    duration: '90 jours',
    domain: '.facebook.com',
    isThirdParty: true,
    description: 'Pixel de tracking Facebook pour la publicité'
  },
];

// Version actuelle de la politique de consentement
export const CONSENT_VERSION = '2024.1';

// Durée de stockage du consentement (1 an)
const CONSENT_EXPIRY = 365 * 24 * 60 * 60 * 1000;

/**
 * Gestionnaire de consentement RGPD
 */
export class ConsentManager {
  private storageKey = 'vidgenie_consent';
  private consentRecords: ConsentRecord[] = [];

  constructor() {
    this.loadStoredConsent();
  }

  /**
   * Obtient l'état actuel du consentement
   */
  getConsent(): ConsentSettings | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Vérifier l'expiration
      if (parsed.timestamp && Date.now() - new Date(parsed.timestamp).getTime() > CONSENT_EXPIRY) {
        this.clearConsent();
        return null;
      }

      // Vérifier la version
      if (parsed.version !== CONSENT_VERSION) {
        secureLog.info('Consent version outdated, requiring new consent', {
          oldVersion: parsed.version,
          newVersion: CONSENT_VERSION,
        });
        return null;
      }

      return parsed.consent;
    } catch (error) {
      secureLog.error('Error loading consent', error);
      this.clearConsent();
      return null;
    }
  }

  /**
   * Définit le consentement utilisateur
   */
  setConsent(
    consent: ConsentSettings,
    source: ConsentRecord['source'] = 'banner',
    userId?: string
  ): void {
    const record: ConsentRecord = {
      userId,
      sessionId: this.getSessionId(),
      consent,
      timestamp: new Date(),
      version: CONSENT_VERSION,
      source,
    };

    // Ajouter des informations de contexte si disponible
    if (typeof window !== 'undefined') {
      record.userAgent = navigator.userAgent;
    }

    // Stocker localement
    this.storeConsent(record);

    // Ajouter à l'historique
    this.consentRecords.push(record);

    // Appliquer le consentement immédiatement
    this.applyConsent(consent);

    // Logger pour audit
    secureLog.security('Consent updated', {
      userId,
      consent,
      source,
      timestamp: record.timestamp,
    });

    // Déclencher les événements
    this.dispatchConsentEvent('consent-changed', consent);
  }

  /**
   * Révoque tout le consentement (sauf nécessaire)
   */
  revokeConsent(userId?: string): void {
    const revokedConsent: ConsentSettings = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false,
    };

    this.setConsent(revokedConsent, 'preferences', userId);
  }

  /**
   * Vérifie si un type de cookie est autorisé
   */
  isConsentGiven(type: ConsentType): boolean {
    const consent = this.getConsent();
    
    // Les cookies nécessaires sont toujours autorisés
    if (type === 'necessary') return true;
    
    // Si pas de consentement stocké, refuser tout sauf nécessaire
    if (!consent) return false;

    return consent[type] || false;
  }

  /**
   * Obtient la liste des cookies autorisés
   */
  getAllowedCookies(): CookieInfo[] {
    return COOKIE_REGISTRY.filter(cookie => 
      this.isConsentGiven(cookie.category)
    );
  }

  /**
   * Applique le consentement actuel
   */
  private applyConsent(consent: ConsentSettings): void {
    if (typeof window === 'undefined') return;

    // Nettoyer les cookies non autorisés
    this.cleanupUnauthorizedCookies(consent);

    // Configurer les services tiers
    this.configureThirdPartyServices(consent);

    // Déclencher les callbacks des services
    this.notifyServices(consent);
  }

  /**
   * Nettoie les cookies non autorisés
   */
  private cleanupUnauthorizedCookies(consent: ConsentSettings): void {
    if (typeof document === 'undefined') return;

    // Obtenir tous les cookies actuels
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      const [name] = cookie.split('=').map(c => c.trim());
      
      // Trouver le cookie dans le registre
      const cookieInfo = COOKIE_REGISTRY.find(c => 
        name.startsWith(c.name.replace('*', ''))
      );

      if (cookieInfo && !consent[cookieInfo.category]) {
        // Supprimer le cookie
        this.deleteCookie(name, cookieInfo.domain);
        secureLog.debug('Cookie removed due to consent', { name, category: cookieInfo.category });
      }
    }
  }

  /**
   * Supprime un cookie spécifique
   */
  private deleteCookie(name: string, domain?: string): void {
    const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
    const path = 'path=/';
    const domainPart = domain ? `domain=${domain}` : '';
    
    document.cookie = `${name}=; ${expires}; ${path}; ${domainPart}`;
  }

  /**
   * Configure les services tiers selon le consentement
   */
  private configureThirdPartyServices(consent: ConsentSettings): void {
    // Google Analytics
    if (consent.analytics) {
      this.enableGoogleAnalytics();
    } else {
      this.disableGoogleAnalytics();
    }

    // Services marketing
    if (consent.marketing) {
      this.enableMarketingServices();
    } else {
      this.disableMarketingServices();
    }
  }

  /**
   * Active Google Analytics
   */
  private enableGoogleAnalytics(): void {
    if (typeof window === 'undefined') return;

    // Configuration GA4
    const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (GA_MEASUREMENT_ID) {
      // Script GA4
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);

      // Configuration
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
      (window as any).gtag = gtag;
      
      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
  }

  /**
   * Désactive Google Analytics
   */
  private disableGoogleAnalytics(): void {
    if (typeof window === 'undefined') return;

    // Désactiver GA
    (window as any)['ga-disable-' + process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID] = true;
  }

  /**
   * Active les services marketing
   */
  private enableMarketingServices(): void {
    // Implémenter selon les besoins
    secureLog.debug('Marketing services enabled');
  }

  /**
   * Désactive les services marketing
   */
  private disableMarketingServices(): void {
    // Implémenter selon les besoins
    secureLog.debug('Marketing services disabled');
  }

  /**
   * Notifie les services du changement de consentement
   */
  private notifyServices(consent: ConsentSettings): void {
    // Événement personnalisé pour les services
    this.dispatchConsentEvent('services-consent-update', consent);
  }

  /**
   * Stocke le consentement localement
   */
  private storeConsent(record: ConsentRecord): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(record));
    } catch (error) {
      secureLog.error('Error storing consent', error);
    }
  }

  /**
   * Charge le consentement stocké
   */
  private loadStoredConsent(): void {
    const consent = this.getConsent();
    if (consent) {
      this.applyConsent(consent);
    }
  }

  /**
   * Efface le consentement stocké
   */
  private clearConsent(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Génère ou récupère l'ID de session
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return crypto.randomUUID();

    let sessionId = sessionStorage.getItem('vidgenie_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('vidgenie_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Déclenche un événement de consentement
   */
  private dispatchConsentEvent(type: string, data: any): void {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent(type, { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * Exporte l'historique des consentements pour audit
   */
  exportConsentHistory(): ConsentRecord[] {
    return [...this.consentRecords];
  }

  /**
   * Vérifie si le consentement est requis
   */
  isConsentRequired(): boolean {
    return this.getConsent() === null;
  }

  /**
   * Obtient les détails de conformité
   */
  getComplianceDetails(): {
    hasValidConsent: boolean;
    consentVersion: string;
    consentDate: Date | null;
    allowedCategories: ConsentType[];
    cookieCount: number;
  } {
    const consent = this.getConsent();
    const record = this.getCurrentConsentRecord();

    return {
      hasValidConsent: consent !== null,
      consentVersion: CONSENT_VERSION,
      consentDate: record?.timestamp || null,
      allowedCategories: consent 
        ? Object.entries(consent)
            .filter(([, allowed]) => allowed)
            .map(([category]) => category as ConsentType)
        : ['necessary'],
      cookieCount: this.getAllowedCookies().length,
    };
  }

  /**
   * Obtient l'enregistrement de consentement actuel
   */
  private getCurrentConsentRecord(): ConsentRecord | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Instance globale du gestionnaire de consentement
 */
export const consentManager = new ConsentManager();

/**
 * Hook React pour le consentement
 */
export function useConsent() {
  if (typeof window === 'undefined') {
    return {
      consent: null,
      isRequired: false,
      setConsent: () => {},
      revokeConsent: () => {},
      isAllowed: () => false,
    };
  }

  const consent = consentManager.getConsent();

  return {
    consent,
    isRequired: consentManager.isConsentRequired(),
    setConsent: (consent: ConsentSettings, source?: ConsentRecord['source']) => 
      consentManager.setConsent(consent, source),
    revokeConsent: () => consentManager.revokeConsent(),
    isAllowed: (type: ConsentType) => consentManager.isConsentGiven(type),
    allowedCookies: consentManager.getAllowedCookies(),
    complianceDetails: consentManager.getComplianceDetails(),
  };
}

/**
 * Utilitaires pour la gestion des cookies
 */
export const CookieUtils = {
  /**
   * Définit un cookie avec respect du consentement
   */
  setCookie(
    name: string, 
    value: string, 
    category: ConsentType,
    options: {
      expires?: Date;
      maxAge?: number;
      domain?: string;
      path?: string;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
    } = {}
  ): boolean {
    if (!consentManager.isConsentGiven(category)) {
      secureLog.debug('Cookie blocked due to consent', { name, category });
      return false;
    }

    if (typeof document === 'undefined') return false;

    const {
      expires,
      maxAge,
      domain,
      path = '/',
      secure = true,
      sameSite = 'lax'
    } = options;

    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (expires) cookieString += `; expires=${expires.toUTCString()}`;
    if (maxAge) cookieString += `; max-age=${maxAge}`;
    if (domain) cookieString += `; domain=${domain}`;
    cookieString += `; path=${path}`;
    if (secure) cookieString += `; secure`;
    cookieString += `; samesite=${sameSite}`;

    document.cookie = cookieString;
    return true;
  },

  /**
   * Récupère un cookie
   */
  getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  },

  /**
   * Supprime un cookie
   */
  deleteCookie(name: string, domain?: string, path = '/'): void {
    if (typeof document === 'undefined') return;

    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
    if (domain) cookieString += `; domain=${domain}`;
    
    document.cookie = cookieString;
  },
};