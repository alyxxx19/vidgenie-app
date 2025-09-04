# 🎬 Image-to-Video Workflow System

## Vue d'ensemble

Ce système implémente un pipeline complet de génération image-to-vidéo avec visualisation en temps réel, utilisant DALL-E 3 pour la génération d'images et Google VEO 3 pour la conversion vidéo.

## 🏗️ Architecture

### Backend
- **Orchestrateur de Workflow** : Gère le pipeline complet avec gestion d'erreurs
- **APIs RESTful** : Endpoints pour démarrer, surveiller et annuler les workflows
- **Server-Sent Events (SSE)** : Mises à jour en temps réel
- **Services intégrés** : DALL-E 3, VEO3, S3, modération de contenu

### Frontend
- **Interface de Workflow** : Configuration intuitive des prompts et paramètres
- **Visualiseur de Workflow** : Affichage en temps réel des étapes
- **Hooks React** : Gestion des états et connexions SSE
- **Components réutilisables** : UI moderne et responsive

## 🚀 Démarrage rapide

### 1. Configuration
```bash
# Variables d'environnement requises
OPENAI_API_KEY=your_openai_key
FAL_KEY=your_fal_ai_key
S3_BUCKET_NAME=your_s3_bucket
S3_REGION=your_s3_region
DATABASE_URL=your_database_url
```

### 2. Test du système
```bash
npx tsx scripts/test-workflow.ts
```

### 3. Démarrage
```bash
npm run dev
# Naviguer vers /create et sélectionner "smart_workflow"
```

## 🔄 Pipeline de Workflow

### Étapes du Pipeline
1. **Validation & Sécurité** : Modération des prompts, vérification des crédits
2. **Génération Image** : DALL-E 3 avec optimisation pour vidéo
3. **Upload Image** : Stockage S3 et création d'asset en BDD
4. **Génération Vidéo** : Conversion image-to-vidéo avec VEO3
5. **Upload Vidéo** : Stockage final et finalisation
6. **Finalisation** : Mise à jour des statuts et notifications

### États des Étapes
- `pending` : En attente d'exécution
- `processing` : En cours d'exécution (avec pourcentage de progrès)
- `completed` : Terminée avec succès
- `failed` : Échouée avec message d'erreur

## 📡 API Endpoints

### POST `/api/workflow/start`
Démarre un nouveau workflow
```typescript
{
  imagePrompt: string;
  videoPrompt: string;
  imageConfig?: {
    style: 'natural' | 'vivid';
    quality: 'standard' | 'hd';
    size: '1024x1024' | '1792x1024' | '1024x1792';
  };
  videoConfig?: {
    duration: '8s';
    resolution: '720p' | '1080p';
    generateAudio: boolean;
  };
  projectId?: string;
}
```

### GET `/api/workflow/:id/status`
Récupère le statut actuel du workflow

### GET `/api/workflow/:id/stream`
Stream SSE pour mises à jour temps réel

### POST `/api/workflow/:id/cancel`
Annule un workflow en cours

### GET `/api/workflow/health`
Vérification de la santé du système

## 🎨 Composants UI

### WorkflowInterface
Interface principale pour configurer et lancer les workflows
```tsx
<WorkflowInterface projectId={projectId} />
```

### WorkflowVisualizer  
Visualiseur en temps réel des étapes du workflow
```tsx
<WorkflowVisualizer 
  workflowId={workflowId}
  onComplete={handleComplete}
  onError={handleError}
/>
```

### Hooks
```tsx
// Hook principal pour gérer les workflows
const {
  isRunning,
  steps,
  result,
  startWorkflow,
  cancelWorkflow
} = useWorkflow();

// Hook pour SSE stream
const {
  steps,
  status,
  isConnected
} = useWorkflowStream(workflowId);
```

## 🎯 Fonctionnalités Clés

### ✨ Visualisation Temps Réel
- Affichage des étapes avec icônes et statuts
- Barres de progression par étape
- Timeline avec timestamps
- Prévisualisation des résultats

### 🔄 Gestion d'Erreurs
- Retry automatique avec backoff exponentiel
- Remboursement automatique des crédits en cas d'échec
- Messages d'erreur contextuels
- Reconnexion SSE automatique

### ⚡ Performance
- Pipeline asynchrone non-bloquant
- Gestion des connexions SSE optimisée
- Cache des résultats intermédiaires
- Optimisation des prompts pour vidéo

### 🔐 Sécurité
- Modération automatique des contenus
- Vérification des crédits en temps réel
- Authentification requise
- Validation des paramètres

## 📊 Monitoring

### Métriques Disponibles
- Durée totale du workflow
- Temps par étape individuelle
- Taux de succès/échec
- Utilisation des crédits
- Performances des APIs

### Logs
```javascript
// Logs structurés pour chaque étape
console.log(`Workflow ${workflowId} - Step ${stepId}: ${status} (${progress}%)`);
```

## 🛠️ Développement

### Structure des Fichiers
```
src/
├── components/
│   ├── workflow-interface.tsx      # Interface principale
│   ├── workflow-visualizer.tsx     # Visualiseur temps réel
│   └── video-prompt-builder.tsx    # Builder de prompts vidéo
├── hooks/
│   ├── useWorkflow.ts              # Hook principal
│   └── useWorkflowStream.ts        # Hook SSE
├── lib/services/
│   ├── workflow-orchestrator.ts    # Orchestrateur principal
│   ├── image-generation.ts         # Service DALL-E 3
│   └── veo3-client.ts              # Client VEO3
└── app/api/workflow/
    ├── start/route.ts              # Démarrage workflow
    ├── [id]/status/route.ts        # Statut workflow
    ├── [id]/stream/route.ts        # Stream SSE
    ├── [id]/cancel/route.ts        # Annulation
    └── health/route.ts             # Health check
```

### Ajout d'Étapes
1. Étendre l'interface `WorkflowStep`
2. Ajouter la logique dans `WorkflowOrchestrator.executeWorkflow()`
3. Mettre à jour les icônes dans `STEP_ICONS`
4. Ajuster les calculs de progrès

### Nouveaux Providers
1. Créer un client dans `src/lib/services/`
2. Ajouter la validation dans l'orchestrateur
3. Intégrer dans le pipeline avec gestion d'erreurs
4. Mettre à jour les tests

## 🧪 Tests

### Test du Pipeline Complet
```bash
npx tsx scripts/test-workflow.ts
```

### Tests Unitaires
```bash
npm run test -- workflow
```

### Test de Charge
```bash
# Tester plusieurs workflows simultanés
npm run test:load
```

## 🚨 Dépannage

### Problèmes Courants

**Erreur de connexion API**
- Vérifier les clés API (OPENAI_API_KEY, FAL_KEY)
- Tester avec `/api/workflow/health`

**Stream SSE déconnecté**
- Vérifier la connexion réseau
- Utiliser le bouton "reconnect"
- Recharger la page si nécessaire

**Crédits insuffisants**
- Vérifier le solde utilisateur
- Ajuster les coûts dans `CREDIT_COSTS`

**Timeout de génération**
- Augmenter `maxAttempts` dans l'orchestrateur
- Vérifier les performances des APIs externes

### Debug
```bash
# Logs détaillés
DEBUG=workflow:* npm run dev

# Test des APIs individuelles
npx tsx -e "
import { testAPIs } from '@/lib/services/workflow-orchestrator';
testAPIs().then(console.log);
"
```

## 🚀 Déploiement

### Variables d'Environnement Production
```bash
NODE_ENV=production
OPENAI_API_KEY=prod_key
FAL_KEY=prod_key
DATABASE_URL=prod_db_url
S3_BUCKET_NAME=prod_bucket
REDIS_URL=prod_redis  # Pour les queues (optionnel)
```

### Optimisations Production
- Utiliser Redis pour les queues Inngest
- Configurer CDN pour les assets
- Monitoring avec OpenTelemetry
- Mise en cache des prompts fréquents

## 📈 Évolutions Futures

### Fonctionnalités Prévues
- [ ] Support multi-providers (Midjourney, Stable Video)
- [ ] Batch processing pour plusieurs générations
- [ ] Templates de workflows personnalisés
- [ ] API publique avec rate limiting
- [ ] Analytics avancées et tableaux de bord
- [ ] Intégration avec services de stockage externes

### Architecture
- [ ] Migration vers des microservices
- [ ] Queue distribuée avec Bull/Inngest
- [ ] Cache Redis pour les performances
- [ ] Monitoring et alerting avancés

---

## 💡 Support

Pour toute question ou problème :
1. Consulter les logs de debug
2. Tester avec `scripts/test-workflow.ts`
3. Vérifier la documentation des APIs externes
4. Ouvrir une issue sur le repository

**Happy generating! 🎬✨**