#!/usr/bin/env tsx

/**
 * Script pour créer automatiquement les produits et prix Stripe
 * Usage: npm run stripe:setup ou tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

interface PlanConfig {
  name: string;
  description: string;
  monthlyPrice: number; // en centimes
  yearlyPrice: number;  // en centimes
  features: string[];
  credits: number;
  storage: number;
}

const PLANS: Record<string, PlanConfig> = {
  STARTER: {
    name: 'VidGenie Starter',
    description: 'Idéal pour les créateurs individuels qui démarrent',
    monthlyPrice: 1900, // 19€
    yearlyPrice: 19000, // 190€ (économie de 17%)
    features: [
      'Génération HD',
      '1000 crédits/mois',
      '10GB stockage',
      'Support email',
      'Tous les templates',
      'Pas de filigrane',
    ],
    credits: 1000,
    storage: 10,
  },
  PRO: {
    name: 'VidGenie Pro',
    description: 'Pour les professionnels et créateurs expérimentés',
    monthlyPrice: 4900, // 49€
    yearlyPrice: 49000, // 490€ (économie de 17%)
    features: [
      'Génération 4K',
      '5000 crédits/mois',
      '100GB stockage',
      'Support prioritaire',
      'Templates premium',
      'Accès API',
      'Branding personnalisé',
      'Analytics avancées',
    ],
    credits: 5000,
    storage: 100,
  },
  ENTERPRISE: {
    name: 'VidGenie Enterprise',
    description: 'Pour les équipes et organisations',
    monthlyPrice: 9900, // 99€
    yearlyPrice: 99000, // 990€ (économie de 17%)
    features: [
      'Solutions vidéo sur mesure',
      '15000+ crédits/mois',
      '500GB+ stockage',
      'Support dédié 24/7',
      'SLA garanti',
      'Options white label',
      'Intégrations personnalisées',
      'Gestion d\'équipe avancée',
      'Facturation centralisée',
    ],
    credits: 15000,
    storage: 500,
  },
};

async function createStripeProducts() {
  console.log('🚀 Configuration des produits Stripe pour VidGenie...\n');
  
  const results: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId: string }> = {};

  for (const [planKey, planConfig] of Object.entries(PLANS)) {
    console.log(`📦 Création du produit: ${planConfig.name}`);
    
    try {
      // 1. Créer le produit
      const product = await stripe.products.create({
        name: planConfig.name,
        description: planConfig.description,
        metadata: {
          planKey: planKey.toLowerCase(),
          credits: planConfig.credits.toString(),
          storage: planConfig.storage.toString(),
          features: planConfig.features.join('|'),
        },
        images: [], // Vous pouvez ajouter des images de produit ici
        url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      });

      console.log(`  ✅ Produit créé: ${product.id}`);

      // 2. Créer le prix mensuel
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        currency: 'eur',
        unit_amount: planConfig.monthlyPrice,
        recurring: {
          interval: 'month',
        },
        metadata: {
          planKey: planKey.toLowerCase(),
          interval: 'monthly',
        },
      });

      console.log(`  ✅ Prix mensuel créé: ${monthlyPrice.id} (${planConfig.monthlyPrice / 100}€/mois)`);

      // 3. Créer le prix annuel
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        currency: 'eur',
        unit_amount: planConfig.yearlyPrice,
        recurring: {
          interval: 'year',
        },
        metadata: {
          planKey: planKey.toLowerCase(),
          interval: 'yearly',
        },
      });

      console.log(`  ✅ Prix annuel créé: ${yearlyPrice.id} (${planConfig.yearlyPrice / 100}€/an)`);

      results[planKey] = {
        productId: product.id,
        monthlyPriceId: monthlyPrice.id,
        yearlyPriceId: yearlyPrice.id,
      };

      console.log(`  🎉 ${planConfig.name} configuré avec succès!\n`);

    } catch (error) {
      console.error(`  ❌ Erreur lors de la création de ${planConfig.name}:`, error);
      continue;
    }
  }

  return results;
}

async function updateEnvFile(results: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId: string }>) {
  console.log('📝 Mise à jour du fichier .env.local...');
  
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.log('  📄 Création d\'un nouveau fichier .env.local');
  }

  // Préparer les nouvelles variables
  const newVars: Record<string, string> = {};
  
  for (const [planKey, ids] of Object.entries(results)) {
    newVars[`STRIPE_${planKey}_PRODUCT_ID`] = ids.productId;
    newVars[`STRIPE_${planKey}_MONTHLY_PRICE_ID`] = ids.monthlyPriceId;
    newVars[`STRIPE_${planKey}_YEARLY_PRICE_ID`] = ids.yearlyPriceId;
  }

  // Mettre à jour ou ajouter les variables
  for (const [key, value] of Object.entries(newVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
      console.log(`  ✅ Mis à jour: ${key}`);
    } else {
      envContent += `\n${key}="${value}"`;
      console.log(`  ➕ Ajouté: ${key}`);
    }
  }

  // Sauvegarder le fichier
  fs.writeFileSync(envPath, envContent);
  console.log('  💾 Fichier .env.local mis à jour!\n');
}

async function listExistingProducts() {
  console.log('📋 Vérification des produits existants...\n');
  
  try {
    const products = await stripe.products.list({ limit: 100 });
    const vidgenieProducts = products.data.filter(p => 
      p.name.toLowerCase().includes('vidgenie') || 
      p.metadata.planKey
    );

    if (vidgenieProducts.length > 0) {
      console.log('🔍 Produits VidGenie existants trouvés:');
      for (const product of vidgenieProducts) {
        console.log(`  - ${product.name} (${product.id})`);
        
        // Lister les prix associés
        const prices = await stripe.prices.list({ product: product.id });
        for (const price of prices.data) {
          const amount = (price.unit_amount || 0) / 100;
          const interval = price.recurring?.interval || 'one-time';
          console.log(`    └─ ${price.id}: ${amount}€/${interval}`);
        }
      }
      
      console.log('\n⚠️  Des produits existent déjà. Voulez-vous continuer? (cela créera des doublons)');
      console.log('   Pour nettoyer les anciens produits, utilisez le Stripe Dashboard.\n');
    } else {
      console.log('✅ Aucun produit VidGenie existant trouvé.\n');
    }
  } catch (error) {
    console.warn('⚠️  Impossible de vérifier les produits existants:', error);
  }
}

async function setupWebhooks() {
  console.log('🔗 Configuration des webhooks recommandés...\n');
  
  const requiredEvents = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.created',
    'customer.updated',
  ];

  console.log('📌 Événements webhook requis pour VidGenie:');
  requiredEvents.forEach(event => console.log(`  - ${event}`));
  
  console.log('\n🛠️  Configurez ces webhooks dans votre Stripe Dashboard:');
  console.log('   1. Allez sur https://dashboard.stripe.com/webhooks');
  console.log('   2. Cliquez sur "Add endpoint"');
  console.log(`   3. URL: ${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhooks`);
  console.log('   4. Sélectionnez les événements listés ci-dessus');
  console.log('   5. Copiez le signing secret dans STRIPE_WEBHOOK_SECRET\n');
}

async function main() {
  try {
    console.log('🎯 VidGenie Stripe Setup\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Stripe Mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST'}\n`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY non configurée dans .env.local');
      process.exit(1);
    }

    // Vérifier les produits existants
    await listExistingProducts();

    // Créer les produits et prix
    const results = await createStripeProducts();

    // Mettre à jour .env.local
    await updateEnvFile(results);

    // Informations sur les webhooks
    await setupWebhooks();

    console.log('🎉 Configuration Stripe terminée avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Redémarrez votre serveur de développement');
    console.log('   2. Configurez les webhooks dans Stripe Dashboard');
    console.log('   3. Testez le flow d\'abonnement sur /pricing');
    console.log('   4. Vérifiez l\'attribution des crédits');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

// Fonction pour nettoyer les anciens produits (optionnel)
async function cleanupProducts() {
  console.log('🧹 Nettoyage des anciens produits VidGenie...');
  
  const products = await stripe.products.list({ limit: 100 });
  const vidgenieProducts = products.data.filter(p => 
    p.name.toLowerCase().includes('vidgenie') || 
    p.metadata.planKey
  );

  for (const product of vidgenieProducts) {
    try {
      await stripe.products.update(product.id, { active: false });
      console.log(`  ✅ Désactivé: ${product.name}`);
    } catch (error) {
      console.log(`  ❌ Erreur lors de la désactivation de ${product.name}:`, error);
    }
  }
}

// Gestion des arguments en ligne de commande
const args = process.argv.slice(2);
if (args.includes('--cleanup')) {
  cleanupProducts().catch(console.error);
} else {
  main().catch(console.error);
}