#!/usr/bin/env npx tsx

/**
 * Script pour ajouter des crédits à un utilisateur
 * Usage: npx tsx scripts/add-credits.ts <email> <amount> [description]
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const db = new PrismaClient();

interface AddCreditsOptions {
  email: string;
  amount: number;
  description?: string;
  interactive?: boolean;
}

async function addCreditsToUser({ email, amount, description = 'Crédits ajoutés manuellement' }: AddCreditsOptions) {
  console.log(`🔍 Recherche de l'utilisateur avec email: ${email}...`);
  
  // Trouver l'utilisateur
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      creditsBalance: true,
    }
  });

  if (!user) {
    console.error(`❌ Utilisateur non trouvé avec l'email: ${email}`);
    return;
  }

  console.log(`✅ Utilisateur trouvé:`);
  console.log(`   - Nom: ${user.name || 'Non défini'}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Crédits actuels: ${user.creditsBalance}`);
  console.log(`   - Crédits après ajout: ${user.creditsBalance + amount}`);
  console.log('');

  // Mettre à jour les crédits
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { 
      creditsBalance: { increment: amount }
    },
    select: {
      creditsBalance: true,
    }
  });

  // Ajouter une entrée dans le ledger
  await db.creditLedger.create({
    data: {
      userId: user.id,
      amount: amount,
      type: 'MANUAL_ADD',
      description: description,
    }
  });

  console.log(`✅ Succès! ${amount} crédits ajoutés.`);
  console.log(`   - Nouveau solde: ${updatedUser.creditsBalance} crédits`);
  console.log(`   - Entrée ajoutée dans le ledger: "${description}"`);
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function interactiveMode() {
  console.log('🎛️  Mode interactif - Ajout de crédits');
  console.log('=====================================');
  console.log('');

  const email = await promptUser('Email de l\'utilisateur: ');
  const amountStr = await promptUser('Nombre de crédits à ajouter: ');
  const description = await promptUser('Description (optionnelle): ');

  const amount = parseInt(amountStr);
  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Le nombre de crédits doit être un nombre positif');
    return;
  }

  console.log('');
  const confirm = await promptUser(`Confirmer l'ajout de ${amount} crédits à ${email}? (oui/non): `);
  
  if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o' && confirm.toLowerCase() !== 'yes') {
    console.log('❌ Opération annulée');
    return;
  }

  await addCreditsToUser({
    email,
    amount,
    description: description || undefined,
  });
}

async function listUsers() {
  console.log('📋 Liste des utilisateurs:');
  console.log('=========================');
  
  const users = await db.user.findMany({
    select: {
      email: true,
      name: true,
      creditsBalance: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (users.length === 0) {
    console.log('Aucun utilisateur trouvé.');
    return;
  }

  console.table(users.map(user => ({
    Email: user.email,
    Nom: user.name || 'Non défini',
    Crédits: user.creditsBalance,
    'Créé le': user.createdAt.toLocaleDateString('fr-FR')
  })));
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Afficher l'aide
    if (args.includes('--help') || args.includes('-h')) {
      console.log('📖 Aide - Script d\'ajout de crédits');
      console.log('====================================');
      console.log('');
      console.log('Usage:');
      console.log('  npx tsx scripts/add-credits.ts [email] [amount] [description]');
      console.log('  npx tsx scripts/add-credits.ts --interactive');
      console.log('  npx tsx scripts/add-credits.ts --list');
      console.log('');
      console.log('Exemples:');
      console.log('  npx tsx scripts/add-credits.ts user@example.com 1000');
      console.log('  npx tsx scripts/add-credits.ts user@example.com 500 "Bonus crédits"');
      console.log('  npx tsx scripts/add-credits.ts --interactive');
      console.log('  npx tsx scripts/add-credits.ts --list');
      return;
    }

    // Mode liste
    if (args.includes('--list') || args.includes('-l')) {
      await listUsers();
      return;
    }

    // Mode interactif
    if (args.includes('--interactive') || args.includes('-i') || args.length === 0) {
      await interactiveMode();
      return;
    }

    // Mode arguments directs
    const [email, amountStr, description] = args;

    if (!email || !amountStr) {
      console.error('❌ Email et montant requis');
      console.log('Utilisez --help pour voir les options disponibles');
      return;
    }

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Le nombre de crédits doit être un nombre positif');
      return;
    }

    await addCreditsToUser({
      email,
      amount,
      description,
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}