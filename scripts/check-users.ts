import prisma from '../src/lib/prisma';

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true
      },
      take: 5
    });

    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach(user => {
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Created: ${user.createdAt.toISOString()}`);
        console.log('  ---');
      });
    }

    // Check for API credentials
    console.log('\n🔍 Checking existing API credentials...\n');
    const credentials = await prisma.apiCredential.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
        isActive: true,
        validationStatus: true,
        createdAt: true
      },
      take: 10
    });

    if (credentials.length === 0) {
      console.log('❌ No API credentials found in database');
    } else {
      console.log(`✅ Found ${credentials.length} credential(s):\n`);
      credentials.forEach(cred => {
        console.log(`  Provider: ${cred.provider}`);
        console.log(`  User ID: ${cred.userId}`);
        console.log(`  Active: ${cred.isActive}`);
        console.log(`  Status: ${cred.validationStatus}`);
        console.log(`  Created: ${cred.createdAt.toISOString()}`);
        console.log('  ---');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();