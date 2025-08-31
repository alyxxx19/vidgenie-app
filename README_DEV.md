# Vidgenie - Guide de Développement

## Architecture

- **Frontend**: Next.js 15 + App Router + TypeScript + Tailwind CSS v4
- **Backend**: tRPC + API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Jobs**: Inngest (workers async)
- **Auth**: NextAuth.js
- **Storage**: AWS S3 + CloudFront
- **Analytics**: PostHog + Sentry
- **UI**: shadcn/ui + Radix

## Prérequis

- Node.js 18+ (warnings avec v18, recommandé v20+)
- Docker (pour PostgreSQL local)
- Git

## Installation

```bash
# 1. Installation dépendances
cd vidgenie-app
npm install

# 2. Base de données PostgreSQL
docker run --name vidgenie-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 51214:5432 -d postgres:16

# 3. Configuration environnement
cp .env.example .env
cp .env.example .env.local
# DATABASE_URL="postgresql://postgres:postgres@localhost:51214/postgres?schema=public"
# NEXTAUTH_SECRET="dev-secret-key-replace-in-production-2024"
# NEXTAUTH_URL="http://localhost:3001"  # ou port disponible

# 4. Schema Prisma
npx prisma generate
npx prisma db push
```

## Variables d'environnement requises

### Base de données
```env
DATABASE_URL="postgresql://username:password@localhost:5432/vidgenie"
```

### NextAuth
```env
NEXTAUTH_SECRET="génération-via-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### Stockage S3
```env
S3_ACCESS_KEY_ID="your-s3-key"
S3_SECRET_ACCESS_KEY="your-s3-secret"
S3_BUCKET_NAME="vidgenie-media"
S3_REGION="eu-west-3"
```

### Inngest (workers)
```env
INNGEST_SIGNING_KEY="your-inngest-key"
```

## Développement

```bash
# Lancer en dev
npm run dev

# Build production
npm run build

# Tests
npm run test

# Linting
npm run lint

# Base de données
npx prisma studio  # Interface admin DB
npx prisma migrate dev --name init
```

## Structure du projet

```
vidgenie-app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes (tRPC + NextAuth)
│   │   ├── auth/           # Pages d'authentification
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── create/         # Création de contenu
│   │   └── providers.tsx   # Context providers
│   ├── components/         # Composants réutilisables
│   │   └── ui/            # shadcn/ui components
│   ├── inngest/           # Workers Inngest
│   ├── lib/               # Utilitaires (crypto, S3, etc.)
│   └── server/            # Backend logic
│       └── api/           # tRPC routers
├── prisma/
│   └── schema.prisma      # Schéma base de données
└── package.json
```

## Endpoints tRPC disponibles

### Jobs
- `jobs.submitGeneration` - Lancer génération contenu
- `jobs.getStatus` - Statut d'un job
- `jobs.list` - Liste des jobs utilisateur

### Assets  
- `assets.list` - Liste des médias
- `assets.get` - Détails d'un média
- `assets.delete` - Supprimer un média

### Posts
- `posts.create` - Créer post depuis asset
- `posts.generateSEO` - Optimisation SEO automatique  
- `posts.list` - Liste des posts
- `posts.calendar` - Vue calendrier

## Workers Inngest

### Generation Worker
- Event: `generation/start`
- Fonction: Génère contenu via APIs IA
- Stockage: Upload S3 automatique
- SLO: ≤ 10 minutes

### Publishing Worker (TODO)
- Event: `publishing/start`  
- Fonction: Publication multi-plateformes
- Retry: 3 tentatives avec backoff

## Modèles de données

### User
- Profil créateur (solo/semi-pro)
- Crédits et abonnement
- Relations: APIs, comptes sociaux, contenus

### Job  
- Jobs async (génération, publication)
- Tracking Inngest + métriques temps
- Retry automatique

### Asset
- Médias générés (S3 + métadonnées)
- Thumbnails et preview
- Linkage avec jobs et posts

### Post
- Contenu prêt pour publication
- SEO + planning
- Multi-plateforme

## Sécurité

- **Credentials**: Chiffrement AES-256 en BDD
- **Auth**: NextAuth + OAuth providers
- **API**: Rate limiting + validation Zod
- **Storage**: URLs signées S3 (expirent)

## Monitoring

### Métriques clés
- Temps génération (SLO ≤ 10min)
- Taux succès (≥ 95%)
- Usage crédits par utilisateur
- Erreurs par provider IA

### Events PostHog
- `generation_started/succeeded/failed`
- `api_keys_connected`
- `post_scheduled/published`

## Debugging

```bash
# Logs Inngest en local
npm run inngest:dev

# Database GUI
npx prisma studio

# Inspect tRPC
http://localhost:3000/api/trpc/jobs.list

# S3 debugging
aws s3 ls s3://vidgenie-media/users/
```

## Premier test E2E

1. Signup via `/auth/signin`
2. Dashboard → "Nouveau contenu"
3. Saisir prompt → "Générer"
4. Vérifier job status en temps réel
5. Asset généré → S3 + BDD
6. (TODO) Post creation + SEO

## Troubleshooting

### Erreur P1001 "Can't reach database server"
```bash
# Vérifier que PostgreSQL tourne
docker ps | grep vidgenie-db

# Redémarrer si nécessaire
docker restart vidgenie-db

# Ou recréer le conteneur
docker rm vidgenie-db
docker run --name vidgenie-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres -p 51214:5432 -d postgres:16
```

### "Module not found @/components/ui/*"
```bash
# Régénérer les composants shadcn
npx shadcn@latest add button card sonner

# Vérifier alias TypeScript
cat tsconfig.json | grep -A3 paths
```

### Warning "lockfiles multiples"
```bash
# Supprimer lockfile parasite
rm -f /Users/$(whoami)/package-lock.json

# Reinstaller depuis le bon dossier
cd vidgenie-app && npm install
```

### Port 3000 occupé
- Next.js utilise automatiquement port 3001+
- Mettre à jour `NEXTAUTH_URL` dans `.env`

## TODO Prochaines étapes

- [ ] OAuth TikTok/YouTube/Instagram  
- [ ] Vraies APIs IA (OpenAI, MidJourney, etc.)
- [ ] Publication automatique multi-plateforme
- [ ] Système crédits + abonnements complet
- [ ] Tests unitaires + E2E (Jest/Playwright)
- [ ] Monitoring avancé (Sentry alerts)
- [ ] CI/CD + déploiement Vercel