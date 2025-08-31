# 📚 Configuration Complète Supabase

## 🔧 Architecture de Base de Données

### Tables Principales

1. **users** - Utilisateurs et profils
   - Gestion des crédits
   - Intégration Stripe
   - Préférences utilisateur

2. **projects** - Organisation du contenu
   - Groupement des assets et posts
   - Projet par défaut créé automatiquement

3. **jobs** - File d'attente des tâches
   - Génération de vidéos
   - Publication sur réseaux sociaux
   - Suivi en temps réel

4. **assets** - Médias générés
   - Vidéos, images, audio
   - Stockage S3 intégré
   - Métadonnées IA

5. **posts** - Publications sociales
   - Multi-plateforme
   - Planification
   - Analytics

## 🔒 Sécurité (RLS)

### Row Level Security Activée

Toutes les tables sont protégées par RLS:
- ✅ Les utilisateurs ne voient que leurs propres données
- ✅ Protection contre les accès non autorisés
- ✅ Isolation complète entre utilisateurs

### Politiques Appliquées

```sql
-- Exemple: Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);
```

## ⚡ Fonctions & Triggers

### Triggers Automatiques

1. **update_updated_at_column** - Met à jour automatiquement updatedAt
2. **update_user_credits_balance** - Synchronise le solde de crédits
3. **track_job_completion** - Enregistre les événements d'usage
4. **create_default_project** - Crée un projet par défaut pour les nouveaux utilisateurs

### Fonctions Utilitaires

```sql
-- Vérifier la limite quotidienne de génération
SELECT check_generation_limit('user_id');

-- Calculer l'usage de stockage
SELECT calculate_user_storage('user_id');

-- Obtenir les détails du plan
SELECT * FROM get_user_plan('user_id');
```

## 💾 Storage Buckets

### Buckets Configurés

| Bucket | Public | Limite | Usage |
|--------|--------|--------|-------|
| **assets** | Non | 500MB | Vidéos et médias générés |
| **thumbnails** | Oui | 5MB | Vignettes publiques |
| **avatars** | Oui | 2MB | Photos de profil |
| **exports** | Non | 1GB | Exports et archives |

### Politiques de Stockage

- Les utilisateurs ne peuvent accéder qu'à leurs propres fichiers
- Structure: `bucket/{userId}/{filename}`
- Thumbnails et avatars accessibles publiquement

## 🔄 Realtime

### Tables avec Realtime

- **jobs** - Suivi du progrès en temps réel
- **assets** - Notifications de création
- **posts** - Mises à jour de statut
- **credit_ledger** - Changements de solde

### Exemple d'utilisation

```typescript
// Écouter les mises à jour de jobs
const subscription = supabase
  .channel('job-progress')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'jobs',
    filter: `userId=eq.${userId}`
  }, (payload) => {
    console.log('Job updated:', payload);
  })
  .subscribe();
```

## 📊 Vues Analytics

### Vues Disponibles

1. **user_stats** - Statistiques utilisateur complètes
2. **daily_usage** - Usage quotidien par utilisateur
3. **platform_stats** - Performance par plateforme sociale

### Exemple de requête

```sql
-- Obtenir les stats d'un utilisateur
SELECT * FROM user_stats WHERE user_id = 'xxx';

-- Usage des 30 derniers jours
SELECT * FROM daily_usage 
WHERE "userId" = 'xxx' 
AND date >= CURRENT_DATE - INTERVAL '30 days';
```

## 🚀 Application des Migrations

### Méthode Automatique

```bash
# Exécuter le script d'installation
./scripts/apply-supabase-migrations.sh
```

### Méthode Manuelle (Dashboard Supabase)

1. Aller dans **SQL Editor**
2. Créer une nouvelle requête
3. Copier/coller chaque fichier de migration
4. Exécuter dans l'ordre:
   - 001_enable_rls.sql
   - 002_functions_triggers.sql
   - 003_storage_buckets.sql
   - 004_realtime.sql

## 🔍 Vérification

### Tester RLS

```sql
-- Devrait retourner true
SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users'
);
```

### Tester les Triggers

```sql
-- Créer un job et vérifier l'event
INSERT INTO jobs ("userId", type, status) 
VALUES ('test-user', 'generation', 'pending');

-- Vérifier l'event créé
SELECT * FROM usage_events 
WHERE "jobId" = (SELECT id FROM jobs ORDER BY "createdAt" DESC LIMIT 1);
```

### Tester Storage

```typescript
// Upload test
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);
```

## 📈 Monitoring

### Requêtes Utiles

```sql
-- Utilisateurs actifs aujourd'hui
SELECT COUNT(DISTINCT "userId") 
FROM jobs 
WHERE "createdAt" >= CURRENT_DATE;

-- Jobs en cours
SELECT * FROM jobs 
WHERE status IN ('pending', 'running');

-- Espace de stockage total
SELECT 
    SUM("fileSize") / 1024 / 1024 / 1024 as total_gb
FROM assets 
WHERE status = 'ready';
```

## 🛠️ Maintenance

### Nettoyage Périodique

```sql
-- Nettoyer les vieux jobs
DELETE FROM jobs 
WHERE status IN ('completed', 'failed') 
AND "createdAt" < CURRENT_DATE - INTERVAL '90 days';

-- Nettoyer les tokens expirés
SELECT cleanup_expired_social_tokens();
```

## 🔐 Variables d'Environnement

Assurez-vous que ces variables sont configurées:

```env
NEXT_PUBLIC_SUPABASE_URL=https://elsrrybullbvyjhkyuzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres:VidGenie2024!@db.elsrrybullbvyjhkyuzr.supabase.co:5432/postgres
```

## 📞 Support

Pour toute question sur la configuration Supabase:
1. Consultez la [documentation officielle](https://supabase.com/docs)
2. Vérifiez les logs dans le Dashboard Supabase
3. Utilisez l'onglet **Logs** pour déboguer les politiques RLS