'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Star, 
  Copy, 
  Edit3, 
  Trash2,
  Pin,
  PinOff,
  Sparkles,
  BookOpen,
  Hash,
  Wand2
} from 'lucide-react';
import { api } from '@/app/providers';
import { toast } from 'sonner';

export default function PromptsPage() {
  const { user, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

  const { data: userPrompts, refetch: refetchUserPrompts } = api.prompts.list.useQuery({ limit: 50 });
  const { data: templates } = api.prompts.getTemplates.useQuery();
  const { data: categories } = api.prompts.getCategories.useQuery();

  const createPromptMutation = api.prompts.create.useMutation({
    onSuccess: () => {
      refetchUserPrompts();
      setIsCreateDialogOpen(false);
      setNewPrompt({ title: '', content: '', category: '', tags: '' });
      toast.success('Votre prompt a été sauvegardé avec succès');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const togglePinMutation = api.prompts.update.useMutation({
    onSuccess: () => {
      refetchUserPrompts();
    },
  });

  const deletePromptMutation = api.prompts.delete.useMutation({
    onSuccess: () => {
      refetchUserPrompts();
      toast.success('Le prompt a été supprimé avec succès');
    },
  });

  const handleCreatePrompt = () => {
    createPromptMutation.mutate({
      title: newPrompt.title,
      content: newPrompt.content,
      category: newPrompt.category || undefined,
      tags: newPrompt.tags ? newPrompt.tags.split(',').map(t => t.trim()) : [],
    });
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Prompt copié dans le presse-papier');
  };

  const filteredUserPrompts = userPrompts?.filter(prompt =>
    prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredTemplates = templates?.filter(template =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Prompts & Templates</h1>
              <p className="text-slate-600">Gérez vos prompts sauvegardés et explorez les templates</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau prompt</DialogTitle>
                  <DialogDescription>
                    Sauvegardez un prompt pour le réutiliser plus tard
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titre</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Vidéo motivation entrepreneuriat"
                      value={newPrompt.title}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Contenu du prompt</Label>
                    <Textarea
                      id="content"
                      placeholder="Décrivez le type de contenu que vous voulez générer..."
                      value={newPrompt.content}
                      onChange={(e) => setNewPrompt(prev => ({ ...prev, content: e.target.value }))}
                      className="min-h-[120px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Catégorie</Label>
                      <Input
                        id="category"
                        placeholder="Ex: motivation, tutorial"
                        value={newPrompt.category}
                        onChange={(e) => setNewPrompt(prev => ({ ...prev, category: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="tags">Tags (séparés par virgules)</Label>
                      <Input
                        id="tags"
                        placeholder="Ex: viral, inspiration, business"
                        value={newPrompt.tags}
                        onChange={(e) => setNewPrompt(prev => ({ ...prev, tags: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleCreatePrompt}
                      disabled={!newPrompt.title || !newPrompt.content || createPromptMutation.isPending}
                    >
                      Créer le prompt
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Rechercher dans vos prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="user-prompts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="user-prompts" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Mes prompts ({userPrompts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Templates ({templates?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* User Prompts Tab */}
          <TabsContent value="user-prompts" className="space-y-6">
            {filteredUserPrompts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUserPrompts.map((prompt) => (
                  <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight">
                            {prompt.title}
                          </CardTitle>
                          {prompt.category && (
                            <Badge variant="secondary" className="mt-2">
                              {prompt.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePinMutation.mutate({
                              id: prompt.id,
                              isPinned: !prompt.isPinned,
                            })}
                          >
                            {prompt.isPinned ? (
                              <PinOff className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Pin className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {prompt.content}
                      </p>
                      
                      {prompt.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Hash className="w-2 h-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {prompt.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{prompt.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Utilisé {prompt.usageCount} fois</span>
                        {prompt.lastUsedAt && (
                          <span>
                            Dernière utilisation: {new Date(prompt.lastUsedAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(prompt.content)}
                          className="flex-1"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Navigate to create page with this prompt
                            window.location.href = `/create?prompt=${encodeURIComponent(prompt.content)}`;
                          }}
                          className="flex-1"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Utiliser
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePromptMutation.mutate({ id: prompt.id })}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun prompt sauvegardé</h3>
                <p className="text-slate-500 mb-6">
                  Créez votre premier prompt pour accélérer vos futures générations
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer mon premier prompt
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {filteredTemplates.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          {template.title}
                        </CardTitle>
                      </div>
                      {template.category && (
                        <Badge variant="secondary">
                          {template.category}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {template.content}
                      </p>
                      
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Hash className="w-2 h-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Utilisé {template.usageCount} fois</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span>Template officiel</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(template.content)}
                          className="flex-1"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copier
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Navigate to create page with this template
                            window.location.href = `/create?prompt=${encodeURIComponent(template.content)}`;
                          }}
                          className="flex-1"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Utiliser
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Templates bientôt disponibles</h3>
                <p className="text-slate-500">
                  Des templates créés par notre équipe seront ajoutés prochainement
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Categories Sidebar */}
        {categories && categories.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Catégories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge key={category.name} variant="outline" className="cursor-pointer">
                    {category.name} ({category.count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}