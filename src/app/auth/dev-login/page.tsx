'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, User } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connexion Dev</CardTitle>
          <CardDescription>
            Mode développement - Pas d&apos;OAuth requis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              <User className="w-4 h-4 mr-2" />
              Se connecter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Mode dev :</strong> Aucune validation requise. 
              Créera automatiquement un compte si non existant.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}