# Vidgenie - AI Video Content Creation Platform

Plateforme SaaS d'automatisation de création de contenus vidéo courts pour TikTok, YouTube Shorts, et Instagram Reels.

## Stack Technique

- **Frontend**: Next.js 15 avec App Router, TypeScript, shadcn/ui
- **Backend**: tRPC pour APIs type-safe  
- **Base de données**: PostgreSQL avec Prisma ORM
- **Jobs asynchrones**: Inngest pour workflows durables
- **Stockage**: AWS S3 pour média
- **Authentification**: NextAuth.js + Système custom avec contexte React
- **UI**: Tailwind CSS v4 + Radix UI components
- **Analytics**: PostHog + Sentry

## Installation

### Prérequis

- Node.js 18+ (recommandé v20+)
- Compte Supabase (base de données PostgreSQL hébergée) 
- Docker (pour PostgreSQL local optionnel)
- Compte AWS S3 (optionnel pour dev)

### Configuration

1. **Cloner et installer**
```bash
git clone <repo-url>
cd vidgenie-app
npm install
```

2. **Variables d'environnement**
```bash
cp .env.example .env
```

Configurer `.env.local`:
```
# Supabase Database (remplacer [YOUR_PASSWORD] par votre mot de passe)
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.bnnhdbapoqlkgijderkh.supabase.co:5432/postgres"

# Supabase
SUPABASE_URL="https://bnnhdbapoqlkgijderkh.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubmhkYmFwb3Fsa2dpamRlcmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTA0ODcsImV4cCI6MjA3MjEyNjQ4N30.t72KIFgB4Jps8dAdnclDKZIFITL9tq1PJyP5QkQUcx8"

NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
S3_BUCKET_NAME="vidgenie-media"
S3_REGION="eu-west-3"
INNGEST_EVENT_KEY="your-inngest-key"
```

3. **Configuration Supabase**

⚠️ **Important**: Récupérez d'abord votre mot de passe Supabase:
1. Aller sur [Dashboard Supabase](https://supabase.com/dashboard/project/bnnhdbapoqlkgijderkh)
2. Settings → Database → Connection string
3. Remplacer `[YOUR_PASSWORD]` dans `.env.local`

```bash
# Appliquer le schema à Supabase
npm run db:push

# Populer avec les données de test
npm run db:seed
```

4. **Démarrer les services**
```bash
# Terminal 1: App principale
npm run dev

# Terminal 2: Worker Inngest
npm run inngest:dev
```

L'application sera disponible sur http://localhost:3000

## Architecture

### Structure des dossiers

```
src/
├── app/                 # App Router pages
│   ├── auth/           # Pages d'authentification
│   ├── create/         # Page création de contenu
│   ├── dashboard/      # Dashboard principal
│   └── assets/         # Pages détail assets
├── components/         # Composants UI réutilisables
├── lib/               # Utilitaires et configuration
├── server/            # Backend tRPC
│   └── api/           # Routers API
└── inngest/           # Workers jobs asynchrones
```

### Modèle de données

**User** → **Project** → **Job** → **Asset** → **Post**

- **User**: Utilisateur avec crédits et plan
- **Project**: Organisation du contenu par projet
- **Job**: Demande de génération IA avec status
- **Asset**: Média généré (vidéo + métadonnées)
- **Post**: Publication sur plateformes

### Workflow principal

1. **Création**: Utilisateur saisit prompt + config
2. **Génération**: Job Inngest simule IA avec providers
3. **SEO**: Génération auto de hashtags/descriptions
4. **Édition**: Interface pour ajuster SEO par plateforme
5. **Publication**: Mock publishing vers TikTok/YouTube/Instagram

## Fonctionnalités MVP

### ✅ Génération IA
- Simulation de 3 providers AI (OpenAI Sora, MidJourney, RunwayML)
- Sélection automatique du provider optimal
- Tracking en temps réel du progrès
- Upload S3 simulé

### ✅ Gestion des prompts
- Templates publics pré-configurés
- Prompts personnels sauvegardés
- Catégorisation et tags
- Système de favoris

### ✅ SEO automatisé
- Génération auto hashtags/descriptions
- Optimisation par plateforme
- Interface d'édition intuitive
- Extraction de mots-clés

### ✅ Dashboard complet
- Vue calendrier pour planification
- Historique des contenus
- Métriques de performance
- Gestion des projets

### ✅ Publication multi-plateformes
- Publication immédiate ou programmée
- Support TikTok, YouTube Shorts, Instagram
- Mock APIs pour développement
- Tracking des posts publiés

### ✅ Système de crédits
- 4 plans (Gratuit, Starter, Pro, Enterprise)
- Gestion de la consommation
- Historique des transactions
- Limites par plan

### ✅ Analytics & KPIs
- Métriques d'activation utilisateur (≥35%)
- Taux de succès génération (≥95%)
- Contenu par utilisateur/semaine (≥3)
- Tracking d'engagement

## Scripts utiles

```bash
# Développement
npm run dev              # Démarrer l'app
npm run inngest:dev      # Worker Inngest

# Base de données
npm run db:generate      # Générer client Prisma
npm run db:push          # Sync schema
npm run db:migrate       # Nouvelle migration
npm run db:studio        # Interface admin
npm run db:seed          # Populer données test

# Qualité code
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run build            # Build production
```

## Développement

### Authentification simplifiée

Le système d'auth est simplifié pour le MVP avec un contexte React:

```typescript
const { user, signIn, signOut } = useAuth();
```

L'utilisateur test est créé automatiquement: `test@example.com`

### Mock Services

**AI Generation**: Simulation realistic de génération vidéo avec:
- Temps de traitement variables par provider
- Coûts en crédits différents
- Scores de qualité simulés

**Publishing**: Mock APIs pour toutes les plateformes avec:
- Validation des formats requis
- Simulation des réponses APIs
- Tracking des publications

### Base de données test

Le script `npm run db:seed` crée:
- 4 plans d'abonnement
- 5 templates de prompts publics
- 1 utilisateur test avec 1000 crédits
- 2 prompts personnels
- 1 projet par défaut
- 3 jobs de test (2 complétés, 1 en cours)
- Assets correspondants avec métadonnées SEO

## Production

### Variables d'environnement

Configurer toutes les variables en production:
- `DATABASE_URL`: PostgreSQL production
- `S3_*`: Credentials AWS réels
- `INNGEST_*`: Configuration Inngest production

### Intégrations à finaliser

Pour mise en production:
1. **OAuth**: Remplacer auth simplifiée par NextAuth.js
2. **AI Providers**: Intégrer vraies APIs (OpenAI, etc.)
3. **Social APIs**: TikTok Business, YouTube API, Instagram API
4. **Paiements**: Stripe pour gestion abonnements
5. **Monitoring**: Sentry + analytics configurés

## Support

- **Logs**: Console navigateur + serveur
- **Debug**: Prisma Studio pour DB
- **Monitoring**: TODO Sentry en production

## License

Propriétaire - Vidgenie SaaS
