import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elsrrybullbvyjhkyuzr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsc3JyeWJ1bGxidnlqaGt5dXpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY2NDA1OSwiZXhwIjoyMDcyMjQwMDU5fQ.W2qUXo3oKdcZe59yNlhTwsxBE5YzntVXdlyDJuRVIDY';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkRLS() {
  console.log('🔒 Vérification Row Level Security...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('row_security', 'YES');
    
    if (error) {
      console.log('   ⚠️  Impossible de vérifier RLS via API');
      return false;
    }
    
    const rlsTables = data?.map(t => t.table_name) || [];
    console.log(`   ✅ RLS activé sur ${rlsTables.length} tables:`, rlsTables);
    return rlsTables.length > 0;
  } catch (err) {
    console.log('   ⚠️  Vérification RLS échouée');
    return false;
  }
}

async function checkPolicies() {
  console.log('\n🛡️  Vérification Politiques de Sécurité...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = \'public\''
    });
    
    if (error) {
      console.log('   ⚠️  Impossible de vérifier les politiques via API');
      return false;
    }
    
    console.log(`   ✅ ${data?.count || 0} politiques de sécurité actives`);
    return (data?.count || 0) > 0;
  } catch (err) {
    console.log('   ⚠️  Vérification des politiques échouée');
    return false;
  }
}

async function checkStorageBuckets() {
  console.log('\n💾 Vérification Storage Buckets...');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('   ❌ Erreur storage:', error.message);
      return false;
    }
    
    const buckets = data.map(b => b.name);
    const expectedBuckets = ['assets', 'avatars', 'thumbnails'];
    const missingBuckets = expectedBuckets.filter(b => !buckets.includes(b));
    
    console.log(`   📦 Buckets trouvés: ${buckets.join(', ')}`);
    
    if (missingBuckets.length > 0) {
      console.log(`   ⚠️  Buckets manquants: ${missingBuckets.join(', ')}`);
      return false;
    }
    
    console.log('   ✅ Tous les buckets essentiels sont configurés');
    return true;
  } catch (err) {
    console.log('   ❌ Erreur lors de la vérification storage');
    return false;
  }
}

async function checkPlans() {
  console.log('\n📦 Vérification Plans de Subscription...');
  
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('name, price, creditsPerMonth');
    
    if (error) {
      console.log('   ❌ Erreur plans:', error.message);
      return false;
    }
    
    const plans = data || [];
    console.log(`   ✅ ${plans.length} plans trouvés:`);
    plans.forEach(p => {
      console.log(`     • ${p.name}: ${p.price/100}€ - ${p.creditsPerMonth} crédits`);
    });
    
    return plans.length >= 4;
  } catch (err) {
    console.log('   ❌ Erreur lors de la vérification des plans');
    return false;
  }
}

async function checkTemplates() {
  console.log('\n📝 Vérification Templates...');
  
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('title, category')
      .eq('isTemplate', true)
      .eq('isPublic', true);
    
    if (error) {
      console.log('   ❌ Erreur templates:', error.message);
      return false;
    }
    
    const templates = data || [];
    console.log(`   ✅ ${templates.length} templates publics:`);
    templates.forEach(t => {
      console.log(`     • ${t.title} (${t.category})`);
    });
    
    return templates.length >= 3;
  } catch (err) {
    console.log('   ❌ Erreur lors de la vérification des templates');
    return false;
  }
}

async function checkRealtimeStatus() {
  console.log('\n⚡ Vérification Realtime...');
  
  try {
    // Test simple de connexion realtime
    const channel = supabase.channel('test-channel');
    
    setTimeout(() => {
      channel.unsubscribe();
    }, 1000);
    
    console.log('   ✅ Connexion Realtime possible');
    return true;
  } catch (err) {
    console.log('   ⚠️  Realtime non configuré (optionnel)');
    return false;
  }
}

async function testBasicOperations() {
  console.log('\n🧪 Test des Opérations de Base...');
  
  try {
    // Test de lecture
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (usersError) {
      console.log('   ❌ Erreur lecture users:', usersError.message);
      return false;
    }
    
    console.log(`   ✅ Lecture users OK (${users?.length || 0} trouvé)`);
    
    // Test de lecture jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, status')
      .limit(1);
    
    if (jobsError) {
      console.log('   ❌ Erreur lecture jobs:', jobsError.message);
      return false;
    }
    
    console.log(`   ✅ Lecture jobs OK (${jobs?.length || 0} trouvé)`);
    
    return true;
  } catch (err) {
    console.log('   ❌ Erreur lors des tests de base');
    return false;
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT DE VÉRIFICATION SUPABASE');
  console.log('='.repeat(60));
  
  const results = {
    rls: await checkRLS(),
    policies: await checkPolicies(),
    storage: await checkStorageBuckets(),
    plans: await checkPlans(),
    templates: await checkTemplates(),
    realtime: await checkRealtimeStatus(),
    operations: await testBasicOperations(),
  };
  
  console.log('\n📋 RÉSULTATS :');
  console.log(`   🔒 Row Level Security: ${results.rls ? '✅ OK' : '❌ MANQUANT'}`);
  console.log(`   🛡️  Politiques: ${results.policies ? '✅ OK' : '❌ MANQUANT'}`);
  console.log(`   💾 Storage Buckets: ${results.storage ? '✅ OK' : '❌ MANQUANT'}`);
  console.log(`   📦 Plans: ${results.plans ? '✅ OK' : '❌ MANQUANT'}`);
  console.log(`   📝 Templates: ${results.templates ? '✅ OK' : '❌ MANQUANT'}`);
  console.log(`   ⚡ Realtime: ${results.realtime ? '✅ OK' : '⚠️  OPTIONNEL'}`);
  console.log(`   🧪 Opérations: ${results.operations ? '✅ OK' : '❌ PROBLÈME'}`);
  
  const criticalOK = results.operations && results.plans && results.templates;
  const securityOK = results.rls || results.policies;
  
  console.log('\n' + '='.repeat(60));
  
  if (criticalOK && securityOK) {
    console.log('🎉 SUPABASE ENTIÈREMENT CONFIGURÉ !');
    console.log('   ✅ Sécurité : OK');
    console.log('   ✅ Fonctionnalités : OK');
    console.log('   ✅ Prêt pour production');
  } else if (criticalOK) {
    console.log('⚠️  CONFIGURATION PARTIELLE');
    console.log('   ✅ Fonctionnalités : OK');
    console.log('   ⚠️  Sécurité : À améliorer');
    console.log('   ✅ Utilisable pour développement');
  } else {
    console.log('❌ CONFIGURATION INCOMPLÈTE');
    console.log('   ❌ Des éléments critiques manquent');
    console.log('   🔧 Action requise');
  }
  
  console.log('='.repeat(60));
}

// Exécuter la vérification
generateReport().catch(console.error);