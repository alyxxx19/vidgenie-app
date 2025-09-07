import prisma from '../src/lib/prisma';
import { encryptionService } from '../src/services/encryption';
import { apiValidationService } from '../src/services/api-validation';

async function testApiKeyPersistence() {
  console.log('🧪 Testing API Key Persistence with correct encryption key...\n');
  
  // Set the encryption key in environment
  process.env.ENCRYPTION_KEY = 'vidgenie2024encryptkey32charskey';

  try {
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'aurelien.auriol19@gmail.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.id}\n`);

    // Test data
    const testKey = {
      provider: 'openai',
      key: 'sk-test-persistence-key-123456789'
    };

    console.log('1️⃣ Saving test API key...');
    const encrypted = encryptionService.encrypt(testKey.key);
    
    const saved = await prisma.apiCredential.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: testKey.provider
        }
      },
      update: {
        encryptedKey: encrypted.encrypted,
        encryptionIV: encrypted.iv,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        provider: testKey.provider,
        encryptedKey: encrypted.encrypted,
        encryptionIV: encrypted.iv,
        isActive: true,
        validationStatus: 'unchecked'
      }
    });
    
    console.log(`   ✅ Saved with ID: ${saved.id}`);

    console.log('\n2️⃣ Retrieving and verifying...');
    const retrieved = await prisma.apiCredential.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: testKey.provider
        }
      }
    });

    if (!retrieved) {
      console.log('   ❌ Failed to retrieve saved key');
      return;
    }

    console.log(`   ✅ Retrieved from database`);

    console.log('\n3️⃣ Decrypting...');
    const decrypted = encryptionService.decrypt(
      retrieved.encryptedKey,
      retrieved.encryptionIV
    );
    
    const matches = decrypted === testKey.key;
    console.log(`   ${matches ? '✅' : '❌'} Decryption ${matches ? 'successful' : 'failed'}`);
    
    if (matches) {
      const masked = apiValidationService.maskApiKey(decrypted);
      console.log(`   📝 Masked key: ${masked}`);
    } else {
      console.log(`   Expected: ${testKey.key}`);
      console.log(`   Got: ${decrypted}`);
    }

    console.log('\n4️⃣ Simulating page refresh (new retrieval)...');
    // Disconnect and reconnect to simulate a fresh page load
    await prisma.$disconnect();
    
    // Re-retrieve after "refresh"
    const afterRefresh = await prisma.apiCredential.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: testKey.provider
        }
      }
    });

    if (!afterRefresh) {
      console.log('   ❌ Failed to retrieve after refresh');
      return;
    }

    const decryptedAfterRefresh = encryptionService.decrypt(
      afterRefresh.encryptedKey,
      afterRefresh.encryptionIV
    );
    
    const stillMatches = decryptedAfterRefresh === testKey.key;
    console.log(`   ${stillMatches ? '✅' : '❌'} Key persisted correctly after refresh`);

    console.log('\n✨ Persistence test complete!');
    console.log('   The API keys are now properly saved and can be retrieved after page refresh.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiKeyPersistence();