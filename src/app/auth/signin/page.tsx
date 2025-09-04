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
  Mail,
  Github,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { GoogleSignInButton } from '@/components/auth/google-signin-button';
import { AuthButton } from '@/components/auth/auth-button';

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
        // Immediate redirect, no toast to avoid delay
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
          description: 'Vérifiez votre email pour confirmer votre compte avant de vous connecter',
        });
        // Clear form fields after successful signup
        setEmail('');
        setPassword('');
        setName('');
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
      setIsLoading(true);
      const { error } = await signInWithOAuth(provider);
      
      if (error) {
        toast({
          title: 'Erreur OAuth',
          description: error.message || `Impossible de se connecter avec ${provider}`,
          variant: 'destructive',
        });
        setIsLoading(false);
      }
      // No need to set loading false on success as user will be redirected
    } catch (error: any) {
      toast({
        title: 'Erreur OAuth',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
      setIsLoading(false);
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
              <GoogleSignInButton 
                variant="outline"
                size="default"
                className="h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
                onError={(error) => {
                  toast({
                    title: 'Erreur OAuth',
                    description: error,
                    variant: 'destructive',
                  });
                }}
                disabled={isLoading}
                showText={true}
              />

              <AuthButton
                variant="outline"
                size="default"
                className="h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
                onClick={() => handleOAuthSignIn('github')}
                isLoading={isLoading}
                icon={<Github className="w-4 h-4" />}
                disabled={isLoading}
              >
                continue_with_github
              </AuthButton>
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
                      className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
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
                        className="pr-10 h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
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
                  
                  <AuthButton 
                    type="submit" 
                    className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
                    isLoading={isLoading}
                    loadingText="processing..."
                    icon={<Mail className="w-4 h-4" />}
                    disabled={isLoading}
                  >
                    authenticate
                  </AuthButton>
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
                      className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
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
                      className="h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
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
                        className="pr-10 h-10 bg-white border-border text-black placeholder:text-muted-foreground focus:border-border focus:ring-0 font-mono text-sm"
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
                  
                  <AuthButton 
                    type="submit" 
                    className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
                    isLoading={isLoading}
                    loadingText="creating..."
                    icon={<Mail className="w-4 h-4" />}
                    disabled={isLoading}
                  >
                    create_account
                  </AuthButton>
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