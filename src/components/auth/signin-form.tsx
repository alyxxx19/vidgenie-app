'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { authService } from '@/lib/supabase/auth';
import { GoogleSignInButton } from './google-signin-button';
import { AuthButton } from './auth-button';
import { Github, Mail } from 'lucide-react';

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
    <Card className="w-full max-w-md bg-card border-border shadow-card">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-mono text-white">signin</CardTitle>
        <CardDescription className="text-muted-foreground font-mono text-sm">
          enter_credentials_to_continue
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
            <Label htmlFor="email" className="text-white text-xs font-mono">email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 focus:text-black active:text-black font-mono text-sm"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white text-xs font-mono">password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 focus:text-black active:text-black font-mono text-sm"
              required
            />
          </div>
          
          <AuthButton 
            type="submit" 
            className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
            isLoading={isLoading}
            loadingText="authenticating..."
            icon={<Mail className="w-4 h-4" />}
            disabled={isLoading}
          >
            authenticate
          </AuthButton>
        </form>

        <div className="space-y-2">
          <Separator className="bg-border" />
          <p className="text-center text-sm text-muted-foreground font-mono">
            or_continue_with
          </p>
        </div>

        <div className="space-y-2">
          <GoogleSignInButton
            variant="outline"
            size="default"
            className="h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
            disabled={isLoading}
            onError={(error) => setError(error)}
            onSuccess={() => router.push('/dashboard')}
            showText={true}
          />
          <AuthButton
            variant="outline"
            size="default"
            className="h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
            onClick={() => handleOAuthSignIn('github')}
            icon={<Github className="w-4 h-4" />}
            disabled={isLoading}
          >
            continue_with_github
          </AuthButton>
        </div>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-white font-mono"
            onClick={async () => {
              if (email) {
                try {
                  await authService.resetPassword(email);
                  setError('reset_email_sent_check_inbox');
                } catch (err: any) {
                  setError(err.message);
                }
              } else {
                setError('enter_email_first');
              }
            }}
          >
            forgot_password?
          </button>
        </div>
      </CardContent>
    </Card>
  );
}