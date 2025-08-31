# Configuration Supabase pour Vidgenie

## Étapes de configuration

### 1. Récupérer le mot de passe de la base de données

1. Aller sur https://supabase.com/dashboard/project/bnnhdbapoqlkgijderkh
2. Settings → Database → Connection string
3. Copier le mot de passe de la base de données

### 2. Mettre à jour .env.local

Remplacer `[YOUR_PASSWORD]` dans le DATABASE_URL par votre mot de passe:

```bash
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.bnnhdbapoqlkgijderkh.supabase.co:5432/postgres"
```

### 3. Appliquer le schema

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer le schema à Supabase
npm run db:push

# Populer les données de test
npm run db:seed
```

### 4. Vérifier la connexion

```bash
# Ouvrir Prisma Studio
npm run db:studio
```

## Structure des tables créées

Les tables suivantes seront créées dans Supabase:

- `User` - Utilisateurs avec crédits et plans
- `Plan` - Plans d'abonnement (Gratuit, Starter, Pro, Enterprise)
- `Project` - Projets de contenu
- `Job` - Jobs de génération IA
- `Asset` - Médias générés
- `Post` - Publications sur plateformes
- `Prompt` - Prompts sauvegardés et templates
- `CreditLedger` - Historique des transactions
- `UsageEvent` - Analytics et KPIs

## Données de test

Le script seed créera:
- 4 plans d'abonnement
- 5 templates de prompts
- 1 utilisateur test: `test@example.com`
- Contenu de démonstration

## Support

Si vous rencontrez des problèmes:
1. Vérifiez que le mot de passe est correct
2. Vérifiez que l'IP est autorisée dans Supabase
3. Consultez les logs Supabase Dashboard