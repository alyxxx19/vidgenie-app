# 🎨 Enhanced Prompt Builder System

## Overview

Le système de Prompt Builder avancé transforme l'expérience de génération d'images dans le mode `image_only` de VidGenie. Il combine l'intelligence artificielle GPT-4 pour l'amélioration des prompts avec une interface utilisateur intuitive et des fonctionnalités avancées.

## ✨ Fonctionnalités Principales

### 1. **Modes de Création**
- **Simple** : Interface classique avec textarea
- **Guidé** : Assistant intelligent avec catégories et sélections visuelles  
- **Expert** : Contrôles avancés pour les utilisateurs expérimentés

### 2. **Amélioration GPT Automatique**
- ✅ Enrichissement automatique des prompts avec GPT-4o-mini
- 🎛️ Contrôle de la créativité (température 0.3-1.0)
- 🎨 Application de styles artistiques spécifiques
- 🖼️ Modification de l'ambiance et de la composition

### 3. **Templates Prédéfinis**
```typescript
// Exemples de templates
- Business Professional
- Product Shot  
- Nature Scene
- Character Design
- Abstract Art
```

### 4. **Système de Catégories**
- **Style** : Portrait, Paysage, Abstrait, Photo, Illustration, 3D
- **Ambiance** : Lumineux, Sombre, Coloré, Minimaliste, Dramatique
- **Art** : Réaliste, Cartoon, Anime, Impressionniste, Cyberpunk
- **Composition** : Rule of thirds, Symétrie, Angles, Profondeur

### 5. **Outils d'Analyse**
- 📊 **Estimation du coût** en crédits
- 🔍 **Analyse de complexité** (simple/moyen/complexe)  
- ✅ **Validation automatique** du prompt
- 📈 **Compteur de tokens** en temps réel

### 6. **Fonctionnalités Utiles**
- 💾 **Historique des prompts** (10 derniers)
- 🔄 **Génération de variations** 
- ❌ **Prompt négatif** pour éviter certains éléments
- 🎯 **Sauvegarde locale** des préférences

## 🚀 Utilisation

### Mode Guidé
1. Sélectionnez une **catégorie de style** (Portrait, Paysage, etc.)
2. Choisissez une **ambiance** (Lumineux, Sombre, etc.)  
3. Appliquez un **style artistique** (Réaliste, Cartoon, etc.)
4. Le prompt est **automatiquement construit** et amélioré

### Mode Expert
```typescript
// Contrôles avancés disponibles
- Température GPT : 0.3-1.0
- Prompt négatif : "blur, low quality, distorted"
- Composition : "Rule of thirds", "Close-up", etc.
- Enhancement : ON/OFF toggle
```

## 🔧 Configuration Technique

### Structure des Fichiers
```
src/
├── components/
│   └── prompt-builder.tsx          # Composant principal
├── lib/
│   ├── services/
│   │   └── prompt-enhancer.ts      # Service GPT (serveur uniquement)
│   └── utils/
│       └── prompt-utils.ts         # Utilitaires client-safe
└── app/create/page.tsx             # Intégration dans la page
```

### API Endpoints
- `POST /api/dev-generate-image` - Génération avec enhancement
- `POST /api/mock-generate-image` - Version de test

### Variables d'Environnement
```env
OPENAI_API_KEY=sk-proj-...          # Clé OpenAI pour GPT
SKIP_MODERATION=true                # Bypass modération en dev
```

## 📊 Exemples de Transformation

### Avant (prompt simple)
```
"a cat"
```

### Après (prompt amélioré par GPT)
```
"A photorealistic close-up portrait of an elegant domestic cat with bright, 
luminous amber eyes and soft fluffy fur, sitting gracefully in a vibrant 
garden setting with natural sunlight, shallow depth of field, highly detailed"
```

## 🎯 Estimation des Coûts

| Qualité | Dimensions | Crédits Base | Avec Complexité |
|---------|------------|--------------|-----------------|
| Standard | 1024x1024 | 3 crédits | 3-4 crédits |
| HD | 1024x1792 | 5 crédits | 5-7 crédits |
| HD | 1792x1024 | 5 crédits | 5-7 crédits |

## 🔄 Workflow Complet

1. **Input** : L'utilisateur entre un prompt basique
2. **Analysis** : Validation et estimation automatiques
3. **Enhancement** : GPT-4 enrichit le prompt (optionnel)
4. **Generation** : DALL-E 3 crée l'image
5. **Display** : Affichage avec métadonnées complètes

## 🛠️ Développement

### Ajouter un Nouveau Template
```typescript
// Dans prompt-builder.tsx
const PROMPT_TEMPLATES = {
  monNouveauTemplate: {
    name: 'Mon Template',
    template: 'Un {sujet} dans un {environnement}, style {style}',
    variables: ['sujet', 'environnement', 'style'],
  },
};
```

### Ajouter une Nouvelle Catégorie
```typescript
const STYLE_CATEGORIES = {
  macategorie: { 
    label: 'Ma Catégorie', 
    icon: '🎨', 
    keywords: 'mot-clé1, mot-clé2' 
  },
};
```

## 🎉 Résultat

L'utilisateur dispose maintenant d'un système de génération d'images professionnel avec :
- Interface intuitive et modulaire
- Amélioration intelligente des prompts
- Contrôle total sur les paramètres
- Feedback en temps réel
- Historique et templates

**De "a cat" à une œuvre d'art en un clic !** 🐱✨