# Serveurs MCP VidGenie

Ce dossier contient les serveurs Model Context Protocol (MCP) spécialement conçus pour le projet VidGenie.

## Serveurs disponibles

### 1. 🗄️ Filesystem Server (`filesystem-server.js`)
**Fonctionnalités :**
- Accès sécurisé aux fichiers du projet
- Lecture/écriture des fichiers source
- Listage des répertoires
- Création de nouveaux répertoires

**Chemins autorisés :**
- `/src` - Code source de l'application
- `/public` - Fichiers publics
- `/scripts` - Scripts de développement
- `/prisma` - Schémas de base de données

**Utilisation :**
```bash
npm run mcp:filesystem
```

### 2. 🗃️ Database Server (`database-server.js`) 
**Fonctionnalités :**
- Requêtes prédéfinies sur Prisma/Supabase
- Données dashboard utilisateur
- Statistiques d'administration
- Vérification des crédits utilisateur

**Requêtes disponibles :**
- `get_user` - Informations utilisateur
- `get_user_credits` - Solde de crédits
- `get_user_jobs` - Historique des générations
- `get_generation_stats` - Statistiques de génération

**Utilisation :**
```bash
npm run mcp:database
```

### 3. 🔌 API Integration Server (`api-integration-server.js`)
**Fonctionnalités :**
- Interface avec OpenAI (amélioration de prompts)
- Interface avec Stripe (clients, produits)
- Vérification de santé des services
- Statistiques d'usage des APIs

**Services intégrés :**
- OpenAI (GPT-4o, DALL-E 3, gpt-image-1)
- Stripe (paiements, abonnements)
- Supabase (authentification)
- Fal.ai & Replicate (génération vidéo)

**Utilisation :**
```bash
npm run mcp:api
```

### 4. 🔍 MCP Inspector
**Utilisation :**
```bash
npm run mcp:inspector
```

## Configuration

Le fichier `mcp-config.json` contient la configuration complète pour Claude Code :

```json
{
  "mcpServers": {
    "vidgenie-filesystem": { ... },
    "vidgenie-database": { ... },
    "vidgenie-api": { ... }
  }
}
```

## Sécurité

- **Filesystem Server** : Accès limité aux dossiers autorisés
- **Database Server** : Requêtes prédéfinies uniquement (pas de SQL arbitraire)
- **API Server** : Clés API chargées depuis l'environnement

## Variables d'environnement requises

```bash
# Base de données
DATABASE_URL="prisma+postgres://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="..."

# APIs externes
OPENAI_API_KEY="sk-..."
STRIPE_SECRET_KEY="sk_test_..."
FAL_KEY="..."
REPLICATE_API_TOKEN="..."
```

## Exemples d'utilisation

### Améliorer un prompt avec OpenAI
```json
{
  "tool": "enhance_prompt",
  "args": {
    "prompt": "Une belle montagne",
    "style": "cinématographique"
  }
}
```

### Vérifier les crédits d'un utilisateur
```json
{
  "tool": "check_user_credits", 
  "args": {
    "userId": "user-123"
  }
}
```

### Lire un fichier du projet
```json
{
  "tool": "read_file",
  "args": {
    "path": "/Users/alyx19/Desktop/ccc/vidgenie-app/src/app/page.tsx"
  }
}
```

## Dépannage

1. **Erreur de connexion** : Vérifiez les variables d'environnement
2. **Accès refusé** : Vérifiez que le chemin est dans les chemins autorisés
3. **Erreur API** : Vérifiez la validité des clés API

## Architecture MCP

```
Claude Code
    ↓
MCP Protocol
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  Filesystem     │   Database      │   API Services  │
│    Server       │    Server       │     Server      │
├─────────────────┼─────────────────┼─────────────────┤
│ • read_file     │ • query_db      │ • enhance_prompt│
│ • write_file    │ • get_stats     │ • stripe_info   │
│ • list_dir      │ • check_credits │ • health_check  │
│ • create_dir    │ • dashboard     │ • usage_stats   │
└─────────────────┴─────────────────┴─────────────────┘
```

## Intégration avec Claude Code

Pour utiliser ces serveurs avec Claude Code, copiez le contenu de `mcp-config.json` dans votre configuration Claude Code.

Les serveurs MCP permettent à Claude d'avoir un accès structuré et sécurisé aux données et services de VidGenie sans exposer directement les APIs ou la base de données.