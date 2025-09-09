'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  User, 
  Activity,
  Shield,
  Settings as SettingsIcon,
  Info,
  Camera,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Globe,
  Video,
  Eye,
  TrendingUp,
  Clock,
  Award,
  Zap,
  RefreshCcw,
  Key
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import UserSection from '@/components/user-section';
import { ApiKeysSection } from '@/components/settings/ApiKeysSection';
import { ChangePasswordModal } from '@/components/ui/change-password-modal';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { TwoFactorModal } from '@/components/ui/two-factor-modal';
import { api } from '@/app/providers';

const achievementLabels = {
  early_adopter: 'Adopteur précoce',
  content_master: 'Maître du contenu',
  viral_creator: 'Créateur viral',
  consistent_creator: 'Créateur assidu',
};

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<'setup' | 'disable'>('setup');

  // Récupération des données réelles via TRPC
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile, error: profileError } = api.user.getProfile.useQuery(
    undefined,
    { enabled: !!user, retry: false }
  );
  
  const { data: userStats, isLoading: statsLoading, error: statsError } = api.user.getUserStats.useQuery(
    undefined,
    { enabled: !!user, retry: false }
  );
  
  const { data: userActivity, isLoading: activityLoading, error: activityError, refetch: refetchActivity } = api.user.getUserActivity.useQuery(
    { limit: 5 },
    { enabled: !!user, retry: false }
  );

  const { data: twoFAStatus, refetch: refetch2FA } = api.user.get2FAStatus.useQuery(
    undefined,
    { enabled: !!user, retry: false }
  );

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profil mis à jour avec succès');
      refetchProfile();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
      }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // Si on a une erreur de profil, afficher une page d'erreur
  if (profileError || (!profile && !profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
      }}>
        <Card className="bg-card border border-border max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-mono text-foreground mb-2">Erreur de chargement</h2>
            <p className="text-muted-foreground font-mono mb-4">
              {profileError?.message || 'Impossible de charger le profil utilisateur'}
            </p>
            <Button onClick={() => refetchProfile()} className="font-mono">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
      }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    );
  }

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    // Refetch profile to get updated avatar
    refetchProfile();
  };

  const handle2FASetup = () => {
    setTwoFAMode('setup');
    setIs2FAModalOpen(true);
  };

  const handle2FADisable = () => {
    setTwoFAMode('disable');
    setIs2FAModalOpen(true);
  };

  const handle2FAModalClose = () => {
    setIs2FAModalOpen(false);
    refetch2FA(); // Refresh 2FA status after changes
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const displayName = profile.firstName && profile.lastName 
    ? `${profile.firstName} ${profile.lastName}`
    : profile.name || 'Utilisateur';

  const displayStats = userStats || {
    contentCreated: 0,
    totalViews: 0,
    avgEngagement: 0,
    timeSpent: 0,
    creationStreak: 0,
    achievements: [],
  };

  return (
    <div className="min-h-screen relative" style={{
      background: 'linear-gradient(180deg, #000000 0%, #111111 100%)'
    }}>
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        ),
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 39px,
          rgba(38, 38, 38, 0.3) 39px,
          rgba(38, 38, 38, 0.3) 40px
        )`
      }} />

      {/* Header */}
      <header className="relative z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground font-mono text-xs">
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-mono text-foreground">profil utilisateur</h1>
              <p className="text-xs font-mono text-muted-foreground">
                informations • paramètres • activité
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Profile Hero Section */}
        <Card className="bg-card border border-border mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-8">
              {/* Large Avatar */}
              <div className="relative group">
                <Avatar className="w-32 h-32 border-2 border-border">
                  <AvatarImage src={profile.avatar || undefined} alt={displayName} />
                  <AvatarFallback className="bg-secondary text-foreground text-4xl font-mono">
                    {profile.firstName?.[0] || profile.name?.[0] || 'U'}
                    {profile.lastName?.[0] || ''}
                  </AvatarFallback>
                </Avatar>
                <AvatarUpload
                  currentAvatar={profile.avatar || undefined}
                  userName={displayName}
                  onAvatarUpdate={handleAvatarUpdate}
                />
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-card ${profile.isOnline ? 'bg-green-500' : 'bg-secondary'}`} />
              </div>

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-mono text-foreground">
                      {displayName}
                    </h1>
                    <Badge className="bg-secondary text-foreground font-mono text-xs">
                      plan {profile.planId}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground font-mono mb-4">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {profile.phone}
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </div>
                    )}
                    {profile.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                          site web
                        </a>
                      </div>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-muted-foreground font-mono max-w-2xl mb-4">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Membre depuis {profile.memberSince}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Dernière connexion {profile.lastLogin}
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                {displayStats.achievements && displayStats.achievements.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Achievements:</span>
                    {displayStats.achievements.map((achievement) => (
                      <Badge key={achievement} className="bg-secondary text-foreground font-mono text-xs flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {achievementLabels[achievement as keyof typeof achievementLabels]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div>
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs"
                >
                  {isEditing ? 'Annuler' : 'Éditer le profil'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-card border border-border">
            <CardContent className="p-6 text-center">
              <Video className="w-8 h-8 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-mono text-foreground mb-1">
                {statsLoading ? (
                  <div className="w-8 h-8 bg-secondary animate-pulse rounded" />
                ) : (
                  displayStats.contentCreated
                )}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                contenus créés
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-6 text-center">
              <Eye className="w-8 h-8 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-mono text-foreground mb-1">
                {statsLoading ? (
                  <div className="w-12 h-8 bg-secondary animate-pulse rounded" />
                ) : (
                  formatNumber(displayStats.totalViews)
                )}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                vues estimées
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-mono text-foreground mb-1">
                {statsLoading ? (
                  <div className="w-10 h-8 bg-secondary animate-pulse rounded" />
                ) : (
                  `${displayStats.avgEngagement}%`
                )}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                taux de réussite
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-mono text-foreground mb-1">
                {statsLoading ? (
                  <div className="w-8 h-8 bg-secondary animate-pulse rounded" />
                ) : (
                  `${displayStats.timeSpent}min`
                )}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                temps total
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-6 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-foreground" />
              <div className="text-2xl font-mono text-foreground mb-1">
                {statsLoading ? (
                  <div className="w-6 h-8 bg-secondary animate-pulse rounded" />
                ) : (
                  displayStats.creationStreak
                )}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                jours consécutifs
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
              <Info className="w-3 h-3" />
              aperçu
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
              <SettingsIcon className="w-3 h-3" />
              paramètres
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
              <Activity className="w-3 h-3" />
              activité
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
              <Shield className="w-3 h-3" />
              sécurité
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
              <Key className="w-3 h-3" />
              api keys
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-mono text-sm">résumé du profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-mono text-foreground mb-2">Informations générales</h3>
                    <div className="space-y-2 text-sm font-mono text-muted-foreground">
                      <div>Nom: {displayName}</div>
                      <div>Email: {profile.email}</div>
                      <div>Localisation: {profile.location || 'Non renseigné'}</div>
                      <div>Fuseau horaire: {profile.timezone}</div>
                      <div>Langue: {profile.preferredLang}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-mono text-foreground mb-2">Statistiques</h3>
                    <div className="space-y-2 text-sm font-mono text-muted-foreground">
                      <div>Plan: {profile.planId}</div>
                      <div>Membre depuis: {profile.memberSince}</div>
                      <div>Contenus: {displayStats.contentCreated}</div>
                      <div>Vues estimées: {formatNumber(displayStats.totalViews)}</div>
                      <div>Taux de réussite: {displayStats.avgEngagement}%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab - Reuse UserSection */}
          <TabsContent value="settings" className="space-y-6">
            <UserSection user={user} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-card border border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground font-mono text-sm">activité récente</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchActivity()}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCcw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLoading ? (
                    // Skeleton loading
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border border-border">
                        <div className="w-8 h-8 bg-secondary animate-pulse border border-border" />
                        <div className="flex-1 space-y-2">
                          <div className="w-3/4 h-4 bg-secondary animate-pulse rounded" />
                          <div className="w-1/2 h-3 bg-secondary animate-pulse rounded" />
                        </div>
                      </div>
                    ))
                  ) : userActivity && userActivity.length > 0 ? (
                    userActivity.map((item, index) => (
                      <div key={item.id || index} className="flex items-center gap-4 p-3 border border-border">
                        <div className="w-8 h-8 bg-secondary border border-border flex items-center justify-center">
                          {item.type === 'create' && <Video className="w-4 h-4 text-foreground" />}
                          {item.type === 'publish' && <TrendingUp className="w-4 h-4 text-foreground" />}
                          {item.type === 'generation' && <Zap className="w-4 h-4 text-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-mono text-foreground">{item.action}</p>
                          <p className="text-xs font-mono text-muted-foreground">{item.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                      Aucune activité récente
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-mono text-sm">sécurité du compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border">
                    <div>
                      <h4 className="font-mono text-foreground">Mot de passe</h4>
                      <p className="text-xs font-mono text-muted-foreground">Dernière modification: il y a 30 jours</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-border text-foreground hover:bg-secondary font-mono text-xs"
                      onClick={() => setIsChangePasswordOpen(true)}
                    >
                      Modifier
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-border">
                    <div>
                      <h4 className="font-mono text-foreground">Authentification à deux facteurs</h4>
                      <p className="text-xs font-mono text-muted-foreground">
                        {twoFAStatus?.enabled ? 'Activé - Votre compte est protégé' : 'Sécurisez votre compte avec 2FA'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-border text-foreground hover:bg-secondary font-mono text-xs"
                      onClick={twoFAStatus?.enabled ? handle2FADisable : handle2FASetup}
                    >
                      {twoFAStatus?.enabled ? 'Désactiver' : 'Activer'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-border">
                    <div>
                      <h4 className="font-mono text-foreground">Sessions actives</h4>
                      <p className="text-xs font-mono text-muted-foreground">Gérer les appareils connectés</p>
                    </div>
                    <Button variant="outline" className="border-border text-foreground hover:bg-secondary font-mono text-xs">
                      Voir tout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <ApiKeysSection />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <ChangePasswordModal 
          open={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        />
        <TwoFactorModal
          open={is2FAModalOpen}
          onOpenChange={handle2FAModalClose}
          mode={twoFAMode}
          isEnabled={twoFAStatus?.enabled || false}
        />
      </div>
    </div>
  );
}