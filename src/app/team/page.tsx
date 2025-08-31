'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Users, 
  Mail, 
  Crown, 
  Edit3, 
  Trash2,
  MoreVertical,
  ArrowLeft,
  UserCheck,
  UserX,
  Clock,
  Settings,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: Date;
  lastActiveAt: Date;
  projects: string[];
  permissions: {
    canCreateContent: boolean;
    canEditContent: boolean;
    canPublish: boolean;
    canManageTeam: boolean;
    canViewAnalytics: boolean;
  };
}

// Mock team data
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Marie Dubois',
    email: 'marie@example.com',
    role: 'admin',
    status: 'active',
    joinedAt: new Date('2024-01-15'),
    lastActiveAt: new Date('2024-03-20'),
    projects: ['Campagne Printemps 2024', 'Content Marketing Q1'],
    permissions: {
      canCreateContent: true,
      canEditContent: true,
      canPublish: true,
      canManageTeam: true,
      canViewAnalytics: true,
    },
  },
  {
    id: '2',
    name: 'Julien Martin',
    email: 'julien@example.com',
    role: 'editor',
    status: 'active',
    joinedAt: new Date('2024-02-01'),
    lastActiveAt: new Date('2024-03-19'),
    projects: ['Série Tutoriels Tech'],
    permissions: {
      canCreateContent: true,
      canEditContent: true,
      canPublish: false,
      canManageTeam: false,
      canViewAnalytics: true,
    },
  },
  {
    id: '3',
    name: 'Sophie Laurent',
    email: 'sophie@example.com',
    role: 'viewer',
    status: 'pending',
    joinedAt: new Date('2024-03-18'),
    lastActiveAt: new Date('2024-03-18'),
    projects: [],
    permissions: {
      canCreateContent: false,
      canEditContent: false,
      canPublish: false,
      canManageTeam: false,
      canViewAnalytics: true,
    },
  },
];

const rolePermissions = {
  owner: { label: 'Propriétaire', color: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Administrateur', color: 'bg-blue-100 text-blue-800' },
  editor: { label: 'Éditeur', color: 'bg-green-100 text-green-800' },
  viewer: { label: 'Visualiseur', color: 'bg-gray-100 text-gray-800' },
};

export default function TeamPage() {
  const { user, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'viewer',
    message: '',
  });

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

  // Filter team members
  const filteredMembers = mockTeamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleSendInvite = async () => {
    if (!inviteData.email) {
      toast.error('Veuillez saisir un email');
      return;
    }

    try {
      // Simulate sending invite
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Invitation envoyée à ${inviteData.email}`);
      setIsInviteDialogOpen(false);
      setInviteData({ email: '', role: 'viewer', message: '' });
    } catch (_error) {
      toast.error('Erreur lors de l&apos;envoi de l&apos;invitation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
                <h1 className="text-2xl font-bold">Gestion d&apos;équipe</h1>
                <p className="text-slate-600">Gérez les collaborateurs et leurs permissions</p>
              </div>
            </div>
            
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Inviter un collaborateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inviter un nouveau collaborateur</DialogTitle>
                  <DialogDescription>
                    Envoyez une invitation pour rejoindre votre équipe
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="collaborateur@example.com"
                      value={inviteData.email}
                      onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="invite-role">Rôle</Label>
                    <Select 
                      value={inviteData.role} 
                      onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Visualiseur - Peut voir le contenu</SelectItem>
                        <SelectItem value="editor">Éditeur - Peut créer et modifier</SelectItem>
                        <SelectItem value="admin">Admin - Accès complet sauf propriété</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="invite-message">Message d&apos;invitation (optionnel)</Label>
                    <Input
                      id="invite-message"
                      placeholder="Message personnalisé..."
                      value={inviteData.message}
                      onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSendInvite}>
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer l&apos;invitation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Team Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Membres totaux</span>
              </div>
              <div className="text-2xl font-bold">{mockTeamMembers.length + 1}</div>
              <p className="text-xs text-slate-500">Vous inclus</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Actifs</span>
              </div>
              <div className="text-2xl font-bold">
                {mockTeamMembers.filter(m => m.status === 'active').length + 1}
              </div>
              <p className="text-xs text-slate-500">Connectés récemment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium">En attente</span>
              </div>
              <div className="text-2xl font-bold">
                {mockTeamMembers.filter(m => m.status === 'pending').length}
              </div>
              <p className="text-xs text-slate-500">Invitations envoyées</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Administrateurs</span>
              </div>
              <div className="text-2xl font-bold">
                {mockTeamMembers.filter(m => m.role === 'admin').length + 1}
              </div>
              <p className="text-xs text-slate-500">Accès complet</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un membre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="editor">Éditeur</SelectItem>
                  <SelectItem value="viewer">Visualiseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <div className="space-y-4">
          {/* Current User (Owner) */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{user.name}</h3>
                      <Crown className="w-4 h-4 text-yellow-500" />
                    </div>
                    <p className="text-slate-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-purple-100 text-purple-800">Propriétaire</Badge>
                      <Badge className="bg-green-100 text-green-800">Actif</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-slate-500 mb-2">
                    Créateur du compte
                  </div>
                  <div className="text-xs text-slate-400">
                    Dernière activité: Maintenant
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          {filteredMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-white font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-lg">{member.name}</h3>
                      <p className="text-slate-500">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={rolePermissions[member.role].color}>
                          {rolePermissions[member.role].label}
                        </Badge>
                        {getStatusBadge(member.status)}
                      </div>
                      
                      {member.projects.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-400 mb-1">Projets assignés:</p>
                          <div className="flex flex-wrap gap-1">
                            {member.projects.slice(0, 2).map(project => (
                              <Badge key={project} variant="outline" className="text-xs">
                                {project}
                              </Badge>
                            ))}
                            {member.projects.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{member.projects.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-slate-500 mb-2">
                      Rejoint le {member.joinedAt.toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-xs text-slate-400">
                      Dernière activité: {member.lastActiveAt.toLocaleDateString('fr-FR')}
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Permissions */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-slate-700 mb-2">Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {member.permissions.canCreateContent && (
                      <Badge variant="outline" className="text-xs">Créer contenu</Badge>
                    )}
                    {member.permissions.canEditContent && (
                      <Badge variant="outline" className="text-xs">Modifier contenu</Badge>
                    )}
                    {member.permissions.canPublish && (
                      <Badge variant="outline" className="text-xs">Publier</Badge>
                    )}
                    {member.permissions.canManageTeam && (
                      <Badge variant="outline" className="text-xs">Gérer équipe</Badge>
                    )}
                    {member.permissions.canViewAnalytics && (
                      <Badge variant="outline" className="text-xs">Voir analytics</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Role Explanations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Rôles et permissions</CardTitle>
            <CardDescription>
              Explication des différents niveaux d&apos;accès
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="bg-purple-100 text-purple-800">Propriétaire</Badge>
                  <div className="text-sm">
                    <p className="font-medium">Accès complet</p>
                    <p className="text-slate-500">Gestion facturation, suppression du compte</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Badge className="bg-blue-100 text-blue-800">Administrateur</Badge>
                  <div className="text-sm">
                    <p className="font-medium">Gestion complète</p>
                    <p className="text-slate-500">Création, édition, publication, gestion équipe</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="bg-green-100 text-green-800">Éditeur</Badge>
                  <div className="text-sm">
                    <p className="font-medium">Création et édition</p>
                    <p className="text-slate-500">Peut créer et modifier, mais pas publier</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Badge className="bg-gray-100 text-gray-800">Visualiseur</Badge>
                  <div className="text-sm">
                    <p className="font-medium">Lecture seule</p>
                    <p className="text-slate-500">Peut voir le contenu et les analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}