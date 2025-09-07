/**
 * Bannière de consentement RGPD
 * PHASE 7.1 - Interface utilisateur pour la gestion du consentement
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Shield, Eye, Target, Palette } from 'lucide-react';
import { useConsent, ConsentSettings, COOKIE_REGISTRY } from '@/lib/gdpr/consent-manager';
import { announceToScreenReader } from '@/lib/accessibility';

interface ConsentBannerProps {
  position?: 'bottom' | 'top';
  showDetailsButton?: boolean;
  companyName?: string;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
}

export default function ConsentBanner({
  position = 'bottom',
  showDetailsButton = true,
  companyName = 'VidGenie',
  privacyPolicyUrl = '/privacy',
  cookiePolicyUrl = '/cookies',
}: ConsentBannerProps) {
  const { consent, isRequired, setConsent } = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<ConsentSettings>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    personalization: false,
  });

  // Ne pas afficher si le consentement n'est pas requis
  if (!isRequired) {
    return null;
  }

  // Accepter tous les cookies
  const handleAcceptAll = () => {
    const allConsent: ConsentSettings = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    
    setConsent(allConsent, 'banner');
    announceToScreenReader('Tous les cookies ont été acceptés');
  };

  // Accepter seulement les nécessaires
  const handleRejectAll = () => {
    const minimalConsent: ConsentSettings = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    
    setConsent(minimalConsent, 'banner');
    announceToScreenReader('Seuls les cookies nécessaires ont été acceptés');
  };

  // Sauvegarder les préférences personnalisées
  const handleSavePreferences = () => {
    setConsent(currentSettings, 'preferences');
    announceToScreenReader('Vos préférences de cookies ont été sauvegardées');
    setShowDetails(false);
  };

  // Mettre à jour une préférence spécifique
  const updatePreference = (category: keyof ConsentSettings, enabled: boolean) => {
    setCurrentSettings(prev => ({
      ...prev,
      [category]: enabled,
    }));
  };

  // Icônes pour chaque catégorie
  const getCategoryIcon = (category: keyof ConsentSettings) => {
    switch (category) {
      case 'necessary': return <Shield className="w-5 h-5" />;
      case 'functional': return <Settings className="w-5 h-5" />;
      case 'analytics': return <Eye className="w-5 h-5" />;
      case 'marketing': return <Target className="w-5 h-5" />;
      case 'personalization': return <Palette className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  // Descriptions des catégories
  const categoryDescriptions = {
    necessary: 'Ces cookies sont essentiels au fonctionnement du site. Ils ne peuvent pas être désactivés.',
    functional: 'Ces cookies permettent d\'améliorer votre expérience en mémorisant vos préférences.',
    analytics: 'Ces cookies nous aident à comprendre comment vous utilisez notre site pour l\'améliorer.',
    marketing: 'Ces cookies sont utilisés pour vous proposer des publicités personnalisées.',
    personalization: 'Ces cookies personnalisent le contenu selon vos intérêts et comportements.',
  };

  // Labels des catégories
  const categoryLabels = {
    necessary: 'Cookies nécessaires',
    functional: 'Cookies fonctionnels',
    analytics: 'Cookies d\'analyse',
    marketing: 'Cookies marketing',
    personalization: 'Personnalisation',
  };

  if (showDetails) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto m-4"
          role="dialog"
          aria-labelledby="consent-title"
          aria-describedby="consent-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 id="consent-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              Préférences de confidentialité
            </h2>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Description */}
          <div className="p-6">
            <p id="consent-description" className="text-gray-600 dark:text-gray-300 mb-6">
              Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
              Vous pouvez choisir quels types de cookies vous souhaitez autoriser.
            </p>

            {/* Catégories de cookies */}
            <div className="space-y-6">
              {Object.entries(categoryLabels).map(([category, label]) => {
                const typedCategory = category as keyof ConsentSettings;
                const cookies = COOKIE_REGISTRY.filter(c => c.category === category);
                
                return (
                  <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(typedCategory)}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {label}
                        </h3>
                        {category === 'necessary' && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                            Toujours actif
                          </span>
                        )}
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentSettings[typedCategory]}
                          disabled={category === 'necessary'}
                          onChange={(e) => updatePreference(typedCategory, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {categoryDescriptions[typedCategory]}
                    </p>

                    {/* Liste des cookies */}
                    {cookies.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                          Voir les cookies ({cookies.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {cookies.map((cookie) => (
                            <div key={cookie.name} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-mono font-medium">{cookie.name}</span>
                                <span className="text-gray-500">{cookie.duration}</span>
                              </div>
                              <p className="text-gray-600 dark:text-gray-300">{cookie.description}</p>
                              {cookie.isThirdParty && (
                                <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-1 rounded">
                                  Tiers: {cookie.domain}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={handleSavePreferences}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sauvegarder mes préférences
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Accepter tout
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Refuser tout
              </button>
            </div>

            {/* Liens légaux */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm">
              <a
                href={privacyPolicyUrl}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Politique de confidentialité
              </a>
              <a
                href={cookiePolicyUrl}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Politique des cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bannière principale
  return (
    <div 
      className={`fixed left-0 right-0 z-50 ${
        position === 'bottom' ? 'bottom-0' : 'top-0'
      }`}
      role="banner"
      aria-label="Consentement aux cookies"
    >
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Message principal */}
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Nous respectons votre vie privée
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu. 
                    Vous pouvez choisir quels cookies accepter.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              {showDetailsButton && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Personnaliser
                </button>
              )}
              
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Refuser
              </button>
              
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Accepter tout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}