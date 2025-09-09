'use client';

import { Handle, Position } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Upload, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { WorkflowNodeData } from '../types/workflow';
import { NODE_THEMES, STATUS_COLORS, NODE_SIZES, HANDLE_STYLES } from '../constants/node-themes';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import NextImage from 'next/image';
import { useWorkflowStore } from '../store/workflow-store';

interface ImageUploadNodeProps {
  id: string;
  data: WorkflowNodeData;
  selected?: boolean;
}

export function ImageUploadNode({ id, data, selected }: ImageUploadNodeProps) {
  const theme = NODE_THEMES.image; // Réutilise le thème vert des images
  const statusColors = STATUS_COLORS[data.status];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Hook du store pour les actions
  const updateNodeData = useWorkflowStore(state => state.updateNodeData);

  const getNodeClasses = () => {
    const baseClasses = `${NODE_SIZES.default} ${statusColors.bg} border-2 transition-all duration-300 rounded-xl shadow-lg backdrop-blur-sm`;
    
    let borderClasses: string = statusColors.border;
    let effectClasses = '';

    // Styles spécifiques selon l'état
    switch (data.status) {
      case 'loading':
        borderClasses = 'border-green-500';
        effectClasses = 'animate-pulse shadow-lg shadow-green-500/20';
        break;
      case 'success':
        effectClasses = 'shadow-lg shadow-green-500/20';
        break;
      case 'error':
        effectClasses = 'animate-shake shadow-lg shadow-red-500/20';
        break;
      default:
        if (selected) {
          borderClasses = 'border-green-500';
          effectClasses = 'shadow-xl shadow-green-500/30';
        }
        if (isDragOver) {
          borderClasses = 'border-green-500';
          effectClasses = 'shadow-lg shadow-green-500/20 scale-102';
        }
    }

    return `${baseClasses} ${borderClasses} ${effectClasses}`;
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'loading':
        return <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const badgeTexts = {
      idle: 'awaiting_image',
      loading: 'uploading',
      success: 'uploaded',
      error: 'error'
    };

    return (
      <Badge className={`${statusColors.badge} font-mono text-xs px-2 py-1`}>
        {badgeTexts[data.status]}
      </Badge>
    );
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const config = data.config?.imageUpload;
    if (!config) return { valid: true };

    // Vérifier le format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (config.acceptedFormats && !config.acceptedFormats.includes(fileExtension || '')) {
      return { 
        valid: false, 
        error: `Format ${fileExtension} non supporté. Formats acceptés: ${config.acceptedFormats.join(', ')}` 
      };
    }

    // Vérifier la taille
    if (config.maxFileSize && file.size > config.maxFileSize) {
      const maxSizeMB = Math.round(config.maxFileSize / (1024 * 1024));
      return { 
        valid: false, 
        error: `Fichier trop volumineux. Taille max: ${maxSizeMB}MB` 
      };
    }

    return { valid: true };
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Mise à jour du statut et initialisation de l'upload
    updateNodeData(id, { status: 'loading' });
    setUploadProgress(0);
    
    // Upload réel avec progression (pour l'instant simulé, prêt pour l'API)
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Créer l'URL de prévisualisation
    const previewUrl = URL.createObjectURL(file);
    
    // Simuler la création d'une image
    const img = new Image();
    img.onload = () => {
      // Mettre à jour les données du nœud
      const uploadData = {
        originalFile: file,
        uploadedUrl: previewUrl, // Dans un vrai cas, ce serait l'URL du serveur
        thumbnailUrl: previewUrl,
        width: img.width,
        height: img.height,
        fileSize: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
      };

      // Mettre à jour le store avec les données de l'image uploadée
      updateNodeData(id, { 
        imageUploadData: uploadData,
        status: 'success',
        input: previewUrl,
        output: {
          imageUrl: previewUrl,
          width: uploadData.width,
          height: uploadData.height,
          fileSize: uploadData.fileSize,
          format: uploadData.format
        }
      });
      
      toast.success('Image uploaded successfully!');
    };

    img.src = previewUrl;
    
  }, [id, data.config]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else {
      toast.error('Please upload an image file');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const clearImage = () => {
    if (data.imageUploadData?.uploadedUrl) {
      URL.revokeObjectURL(data.imageUploadData.uploadedUrl);
    }
    // Nettoyer les données dans le store
    updateNodeData(id, { 
      imageUploadData: undefined, 
      status: 'idle', 
      input: undefined,
      output: undefined
    });
  };

  const IconComponent = theme.icon;
  const progress = data.progress || uploadProgress;
  const imageData = data.imageUploadData;
  const hasImage = data.status === 'success' && imageData?.uploadedUrl;

  return (
    <div className={getNodeClasses()}>
      {/* Handle pour la connexion sortante */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={`${HANDLE_STYLES.base} ${
          data.status === 'success' ? HANDLE_STYLES.success :
          data.status === 'loading' ? HANDLE_STYLES.active :
          data.status === 'error' ? HANDLE_STYLES.error :
          HANDLE_STYLES.idle
        }`}
      />

      {/* Header avec thème coloré vert */}
      <div className={`border-b border-[#333333] bg-gradient-to-r from-[${theme.accent}]/10 to-transparent p-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-[${theme.accent}]/20 border border-[${theme.accent}]/30`}>
              <Upload className={`w-4 h-4 text-[${theme.accent}] ${data.status === 'loading' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-mono text-sm text-white font-medium">image_upload</h3>
              <p className="text-xs text-gray-400 font-mono">upload source image</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4 space-y-4">
        {/* Zone d'upload */}
        {!hasImage && data.status !== 'loading' && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
              isDragOver 
                ? `border-[${theme.accent}] bg-[${theme.accent}]/5` 
                : 'border-[#333333] hover:border-[#666666] hover:bg-[#1F1F1F]'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <div className="space-y-1">
              <p className="text-sm font-mono text-white">
                {isDragOver ? 'Drop image here' : 'Click or drag image to upload'}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                Supports: {data.config?.imageUpload?.acceptedFormats?.join(', ') || 'png, jpg, jpeg, webp'}
              </p>
              {data.config?.imageUpload?.maxFileSize && (
                <p className="text-xs text-gray-500 font-mono">
                  Max size: {Math.round(data.config.imageUpload.maxFileSize / (1024 * 1024))}MB
                </p>
              )}
            </div>
          </div>
        )}

        {/* Barre de progression pendant l'upload */}
        {data.status === 'loading' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-green-400">uploading_image</span>
              <span className="text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="relative">
              <div className="h-2 bg-[#0A0A0A] border border-[#333333] rounded overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-transparent opacity-50 animate-pulse" />
            </div>
            <div className="text-xs text-green-400 font-mono text-center">
              processing_image_upload
            </div>
          </div>
        )}

        {/* Aperçu de l'image uploadée */}
        {hasImage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
                <CheckCircle className="w-3 h-3" />
                <span>image_uploaded_successfully</span>
              </div>
              <Button
                variant="outline"
                size="sm" 
                onClick={clearImage}
                className="h-6 w-6 p-0 bg-[#0A0A0A] border-[#333333] text-gray-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Aperçu de l'image */}
            <div className="relative">
              <NextImage
                src={imageData?.uploadedUrl || '/placeholder-image.png'}
                alt="Uploaded image"
                width={200}
                height={128}
                className="w-full h-32 object-cover rounded-lg border border-[#333333]"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Métadonnées de l'image */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
              {imageData?.width && imageData?.height && (
                <span>resolution: {imageData.width}×{imageData.height}</span>
              )}
              {imageData?.fileSize && (
                <span>file_size: {Math.round(imageData.fileSize / 1024)}KB</span>
              )}
              {imageData?.format && (
                <span>format: {imageData.format}</span>
              )}
              <span>status: ready</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-green-500/10 hover:border-green-500/30"
                onClick={() => window.open(imageData?.uploadedUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                view_full
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs font-mono bg-[#0A0A0A] border-[#333333] text-white hover:bg-green-500/10 hover:border-green-500/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                replace
              </Button>
            </div>

            <div className="text-xs text-green-400 font-mono">
              ✓ Ready for video generation
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {data.status === 'error' && data.errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-red-400 font-mono">{data.errorMessage}</span>
            </div>
          </div>
        )}

        {/* État d'attente */}
        {data.status === 'idle' && !hasImage && (
          <div className="text-center text-xs text-gray-500 font-mono">
            select_an_image_to_begin_video_generation
          </div>
        )}
      </div>

      {/* Footer avec informations techniques */}
      <div className="border-t border-[#333333] p-3 bg-[#111111]/50">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span>cost: {data.config?.costCredits || 0}_credits</span>
            <span>source: local_upload</span>
          </div>
          <span className="text-gray-500">image_input</span>
        </div>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}