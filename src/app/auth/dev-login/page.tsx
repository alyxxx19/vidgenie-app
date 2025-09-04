'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, User } from 'lucide-react';
import { toast } from 'sonner';
import { AuthButton } from '@/components/auth/auth-button';

export default function DevLoginPage() {
  const [email, setEmail] = useState('test@example.com');
  const [name, setName] = useState('Test User');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create or find user directly
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store user info in localStorage for dev
        localStorage.setItem('dev_user', JSON.stringify(data.user));
        toast.success('Connexion réussie !');
        router.push('/dashboard');
      } else {
        throw new Error('Erreur de connexion');
      }
    } catch (_error) {
      toast.error('Impossible de se connecter');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-6">
      {/* Minimal grid pattern */}
      <div className="absolute inset-0 bg-grid-minimal opacity-50" />
      
      <Card className="w-full max-w-md bg-card border-border shadow-card relative z-10">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-mono text-white">dev_mode</CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-sm">
            development_authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white text-xs font-mono">email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white text-xs font-mono">name</Label>
              <Input
                id="name"
                type="text"
                placeholder="full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
                required
              />
            </div>
            
            <AuthButton 
              type="submit" 
              className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
              isLoading={isLoading}
              loadingText="connecting..."
              icon={<User className="w-4 h-4" />}
              disabled={isLoading}
            >
              dev_authenticate
              <ArrowRight className="w-4 h-4 ml-2" />
            </AuthButton>
          </form>

          <div className="mt-6 p-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground font-mono">
              <strong className="text-white">dev_mode:</strong> no_validation_required.<br/>
              auto_creates_account_if_missing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}