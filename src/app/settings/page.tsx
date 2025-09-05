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
import { ApiKeysSection } from '@/components/settings/ApiKeysSection';

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
    <div className="min-h-screen bg-cyber-gradient relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      
      {/* Header */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-white hover:bg-secondary font-mono text-xs">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                dashboard
              </Link>
            </Button>
            <div className="animate-slide-in">
              <h1 className="font-mono text-lg text-white mb-1">settings</h1>
              <p className="text-muted-foreground text-xs font-mono">
                configuration • preferences • account
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 relative z-10">
        <Tabs defaultValue="profile" className="space-y-8 animate-fade-in-up">
          <TabsList className="bg-secondary/50 border-secondary">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono text-xs">profile</TabsTrigger>
            <TabsTrigger value="apikeys" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono text-xs">api_keys</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono text-xs">notifications</TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono text-xs">privacy</TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono text-xs">preferences</TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono text-xs">account</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 animate-fade-in-up">
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
                  <User className="w-5 h-5" />
                  user_profile
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

          {/* API Keys Tab */}
          <TabsContent value="apikeys" className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <ApiKeysSection />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
                  <Bell className="w-5 h-5" />
                  notifications_config
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base text-white font-mono">email_notifications</Label>
                      <p className="text-sm text-muted-foreground font-mono">receive updates via email</p>
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
                      <Label className="text-base text-white font-mono">push_notifications</Label>
                      <p className="text-sm text-muted-foreground font-mono">real-time notifications</p>
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
                      <Label className="text-base text-white font-mono">weekly_report</Label>
                      <p className="text-sm text-muted-foreground font-mono">performance summary</p>
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
                      <Label className="text-base text-white font-mono">content_reminders</Label>
                      <p className="text-sm text-muted-foreground font-mono">content creation suggestions</p>
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
                      <Label className="text-base text-white font-mono">team_updates</Label>
                      <p className="text-sm text-muted-foreground font-mono">collaborator activity</p>
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
                
                <Button onClick={() => handleSaveSettings('notifications')} className="bg-white hover:bg-white/90 text-black font-mono text-xs">
                  <Save className="w-4 h-4 mr-2" />
                  save_notifications
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
                  <Shield className="w-5 h-5" />
                  privacy_security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base text-white font-mono">public_profile</Label>
                      <p className="text-sm text-muted-foreground font-mono">profile visible to others</p>
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
                      <Label className="text-base text-white font-mono">content_analytics</Label>
                      <p className="text-sm text-muted-foreground font-mono">enable performance analysis</p>
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
                      <Label className="text-base text-white font-mono">data_collection</Label>
                      <p className="text-sm text-muted-foreground font-mono">improve services with usage data</p>
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
                  <h3 className="font-mono text-white text-sm">change_password</h3>
                  
                  <div>
                    <Label htmlFor="new-password" className="text-muted-foreground font-mono text-xs">new_password</Label>
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
                    <Label htmlFor="confirm-password" className="text-muted-foreground font-mono text-xs">confirm_password</Label>
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
                    className="bg-white hover:bg-white/90 text-black font-mono text-xs"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    change_password
                  </Button>
                </div>
                
                <Button onClick={() => handleSaveSettings('privacy')} className="bg-white hover:bg-white/90 text-black font-mono text-xs">
                  <Save className="w-4 h-4 mr-2" />
                  save_privacy
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-mono text-sm">
                  <Palette className="w-5 h-5" />
                  creation_preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base text-white font-mono">default_platforms</Label>
                  <p className="text-sm text-muted-foreground font-mono mb-3">auto-select on creation</p>
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
                  <Label htmlFor="video-length" className="text-base text-white font-mono">default_duration_sec</Label>
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
                  <Label htmlFor="quality" className="text-base text-white font-mono">preferred_quality</Label>
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
                      <Label className="text-base text-white font-mono">auto_scheduling</Label>
                      <p className="text-sm text-muted-foreground font-mono">schedule at optimal times</p>
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
                      <Label className="text-base text-white font-mono">auto_seo</Label>
                      <p className="text-sm text-muted-foreground font-mono">auto-generate hashtags & descriptions</p>
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
                      <Label className="text-base text-white font-mono">dark_mode</Label>
                      <p className="text-sm text-muted-foreground font-mono">dark interface mode</p>
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
                
                <Button onClick={() => handleSaveSettings('preferences')} className="bg-white hover:bg-white/90 text-black font-mono text-xs">
                  <Save className="w-4 h-4 mr-2" />
                  save_preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader>
                <CardTitle className="text-white font-mono text-sm">account_information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-muted-foreground font-mono">current_plan</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-white/10 text-white font-mono">pro</Badge>
                      <span className="text-sm text-white font-mono">1500 credits/month</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground font-mono">member_since</Label>
                    <p className="font-mono text-white">2024-01-15</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground font-mono">last_login</Label>
                    <p className="font-mono text-white">today 14:32</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground font-mono">content_created</Label>
                    <p className="font-mono text-white">127 videos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardHeader>
                <CardTitle className="text-red-400 font-mono text-sm">danger_zone</CardTitle>
                <CardDescription className="text-muted-foreground font-mono text-xs">
                  irreversible account actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-secondary/50 rounded-lg">
                  <div>
                    <Label className="text-base text-white font-mono">export_data</Label>
                    <p className="text-sm text-muted-foreground font-mono">download all personal data</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData} className="border-secondary text-white hover:bg-secondary/50 font-mono text-xs">
                    <Download className="w-4 h-4 mr-2" />
                    export
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-red-500/30 rounded-lg">
                  <div>
                    <Label className="text-base text-red-400 font-mono">delete_account</Label>
                    <p className="text-sm text-muted-foreground font-mono">permanent account deletion</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 font-mono text-xs"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    delete
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