import prisma from '../src/lib/prisma';
import { encryptionService } from '../src/services/encryption';

async function testApiKeys() {
  console.log('🔍 Testing API Keys Storage and Retrieval...\n');

  try {
    // Test user ID (you should replace this with a real user ID from your database)
    const testUserId = 'test-user-id'; // Replace with actual user ID
    
    // Test data
    const testKeys = [
      { provider: 'openai', key: 'sk-test-key-123456789' },
      { provider: 'nanobanana', key: 'nb_test_key_987654321' },
      { provider: 'veo3', key: 'fal_test_key_456789123' }
    ];

    console.log('1️⃣ Cleaning up existing test data...');
    await prisma.apiCredential.deleteMany({
      where: { userId: testUserId }
    });

    console.log('2️⃣ Saving test API keys...');
    for (const testKey of testKeys) {
      const encrypted = encryptionService.encrypt(testKey.key);
      
      const saved = await prisma.apiCredential.create({
        data: {
          userId: testUserId,
          provider: testKey.provider,
          encryptedKey: encrypted.encrypted,
          encryptionIV: encrypted.iv,
          isActive: true,
          validationStatus: 'unchecked'
        }
      });
      
      console.log(`   ✅ Saved ${testKey.provider}: ${saved.id}`);
    }

    console.log('\n3️⃣ Retrieving and decrypting keys...');
    const retrieved = await prisma.apiCredential.findMany({
      where: { userId: testUserId }
    });

    for (const credential of retrieved) {
      const decrypted = encryptionService.decrypt(
        credential.encryptedKey,
        credential.encryptionIV
      );
      
      const original = testKeys.find(k => k.provider === credential.provider);
      const matches = decrypted === original?.key;
      
      console.log(`   ${matches ? '✅' : '❌'} ${credential.provider}: ${matches ? 'Decryption successful' : 'Decryption failed'}`);
      
      if (!matches) {
        console.log(`      Expected: ${original?.key}`);
        console.log(`      Got: ${decrypted}`);
      }
    }

    console.log('\n4️⃣ Testing upsert (update existing)...');
    const updatedKey = 'sk-updated-test-key-999999999';
    const updatedEncrypted = encryptionService.encrypt(updatedKey);
    
    await prisma.apiCredential.upsert({
      where: {
        userId_provider: {
          userId: testUserId,
          provider: 'openai'
        }
      },
      update: {
        encryptedKey: updatedEncrypted.encrypted,
        encryptionIV: updatedEncrypted.iv,
        updatedAt: new Date()
      },
      create: {
        userId: testUserId,
        provider: 'openai',
        encryptedKey: updatedEncrypted.encrypted,
        encryptionIV: updatedEncrypted.iv,
        isActive: true,
        validationStatus: 'unchecked'
      }
    });

    const updatedRecord = await prisma.apiCredential.findUnique({
      where: {
        userId_provider: {
          userId: testUserId,
          provider: 'openai'
        }
      }
    });

    if (updatedRecord) {
      const decryptedUpdated = encryptionService.decrypt(
        updatedRecord.encryptedKey,
        updatedRecord.encryptionIV
      );
      
      console.log(`   ${decryptedUpdated === updatedKey ? '✅' : '❌'} OpenAI key updated successfully`);
    }

    console.log('\n✨ All tests completed!');
    
    // Cleanup
    console.log('\n5️⃣ Cleaning up test data...');
    await prisma.apiCredential.deleteMany({
      where: { userId: testUserId }
    });
    console.log('   ✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testApiKeys();