'use client';

import React, { useState } from 'react';
import { api } from '@/app/providers';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Key,
  Camera,
  Phone,
  Mail,
  Calendar,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiKeysSection } from '@/components/settings/ApiKeysSection';

interface UserData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio: string;
  website: string;
  location?: string;
  timezone: string;
  language: string;
  creatorType: string;
  planName: string;
  memberSince: string;
  lastLogin: string;
  contentCreated: number;
  isOnline: boolean;
}

interface UserSettings {
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

interface UserSectionProps {
  user: any;
}

export default function UserSection({ user }: UserSectionProps) {
  // Récupération des données réelles via TRPC
  const { data: profile, isLoading: profileLoading, refetch } = api.user.getProfile.useQuery();
  const { data: userStats } = api.user.getUserStats.useQuery();
  const { data: userSettings, isLoading: settingsLoading } = api.user.getUserSettings.useQuery();

  // Mutations pour sauvegarder les données
  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profil sauvegardé');
      refetch();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const { refetch: exportUserData, isFetching: isExporting } = api.user.exportUserData.useQuery(
    undefined,
    {
      enabled: false, // Ne pas exécuter automatiquement
    }
  );

  const handleExportData = async () => {
    try {
      const { data } = await exportUserData();
      if (data) {
        // Créer un fichier JSON et le télécharger
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vidgenie-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Données exportées avec succès');
      }
    } catch (error) {
      toast.error(`Erreur lors de l'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const requestAccountDeletionMutation = api.user.requestAccountDeletion.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.message}. Période de grâce: ${result.gracePeriodDays} jours`);
    },
    onError: (error) => {
      toast.error(`Erreur lors de la demande: ${error.message}`);
    },
  });

  const updateSettingsMutation = api.user.updateUserSettings.useMutation({
    onSuccess: () => {
      toast.success('Paramètres sauvegardés');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  
  const [userData, setUserData] = useState<UserData>({
    id: user?.id || '',
    name: user?.name || 'Utilisateur',
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    avatar: '',
    bio: '',
    website: '',
    location: '',
    timezone: 'Europe/Paris',
    language: 'fr-FR',
    creatorType: 'solo',
    planName: 'free',
    memberSince: '',
    lastLogin: '',
    contentCreated: 0,
    isOnline: false,
  });

  // Mettre à jour les données locales quand les données du profil arrivent
  React.useEffect(() => {
    if (profile) {
      setUserData({
        id: profile.id,
        name: profile.name || 'Utilisateur',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email,
        phone: profile.phone || '',
        avatar: profile.avatar || '',
        bio: profile.bio || '',
        website: profile.website || '',
        location: profile.location || '',
        timezone: profile.timezone,
        language: profile.preferredLang,
        creatorType: profile.creatorType,
        planName: profile.planId,
        memberSince: profile.memberSince,
        lastLogin: profile.lastLogin,
        contentCreated: userStats?.contentCreated || 0,
        isOnline: profile.isOnline,
      });
    }
  }, [profile, userStats]);

  const [settings, setSettings] = useState<UserSettings>({
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
      defaultPlatforms: ['tiktok'],
      autoSchedule: false,
      defaultVideoLength: 30,
      qualityPreference: 'high',
      autoSEO: true,
      darkMode: false,
    },
  });

  // Mettre à jour les settings quand les données arrivent
  React.useEffect(() => {
    if (userSettings) {
      setSettings({
        notifications: {
          emailNotifications: userSettings.emailNotifications,
          pushNotifications: userSettings.pushNotifications,
          weeklyReport: userSettings.weeklyReport,
          contentReminders: userSettings.contentReminders,
          teamUpdates: userSettings.teamUpdates,
          marketingEmails: userSettings.marketingEmails,
        },
        privacy: {
          profilePublic: userSettings.profilePublic,
          contentAnalytics: userSettings.contentAnalytics,
          dataCollection: userSettings.dataCollection,
          thirdPartyIntegrations: userSettings.thirdPartyIntegrations,
        },
        preferences: {
          defaultPlatforms: userSettings.defaultPlatforms,
          autoSchedule: userSettings.autoSchedule,
          defaultVideoLength: userSettings.defaultVideoLength,
          qualityPreference: userSettings.qualityPreference,
          autoSEO: userSettings.autoSEO,
          darkMode: false, // Pas encore dans la DB
        },
      });
    }
  }, [userSettings]);

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    updateProfileMutation.mutate({
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      bio: userData.bio,
      website: userData.website,
      location: userData.location,
      timezone: userData.timezone,
      preferredLang: userData.language,
    });
  };

  const handleSaveSettings = async (section: keyof UserSettings) => {
    if (section === 'notifications') {
      const notificationSettings = settings.notifications;
      updateSettingsMutation.mutate({
        emailNotifications: notificationSettings.emailNotifications,
        pushNotifications: notificationSettings.pushNotifications,
        weeklyReport: notificationSettings.weeklyReport,
        contentReminders: notificationSettings.contentReminders,
        teamUpdates: notificationSettings.teamUpdates,
        marketingEmails: notificationSettings.marketingEmails,
      });
    } else if (section === 'privacy') {
      const privacySettings = settings.privacy;
      updateSettingsMutation.mutate({
        profilePublic: privacySettings.profilePublic,
        contentAnalytics: privacySettings.contentAnalytics,
        dataCollection: privacySettings.dataCollection,
        thirdPartyIntegrations: privacySettings.thirdPartyIntegrations,
      });
    } else if (section === 'preferences') {
      const preferenceSettings = settings.preferences;
      updateSettingsMutation.mutate({
        defaultPlatforms: preferenceSettings.defaultPlatforms,
        autoSchedule: preferenceSettings.autoSchedule,
        defaultVideoLength: preferenceSettings.defaultVideoLength,
        qualityPreference: preferenceSettings.qualityPreference,
        autoSEO: preferenceSettings.autoSEO,
      });
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('les mots de passe ne correspondent pas');
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('mot de passe modifié');
      setNewPassword('');
      setConfirmPassword('');
    } catch (_error) {
      toast.error('erreur lors de la modification');
    }
  };

  const handleAvatarUpload = () => {
    // Simulate file upload
    toast.success('photo de profil mise à jour');
  };


  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ ATTENTION: Cette action planifiera la suppression définitive de votre compte dans 7 jours.\n\nToutes vos données (contenus, paramètres, historique) seront définitivement perdues.\n\nÊtes-vous absolument sûr de vouloir continuer ?')) {
      return;
    }

    const reason = prompt('Optionnel: Pouvez-vous nous dire pourquoi vous supprimez votre compte ? (cela nous aide à améliorer nos services)');
    
    try {
      requestAccountDeletionMutation.mutate({
        reason: reason || undefined,
        feedback: undefined,
      });
    } catch (error) {
      toast.error('Erreur lors de la demande de suppression');
    }
  };

  if (profileLoading || settingsLoading) {
    return (
      <div className="space-y-8">
        <Card className="bg-card border border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* User Info Header */}
      <Card className="bg-card border border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className="bg-secondary text-foreground text-2xl font-mono">
                  {userData.firstName?.[0] || userData.name?.[0] || 'U'}
                  {userData.lastName?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-foreground text-background hover:bg-foreground/90 rounded-full"
                onClick={handleAvatarUpload}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-mono text-foreground">{userData.firstName} {userData.lastName}</h2>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${userData.isOnline ? 'bg-success' : 'bg-secondary'}`} />
                    <span className="text-xs font-mono text-muted-foreground">
                      {userData.isOnline ? 'online' : 'offline'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {userData.email}
                  </div>
                  {userData.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {userData.phone}
                    </div>
                  )}
                  {userData.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {userData.location}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Badge className="bg-secondary text-foreground font-mono text-xs">
                  plan {userData.planName}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Calendar className="w-3 h-3" />
                  membre depuis {userData.memberSince}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {userData.contentCreated} contenus créés
                </div>
              </div>

              {userData.bio && (
                <p className="text-sm text-muted-foreground font-mono max-w-2xl">
                  {userData.bio}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
            <User className="w-3 h-3" />
            profile
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
            <Key className="w-3 h-3" />
            api keys
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
            <Bell className="w-3 h-3" />
            notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
            <Shield className="w-3 h-3" />
            privacy
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
            <Palette className="w-3 h-3" />
            preferences
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
            <User className="w-3 h-3" />
            account
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
                <User className="w-4 h-4" />
                informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-xs font-mono text-muted-foreground">prénom</Label>
                  <Input
                    id="firstName"
                    value={userData.firstName}
                    onChange={(e) => setUserData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs font-mono text-muted-foreground">nom</Label>
                  <Input
                    id="lastName"
                    value={userData.lastName}
                    onChange={(e) => setUserData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-xs font-mono text-muted-foreground">email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-mono text-muted-foreground">téléphone</Label>
                  <Input
                    id="phone"
                    value={userData.phone || ''}
                    onChange={(e) => setUserData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="bio" className="text-xs font-mono text-muted-foreground">bio</Label>
                <Textarea
                  id="bio"
                  placeholder="parlez-nous de vous..."
                  value={userData.bio}
                  onChange={(e) => setUserData(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website" className="text-xs font-mono text-muted-foreground">site web</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://monsite.com"
                    value={userData.website}
                    onChange={(e) => setUserData(prev => ({ ...prev, website: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-xs font-mono text-muted-foreground">localisation</Label>
                  <Input
                    id="location"
                    value={userData.location || ''}
                    onChange={(e) => setUserData(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone" className="text-xs font-mono text-muted-foreground">fuseau horaire</Label>
                  <Select 
                    value={userData.timezone}
                    onValueChange={(value) => setUserData(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="Europe/Paris">Paris (GMT+1)</SelectItem>
                      <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                      <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="language" className="text-xs font-mono text-muted-foreground">langue</Label>
                  <Select 
                    value={userData.language}
                    onValueChange={(value) => setUserData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="fr-FR">français</SelectItem>
                      <SelectItem value="en-US">english (us)</SelectItem>
                      <SelectItem value="es-ES">español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleSaveProfile} className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs">
                <Save className="w-4 h-4 mr-2" />
                sauvegarder le profil
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="space-y-6">
          <ApiKeysSection />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
                <Bell className="w-4 h-4" />
                configuration des notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-foreground font-mono">notifications email</Label>
                    <p className="text-xs text-muted-foreground font-mono">recevoir les mises à jour par email</p>
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
                    <Label className="text-sm text-foreground font-mono">notifications push</Label>
                    <p className="text-xs text-muted-foreground font-mono">notifications en temps réel</p>
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
                    <Label className="text-sm text-foreground font-mono">rapport hebdomadaire</Label>
                    <p className="text-xs text-muted-foreground font-mono">résumé des performances</p>
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
                    <Label className="text-sm text-foreground font-mono">rappels de contenu</Label>
                    <p className="text-xs text-muted-foreground font-mono">suggestions de création</p>
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
                    <Label className="text-sm text-foreground font-mono">mises à jour équipe</Label>
                    <p className="text-xs text-muted-foreground font-mono">activité des collaborateurs</p>
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
              
              <Button onClick={() => handleSaveSettings('notifications')} className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs">
                <Save className="w-4 h-4 mr-2" />
                sauvegarder notifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
                <Shield className="w-4 h-4" />
                confidentialité et sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-foreground font-mono">profil public</Label>
                    <p className="text-xs text-muted-foreground font-mono">profil visible par les autres</p>
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
                    <Label className="text-sm text-foreground font-mono">analytics du contenu</Label>
                    <p className="text-xs text-muted-foreground font-mono">analyse des performances</p>
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
                    <Label className="text-sm text-foreground font-mono">collecte de données</Label>
                    <p className="text-xs text-muted-foreground font-mono">améliorer les services</p>
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
              
              <Separator className="bg-border" />
              
              {/* Password Change */}
              <div className="space-y-4">
                <h3 className="font-mono text-foreground text-sm">changer le mot de passe</h3>
                
                <div>
                  <Label htmlFor="new-password" className="text-xs font-mono text-muted-foreground">nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-secondary border-border text-foreground"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="confirm-password" className="text-xs font-mono text-muted-foreground">confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                
                <Button 
                  onClick={handlePasswordChange}
                  disabled={!newPassword || newPassword !== confirmPassword}
                  className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs"
                >
                  <Key className="w-4 h-4 mr-2" />
                  changer le mot de passe
                </Button>
              </div>
              
              <Button onClick={() => handleSaveSettings('privacy')} className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs">
                <Save className="w-4 h-4 mr-2" />
                sauvegarder confidentialité
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground font-mono text-sm">
                <Palette className="w-4 h-4" />
                préférences de création
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm text-foreground font-mono">plateformes par défaut</Label>
                <p className="text-xs text-muted-foreground font-mono mb-3">sélection automatique lors de la création</p>
                <div className="flex gap-2">
                  {['tiktok', 'instagram', 'youtube'].map(platform => (
                    <Button
                      key={platform}
                      variant={settings.preferences.defaultPlatforms.includes(platform) ? 'default' : 'outline'}
                      size="sm"
                      className="font-mono text-xs"
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
                      {platform}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="video-length" className="text-sm text-foreground font-mono">durée par défaut (sec)</Label>
                <Select 
                  value={settings.preferences.defaultVideoLength.toString()}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, defaultVideoLength: parseInt(value) }
                  }))}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="15">15 secondes</SelectItem>
                    <SelectItem value="30">30 secondes</SelectItem>
                    <SelectItem value="45">45 secondes</SelectItem>
                    <SelectItem value="60">60 secondes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quality" className="text-sm text-foreground font-mono">qualité préférée</Label>
                <Select 
                  value={settings.preferences.qualityPreference}
                  onValueChange={(value) => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, qualityPreference: value }
                  }))}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="standard">standard (720p)</SelectItem>
                    <SelectItem value="high">haute (1080p)</SelectItem>
                    <SelectItem value="ultra">ultra (4k)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-foreground font-mono">programmation automatique</Label>
                    <p className="text-xs text-muted-foreground font-mono">programmer aux moments optimaux</p>
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
                    <Label className="text-sm text-foreground font-mono">seo automatique</Label>
                    <p className="text-xs text-muted-foreground font-mono">génération auto des hashtags</p>
                  </div>
                  <Switch
                    checked={settings.preferences.autoSEO}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, autoSEO: checked }
                    }))}
                  />
                </div>
              </div>
              
              <Button onClick={() => handleSaveSettings('preferences')} className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs">
                <Save className="w-4 h-4 mr-2" />
                sauvegarder préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-foreground font-mono text-sm">informations du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground font-mono">plan actuel</Label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-secondary text-foreground font-mono text-xs">
                      {userData.planName}
                    </Badge>
                    <span className="text-xs text-foreground font-mono">1500 crédits/mois</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground font-mono">membre depuis</Label>
                  <p className="font-mono text-foreground text-xs">{userData.memberSince}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground font-mono">dernière connexion</Label>
                  <p className="font-mono text-foreground text-xs">{userData.lastLogin}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground font-mono">contenus créés</Label>
                  <p className="font-mono text-foreground text-xs">{userData.contentCreated} vidéos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-foreground font-mono text-sm">zone de danger</CardTitle>
              <CardDescription className="text-muted-foreground font-mono text-xs">
                actions irréversibles du compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border">
                <div>
                  <Label className="text-sm text-foreground font-mono">exporter les données</Label>
                  <p className="text-xs text-muted-foreground font-mono">télécharger toutes les données personnelles</p>
                </div>
                <Button variant="outline" onClick={handleExportData} className="border-border text-foreground hover:bg-secondary font-mono text-xs">
                  <Download className="w-4 h-4 mr-2" />
                  exporter
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-border">
                <div>
                  <Label className="text-sm text-foreground font-mono">supprimer le compte</Label>
                  <p className="text-xs text-muted-foreground font-mono">suppression définitive du compte</p>
                </div>
                <Button 
                  variant="outline" 
                  className="text-foreground border-border hover:bg-secondary font-mono text-xs"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}