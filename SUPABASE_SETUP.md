# Configuration Supabase - Vidgenie

## ⚠️ Action requise : Mot de passe de base de données

Pour finaliser la connexion à Supabase, vous devez récupérer votre mot de passe de base de données.

### Étapes pour récupérer le mot de passe:

1. **Connectez-vous à Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/bnnhdbapoqlkgijderkh

2. **Allez dans Settings → Database**
   - Dans la section "Connection string"
   - Cliquez sur "Reset database password" si vous ne l'avez pas noté
   - Ou utilisez le mot de passe que vous avez défini lors de la création du projet

3. **Mettez à jour le fichier `.env`**
   
   Remplacez `[YOUR_PASSWORD]` par votre vrai mot de passe dans les lignes suivantes:

   ```bash
   DATABASE_URL="postgresql://postgres.bnnhdbapoqlkgijderkh:[YOUR_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.bnnhdbapoqlkgijderkh.supabase.co:5432/postgres"
   ```

### Après avoir mis à jour le mot de passe:

```bash
# 1. Appliquer le schema à Supabase
npm run db:push

# 2. Vérifier que les tables sont créées
npm run db:studio

# 3. Populer avec les données de test
npm run db:seed

# 4. Démarrer l'application
npm run dev
```

### Vérification de la connexion

Si la connexion fonctionne, vous devriez voir:
- ✅ "Prisma schema synced" après `db:push`
- ✅ Prisma Studio s'ouvre avec vos tables
- ✅ Les données de test sont créées avec `db:seed`

### En cas de problème

1. **Erreur d'authentification**
   - Vérifiez que le mot de passe est correct
   - Essayez de réinitialiser le mot de passe depuis le Dashboard Supabase

2. **Erreur de connexion**
   - Vérifiez que votre IP est autorisée (Settings → Database → Connection pooling)
   - Désactivez temporairement le SSL si nécessaire

3. **Tables non créées**
   - Exécutez `npm run db:generate` avant `db:push`
   - Vérifiez les logs dans le Dashboard Supabase

## Informations de connexion actuelles

- **Project URL**: https://bnnhdbapoqlkgijderkh.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJubmhkYmFwb3Fsa2dpamRlcmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTA0ODcsImV4cCI6MjA3MjEyNjQ4N30.t72KIFgB4Jps8dAdnclDKZIFITL9tq1PJyP5QkQUcx8
- **Database Host**: db.bnnhdbapoqlkgijderkh.supabase.co
- **Pooler Host**: aws-0-eu-central-1.pooler.supabase.com

## Support

Pour plus d'aide:
- Documentation Supabase: https://supabase.com/docs
- Dashboard du projet: https://supabase.com/dashboard/project/bnnhdbapoqlkgijderkh