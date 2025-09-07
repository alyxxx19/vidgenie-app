import prisma from '../src/lib/prisma';
import { encryptionService as oldService } from '../src/services/encryption';
import { enhancedEncryptionService as newService, EnhancedEncryptionService } from '../src/services/enhanced-encryption';

/**
 * Script de migration pour passer de l'ancien système d'encryption AES-256-CBC
 * vers le nouveau système AES-256-GCM avec authentification intégrée
 */
async function migrateEncryption() {
  console.log('🔄 Starting encryption migration...\n');

  if (!newService) {
    console.error('❌ Enhanced encryption service not available');
    process.exit(1);
  }

  try {
    // Récupération de toutes les clés API existantes
    console.log('📋 Fetching existing API credentials...');
    const credentials = await prisma.apiCredential.findMany({
      where: {
        isActive: true
      }
    });

    console.log(`📊 Found ${credentials.length} API credentials to migrate\n`);

    let migrated = 0;
    let failed = 0;

    for (const credential of credentials) {
      try {
        console.log(`🔑 Migrating credential ID: ${credential.id} (${credential.provider})`);

        // Étape 1: Déchiffrer avec l'ancien service
        let plaintext: string;
        try {
          plaintext = oldService.decrypt(credential.encryptedKey, credential.encryptionIV);
          console.log(`   ✅ Successfully decrypted with old service`);
        } catch (error) {
          console.log(`   ❌ Failed to decrypt with old service:`, error instanceof Error ? error.message : 'Unknown error');
          failed++;
          continue;
        }

        // Étape 2: Chiffrer avec le nouveau service
        let newEncrypted: { encrypted: string; iv: string; tag: string };
        try {
          newEncrypted = newService.encrypt(plaintext, `user_${credential.userId}_${credential.provider}`);
          console.log(`   ✅ Successfully encrypted with new service`);
        } catch (error) {
          console.log(`   ❌ Failed to encrypt with new service:`, error instanceof Error ? error.message : 'Unknown error');
          failed++;
          continue;
        }

        // Étape 3: Vérifier le round-trip
        try {
          const decrypted = newService.decrypt(
            newEncrypted.encrypted, 
            newEncrypted.iv, 
            newEncrypted.tag,
            `user_${credential.userId}_${credential.provider}`
          );
          
          if (decrypted !== plaintext) {
            throw new Error('Round-trip validation failed');
          }
          console.log(`   ✅ Round-trip validation passed`);
        } catch (error) {
          console.log(`   ❌ Round-trip validation failed:`, error instanceof Error ? error.message : 'Unknown error');
          failed++;
          continue;
        }

        // Étape 4: Sauvegarder dans la base de données avec nouveau format
        try {
          // Combiner encrypted + tag pour la compatibilité
          const combinedEncrypted = newEncrypted.encrypted + ':' + newEncrypted.tag;
          
          await prisma.apiCredential.update({
            where: { id: credential.id },
            data: {
              encryptedKey: combinedEncrypted,
              encryptionIV: newEncrypted.iv,
              updatedAt: new Date()
            }
          });
          
          console.log(`   ✅ Database updated successfully`);
          migrated++;
        } catch (error) {
          console.log(`   ❌ Database update failed:`, error instanceof Error ? error.message : 'Unknown error');
          failed++;
          continue;
        }

        console.log(`   🎉 Migration completed for credential ${credential.id}\n`);

      } catch (error) {
        console.error(`❌ Unexpected error migrating credential ${credential.id}:`, error);
        failed++;
      }
    }

    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success rate: ${credentials.length > 0 ? Math.round((migrated / credentials.length) * 100) : 0}%`);

    if (failed > 0) {
      console.log('\n⚠️  Some credentials failed to migrate. Check the logs above for details.');
      console.log('   These credentials will continue to work with the old encryption service.');
    }

    if (migrated > 0) {
      console.log('\n🔄 To complete the migration:');
      console.log('   1. Update your encryption service imports to use enhanced-encryption');
      console.log('   2. Test the application thoroughly');
      console.log('   3. Remove the old encryption service once confident');
    }

    console.log('\n✨ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed with unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Fonction de rollback en cas de problème
 */
async function rollbackEncryption() {
  console.log('🔄 Starting encryption rollback...\n');
  
  // Cette fonction pourrait restaurer les anciennes données si nécessaire
  // Pour l'instant, on log juste un avertissement
  console.log('⚠️  Rollback not implemented yet.');
  console.log('   In case of issues, restore from backup or manually revert changes.');
}

/**
 * Fonction de validation pour vérifier que toutes les clés sont accessibles
 */
async function validateMigration() {
  console.log('🔍 Validating migration...\n');

  if (!newService) {
    console.error('❌ Enhanced encryption service not available');
    return false;
  }

  try {
    const credentials = await prisma.apiCredential.findMany({
      where: { isActive: true }
    });

    console.log(`📊 Validating ${credentials.length} credentials...\n`);

    let valid = 0;
    let invalid = 0;

    for (const credential of credentials) {
      try {
        // Essayer de déchiffrer avec le nouveau format
        const parts = credential.encryptedKey.split(':');
        if (parts.length !== 2) {
          console.log(`❌ Invalid format for credential ${credential.id}`);
          invalid++;
          continue;
        }

        const decrypted = newService.decrypt(
          parts[0], 
          credential.encryptionIV, 
          parts[1],
          `user_${credential.userId}_${credential.provider}`
        );

        if (decrypted && decrypted.length > 0) {
          console.log(`✅ Credential ${credential.id} (${credential.provider}) - Valid`);
          valid++;
        } else {
          console.log(`❌ Credential ${credential.id} (${credential.provider}) - Empty result`);
          invalid++;
        }

      } catch (error) {
        console.log(`❌ Credential ${credential.id} (${credential.provider}) - ${error instanceof Error ? error.message : 'Unknown error'}`);
        invalid++;
      }
    }

    console.log('\n📊 Validation Summary:');
    console.log(`   ✅ Valid: ${valid}`);
    console.log(`   ❌ Invalid: ${invalid}`);
    console.log(`   📈 Success rate: ${credentials.length > 0 ? Math.round((valid / credentials.length) * 100) : 0}%`);

    return invalid === 0;

  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    migrateEncryption();
    break;
  case 'validate':
    validateMigration();
    break;
  case 'rollback':
    rollbackEncryption();
    break;
  default:
    console.log('Usage: npx tsx scripts/migrate-encryption.ts [migrate|validate|rollback]');
    console.log('');
    console.log('Commands:');
    console.log('  migrate   - Migrate existing API keys to enhanced encryption');
    console.log('  validate  - Validate all API keys can be decrypted');
    console.log('  rollback  - Rollback to previous encryption (not implemented)');
    process.exit(1);
}