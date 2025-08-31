'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { authService } from '@/lib/supabase/auth';
import { GoogleSignInButton } from './google-signin-button';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      setError('');
      await authService.signInWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="space-y-2">
          <Separator />
          <p className="text-center text-sm text-muted-foreground">
            Or continue with
          </p>
        </div>

        <div className="space-y-2">
          <GoogleSignInButton
            disabled={isLoading}
            onError={(error) => setError(error)}
            onSuccess={() => router.push('/dashboard')}
          />
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading}
            className="w-full"
          >
            GitHub
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary"
            onClick={async () => {
              if (email) {
                try {
                  await authService.resetPassword(email);
                  setError('Password reset email sent! Check your inbox.');
                } catch (err: any) {
                  setError(err.message);
                }
              } else {
                setError('Please enter your email address first');
              }
            }}
          >
            Forgot your password?
          </button>
        </div>
      </CardContent>
    </Card>
  );
}