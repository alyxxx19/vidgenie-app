'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface UserSettings {
  profile: {
    name: string;
    email: string;
    bio: string;
    website: string;
    timezone: string;
    language: string;
    creatorType: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReport: boolean;
    contentReminders: boolean;
    teamUpdates: boolean;
    marketingEmails: boolean;
  };
  privacy: {
    profilePublic: boolean;
    contentAnalytics: boolean;
    dataCollection: boolean;
    thirdPartyIntegrations: boolean;
  };
  preferences: {
    defaultPlatforms: string[];
    autoSchedule: boolean;
    defaultVideoLength: number;
    qualityPreference: string;
    autoSEO: boolean;
    darkMode: boolean;
  };
}

const mockSettings: UserSettings = {
  profile: {
    name: 'Créateur Pro',
    email: 'createur@example.com',
    bio: 'Créateur de contenu spécialisé dans le lifestyle et la tech',
    website: 'https://monsite.com',
    timezone: 'Europe/Paris',
    language: 'fr-FR',
    creatorType: 'pro',
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    weeklyReport: true,
    contentReminders: false,
    teamUpdates: true,
    marketingEmails: false,
  },
  privacy: {
    profilePublic: false,
    contentAnalytics: true,
    dataCollection: true,
    thirdPartyIntegrations: true,
  },
  preferences: {
    defaultPlatforms: ['tiktok', 'instagram'],
    autoSchedule: false,
    defaultVideoLength: 30,
    qualityPreference: 'high',
    autoSEO: true,
    darkMode: false,
  },
};

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const [settings, setSettings] = useState(mockSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const handleSaveSettings = async (section: keyof UserSettings) => {
    try {
      // Simulate saving settings
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Paramètres sauvegardés!');
    } catch (_error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Mot de passe modifié avec succès');
      setNewPassword('');
      setConfirmPassword('');
    } catch (_error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleExportData = async () => {
    try {
      toast.success('Export des données en cours...');
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Données exportées! Vérifiez vos emails.');
    } catch (_error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte? Cette action est irréversible.')) {
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Demande de suppression envoyée');
    } catch (_error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-slate-600">Gérez vos préférences et paramètres de compte</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Confidentialité</TabsTrigger>
            <TabsTrigger value="preferences">Préférences</TabsTrigger>
            <TabsTrigger value="account">Compte</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      value={settings.profile.name}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, name: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, email: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Parlez-nous de vous..."
                    value={settings.profile.bio}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, bio: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://monsite.com"
                    value={settings.profile.website}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, website: e.target.value }
                    }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Select 
                      value={settings.profile.timezone}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, timezone: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                        <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Los Angeles (GMT-8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="language">Langue</Label>
                    <Select 
                      value={settings.profile.language}
                      onValueChange={(value) => setSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, language: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr-FR">Français</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button onClick={() => handleSaveSettings('profile')}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder le profil
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Préférences de notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Notifications email</Label>
                      <p className="text-sm text-slate-500">Recevez des mises à jour par email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, emailNotifications: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Notifications push</Label>
                      <p className="text-sm text-slate-500">Notifications en temps réel</p>
                    </div>
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, pushNotifications: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Rapport hebdomadaire</Label>
                      <p className="text-sm text-slate-500">Résumé de vos performances</p>
                    </div>
                    <Switch
                      checked={settings.notifications.weeklyReport}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, weeklyReport: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Rappels de contenu</Label>
                      <p className="text-sm text-slate-500">Suggestions pour créer du contenu</p>
                    </div>
                    <Switch
                      checked={settings.notifications.contentReminders}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, contentReminders: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Mises à jour équipe</Label>
                      <p className="text-sm text-slate-500">Activité des collaborateurs</p>
                    </div>
                    <Switch
                      checked={settings.notifications.teamUpdates}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, teamUpdates: checked }
                      }))}
                    />
                  </div>
                </div>
                
                <Button onClick={() => handleSaveSettings('notifications')}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder les notifications
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Confidentialité et sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Profil public</Label>
                      <p className="text-sm text-slate-500">Votre profil est visible par les autres utilisateurs</p>
                    </div>
                    <Switch
                      checked={settings.privacy.profilePublic}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, profilePublic: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Analytics de contenu</Label>
                      <p className="text-sm text-slate-500">Permettre l&apos;analyse de vos performances</p>
                    </div>
                    <Switch
                      checked={settings.privacy.contentAnalytics}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, contentAnalytics: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Collecte de données</Label>
                      <p className="text-sm text-slate-500">Améliorer nos services avec vos données d&apos;usage</p>
                    </div>
                    <Switch
                      checked={settings.privacy.dataCollection}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        privacy: { ...prev.privacy, dataCollection: checked }
                      }))}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Password Change */}
                <div className="space-y-4">
                  <h3 className="font-medium">Changer le mot de passe</h3>
                  
                  <div>
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handlePasswordChange}
                    disabled={!newPassword || newPassword !== confirmPassword}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Changer le mot de passe
                  </Button>
                </div>
                
                <Button onClick={() => handleSaveSettings('privacy')}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder la confidentialité
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Préférences de création
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base">Plateformes par défaut</Label>
                  <p className="text-sm text-slate-500 mb-3">Sélectionner automatiquement lors de la création</p>
                  <div className="flex gap-2">
                    {['tiktok', 'instagram', 'youtube'].map(platform => (
                      <Button
                        key={platform}
                        variant={settings.preferences.defaultPlatforms.includes(platform) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const platforms = settings.preferences.defaultPlatforms.includes(platform)
                            ? settings.preferences.defaultPlatforms.filter(p => p !== platform)
                            : [...settings.preferences.defaultPlatforms, platform];
                          setSettings(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, defaultPlatforms: platforms }
                          }));
                        }}
                      >
                        {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'YouTube'}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="video-length">Durée par défaut (secondes)</Label>
                  <Select 
                    value={settings.preferences.defaultVideoLength.toString()}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, defaultVideoLength: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 secondes</SelectItem>
                      <SelectItem value="30">30 secondes</SelectItem>
                      <SelectItem value="45">45 secondes</SelectItem>
                      <SelectItem value="60">60 secondes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quality">Qualité préférée</Label>
                  <Select 
                    value={settings.preferences.qualityPreference}
                    onValueChange={(value) => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, qualityPreference: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (720p)</SelectItem>
                      <SelectItem value="high">Haute (1080p)</SelectItem>
                      <SelectItem value="ultra">Ultra (4K)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Programmation automatique</Label>
                      <p className="text-sm text-slate-500">Programmer automatiquement aux heures optimales</p>
                    </div>
                    <Switch
                      checked={settings.preferences.autoSchedule}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, autoSchedule: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">SEO automatique</Label>
                      <p className="text-sm text-slate-500">Générer automatiquement hashtags et descriptions</p>
                    </div>
                    <Switch
                      checked={settings.preferences.autoSEO}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, autoSEO: checked }
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Mode sombre</Label>
                      <p className="text-sm text-slate-500">Interface en mode sombre</p>
                    </div>
                    <Switch
                      checked={settings.preferences.darkMode}
                      onCheckedChange={(checked) => setSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, darkMode: checked }
                      }))}
                    />
                  </div>
                </div>
                
                <Button onClick={() => handleSaveSettings('preferences')}>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder les préférences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-slate-500">Plan actuel</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">Pro</Badge>
                      <span className="text-sm">1500 crédits/mois</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-slate-500">Membre depuis</Label>
                    <p className="font-medium">15 janvier 2024</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-slate-500">Dernière connexion</Label>
                    <p className="font-medium">Aujourd&apos;hui à 14:32</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-slate-500">Contenu créé</Label>
                    <p className="font-medium">127 vidéos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Zone de danger</CardTitle>
                <CardDescription>
                  Actions irréversibles sur votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-blue-200 rounded-lg">
                  <div>
                    <Label className="text-base">Exporter mes données</Label>
                    <p className="text-sm text-slate-500">Télécharger toutes vos données personnelles</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Exporter
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <Label className="text-base text-red-600">Supprimer le compte</Label>
                    <p className="text-sm text-slate-500">Suppression définitive de votre compte et données</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}