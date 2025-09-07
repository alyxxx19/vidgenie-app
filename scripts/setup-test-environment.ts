#!/usr/bin/env npx tsx

/**
 * Script de configuration de l'environnement de test
 * Phase 4 - Testing & Launch du PRD V2
 * 
 * Ce script configure la base de données de test, les utilisateurs de test,
 * et valide les clés API pour les tests d'intégration
 */

import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../src/services/encryption';
import { PromptEnhancerService } from '../src/services/prompt-enhancer';
import { ImageGeneratorService } from '../src/services/image-generator';
import { VideoGeneratorService } from '../src/services/video-generator';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TestConfig {
  user: {
    id: string;
    email: string;
    name: string;
    credits: number;
  };
  project: {
    id: string;
    name: string;
  };
  apiKeys: {
    openai?: string;
    fal?: string;
    veo3?: string;
    runway?: string;
    pika?: string;
  };
  encryptionKey: string;
}

async function loadTestConfig(): Promise<TestConfig> {
  const envTestPath = path.join(process.cwd(), '.env.test');
  
  if (!fs.existsSync(envTestPath)) {
    console.log('📝 .env.test not found, copying from .env.test.example...');
    
    const examplePath = path.join(process.cwd(), '.env.test.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envTestPath);
      console.log('✅ Created .env.test from example. Please fill in your test API keys.');
    } else {
      throw new Error('.env.test.example not found');
    }
  }

  // Load .env.test
  const envContent = fs.readFileSync(envTestPath, 'utf8');
  const envVars: Record<string, string> = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value;
    }
  });

  return {
    user: {
      id: envVars.TEST_USER_ID || 'test-user-123',
      email: envVars.TEST_USER_EMAIL || 'test@vidgenie.local',
      name: envVars.TEST_USER_NAME || 'Test User',
      credits: parseInt(envVars.TEST_USER_CREDITS || '100')
    },
    project: {
      id: envVars.TEST_PROJECT_ID || 'test-project-123',
      name: envVars.TEST_PROJECT_NAME || 'Test Project'
    },
    apiKeys: {
      openai: envVars.OPENAI_API_KEY,
      fal: envVars.FAL_API_KEY,
      veo3: envVars.VEO3_API_KEY,
      runway: envVars.RUNWAY_API_KEY,
      pika: envVars.PIKA_API_KEY
    },
    encryptionKey: envVars.ENCRYPTION_KEY || 'test-key-32-characters-long-key!!'
  };
}

async function setupTestDatabase(config: TestConfig): Promise<void> {
  console.log('🗄️ Setting up test database...');

  try {
    // Clean existing test data
    await prisma.workflowExecution.deleteMany({
      where: { userId: config.user.id }
    });
    
    await prisma.creditTransaction.deleteMany({
      where: { userId: config.user.id }
    });
    
    await prisma.content.deleteMany({
      where: { userId: config.user.id }
    });

    await prisma.userApiKeys.deleteMany({
      where: { userId: config.user.id }
    });

    await prisma.project.deleteMany({
      where: { userId: config.user.id }
    });

    await prisma.user.deleteMany({
      where: { id: config.user.id }
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        id: config.user.id,
        email: config.user.email,
        name: config.user.name,
        credits: config.user.credits,
        creditsUsed: 0,
        planId: 'test',
        creatorType: 'solo',
        preferredLang: 'en',
        timezone: 'UTC'
      }
    });

    console.log(`✅ Created test user: ${user.email}`);

    // Create test project
    const project = await prisma.project.create({
      data: {
        id: config.project.id,
        userId: config.user.id,
        name: config.project.name,
        description: 'Test project for API testing',
        isDefault: true,
        status: 'active'
      }
    });

    console.log(`✅ Created test project: ${project.name}`);

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function setupEncryptedApiKeys(config: TestConfig): Promise<void> {
  if (!Object.values(config.apiKeys).some(Boolean)) {
    console.log('⚠️ No API keys provided, skipping encryption setup');
    return;
  }

  console.log('🔐 Setting up encrypted API keys...');

  try {
    const encryptionService = new EncryptionService();
    const encryptionKey = config.encryptionKey;

    if (encryptionKey.length !== 32) {
      throw new Error('Encryption key must be exactly 32 characters');
    }

    // Get IV from first encryption
    const firstEncryption = config.apiKeys.openai ? 
      encryptionService.encrypt(config.apiKeys.openai) : 
      encryptionService.encrypt('dummy');
    
    const encryptedKeys = {
      openaiKey: config.apiKeys.openai ? 
        firstEncryption.encrypted : null,
      imageGenKey: config.apiKeys.openai ? 
        encryptionService.encrypt(config.apiKeys.openai).encrypted : null,
      vo3Key: config.apiKeys.veo3 ? 
        encryptionService.encrypt(config.apiKeys.veo3).encrypted : null
    };

    await prisma.userApiKeys.create({
      data: {
        userId: config.user.id,
        ...encryptedKeys,
        encryptionIV: firstEncryption.iv,
        validationStatus: {},
        lastUpdated: new Date(),
        createdAt: new Date()
      }
    });

    console.log('✅ API keys encrypted and stored');

  } catch (error) {
    console.error('❌ API keys setup failed:', error);
    throw error;
  }
}

async function validateApiKeys(config: TestConfig): Promise<void> {
  console.log('🔍 Validating API keys...');

  const results = {
    openai: { valid: false, error: '' },
    fal: { valid: false, error: '' },
    veo3: { valid: false, error: '' }
  };

  // Test OpenAI
  if (config.apiKeys.openai) {
    try {
      const promptService = new PromptEnhancerService(config.apiKeys.openai);
      const connectionResult = await promptService.testConnection();
      
      if (connectionResult.success) {
        results.openai.valid = true;
        console.log(`✅ OpenAI API key valid (model: ${connectionResult.model})`);
      } else {
        results.openai.error = connectionResult.error || 'Unknown error';
        console.log(`❌ OpenAI API key invalid: ${results.openai.error}`);
      }
    } catch (error) {
      results.openai.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ OpenAI API key test failed: ${results.openai.error}`);
    }

    // Also test DALL-E
    try {
      const imageService = new ImageGeneratorService(config.apiKeys.openai);
      const connectionResult = await imageService.testConnection();
      
      if (connectionResult.success) {
        console.log(`✅ DALL-E API access confirmed`);
      } else {
        console.log(`⚠️ DALL-E API might not be accessible: ${connectionResult.error}`);
      }
    } catch (error) {
      console.log(`⚠️ DALL-E API test failed: ${error}`);
    }
  } else {
    console.log('⚠️ No OpenAI API key provided');
  }

  // Test Fal.ai
  if (config.apiKeys.fal) {
    try {
      const videoService = new VideoGeneratorService(config.apiKeys.fal, 'fal-ai');
      const connectionResult = await videoService.testConnection();
      
      if (connectionResult.success) {
        results.fal.valid = true;
        console.log(`✅ Fal.ai API key valid`);
      } else {
        results.fal.error = connectionResult.error || 'Unknown error';
        console.log(`❌ Fal.ai API key invalid: ${results.fal.error}`);
      }
    } catch (error) {
      results.fal.error = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Fal.ai API key test failed: ${results.fal.error}`);
    }
  } else {
    console.log('⚠️ No Fal.ai API key provided');
  }

  // Update validation status in database
  if (Object.values(config.apiKeys).some(Boolean)) {
    await prisma.userApiKeys.updateMany({
      where: { userId: config.user.id },
      data: {
        validationStatus: {
          openai: results.openai.valid ? 'valid' : 'invalid',
          fal: results.fal.valid ? 'valid' : 'invalid',
          veo3: results.veo3.valid ? 'valid' : 'invalid',
          lastValidated: new Date().toISOString()
        },
        lastUpdated: new Date()
      }
    });

    console.log('✅ Validation status updated in database');
  }
}

async function generateTestReport(config: TestConfig): Promise<void> {
  console.log('📊 Generating test environment report...');

  const user = await prisma.user.findUnique({
    where: { id: config.user.id }
  });

  const project = await prisma.project.findUnique({
    where: { id: config.project.id }
  });

  const apiKeys = await prisma.userApiKeys.findUnique({
    where: { userId: config.user.id }
  });

  const report = {
    timestamp: new Date().toISOString(),
    environment: 'test',
    database: {
      user: user ? 'Created' : 'Missing',
      project: project ? 'Created' : 'Missing',
      apiKeys: apiKeys ? 'Created' : 'Missing'
    },
    apiKeys: {
      openai: config.apiKeys.openai ? 'Provided' : 'Missing',
      fal: config.apiKeys.fal ? 'Provided' : 'Missing',
      veo3: config.apiKeys.veo3 ? 'Provided' : 'Missing'
    },
    validation: apiKeys?.validationStatus || {},
    ready: !!(user && project && apiKeys)
  };

  const reportPath = path.join(process.cwd(), 'test-environment-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('✅ Test environment report saved to test-environment-report.json');
  console.log('\n📋 Test Environment Summary:');
  console.log(`User: ${report.database.user}`);
  console.log(`Project: ${report.database.project}`);
  console.log(`API Keys: ${report.database.apiKeys}`);
  console.log(`Ready for testing: ${report.ready ? '✅' : '❌'}`);

  if (report.ready) {
    console.log('\n🚀 Test environment is ready!');
    console.log('You can now run:');
    console.log('  npm run test:integration  # Run integration tests');
    console.log('  ENABLE_REAL_API_TESTS=true npm run test:integration  # Run with real APIs');
  } else {
    console.log('\n⚠️ Test environment setup incomplete. Please check the errors above.');
  }
}

async function cleanupTestData(): Promise<void> {
  console.log('🧹 Cleaning up existing test data...');
  
  try {
    // Delete in correct order to avoid foreign key constraints
    const deleteCounts = await Promise.all([
      prisma.workflowExecution.deleteMany({ where: { userId: { startsWith: 'test-' } } }),
      prisma.creditTransaction.deleteMany({ where: { userId: { startsWith: 'test-' } } }),
      prisma.content.deleteMany({ where: { userId: { startsWith: 'test-' } } }),
      prisma.userApiKeys.deleteMany({ where: { userId: { startsWith: 'test-' } } }),
      prisma.project.deleteMany({ where: { userId: { startsWith: 'test-' } } }),
      prisma.user.deleteMany({ where: { id: { startsWith: 'test-' } } })
    ]);

    const totalDeleted = deleteCounts.reduce((sum, result) => sum + result.count, 0);
    console.log(`✅ Cleaned up ${totalDeleted} test records`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';

  console.log('🧪 VidGenie Test Environment Setup');
  console.log('===================================\n');

  try {
    if (command === 'cleanup') {
      await cleanupTestData();
      return;
    }

    const config = await loadTestConfig();

    switch (command) {
      case 'setup':
        await setupTestDatabase(config);
        await setupEncryptedApiKeys(config);
        await validateApiKeys(config);
        await generateTestReport(config);
        break;

      case 'validate':
        await validateApiKeys(config);
        break;

      case 'report':
        await generateTestReport(config);
        break;

      default:
        console.log('Unknown command. Available commands:');
        console.log('  setup    - Full test environment setup (default)');
        console.log('  validate - Validate API keys only');
        console.log('  report   - Generate environment report');
        console.log('  cleanup  - Clean up test data');
    }

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrupted, cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});