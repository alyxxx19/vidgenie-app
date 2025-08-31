# 🚨 Configuration Manuelle Requise - Supabase Dashboard

## ⚠️ Actions à Effectuer dans le Dashboard Supabase

Les migrations SQL nécessitent un accès administrateur au Dashboard Supabase. Voici les étapes à suivre :

### 📍 Accès au SQL Editor

1. **Connectez-vous** à https://supabase.com/dashboard
2. **Sélectionnez** votre projet : `elsrrybullbvyjhkyuzr`
3. **Cliquez** sur **SQL Editor** dans la sidebar gauche
4. **Cliquez** sur **+ New query**

### 📝 Migrations à Appliquer (Dans l'Ordre)

#### 1️⃣ **Migration 001 - Row Level Security**

Copiez le contenu du fichier : `supabase/migrations/001_enable_rls.sql`

**Ce que ça fait :**
- ✅ Active RLS sur toutes les tables
- ✅ Crée les politiques de sécurité
- ✅ Isole les données par utilisateur

#### 2️⃣ **Migration 002 - Functions & Triggers**

Copiez le contenu du fichier : `supabase/migrations/002_functions_triggers.sql`

**Ce que ça fait :**
- ✅ Triggers pour `updatedAt` automatique
- ✅ Gestion automatique des crédits
- ✅ Tracking des événements
- ✅ Validation des données

#### 3️⃣ **Migration 003 - Storage Buckets**

Copiez le contenu du fichier : `supabase/migrations/003_storage_buckets.sql`

**Ce que ça fait :**
- ✅ Crée 4 buckets (assets, thumbnails, avatars, exports)
- ✅ Configure les permissions
- ✅ Définit les limites de taille

#### 4️⃣ **Migration 004 - Realtime & Analytics**

Copiez le contenu du fichier : `supabase/migrations/004_realtime.sql`

**Ce que ça fait :**
- ✅ Active Realtime sur jobs, assets, posts
- ✅ Crée les vues analytics
- ✅ Ajoute les index de performance

### ✅ Ce qui a DÉJÀ été configuré automatiquement

- ✅ **4 Plans de Subscription** (Free, Starter, Pro, Enterprise)
- ✅ **5 Templates de Prompts** publics
- ✅ **Structure Prisma** synchronisée
- ✅ **Données de test** créées

### 🔧 Configuration Additionnelle Optionnelle

#### Enable Realtime (Dashboard)
1. **Settings** → **Realtime**
2. Activez pour les tables : `jobs`, `assets`, `posts`, `credit_ledger`

#### Storage Configuration (Dashboard)
1. **Storage** → **Policies**
2. Vérifiez que les buckets sont créés
3. Les politiques RLS devraient être appliquées automatiquement

#### Email Templates (Auth)
1. **Authentication** → **Email Templates**
2. Personnalisez les emails en français si nécessaire

### 📊 Vérification

Après avoir appliqué les migrations, testez avec ces requêtes SQL :

```sql
-- Vérifier RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Vérifier les triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Vérifier les buckets
SELECT * FROM storage.buckets;

-- Vérifier les plans
SELECT * FROM plans;
```

### 🆘 En cas de problème

1. **Erreur "already exists"** → C'est normal, l'élément existe déjà
2. **Erreur de permission** → Utilisez le service_role_key
3. **Table non trouvée** → Vérifiez que Prisma a bien synchronisé

### 📞 Support

- **Dashboard** : https://supabase.com/dashboard/project/elsrrybullbvyjhkyuzr
- **Logs** : Dashboard → Logs → Recent Queries
- **Monitoring** : Dashboard → Reports

## 🎯 Résultat Attendu

Après configuration complète :

- ✅ Toutes les tables protégées par RLS
- ✅ Triggers automatiques fonctionnels
- ✅ 4 Storage buckets disponibles
- ✅ Realtime activé pour les jobs
- ✅ Analytics views créées
- ✅ Performance optimisée avec indexes

---

**Note** : Les migrations sont idempotentes, vous pouvez les réexécuter sans risque.