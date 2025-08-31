# 🚀 Configuration Stripe - VidGenie

## 📋 Vue d'ensemble

Cette intégration Stripe complète permet de gérer :
- ✅ Abonnements récurrents avec 4 plans (Free, Starter, Pro, Enterprise)
- ✅ Checkout sécurisé avec Stripe Elements
- ✅ Webhooks pour synchronisation en temps réel
- ✅ Portail client pour gestion des abonnements
- ✅ Historique des paiements et factures
- ✅ Gestion des échecs de paiement
- ✅ Crédits automatiques à chaque renouvellement

## 🔧 Configuration requise

### 1. Variables d'environnement

Ajoutez ces variables dans votre `.env.local` :

```bash
# Stripe (remplacez par vos vraies clés)
STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
STRIPE_PRICE_ID_STARTER="price_your-starter-plan-id"
STRIPE_PRICE_ID_PRO="price_your-pro-plan-id"
STRIPE_PRICE_ID_ENTERPRISE="price_your-enterprise-plan-id"
```

### 2. Configuration Stripe Dashboard

#### Créer les produits et prix :

1. **Plan Starter (19€/mois)**
   - Nom : "VidGenie Starter" 
   - Prix : 19€ récurrent mensuel
   - Copier le price_id dans `STRIPE_PRICE_ID_STARTER`

2. **Plan Pro (49€/mois)**
   - Nom : "VidGenie Pro"
   - Prix : 49€ récurrent mensuel
   - Copier le price_id dans `STRIPE_PRICE_ID_PRO`

3. **Plan Enterprise (99€/mois)**
   - Nom : "VidGenie Enterprise"
   - Prix : 99€ récurrent mensuel
   - Copier le price_id dans `STRIPE_PRICE_ID_ENTERPRISE`

#### Configurer les webhooks :

**URL endpoint** : `https://votre-domaine.com/api/stripe/webhooks`

**Événements à écouter** :
- `customer.created`
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Signature** : Copier le signing secret dans `STRIPE_WEBHOOK_SECRET`

## 🏗️ Architecture technique

### Base de données

**Nouveaux modèles ajoutés :**

```prisma
// Ajout au modèle User
stripeCustomerId       String? @unique
stripeSubscriptionId   String? @unique
stripeCurrentPeriodEnd DateTime?
stripePriceId          String?
stripePaymentMethodId  String?

// Nouveaux modèles
model StripeWebhook {
  // Tracking des webhooks pour éviter les doublons
}

model StripeCustomer {
  // Synchronisation des données client Stripe
}

model StripePayment {
  // Historique des paiements
}
```

### API Routes

**tRPC Router** : `/src/server/api/routers/stripe.ts`
- `createCheckoutSession` - Créer une session de paiement
- `createPortalSession` - Accès au portail client
- `getSubscription` - Récupérer l'abonnement actuel
- `cancelSubscription` - Annuler un abonnement
- `reactivateSubscription` - Réactiver un abonnement
- `getPaymentHistory` - Historique des paiements
- `getPlans` - Liste des plans disponibles

**Webhooks** : `/src/app/api/stripe/webhooks/route.ts`
- Validation des signatures Stripe
- Traitement des événements abonnements
- Synchronisation automatique des données
- Attribution automatique des crédits

### Pages créées

1. **`/pricing`** - Page des plans tarifaires
2. **`/account/billing`** - Gestion de facturation

### Intégration Dashboard

- ✅ Affichage du statut d'abonnement
- ✅ Lien vers la gestion de facturation  
- ✅ Prompt d'upgrade pour les utilisateurs gratuits

## 🧪 Tests en développement

### 1. Tester les checkouts

```bash
npm run dev
```

1. Aller sur `http://localhost:3001/pricing`
2. Cliquer sur "S'abonner" pour un plan
3. Utiliser les cartes de test Stripe :
   - **Succès** : `4242 4242 4242 4242`
   - **Échec** : `4000 0000 0000 0002`

### 2. Tester les webhooks

1. Installer Stripe CLI : `brew install stripe/stripe-cli/stripe`
2. Login : `stripe login`
3. Forward webhooks : `stripe listen --forward-to localhost:3001/api/stripe/webhooks`
4. Déclencher des événements test depuis le dashboard Stripe

### 3. Tester le portail client

1. S'abonner à un plan
2. Aller dans `/account/billing` 
3. Cliquer sur "Gérer l'abonnement"
4. Tester l'annulation/réactivation

## 🚀 Déploiement production

### 1. Remplacer les clés test par les clés live

```bash
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
```

### 2. Configurer webhooks production

- URL : `https://votre-domaine.com/api/stripe/webhooks`
- Utiliser le signing secret de production

### 3. Activer les plans dans Stripe

- S'assurer que tous les produits sont actifs
- Vérifier les price_ids en production

## 📊 Monitoring

### Webhooks
- Logs dans la table `stripe_webhooks`
- Monitoring des tentatives échouées
- Retry automatique des événements

### Paiements
- Historique complet dans `stripe_payments`
- Tracking des paiements échoués
- Notifications automatiques (à implémenter)

## 🔒 Sécurité

✅ **Validations mises en place :**
- Validation des signatures de webhooks
- Clés secrètes uniquement côté serveur
- Chiffrement des données sensibles
- Protection CSRF avec tRPC
- Validation des données avec Zod

## 🎯 Fonctionnalités bonus

### À implémenter (optionnel) :
- 📧 Emails de notification (paiements échoués, abonnements)
- 📊 Analytics avancées d'abonnements
- 🎁 Codes promo et réductions
- 👥 Gestion d'équipes (plan Enterprise)
- 📱 Facturation mobile optimisée

## 📞 Support

Pour toute question sur l'intégration Stripe :
1. Vérifier les logs de l'application
2. Consulter les événements dans le dashboard Stripe
3. Utiliser les cartes de test pour reproduire les problèmes

## 🧪 Commandes de test

```bash
# Développement
npm run dev

# Build et vérification
npm run build
npm run type-check

# Base de données
npx prisma studio  # Visualiser les données
npx prisma db push # Appliquer les changements de schéma
```