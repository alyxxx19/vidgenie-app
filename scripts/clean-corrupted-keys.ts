import prisma from '../src/lib/prisma';

async function cleanCorruptedKeys() {
  try {
    console.log('🧹 Cleaning corrupted API keys...\n');
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: 'aurelien.auriol19@gmail.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.id}\n`);

    // Delete all API credentials for this user since they're corrupted
    const deleted = await prisma.apiCredential.deleteMany({
      where: {
        userId: user.id
      }
    });

    console.log(`🗑️  Deleted ${deleted.count} corrupted API key(s)`);
    console.log('\n✨ Cleanup complete! User can now enter new API keys.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanCorruptedKeys();