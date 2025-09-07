/**
 * Configuration Lighthouse CI pour tests de performance
 * PHASE 5.3 - Tests de performance automatisés
 */

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/dashboard'],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 60000,
      numberOfRuns: 3,
      settings: {
        // Émule un appareil mobile
        emulatedFormFactor: 'mobile',
        // Simule une connexion 3G lente
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        // Seuils de performance critiques
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Métriques Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        
        // Métriques de performance
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 4000 }],
        
        // Sécurité et bonnes pratiques
        'is-on-https': 'error',
        'uses-http2': 'off', // Désactivé car peut varier selon l'environnement
        'no-vulnerable-libraries': 'error',
        
        // Accessibilité
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        
        // SEO
        'meta-description': 'error',
        'document-title': 'error',
        
        // Progressive Web App
        'installable-manifest': 'off',
        'splash-screen': 'off',
        'themed-omnibox': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};