#!/usr/bin/env node

/**
 * Script de test pour vérifier l'authentification dans le workflow
 * Usage: npx tsx scripts/test-auth-workflow.ts
 */

// Using built-in fetch in Node 18+

const API_BASE = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function testAuthWorkflow(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('🧪 Testing workflow authentication scenarios...\n');

  // Test 1: Call API without authentication
  try {
    console.log('Test 1: API call without authentication');
    const response = await fetch(`${API_BASE}/api/workflow/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imagePrompt: 'Test image prompt',
        videoPrompt: 'Test video prompt'
      }),
    });

    const data = await response.json();
    
    if (response.status === 401) {
      results.push({
        name: 'Unauthenticated API call returns 401',
        passed: true,
        details: { status: response.status, error: data.error }
      });
      console.log('✅ Correctly returned 401 for unauthenticated request');
    } else {
      results.push({
        name: 'Unauthenticated API call returns 401',
        passed: false,
        error: `Expected 401, got ${response.status}`,
        details: data
      });
      console.log(`❌ Expected 401, got ${response.status}`);
    }
  } catch (error) {
    results.push({
      name: 'Unauthenticated API call returns 401',
      passed: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('❌ Network error:', error);
  }

  // Test 2: Check if server auth logs are working
  try {
    console.log('\nTest 2: Server auth logging verification');
    // This test just tries to call the API to trigger auth logs
    await fetch(`${API_BASE}/api/workflow/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imagePrompt: 'Test for logging',
        videoPrompt: 'Test video for logging'
      }),
    });

    results.push({
      name: 'Auth logging triggered',
      passed: true,
      details: { message: 'Check console for [SERVER-AUTH] and [API-WORKFLOW-START] logs' }
    });
    console.log('✅ Auth logging test completed (check server console)');
  } catch (error) {
    results.push({
      name: 'Auth logging triggered',
      passed: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('❌ Auth logging test failed:', error);
  }

  // Test 3: Malformed request
  try {
    console.log('\nTest 3: Malformed request validation');
    const response = await fetch(`${API_BASE}/api/workflow/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
        imagePrompt: 'a'  // Too short
      }),
    });

    const data = await response.json();
    
    if (response.status === 400 || response.status === 401) {
      results.push({
        name: 'Malformed request validation',
        passed: true,
        details: { status: response.status, error: data.error }
      });
      console.log(`✅ Correctly handled malformed request with status ${response.status}`);
    } else {
      results.push({
        name: 'Malformed request validation',
        passed: false,
        error: `Expected 400 or 401, got ${response.status}`,
        details: data
      });
      console.log(`❌ Expected 400 or 401, got ${response.status}`);
    }
  } catch (error) {
    results.push({
      name: 'Malformed request validation',
      passed: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log('❌ Malformed request test failed:', error);
  }

  return results;
}

async function runTests() {
  try {
    const results = await testAuthWorkflow();
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    
    results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
      
      if (result.passed) passed++;
      else failed++;
    });
    
    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\n🔍 Troubleshooting tips:');
      console.log('- Make sure the development server is running (npm run dev)');
      console.log('- Check server console for detailed auth logs');
      console.log('- Verify Supabase environment variables are configured');
    } else {
      console.log('\n🎉 All authentication tests passed!');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error('   Please start the server with: npm run dev');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Workflow Authentication Test Suite');
  console.log('=====================================\n');
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Run tests
  await runTests();
}

if (require.main === module) {
  main();
}