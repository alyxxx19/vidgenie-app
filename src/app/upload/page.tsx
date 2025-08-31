'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Video, 
  FileVideo, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

interface UploadedFile {
  file: File;
  id: string;
  preview: string;
  uploadProgress: number;
  status: 'uploading' | 'completed' | 'error';
}

export default function UploadPage() {
  const { user, isLoading } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      preview: URL.createObjectURL(file),
      uploadProgress: 0,
      status: 'uploading' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((fileObj) => {
      simulateUpload(fileObj.id);
    });
  }, []);

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, uploadProgress: 100, status: 'completed' }
              : f
          )
        );
        toast.success('Vidéo uploadée avec succès!');
      } else {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, uploadProgress: progress }
              : f
          )
        );
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
    },
    maxFiles: 10,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  const handleSaveToLibrary = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Veuillez uploader au moins une vidéo');
      return;
    }

    const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
    if (completedFiles.length === 0) {
      toast.error('Attendez que tous les uploads soient terminés');
      return;
    }

    try {
      // Simulate saving to library
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`${completedFiles.length} vidéo(s) ajoutée(s) à votre bibliothèque`);
      
      // Reset form
      setUploadedFiles([]);
      setDescription('');
      setTags('');
      setSelectedProject('');
    } catch (_error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Upload de vidéos</h1>
                <p className="text-slate-600">Ajoutez vos vidéos sources à la bibliothèque</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Upload Zone */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload de vidéos
            </CardTitle>
            <CardDescription>
              Formats supportés: MP4, AVI, MOV, WMV, FLV, WebM (max 500MB par fichier)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isDragActive 
                  ? 'Déposez vos vidéos ici...' 
                  : 'Glissez-déposez vos vidéos ou cliquez pour sélectionner'
                }
              </h3>
              <p className="text-slate-500">
                Vous pouvez uploader jusqu'à 10 vidéos simultanément
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Fichiers uploadés ({uploadedFiles.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedFiles.map((fileObj) => (
                <div key={fileObj.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="relative">
                    <video
                      src={fileObj.preview}
                      className="w-20 h-20 object-cover rounded bg-black"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white opacity-70" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium truncate">{fileObj.file.name}</p>
                      {fileObj.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {fileObj.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      {(fileObj.file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                    
                    {fileObj.status === 'uploading' && (
                      <div className="space-y-1">
                        <Progress value={fileObj.uploadProgress} className="h-2" />
                        <p className="text-xs text-slate-500">
                          Upload en cours... {Math.round(fileObj.uploadProgress)}%
                        </p>
                      </div>
                    )}
                    
                    {fileObj.status === 'completed' && (
                      <Badge className="bg-green-100 text-green-800">
                        Upload terminé
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeFile(fileObj.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Metadata Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informations des vidéos</CardTitle>
            <CardDescription>
              Ajoutez des métadonnées pour organiser votre contenu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="project">Projet</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campaign-1">Campagne Printemps 2024</SelectItem>
                    <SelectItem value="campaign-2">Série Tutoriels</SelectItem>
                    <SelectItem value="campaign-3">Content Marketing Q1</SelectItem>
                    <SelectItem value="new">+ Nouveau projet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="lifestyle, tutorial, marketing..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du contenu uploadé..."
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleSaveToLibrary}
                disabled={uploadedFiles.length === 0 || uploadedFiles.some(f => f.status === 'uploading')}
                className="flex-1"
              >
                <FileVideo className="w-4 h-4 mr-2" />
                Ajouter à la bibliothèque
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/library">
                  Voir la bibliothèque
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}