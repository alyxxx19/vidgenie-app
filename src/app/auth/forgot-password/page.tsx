'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Mail,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { AuthButton } from '@/components/auth/auth-button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await resetPassword(email);
      setEmailSent(true);
      toast({
        title: 'Email envoyé',
        description: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer l\'email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-6">
      {/* Minimal grid pattern */}
      <div className="absolute inset-0 bg-grid-minimal opacity-50" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
          </div>
          <h1 className="text-xl font-mono text-white mb-2">
            password_reset
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            enter_email_for_reset_link
          </p>
        </div>

        {/* Reset Password Card */}
        <Card className="bg-card border-border shadow-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white font-mono text-center">reset_password</CardTitle>
            <CardDescription className="text-center text-muted-foreground font-mono text-sm">
              {emailSent 
                ? 'email_sent_check_inbox' 
                : 'enter_email_address'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!emailSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
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

                <AuthButton 
                  type="submit" 
                  className="w-full h-10 bg-white hover:bg-white/90 text-black font-mono text-sm" 
                  isLoading={isLoading}
                  loadingText="sending..."
                  icon={<Mail className="w-4 h-4" />}
                  disabled={isLoading}
                >
                  send_reset_link
                </AuthButton>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 bg-card border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground font-mono">
                    reset_email_sent_to <strong className="text-white">{email}</strong>
                  </p>
                </div>
                
                <AuthButton 
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full h-10 border-border text-white hover:bg-white hover:text-black font-mono text-sm"
                >
                  resend_email
                </AuthButton>
              </div>
            )}

            <div className="text-center">
              <Link 
                href="/auth/signin" 
                className="inline-flex items-center text-sm text-muted-foreground hover:text-white font-mono"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                back_to_signin
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}