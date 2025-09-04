#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function updateFreeUsersCredits() {
  console.log('🔄 Mise à jour des crédits pour les utilisateurs gratuits...\n');

  try {
    // Trouver tous les utilisateurs avec le plan gratuit qui ont moins de 100 crédits
    const freeUsersWithLowCredits = await db.user.findMany({
      where: {
        planId: 'free',
        creditsBalance: { lt: 100 },
      },
      select: {
        id: true,
        email: true,
        name: true,
        creditsBalance: true,
        createdAt: true,
      },
    });

    if (freeUsersWithLowCredits.length === 0) {
      console.log('✅ Tous les utilisateurs gratuits ont déjà au moins 100 crédits.');
      return;
    }

    console.log(`📊 Trouvé ${freeUsersWithLowCredits.length} utilisateur(s) gratuit(s) avec moins de 100 crédits:\n`);

    // Afficher les utilisateurs qui vont être mis à jour
    for (const user of freeUsersWithLowCredits) {
      console.log(`   • ${user.name || 'Sans nom'} (${user.email}): ${user.creditsBalance} crédits → 100 crédits`);
    }

    console.log('\n🔄 Mise à jour en cours...\n');

    // Mettre à jour tous les utilisateurs gratuits pour qu'ils aient 100 crédits
    const updateResult = await db.user.updateMany({
      where: {
        planId: 'free',
        creditsBalance: { lt: 100 },
      },
      data: {
        creditsBalance: 100,
      },
    });

    console.log(`✅ ${updateResult.count} utilisateur(s) mis à jour avec succès.`);

    // Créer une entrée dans le ledger pour chaque utilisateur mis à jour
    for (const user of freeUsersWithLowCredits) {
      const creditsAdded = 100 - user.creditsBalance;
      
      if (creditsAdded > 0) {
        await db.creditLedger.create({
          data: {
            userId: user.id,
            amount: creditsAdded,
            type: 'bonus',
            description: 'Mise à jour des crédits gratuits - 100 crédits minimum',
          },
        });

        console.log(`   💰 ${creditsAdded} crédits ajoutés pour ${user.email}`);
      }
    }

    console.log('\n🎉 Mise à jour terminée avec succès!');

    // Statistiques finales
    const finalStats = await db.user.aggregate({
      where: { planId: 'free' },
      _count: { id: true },
      _min: { creditsBalance: true },
      _max: { creditsBalance: true },
      _avg: { creditsBalance: true },
    });

    console.log('\n📈 Statistiques finales des utilisateurs gratuits:');
    console.log(`   • Total: ${finalStats._count.id} utilisateurs`);
    console.log(`   • Crédits minimum: ${finalStats._min.creditsBalance}`);
    console.log(`   • Crédits maximum: ${finalStats._max.creditsBalance}`);
    console.log(`   • Crédits moyen: ${Math.round(finalStats._avg.creditsBalance || 0)}`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Fonction pour vérifier les utilisateurs gratuits
async function checkFreeUsersCredits() {
  console.log('🔍 Vérification des crédits des utilisateurs gratuits...\n');

  try {
    const stats = await db.user.aggregate({
      where: { planId: 'free' },
      _count: { id: true },
      _min: { creditsBalance: true },
      _max: { creditsBalance: true },
      _avg: { creditsBalance: true },
    });

    const usersWithLowCredits = await db.user.count({
      where: {
        planId: 'free',
        creditsBalance: { lt: 100 },
      },
    });

    console.log('📊 Statistiques actuelles des utilisateurs gratuits:');
    console.log(`   • Total: ${stats._count.id} utilisateurs`);
    console.log(`   • Crédits minimum: ${stats._min.creditsBalance}`);
    console.log(`   • Crédits maximum: ${stats._max.creditsBalance}`);
    console.log(`   • Crédits moyen: ${Math.round(stats._avg.creditsBalance || 0)}`);
    console.log(`   • Utilisateurs avec < 100 crédits: ${usersWithLowCredits}`);

    if (usersWithLowCredits > 0) {
      console.log(`\n⚠️  ${usersWithLowCredits} utilisateur(s) ont moins de 100 crédits.`);
      console.log('   Exécutez ce script avec le flag --update pour les corriger.');
    } else {
      console.log('\n✅ Tous les utilisateurs gratuits ont au moins 100 crédits.');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Fonction principale
async function main() {
  const shouldUpdate = process.argv.includes('--update') || process.argv.includes('-u');
  
  if (shouldUpdate) {
    await updateFreeUsersCredits();
  } else {
    await checkFreeUsersCredits();
    console.log('\n💡 Pour mettre à jour les utilisateurs, utilisez: npm run script scripts/update-free-users-credits.ts --update');
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erreur du script:', error);
      process.exit(1);
    });
}

export { main, updateFreeUsersCredits, checkFreeUsersCredits };