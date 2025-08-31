# 🚀 Intégration Supabase Complète - VidGenie

## 📋 Vue d'ensemble

Cette intégration Supabase complète transforme VidGenie en une application SaaS multi-tenant avec :

- ✅ **Authentification complète** (email/password, OAuth, magic links)
- ✅ **Multi-tenant** avec organisations et rôles granulaires
- ✅ **RLS (Row Level Security)** pour l'isolation des données
- ✅ **Stockage sécurisé** avec buckets privés/publics
- ✅ **Temps réel** pour les updates live
- ✅ **Base de données typée** avec génération automatique des types
- ✅ **Edge Functions** pour les side-effects
- ✅ **Sécurité** niveau production avec policies testées

## 🏗️ Architecture

### Structure des dossiers
```
src/lib/supabase/
├── client.ts              # Client Supabase côté navigateur
├── server.ts              # Client Supabase côté serveur
├── types.ts               # Types générés automatiquement
├── auth.ts                # Service d'authentification
└── services/
    ├── users.ts           # Gestion utilisateurs
    ├── organizations.ts   # Multi-tenant et rôles
    └── storage.ts         # Upload et gestion fichiers

supabase/
├── config.toml           # Configuration locale
├── migrations/           # Migrations SQL versionnées
│   ├── 20241231000001_initial_schema.sql
│   ├── 20241231000002_rls_policies.sql
│   └── 20241231000003_auth_hooks.sql
└── seed.sql             # Données de développement
```

## ⚙️ Configuration

### 1. Variables d'environnement

Ajoutez dans votre `.env.local` :

```bash
# Supabase (publiques)
NEXT_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Supabase (privées)
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Pour les opérations admin
SUPABASE_JWT_SECRET="your-jwt-secret"

# Base de données (si vous utilisez Prisma en parallèle)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

### 2. Configuration Supabase Dashboard

#### Auth Settings
1. **Site URL** : `http://localhost:3000` (dev) / `https://votre-domaine.com` (prod)
2. **Redirect URLs** : 
   - `http://localhost:3000/auth/callback`
   - `https://votre-domaine.com/auth/callback`

#### Storage Settings
1. Créer le bucket `assets` avec :
   - **Public** : `false` (sécurisé par défaut)
   - **File size limit** : `50MB`
   - **Allowed MIME types** : `image/*, video/*, application/pdf`

#### OAuth Providers (optionnel)
1. **Google** : Configurez client ID/secret
2. **GitHub** : Configurez client ID/secret

## 🚀 Setup Local (< 10 minutes)

### 1. Installation
```bash
# Installer les dépendances
npm install

# Démarrer Supabase local
npm run supabase:start
```

### 2. Migrations
```bash
# Appliquer les migrations
npm run supabase:migrate

# Seed des données de test
npm run supabase:reset
```

### 3. Générer les types
```bash
# Générer les types TypeScript
npm run supabase:types
```

### 4. Lancer l'application
```bash
# Démarrer en dev
npm run dev

# Accéder à Supabase Studio
npm run supabase:studio
```

## 👤 Authentification

### Flux d'authentification
```typescript
import { authService } from '@/lib/supabase/auth';

// Inscription
const { user, session } = await authService.signUp({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// Connexion
const { user, session } = await authService.signIn({
  email: 'user@example.com',
  password: 'password123'
});

// OAuth
await authService.signInWithOAuth('google');

// Reset password
await authService.resetPassword('user@example.com');
```

### Hook d'authentification
```tsx
import { useAuth } from '@/lib/auth/auth-context';

function MyComponent() {
  const { user, profile, isLoading, signOut } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return (
    <div>
      <p>Hello {profile?.name}!</p>
      <p>Credits: {profile?.organizations?.credits_balance}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## 🏢 Multi-tenant (Organizations)

### Structure des rôles
- **Owner** : Contrôle total de l'organisation
- **Admin** : Gestion des membres et paramètres
- **Member** : Accès aux projets et création
- **Viewer** : Lecture seule

### Gestion des organisations
```typescript
import { OrganizationsService } from '@/lib/supabase/services/organizations';

// Créer une organisation
const org = await OrganizationsService.createOrganization({
  name: 'Mon Entreprise',
  slug: 'mon-entreprise'
});

// Inviter un utilisateur
await OrganizationsService.inviteUser(orgId, 'user@example.com', 'member');

// Changer de rôle
await OrganizationsService.updateUserRole(orgId, userId, 'admin');

// Déduire des crédits
const success = await OrganizationsService.deductCredits(
  orgId, 
  50, 
  'Génération vidéo TikTok'
);
```

## 🗃️ Base de données et RLS

### Sécurité RLS
Chaque table est protégée par des policies RLS :

```sql
-- Exemple : Les utilisateurs ne voient que leurs assets
CREATE POLICY "Organization members can read assets" ON assets
  FOR SELECT USING (is_organization_member(auth.uid(), organization_id));
```

### Services typés
```typescript
import { UsersService } from '@/lib/supabase/services/users';

// Profil utilisateur
const profile = await UsersService.getCurrentProfile();

// Statistiques
const stats = await UsersService.getUserStats(organizationId);

// Switch organisation
await UsersService.switchOrganization(newOrgId);
```

## 📁 Stockage de fichiers

### Upload sécurisé
```typescript
import { StorageService } from '@/lib/supabase/services/storage';

// Upload direct
const result = await StorageService.uploadFile(file, {
  organizationId: 'org-id',
  projectId: 'project-id', // optionnel
  folder: 'videos',
  isPublic: false
});

// URL signée pour accès privé
const signedUrl = await StorageService.getSignedUrl(result.path, 3600);
```

### Composant d'upload
```tsx
'use client';

import { useState } from 'react';
import { StorageService } from '@/lib/supabase/services/storage';
import { useAuth } from '@/lib/auth/auth-context';

export function FileUpload() {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!profile?.organizations?.id) return;
    
    setUploading(true);
    try {
      const result = await StorageService.uploadFile(file, {
        organizationId: profile.organizations.id,
        folder: 'assets',
        isPublic: false
      });
      
      console.log('File uploaded:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
      }}
      disabled={uploading}
    />
  );
}
```

## 🔄 Temps réel

### Subscribe aux changements
```typescript
import { supabase } from '@/lib/supabase/client';

// Écouter les nouveaux assets
supabase
  .channel('assets-changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'assets',
    filter: `organization_id=eq.${orgId}`
  }, (payload) => {
    console.log('New asset:', payload.new);
  })
  .subscribe();
```

## 🧪 Tests et validation

### Tests des policies RLS
```bash
# Test avec différents utilisateurs
psql -h localhost -p 54322 -U postgres -d postgres

-- Se connecter en tant qu'utilisateur test
SET request.jwt.claims TO '{"sub": "test-user-id"}';

-- Tester les accès
SELECT * FROM assets; -- Doit retourner uniquement les assets de l'utilisateur
```

### Tests d'intégration
```typescript
// tests/auth.test.ts
import { authService } from '@/lib/supabase/auth';

describe('Authentication', () => {
  it('should create user and organization on signup', async () => {
    const result = await authService.signUp({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });
});
```

## 📊 Monitoring et Performance

### Indices optimisés
```sql
-- Performances requêtes courantes
CREATE INDEX idx_assets_org_user_status ON assets(organization_id, user_id, status);
CREATE INDEX idx_jobs_org_status_created ON jobs(organization_id, status, created_at);
```

### Requêtes optimisées
```typescript
// Pagination efficace
const { data: assets } = await supabase
  .from('assets')
  .select('id, filename, created_at, status')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .range(0, 19); // Limite à 20 résultats
```

## 🚚 Déploiement

### 1. Configuration Production
```bash
# Variables production
NEXT_PUBLIC_SUPABASE_URL="https://prod-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ-prod-key..."
SUPABASE_SERVICE_ROLE_KEY="eyJ-prod-service-key..."
```

### 2. Migrations Production
```bash
# Appliquer les migrations sur production
supabase db push --db-url "postgresql://postgres:[password]@prod-db.supabase.co:5432/postgres"
```

### 3. Storage Buckets
1. Configurer les buckets en production
2. Définir les policies de storage
3. Configurer CDN si nécessaire

## 🔧 Scripts utiles

```bash
# Développement local
npm run supabase:start     # Démarrer Supabase local
npm run supabase:studio    # Interface admin
npm run supabase:reset     # Reset DB + seed

# Types et migrations  
npm run supabase:types     # Générer types TypeScript
npm run supabase:migrate   # Appliquer migrations

# Tests
npm test                   # Tests unitaires
npm run test:e2e          # Tests end-to-end

# Production
npm run build             # Build optimisé
```

## 🐛 Troubleshooting

### Erreurs courantes

#### "Invalid JWT"
```bash
# Vérifier la configuration
echo $SUPABASE_JWT_SECRET
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### "RLS policy violation"
```sql
-- Vérifier les policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

#### "Storage access denied"
```sql
-- Vérifier les policies storage
SELECT * FROM storage.policies;
```

### Debug avec logs
```typescript
// Activer les logs Supabase
const supabase = createClient(url, key, {
  auth: { debug: true },
  db: { schema: 'public' },
  global: { headers: { 'x-debug': 'true' } }
});
```

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Real-time Guide](https://supabase.com/docs/guides/realtime)

## ✅ Checklist Production

- [ ] Variables d'environnement configurées
- [ ] Migrations appliquées en production
- [ ] Storage buckets créés avec bonnes policies
- [ ] OAuth providers configurés
- [ ] RLS policies testées
- [ ] Types TypeScript générés
- [ ] Tests unitaires passent
- [ ] Tests d'intégration passent
- [ ] Monitoring configuré
- [ ] Backup automatique activé

## 🎯 Prochaines étapes (optionnel)

- 📧 **Emails transactionnels** avec Supabase Edge Functions
- 📊 **Analytics avancées** avec PostHog + Supabase
- 🔐 **2FA** avec TOTP
- 📱 **Mobile app** avec React Native + Supabase
- 🤖 **Webhooks** pour intégrations externes