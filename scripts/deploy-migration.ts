#!/usr/bin/env npx tsx

/**
 * Script de déploiement sécurisé de la migration Workflow V2
 * Phase 4 - Testing & Launch du PRD V2
 * 
 * Ce script valide et déploie la migration des nouveaux modèles en production
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationCheck {
  name: string;
  status: 'pending' | 'applied' | 'error';
  error?: string;
}

async function checkDatabaseConnection(): Promise<boolean> {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    await prisma.$disconnect();
    return false;
  }
}

async function checkExistingTables(): Promise<MigrationCheck[]> {
  const prisma = new PrismaClient();
  const checks: MigrationCheck[] = [];
  
  try {
    console.log('🔍 Checking existing database schema...');
    
    // Check if new tables already exist
    const tableChecks = [
      'user_api_keys',
      'workflow_executions', 
      'credit_transactions',
      'content'
    ];

    for (const tableName of tableChecks) {
      try {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          );
        ` as [{ exists: boolean }];

        checks.push({
          name: `table_${tableName}`,
          status: result[0]?.exists ? 'applied' : 'pending'
        });
      } catch (error) {
        checks.push({
          name: `table_${tableName}`,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check if credits columns exist in users table
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name IN ('credits', 'creditsUsed');
      ` as { column_name: string }[];

      const hasCredits = result.some(row => row.column_name === 'credits');
      const hasCreditsUsed = result.some(row => row.column_name === 'creditsUsed');

      checks.push({
        name: 'users_credits_column',
        status: hasCredits ? 'applied' : 'pending'
      });

      checks.push({
        name: 'users_creditsUsed_column', 
        status: hasCreditsUsed ? 'applied' : 'pending'
      });

    } catch (error) {
      checks.push({
        name: 'users_credits_columns',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
  
  return checks;
}

async function validateMigrationSQL(): Promise<boolean> {
  const migrationPath = path.join(
    process.cwd(), 
    'prisma/migrations/20250104000001_add_workflow_v2_models/migration.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration SQL file not found');
    return false;
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  // Basic validation checks
  const requiredStatements = [
    'CREATE TABLE IF NOT EXISTS "user_api_keys"',
    'CREATE TABLE IF NOT EXISTS "workflow_executions"',
    'CREATE TABLE IF NOT EXISTS "credit_transactions"',
    'CREATE TABLE IF NOT EXISTS "content"',
    'ADD COLUMN IF NOT EXISTS "credits"',
    'ADD COLUMN IF NOT EXISTS "creditsUsed"'
  ];

  const missingStatements = requiredStatements.filter(stmt => 
    !migrationSQL.includes(stmt)
  );

  if (missingStatements.length > 0) {
    console.error('❌ Migration SQL validation failed. Missing statements:');
    missingStatements.forEach(stmt => console.error(`   - ${stmt}`));
    return false;
  }

  // Check for dangerous operations
  const dangerousPatterns = [
    /DROP TABLE/i,
    /DELETE FROM.*WHERE/i,
    /TRUNCATE/i,
    /ALTER TABLE.*DROP COLUMN/i
  ];

  const dangerousOperations = dangerousPatterns.filter(pattern => 
    pattern.test(migrationSQL)
  );

  if (dangerousOperations.length > 0) {
    console.warn('⚠️ Migration contains potentially dangerous operations');
    console.warn('Please review carefully before proceeding');
  }

  console.log('✅ Migration SQL validation passed');
  return true;
}

async function createBackup(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 Creating database backup...');
    
    // In a real production environment, you would:
    // 1. Create a database dump
    // 2. Store it in a safe location
    // 3. Verify the backup is complete
    
    console.log('⚠️ Manual backup recommended for production deployment');
    console.log('Run: pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql');
    
    // For this demo, we'll simulate backup creation
    const backupInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tables: ['users', 'projects', 'api_credentials', 'jobs', 'assets']
    };
    
    fs.writeFileSync(
      path.join(process.cwd(), 'pre_migration_backup_info.json'),
      JSON.stringify(backupInfo, null, 2)
    );
    
    console.log('✅ Backup info recorded');
  }
  
  return true;
}

async function deployMigration(dryRun = false): Promise<boolean> {
  console.log(dryRun ? '🧪 Dry run migration deployment...' : '🚀 Deploying migration...');
  
  const prisma = new PrismaClient();
  
  try {
    const migrationPath = path.join(
      process.cwd(), 
      'prisma/migrations/20250104000001_add_workflow_v2_models/migration.sql'
    );
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    if (dryRun) {
      console.log('📄 Migration SQL to be executed:');
      console.log('=====================================');
      console.log(migrationSQL);
      console.log('=====================================');
      return true;
    }
    
    // Execute migration in a transaction
    await prisma.$transaction(async (tx) => {
      // Split SQL by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          await tx.$executeRawUnsafe(statement);
        }
      }
    });
    
    console.log('✅ Migration deployed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Migration deployment failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyMigration(): Promise<boolean> {
  console.log('🔍 Verifying migration deployment...');
  
  const prisma = new PrismaClient();
  
  try {
    // Test each new table
    await prisma.userApiKeys.findMany({ take: 1 });
    await prisma.workflowExecution.findMany({ take: 1 });
    await prisma.creditTransaction.findMany({ take: 1 });
    await prisma.content.findMany({ take: 1 });
    
    // Test updated users table
    const user = await prisma.user.findFirst({
      select: { id: true, credits: true, creditsUsed: true }
    });
    
    if (user && typeof user.credits === 'number' && typeof user.creditsUsed === 'number') {
      console.log('✅ Migration verification passed');
      return true;
    } else {
      console.error('❌ Migration verification failed - credits columns not accessible');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateReport(): Promise<void> {
  console.log('📊 Generating migration report...');
  
  const checks = await checkExistingTables();
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    migration: '20250104000001_add_workflow_v2_models',
    tableChecks: checks,
    summary: {
      totalTables: 4,
      appliedTables: checks.filter(c => c.name.startsWith('table_') && c.status === 'applied').length,
      pendingTables: checks.filter(c => c.name.startsWith('table_') && c.status === 'pending').length,
      errors: checks.filter(c => c.status === 'error').length
    }
  };
  
  const reportPath = path.join(process.cwd(), 'migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('✅ Migration report saved to migration-report.json');
  console.log('\n📋 Migration Summary:');
  console.log(`Environment: ${report.environment}`);
  console.log(`Applied tables: ${report.summary.appliedTables}/${report.summary.totalTables}`);
  console.log(`Pending tables: ${report.summary.pendingTables}`);
  console.log(`Errors: ${report.summary.errors}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'deploy';
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');
  
  console.log('🏗️ VidGenie Workflow V2 Migration Deployment');
  console.log('============================================\n');
  
  try {
    // Step 1: Check database connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection verified\n');
    
    // Step 2: Check existing schema
    const checks = await checkExistingTables();
    const hasErrors = checks.some(c => c.status === 'error');
    const allApplied = checks.every(c => c.status === 'applied');
    
    if (hasErrors && !isForce) {
      console.error('❌ Schema check revealed errors. Use --force to proceed anyway.');
      process.exit(1);
    }
    
    if (allApplied && !isForce) {
      console.log('ℹ️ Migration appears to be already applied. Use --force to re-run.');
      await generateReport();
      return;
    }
    
    switch (command) {
      case 'check':
        await generateReport();
        break;
        
      case 'deploy':
        // Step 3: Validate migration SQL
        const isValid = await validateMigrationSQL();
        if (!isValid) {
          throw new Error('Migration SQL validation failed');
        }
        
        // Step 4: Create backup (production only)
        await createBackup();
        
        // Step 5: Deploy migration
        const deploySuccess = await deployMigration(isDryRun);
        if (!deploySuccess) {
          throw new Error('Migration deployment failed');
        }
        
        if (!isDryRun) {
          // Step 6: Verify migration
          const verifySuccess = await verifyMigration();
          if (!verifySuccess) {
            throw new Error('Migration verification failed');
          }
        }
        
        // Step 7: Generate report
        await generateReport();
        
        if (isDryRun) {
          console.log('\n🧪 Dry run completed successfully');
        } else {
          console.log('\n🎉 Migration deployed successfully!');
        }
        break;
        
      default:
        console.log('Available commands:');
        console.log('  deploy   - Deploy the migration (default)');
        console.log('  check    - Check current migration status');
        console.log('\nOptions:');
        console.log('  --dry-run - Show what would be deployed without executing');
        console.log('  --force   - Force deployment even if already applied');
    }
    
  } catch (error) {
    console.error('💥 Migration deployment failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Interrupted, exiting...');
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});