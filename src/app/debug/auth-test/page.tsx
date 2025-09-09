'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/**
 * Page de debug pour tester l'authentification du workflow
 * Accessible via /debug/auth-test
 */
export default function AuthTestPage() {
  const { user, isLoading } = useAuth();
  const [testResults, setTestResults] = useState<string>('');
  const [isTestRunning, setIsTestRunning] = useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => prev + new Date().toLocaleTimeString() + ': ' + message + '\n');
  };

  const testWorkflowAuth = async () => {
    setIsTestRunning(true);
    setTestResults('');
    
    addLog('🧪 Starting workflow authentication test...');
    
    // Test 1: Vérifier l'état d'auth côté client
    addLog(`📊 Client auth state: user=${!!user}, isLoading=${isLoading}, userId=${user?.id}`);
    
    if (!user) {
      addLog('❌ User is not authenticated on client side');
      setIsTestRunning(false);
      return;
    }

    // Test 2: Tester l'API workflow/start
    try {
      addLog('🔗 Testing API call to /api/workflow/start...');
      
      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imagePrompt: 'Test image prompt for authentication debugging',
          videoPrompt: 'Test video prompt for authentication debugging'
        }),
      });

      addLog(`📡 Response status: ${response.status}`);
      
      const data = await response.json();
      addLog(`📦 Response data: ${JSON.stringify(data, null, 2)}`);

      if (response.status === 401) {
        addLog('❌ Authentication failed - 401 Unauthorized');
        addLog('🔍 This indicates that server-side auth is not working properly');
      } else if (response.status === 400) {
        addLog('⚠️  Bad request - possibly insufficient credits or validation error');
        if (data.error?.includes('credits')) {
          addLog('💰 Issue is related to credits, not authentication');
        }
      } else if (response.status === 200 || response.status === 201) {
        addLog('✅ Authentication successful!');
        addLog(`🎉 Workflow started with ID: ${data.workflowId || data.jobId}`);
      } else {
        addLog(`⚠️  Unexpected response: ${response.status}`);
      }

    } catch (error) {
      addLog(`❌ Network error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 3: Test d'autres endpoints si nécessaire
    try {
      addLog('🔗 Testing API call to /api/auth/profile for comparison...');
      
      const profileResponse = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include'
      });

      addLog(`📡 Profile API status: ${profileResponse.status}`);
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        addLog(`✅ Profile API works - user: ${profileData.id}`);
      } else {
        addLog(`❌ Profile API also fails with ${profileResponse.status}`);
      }

    } catch (error) {
      addLog(`⚠️  Profile API error: ${error instanceof Error ? error.message : String(error)}`);
    }

    setIsTestRunning(false);
    addLog('✅ Test completed - check results above');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Workflow Authentication Debug</h1>
        <p className="text-muted-foreground">
          This page helps debug workflow authentication issues.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Auth Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Client Authentication Status
              <Badge variant={user ? 'default' : 'destructive'}>
                {isLoading ? 'Loading' : user ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-semibold">User ID:</Label>
                <div className="font-mono">{user?.id || 'N/A'}</div>
              </div>
              <div>
                <Label className="font-semibold">Email:</Label>
                <div className="font-mono">{user?.email || 'N/A'}</div>
              </div>
              <div>
                <Label className="font-semibold">Loading:</Label>
                <div className="font-mono">{isLoading.toString()}</div>
              </div>
              <div>
                <Label className="font-semibold">Session Active:</Label>
                <div className="font-mono">{(!!user && !isLoading).toString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testWorkflowAuth} 
              disabled={isTestRunning || isLoading}
              className="mb-4"
            >
              {isTestRunning ? 'Running Tests...' : 'Run Authentication Test'}
            </Button>
            
            <div>
              <Label htmlFor="results">Test Results:</Label>
              <Textarea
                id="results"
                value={testResults}
                readOnly
                className="mt-2 font-mono text-xs h-96 bg-slate-50"
                placeholder="Test results will appear here..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-red-600">If you get 401 Unauthorized:</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check if cookies are being sent (credentials: 'include')</li>
                  <li>Verify Supabase environment variables</li>
                  <li>Check server console for [SERVER-AUTH] logs</li>
                  <li>Try signing out and signing in again</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-yellow-600">If you get 400 Bad Request:</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check if you have enough credits</li>
                  <li>Verify request validation (prompts length, etc.)</li>
                  <li>Look for validation error details in response</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-green-600">If you get 200/201 Success:</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Authentication is working correctly!</li>
                  <li>Check if workflow actually starts running</li>
                  <li>Monitor workflow progress</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}