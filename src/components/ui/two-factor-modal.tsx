'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  QrCode, 
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Smartphone,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/providers';

interface TwoFactorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'setup' | 'disable';
  isEnabled: boolean;
}

export function TwoFactorModal({ open, onOpenChange, mode, isEnabled }: TwoFactorModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'disable'>('setup');
  const [qrData, setQrData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Mutations
  const setup2FAMutation = api.user.setup2FA.useMutation({
    onSuccess: (data) => {
      setQrData({
        factorId: data.factorId,
        qrCode: data.qrCode,
        secret: data.secret,
        uri: data.uri,
      });
      setStep('verify');
      toast.success('QR code généré. Scannez-le avec votre application d\'authentification');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const verify2FAMutation = api.user.verify2FA.useMutation({
    onSuccess: () => {
      toast.success('2FA activé avec succès!');
      onOpenChange(false);
      handleClose();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
      setVerificationCode('');
    },
  });

  const disable2FAMutation = api.user.disable2FA.useMutation({
    onSuccess: () => {
      toast.success('2FA désactivé avec succès');
      onOpenChange(false);
      handleClose();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
      setPassword('');
    },
  });

  const handleClose = () => {
    setStep('setup');
    setQrData(null);
    setVerificationCode('');
    setPassword('');
    setShowSecret(false);
    setShowPassword(false);
  };

  const handleSetup2FA = () => {
    setup2FAMutation.mutate();
  };

  const handleVerify = () => {
    if (!qrData || !verificationCode.trim()) {
      toast.error('Veuillez entrer le code de vérification');
      return;
    }

    verify2FAMutation.mutate({
      factorId: qrData.factorId,
      code: verificationCode.trim(),
    });
  };

  const handleDisable = () => {
    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    disable2FAMutation.mutate({ password: password.trim() });
  };

  const copySecret = () => {
    if (qrData?.secret) {
      navigator.clipboard.writeText(qrData.secret);
      toast.success('Secret copié dans le presse-papiers');
    }
  };

  const formatSecret = (secret: string) => {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
            <Shield className="w-4 h-4" />
            {mode === 'setup' ? 'activer_2fa' : 'desactiver_2fa'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-mono text-xs">
            {mode === 'setup' 
              ? 'Sécurisez votre compte avec l\'authentification à deux facteurs'
              : 'Désactiver l\'authentification à deux facteurs'
            }
          </DialogDescription>
        </DialogHeader>

        {mode === 'setup' && step === 'setup' && (
          <div className="space-y-4">
            <Alert className="border-secondary bg-secondary/20">
              <Smartphone className="h-4 w-4" />
              <AlertDescription className="text-sm font-mono text-muted-foreground">
                <span className="text-white">Prérequis:</span> Installez une application comme Google Authenticator, Authy, ou 1Password
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-mono text-foreground text-sm">Comment ça marche ?</h4>
              <ul className="text-xs font-mono text-muted-foreground space-y-1">
                <li>1. Un QR code sera généré pour votre compte</li>
                <li>2. Scannez-le avec votre application d\'authentification</li>
                <li>3. Entrez le code à 6 chiffres pour confirmer</li>
                <li>4. Votre compte sera protégé par 2FA</li>
              </ul>
            </div>
          </div>
        )}

        {mode === 'setup' && step === 'verify' && qrData && (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="text-center space-y-3">
              <div className="bg-white p-4 rounded-lg inline-block">
                <img 
                  src={qrData.qrCode} 
                  alt="QR Code pour 2FA" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                Scannez ce QR code avec votre application d'authentification
              </p>
            </div>

            {/* Secret manuel */}
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground">
                Configuration manuelle (si le QR code ne fonctionne pas)
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={showSecret ? formatSecret(qrData.secret) : '••••••••••••••••'}
                  readOnly
                  className="bg-white border-border text-black font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copySecret}
                  className="border-border text-foreground hover:bg-secondary"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Code de vérification */}
            <div className="space-y-2">
              <Label htmlFor="verification-code" className="text-xs font-mono text-muted-foreground">
                Code de vérification (6 chiffres)
              </Label>
              <Input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="bg-white border-border text-black font-mono text-center text-lg tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            {verificationCode.length === 6 && (
              <Alert className="border-green-500 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="font-mono text-xs text-green-600">
                  Code prêt à être vérifié
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {mode === 'disable' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm font-mono">
                ⚠️ Désactiver la 2FA réduira la sécurité de votre compte
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-mono text-muted-foreground">
                Mot de passe pour confirmation
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-border text-black font-mono pr-10"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-600 hover:text-black"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={setup2FAMutation.isPending || verify2FAMutation.isPending || disable2FAMutation.isPending}
            className="border-border text-foreground hover:bg-secondary font-mono text-xs"
          >
            annuler
          </Button>
          
          {mode === 'setup' && step === 'setup' && (
            <Button
              type="button"
              onClick={handleSetup2FA}
              disabled={setup2FAMutation.isPending}
              className="bg-white hover:bg-white/90 text-black font-mono text-xs"
            >
              {setup2FAMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  génération...
                </>
              ) : (
                <>
                  <QrCode className="w-3 h-3 mr-2" />
                  générer_qr
                </>
              )}
            </Button>
          )}

          {mode === 'setup' && step === 'verify' && (
            <Button
              type="button"
              onClick={handleVerify}
              disabled={verify2FAMutation.isPending || verificationCode.length !== 6}
              className="bg-white hover:bg-white/90 text-black font-mono text-xs"
            >
              {verify2FAMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  vérification...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-2" />
                  activer_2fa
                </>
              )}
            </Button>
          )}

          {mode === 'disable' && (
            <Button
              type="button"
              onClick={handleDisable}
              disabled={disable2FAMutation.isPending || !password.trim()}
              variant="destructive"
              className="font-mono text-xs"
            >
              {disable2FAMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  désactivation...
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 mr-2" />
                  désactiver_2fa
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}