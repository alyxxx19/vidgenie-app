'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Camera,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/providers';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
}

export function AvatarUpload({ currentAvatar, userName, onAvatarUpdate }: AvatarUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutation pour mettre à jour l'avatar
  const updateAvatarMutation = api.user.updateAvatar.useMutation({
    onSuccess: (result) => {
      toast.success('Avatar mis à jour avec succès');
      onAvatarUpdate?.(result.avatar);
      handleClose();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setPreview(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleFileSelect = useCallback((file: File) => {
    // Validation du fichier
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WebP');
      return;
    }

    if (file.size > maxSize) {
      toast.error('Fichier trop volumineux. Maximum 5MB');
      return;
    }

    setSelectedFile(file);

    // Créer un preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const uploadToS3 = async (presignedUrl: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Suivre le progrès
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Étape 1: Obtenir l'URL pré-signée
      toast.info('Préparation de l\'upload...');
      const presignedResponse = await fetch('/api/avatar-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.error || 'Erreur lors de la préparation');
      }

      const { data: { presignedUrl, publicUrl } } = await presignedResponse.json();

      // Étape 2: Upload vers S3
      toast.info('Upload en cours...');
      await uploadToS3(presignedUrl, selectedFile);

      // Étape 3: Confirmer et mettre à jour en base
      toast.info('Finalisation...');
      updateAvatarMutation.mutate({ avatarUrl: publicUrl });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    return userName
      .split(' ')
      .map(name => name[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        size="icon"
        className="absolute -bottom-4 -right-4 w-12 h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full"
        onClick={() => setOpen(true)}
      >
        <Camera className="w-5 h-5" />
      </Button>

      {/* Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
              <ImageIcon className="w-4 h-4" />
              upload_avatar
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-mono text-xs">
              Formats supportés: JPG, PNG, WebP • Taille max: 5MB
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview actuel / nouveau */}
            <div className="flex items-center justify-center gap-6">
              {/* Avatar actuel */}
              <div className="text-center">
                <p className="text-xs font-mono text-muted-foreground mb-2">actuel</p>
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={currentAvatar} alt={userName} />
                  <AvatarFallback className="bg-secondary text-foreground text-xl font-mono">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Flèche */}
              {preview && <div className="text-muted-foreground">→</div>}

              {/* Nouveau preview */}
              {preview && (
                <div className="text-center">
                  <p className="text-xs font-mono text-muted-foreground mb-2">nouveau</p>
                  <Avatar className="w-20 h-20 border-2 border-green-500">
                    <AvatarImage src={preview} alt="Preview" />
                    <AvatarFallback className="bg-secondary text-foreground text-xl font-mono">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            {/* Zone de drop */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-white bg-secondary/50' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-border bg-secondary/20 hover:bg-secondary/30'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-500" />
                  <p className="text-sm font-mono text-foreground">{selectedFile.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Changer
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-mono text-foreground">
                    Glisser-déposer ou{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-white underline font-mono"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      parcourir
                    </Button>
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    JPG, PNG, WebP jusqu'à 5MB
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Upload en cours...</span>
                  <span className="text-foreground">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Avertissements */}
            <Alert className="border-secondary bg-secondary/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm font-mono text-muted-foreground">
                <span className="text-white">Note:</span> L'image sera automatiquement redimensionnée et optimisée
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="border-border text-foreground hover:bg-secondary font-mono text-xs"
            >
              annuler
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="bg-white hover:bg-white/90 text-black font-mono text-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  upload...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3 mr-2" />
                  uploader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}