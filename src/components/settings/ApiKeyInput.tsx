'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Loader2, 
  Key,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyInputProps {
  label: string;
  provider: 'openai' | 'nanobanana' | 'veo3';
  placeholder: string;
  helpText: string;
  value?: string; // Clé masquée existante
  onSave: (provider: string, apiKey: string) => Promise<boolean>;
  onValidate?: (provider: string, apiKey: string) => Promise<{ isValid: boolean; message: string; details?: any }>;
  disabled?: boolean;
  className?: string;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export function ApiKeyInput({
  label,
  provider,
  placeholder,
  helpText,
  value = '',
  onSave,
  onValidate,
  disabled = false,
  className = ''
}: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const [validationDetails, setValidationDetails] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Gestion du changement de valeur
  const handleValueChange = useCallback((newValue: string) => {
    setApiKey(newValue);
    setHasUnsavedChanges(newValue !== '' && newValue !== value);
    
    // Reset validation si la clé change
    if (validationStatus !== 'idle') {
      setValidationStatus('idle');
      setValidationMessage('');
      setValidationDetails(null);
    }
  }, [value, validationStatus]);

  // Validation de la clé
  const handleValidate = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error('Veuillez entrer une clé API');
      return;
    }

    if (!onValidate) {
      toast.error('Validation non disponible pour ce provider');
      return;
    }

    setValidationStatus('validating');
    setValidationMessage('Validation en cours...');

    try {
      const result = await onValidate(provider, apiKey.trim());
      
      if (result.isValid) {
        setValidationStatus('valid');
        setValidationMessage(result.message || 'Clé API valide');
        setValidationDetails(result.details);
        toast.success(`✓ Clé ${label} valide`);
      } else {
        setValidationStatus('invalid');
        setValidationMessage(result.message || 'Clé API invalide');
        setValidationDetails(null);
        toast.error(`✗ Clé ${label} invalide: ${result.message}`);
      }
    } catch (error) {
      setValidationStatus('invalid');
      setValidationMessage('Erreur lors de la validation');
      setValidationDetails(null);
      toast.error('Erreur réseau lors de la validation');
    }
  }, [apiKey, provider, label, onValidate]);

  // Sauvegarde de la clé
  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error('Veuillez entrer une clé API');
      return;
    }

    setIsSaving(true);

    try {
      const success = await onSave(provider, apiKey.trim());
      
      if (success) {
        setHasUnsavedChanges(false);
        toast.success(`Clé ${label} sauvegardée avec succès`);
        
        // Si la validation était réussie, maintenir ce statut
        if (validationStatus !== 'valid') {
          setValidationStatus('idle');
          setValidationMessage('');
        }
      } else {
        toast.error(`Erreur lors de la sauvegarde de la clé ${label}`);
      }
    } catch (error) {
      toast.error('Erreur réseau lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, provider, label, onSave, validationStatus]);

  // Effacer la clé
  const handleClear = useCallback(() => {
    setApiKey('');
    setHasUnsavedChanges(true);
    setValidationStatus('idle');
    setValidationMessage('');
    setValidationDetails(null);
  }, []);

  // Icône de statut de validation
  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Couleur du badge de statut
  const getStatusBadgeVariant = () => {
    switch (validationStatus) {
      case 'valid':
        return 'default'; // Vert
      case 'invalid':
        return 'destructive'; // Rouge
      case 'validating':
        return 'secondary'; // Gris
      default:
        return 'outline'; // Transparent
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header avec label et statut */}
      <div className="flex items-center justify-between">
        <Label htmlFor={`${provider}-key`} className="text-sm font-mono text-muted-foreground">
          {label}
        </Label>
        
        {validationStatus !== 'idle' && (
          <div className="flex items-center gap-2">
            {getValidationIcon()}
            <Badge variant={getStatusBadgeVariant()} className="text-xs font-mono">
              {validationStatus === 'validating' && 'validating...'}
              {validationStatus === 'valid' && 'valid'}
              {validationStatus === 'invalid' && 'invalid'}
            </Badge>
          </div>
        )}
      </div>

      {/* Input avec contrôles */}
      <div className="space-y-2">
        <div className="relative">
          <Input
            id={`${provider}-key`}
            type={isVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={value ? `existing: ${value}` : placeholder}
            disabled={disabled || isSaving}
            className={`pr-24 bg-white border-border text-black placeholder:text-gray-500 font-mono text-sm ${
              validationStatus === 'valid' ? 'border-green-500 focus:border-green-500' :
              validationStatus === 'invalid' ? 'border-red-500 focus:border-red-500' :
              'border-border focus:border-white/50'
            } focus:text-black`}
          />
          
          {/* Contrôles dans l'input */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            {/* Bouton visibilité */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-black/10 text-gray-600 hover:text-black"
              onClick={() => setIsVisible(!isVisible)}
              disabled={disabled}
            >
              {isVisible ? 
                <EyeOff className="w-3 h-3" /> : 
                <Eye className="w-3 h-3" />
              }
            </Button>

            {/* Bouton validation */}
            {onValidate && apiKey.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-black/10 text-gray-600 hover:text-black"
                onClick={handleValidate}
                disabled={disabled || validationStatus === 'validating' || !apiKey.trim()}
              >
                {validationStatus === 'validating' ? 
                  <Loader2 className="w-3 h-3 animate-spin" /> : 
                  <Check className="w-3 h-3" />
                }
              </Button>
            )}

            {/* Bouton clear */}
            {apiKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-black/10 text-gray-600 hover:text-black"
                onClick={handleClear}
                disabled={disabled || isSaving}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Texte d'aide */}
        <p className="text-xs text-muted-foreground font-mono">
          {helpText}
        </p>
      </div>

      {/* Message de validation */}
      {validationMessage && validationStatus !== 'idle' && (
        <Alert variant={validationStatus === 'valid' ? 'default' : 'destructive'} className="border-secondary bg-secondary/20">
          <AlertDescription className="text-sm font-mono">
            <div className="flex items-start gap-2">
              {getValidationIcon()}
              <div className="flex-1">
                <p className="text-white">{validationMessage}</p>
                
                {/* Détails supplémentaires pour clés valides */}
                {validationStatus === 'valid' && validationDetails && (
                  <div className="mt-1 text-xs text-muted-foreground space-y-1">
                    {validationDetails.model && (
                      <p>model: {validationDetails.model}</p>
                    )}
                    {validationDetails.rateLimit && (
                      <p>requests_remaining: {validationDetails.rateLimit.remaining}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={disabled || isSaving || !apiKey.trim() || !hasUnsavedChanges}
          size="sm"
          variant="default"
          className="flex-1 bg-white hover:bg-white/90 text-black hover:text-black focus:text-black active:text-black font-mono text-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              saving...
            </>
          ) : (
            <>
              <Key className="w-3 h-3 mr-2" />
              save
            </>
          )}
        </Button>

        {onValidate && (
          <Button
            onClick={handleValidate}
            disabled={disabled || validationStatus === 'validating' || !apiKey.trim()}
            size="sm"
            variant="outline"
            className="border-border text-white hover:bg-white hover:text-black font-mono text-xs"
          >
            {validationStatus === 'validating' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </Button>
        )}
      </div>

      {/* Indicateur de modifications non sauvegardées */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 text-xs text-orange-400 font-mono">
          <Clock className="w-3 h-3" />
          <span>unsaved_changes</span>
        </div>
      )}
    </div>
  );
}