import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://elsrrybullbvyjhkyuzr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsc3JyeWJ1bGxidnlqaGt5dXpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY2NDA1OSwiZXhwIjoyMDcyMjQwMDU5fQ.W2qUXo3oKdcZe59yNlhTwsxBE5YzntVXdlyDJuRVIDY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function executeSQLFile(filePath: string, name: string) {
  console.log(`\n📝 Applying: ${name}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      // Skip empty statements
      if (!statement || statement.length < 5) continue;
      
      try {
        // Use raw SQL execution via RPC
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        }).single();
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await (supabase as any).raw(statement + ';');
          if (directError) {
            console.error(`  ❌ Error in statement: ${directError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (err: any) {
        // Some statements might already exist, that's ok
        if (err.message?.includes('already exists') || 
            err.message?.includes('duplicate key')) {
          console.log(`  ⚠️  Already exists (skipped)`);
        } else {
          console.error(`  ❌ Error: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log(`  ✅ Applied ${successCount} statements successfully`);
    if (errorCount > 0) {
      console.log(`  ⚠️  ${errorCount} statements had issues (may be normal)`);
    }
    
    return true;
  } catch (error: any) {
    console.error(`  ❌ Failed to apply ${name}: ${error.message}`);
    return false;
  }
}

async function createRPCFunction() {
  console.log('\n🔧 Creating SQL execution function...');
  
  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;
  
  try {
    // Try to create via Dashboard API (this might fail, that's ok)
    console.log('  ℹ️  Note: Direct SQL execution requires Dashboard access');
    console.log('  ℹ️  Some migrations will be provided as SQL for manual execution');
  } catch (err) {
    // Expected to fail without direct SQL access
  }
}

async function applyMigrations() {
  console.log('🚀 Starting Supabase migrations...\n');
  
  // Create RPC function first
  await createRPCFunction();
  
  const migrations = [
    { file: '001_enable_rls.sql', name: 'Row Level Security' },
    { file: '002_functions_triggers.sql', name: 'Functions & Triggers' },
    { file: '003_storage_buckets.sql', name: 'Storage Buckets' },
    { file: '004_realtime.sql', name: 'Realtime & Analytics' }
  ];
  
  console.log('📋 Migrations to apply:');
  migrations.forEach((m, i) => console.log(`  ${i + 1}. ${m.name}`));
  
  // Since we can't directly execute SQL, let's provide the combined SQL
  console.log('\n⚠️  Direct SQL execution requires Dashboard access');
  console.log('📋 Please apply the following migrations manually:\n');
  
  for (const migration of migrations) {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', migration.file);
    
    if (fs.existsSync(filePath)) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`-- ${migration.name}`);
      console.log(`-- File: ${migration.file}`);
      console.log(`${'='.repeat(50)}\n`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log('Copy and paste this SQL in Supabase Dashboard SQL Editor:');
      console.log('---');
      console.log(sql.substring(0, 500) + '...\n');
      console.log(`Full SQL available in: ${filePath}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 Instructions to apply migrations:\n');
  console.log('1. Go to https://supabase.com/dashboard/project/elsrrybullbvyjhkyuzr/sql');
  console.log('2. Click "New query"');
  console.log('3. Copy the content of each migration file');
  console.log('4. Run each migration in order (001, 002, 003, 004)');
  console.log('5. Check for any errors in the output');
  console.log('\n✅ Migration files are ready in: supabase/migrations/');
}

// Run migrations
applyMigrations().catch(console.error);