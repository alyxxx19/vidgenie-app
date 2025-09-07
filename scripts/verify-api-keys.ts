import prisma from '../src/lib/prisma';
import { encryptionService } from '../src/services/encryption';
import { apiValidationService } from '../src/services/api-validation';

async function verifyApiKeys() {
  try {
    console.log('🔍 Verifying API Keys for user: aurelien.auriol19@gmail.com\n');
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'aurelien.auriol19@gmail.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.id}\n`);

    // Get all API credentials for this user
    const credentials = await prisma.apiCredential.findMany({
      where: {
        userId: user.id,
        isActive: true
      }
    });

    console.log(`📦 Found ${credentials.length} active API key(s):\n`);

    for (const credential of credentials) {
      console.log(`Provider: ${credential.provider}`);
      console.log(`  - ID: ${credential.id}`);
      console.log(`  - Status: ${credential.validationStatus}`);
      console.log(`  - Last Validated: ${credential.lastValidated || 'Never'}`);
      console.log(`  - Created: ${credential.createdAt.toISOString()}`);
      console.log(`  - Updated: ${credential.updatedAt.toISOString()}`);
      
      try {
        // Decrypt the key
        const decryptedKey = encryptionService.decrypt(
          credential.encryptedKey,
          credential.encryptionIV
        );
        
        // Mask it for display
        const maskedKey = apiValidationService.maskApiKey(decryptedKey);
        console.log(`  - Masked Key: ${maskedKey}`);
        console.log(`  - Decryption: ✅ Success`);
      } catch (error) {
        console.log(`  - Decryption: ❌ Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      console.log('---');
    }

    console.log('\n✨ Verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyApiKeys();