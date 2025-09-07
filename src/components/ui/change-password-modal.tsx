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
  Eye, 
  EyeOff, 
  Lock, 
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/providers';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<string[]>([]);

  // Mutation pour changer le mot de passe
  const changePasswordMutation = api.user.changePassword.useMutation({
    onSuccess: () => {
      toast.success('Mot de passe mis à jour avec succès');
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors([]);
  };

  const validatePassword = (password: string): string[] => {
    const validationErrors: string[] = [];
    
    if (password.length < 8) {
      validationErrors.push('Au moins 8 caractères');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      validationErrors.push('Au moins une minuscule');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      validationErrors.push('Au moins une majuscule');
    }
    if (!/(?=.*\d)/.test(password)) {
      validationErrors.push('Au moins un chiffre');
    }
    
    return validationErrors;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validation en temps réel pour le nouveau mot de passe
    if (field === 'newPassword') {
      const validationErrors = validatePassword(value);
      setErrors(validationErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations côté client
    const validationErrors = validatePassword(formData.newPassword);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.currentPassword === formData.newPassword) {
      toast.error('Le nouveau mot de passe doit être différent de l\'ancien');
      return;
    }

    // Envoyer la mutation
    changePasswordMutation.mutate(formData);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getPasswordStrength = (password: string) => {
    const errors = validatePassword(password);
    if (password.length === 0) return null;
    if (errors.length === 0) return 'strong';
    if (errors.length <= 2) return 'medium';
    return 'weak';
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
            <Lock className="w-4 h-4" />
            changer_mot_de_passe
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-mono text-xs">
            Pour votre sécurité, votre mot de passe doit respecter certains critères
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mot de passe actuel */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-xs font-mono text-muted-foreground">
              mot de passe actuel
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                className="bg-white border-border text-black font-mono text-sm pr-10"
                placeholder="••••••••"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-600 hover:text-black"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-xs font-mono text-muted-foreground">
              nouveau mot de passe
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                className={`bg-white border-border text-black font-mono text-sm pr-10 ${
                  passwordStrength === 'strong' ? 'border-green-500 focus:border-green-500' :
                  passwordStrength === 'medium' ? 'border-yellow-500 focus:border-yellow-500' :
                  passwordStrength === 'weak' ? 'border-red-500 focus:border-red-500' :
                  'border-border'
                }`}
                placeholder="••••••••"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-600 hover:text-black"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
            
            {/* Indicateur de force du mot de passe */}
            {formData.newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        passwordStrength === 'strong' ? 'bg-green-500' :
                        passwordStrength === 'medium' && level <= 2 ? 'bg-yellow-500' :
                        passwordStrength === 'weak' && level === 1 ? 'bg-red-500' :
                        'bg-secondary'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Force: {passwordStrength === 'strong' ? 'Forte' : passwordStrength === 'medium' ? 'Moyenne' : 'Faible'}
                </p>
              </div>
            )}
          </div>

          {/* Confirmation du mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-mono text-muted-foreground">
              confirmer le mot de passe
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="bg-white border-border text-black font-mono text-sm pr-10"
                placeholder="••••••••"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-600 hover:text-black"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Erreurs de validation */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs">
                Exigences manquantes:
                <ul className="list-disc list-inside mt-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Match des mots de passe */}
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs">
                Les mots de passe ne correspondent pas
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation des mots de passe identiques */}
          {formData.confirmPassword && formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="font-mono text-xs text-green-600">
                Les mots de passe correspondent
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border text-foreground hover:bg-secondary font-mono text-xs"
            disabled={changePasswordMutation.isPending}
          >
            annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={
              changePasswordMutation.isPending || 
              errors.length > 0 || 
              formData.newPassword !== formData.confirmPassword ||
              !formData.currentPassword ||
              !formData.newPassword ||
              !formData.confirmPassword
            }
            className="bg-white hover:bg-white/90 text-black font-mono text-xs"
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                changement...
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-2" />
                changer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}