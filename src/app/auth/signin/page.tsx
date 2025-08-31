'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [_activeTab, _setActiveTab] = useState('signin');
  
  const router = useRouter();
  const { user, signIn, signUp, signInWithOAuth } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          title: 'Erreur de connexion',
          description: error.message || 'Email ou mot de passe incorrect',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Connexion réussie',
          description: 'Bienvenue sur Vidgenie!',
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, name);
      
      if (error) {
        toast({
          title: 'Erreur d\'inscription',
          description: error.message || 'Impossible de créer le compte',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Compte créé',
          description: 'Vérifiez votre email pour confirmer votre compte',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur d\'inscription',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      const { error } = await signInWithOAuth(provider);
      
      if (error) {
        toast({
          title: 'Erreur OAuth',
          description: error.message || `Impossible de se connecter avec ${provider}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur OAuth',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-6">
      {/* Minimal grid pattern */}
      <div className="absolute inset-0 bg-grid-minimal opacity-50" />
      
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-16 items-center relative z-10">
        {/* Left side - Minimal branding */}
        <div className="hidden lg:block animate-slide-in">
          <div className="space-y-6">
            <div>
              <h1 className="font-mono text-4xl font-normal tracking-tight text-white mb-4">
                VIDGENIE
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed font-mono">
                AI-powered content generation platform
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-white" />
                <span className="text-muted-foreground font-mono text-sm">
                  automated generation
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-white" />
                <span className="text-muted-foreground font-mono text-sm">
                  multi-platform publishing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-1 bg-white" />
                <span className="text-muted-foreground font-mono text-sm">
                  predictive analytics
                </span>
              </div>
            </div>
            
            {/* Minimal stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div>
                <div className="text-xl font-mono text-white mb-1">10M+</div>
                <div className="text-xs text-muted-foreground font-mono">videos</div>
              </div>
              <div>
                <div className="text-xl font-mono text-white mb-1">50K+</div>
                <div className="text-xs text-muted-foreground font-mono">users</div>
              </div>
              <div>
                <div className="text-xl font-mono text-white mb-1">98%</div>
                <div className="text-xs text-muted-foreground font-mono">uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Minimal auth form */}
        <Card className="w-full max-w-sm mx-auto bg-card border-border shadow-card animate-slide-in">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-mono text-white mb-2">access_panel</CardTitle>
            <CardDescription className="text-muted-foreground text-sm font-mono">
              authenticate to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
                onClick={() => handleOAuthSignIn('google')}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                continue_with_google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
                onClick={() => handleOAuthSignIn('github')}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                continue_with_github
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-mono">or_continue_with</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary border-border">
                <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:text-black font-mono text-xs">
                  signin
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:text-black font-mono text-xs">
                  signup
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-6 mt-8">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white text-xs font-mono">email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 bg-input border-border text-white placeholder:text-muted-foreground focus:border-white focus:ring-0 font-mono text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white text-xs font-mono">password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 h-10 bg-input border-border text-white placeholder:text-muted-foreground focus:border-white focus:ring-0 font-mono text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin mr-2" />
                        processing...
                      </>
                    ) : (
                      'authenticate'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-6 mt-8">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-signup" className="text-white text-xs font-mono">name</Label>
                    <Input
                      id="name-signup"
                      type="text"
                      placeholder="full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 bg-input border-border text-white placeholder:text-muted-foreground focus:border-white focus:ring-0 font-mono text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-signup" className="text-white text-xs font-mono">email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="user@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 bg-input border-border text-white placeholder:text-muted-foreground focus:border-white focus:ring-0 font-mono text-sm"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password-signup" className="text-white text-xs font-mono">password</Label>
                    <div className="relative">
                      <Input
                        id="password-signup"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 h-10 bg-input border-border text-white placeholder:text-muted-foreground focus:border-white focus:ring-0 font-mono text-sm"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">min 6 chars</p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin mr-2" />
                        creating...
                      </>
                    ) : (
                      'create_account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center space-y-3">
              <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-white font-mono">
                forgot_password?
              </Link>
              
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-mono">
                  by continuing, you agree to terms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Access */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 z-50">
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground text-center mb-2 font-mono">
                  dev_mode
                </p>
                <Link href="/dashboard">
                  <Button size="sm" className="w-full bg-white hover:bg-white/90 text-black font-mono text-xs">
                    skip_auth
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Mobile Logo */}
      <div className="lg:hidden absolute top-4 left-4 z-20">
        <span className="font-mono text-lg text-white">VIDGENIE</span>
      </div>
    </div>
  );
}