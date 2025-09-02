'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Video, 
  Calendar, 
  TrendingUp, 
  Zap,
  Clock,
  AlertCircle,
  LogOut,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/app/providers';
import ContentCalendar from '@/components/content-calendar';
import ContentHistory from '@/components/content-history';
import TimeDisplay from '@/components/time-display';
import DashboardSkeleton from '@/components/dashboard-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth();
  const [_selectedDate, _setSelectedDate] = useState<Date | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Always call hooks, but conditionally enable them
  const { data: _recentJobs } = api.jobs.list.useQuery(
    { limit: 5 },
    { enabled: !!user, staleTime: 60000 }
  );
  const { data: userAssets } = api.assets.list.useQuery(
    { limit: 20 },
    { enabled: !!user, staleTime: 60000 }
  );
  const { data: scheduledPosts } = api.publishing.getScheduled.useQuery(
    {},
    { enabled: !!user, staleTime: 60000 }
  );
  const { data: creditBalance } = api.credits.getBalance.useQuery(
    undefined,
    { enabled: !!user, staleTime: 30000 }
  );
  const { data: generationMetrics } = api.analytics.getGenerationMetrics.useQuery(
    { days: 30 },
    { enabled: !!user, staleTime: 300000 }
  );
  const { data: usagePatterns } = api.analytics.getUsagePatterns.useQuery(
    { days: 7 },
    { enabled: !!user, staleTime: 300000 }
  );
  const { data: subscription } = api.stripe.getSubscription.useQuery(
    undefined,
    { enabled: !!user, staleTime: 300000 }
  );
  
  
  // Handle loading and auth states AFTER all hooks
  if (!isLoading && !user) {
    redirect('/auth/signin');
  }

  if (isLoading && isInitialLoad) {
    return <DashboardSkeleton />;
  }

  if (!isLoading && isInitialLoad) {
    setIsInitialLoad(false);
  }

  if (!user) {
    return null;
  }

  // Use default values immediately to avoid recalculations
  const stats = {
    creditsUsed: creditBalance?.usedThisMonth ?? 0,
    creditsTotal: creditBalance?.balance ?? 1000,
    contentGenerated: userAssets?.assets?.length ?? 0,
    scheduledPosts: scheduledPosts?.length ?? 0,
    successRate: generationMetrics?.successRate ?? 95,
    weeklyContent: usagePatterns?.weeklyContent ?? 0,
    avgGenerationTime: generationMetrics?.avgGenerationTime ? Math.round(generationMetrics.avgGenerationTime / 60) : 5,
  };


  // Transform data for calendar and history - calculate directly without hooks
  const calendarEvents = [
    ...(userAssets?.assets?.map(asset => ({
      id: asset.id,
      title: asset.filename?.replace('.mp4', '') || 'Contenu généré',
      date: new Date(asset.createdAt),
      type: 'generated' as const,
      platforms: (asset.aiConfig as any)?.platforms || ['tiktok'],
      status: asset.status,
    })) || []),
    ...(scheduledPosts?.map(post => ({
      id: post.id,
      title: post.title || 'Post programmé',
      date: new Date(post.scheduledAt!),
      type: 'scheduled' as const,
      platforms: post.platforms,
      status: post.status,
    })) || []),
  ];

  const contentHistory = userAssets?.assets?.map(asset => ({
    id: asset.id,
    title: asset.filename?.replace('.mp4', '') || 'Contenu sans titre',
    prompt: asset.prompt || '',
    createdAt: new Date(asset.createdAt),
    status: asset.status,
    platforms: (asset.aiConfig as any)?.platforms || ['tiktok'],
    duration: asset.duration || 0,
    views: Math.floor(Math.random() * 10000 + 100),
  })) || [];

  const _getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Terminé</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Échec</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
          <div className="flex items-center justify-between">
            <div className="animate-slide-in">
              <h1 className="font-mono text-lg text-white mb-1">dashboard</h1>
              <div className="flex items-center gap-4">
                <p className="text-muted-foreground text-xs font-mono flex items-center gap-2">
                  <span className="w-1 h-1 bg-white animate-minimal-pulse" />
                  {user?.name || 'user'} • online
                </p>
                <TimeDisplay />
              </div>
            </div>
            <div className="flex items-center gap-1 animate-slide-in">
              <div className="hidden xl:flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white hover:bg-secondary text-xs font-mono">
                  <Link href="/projects">
                    projects
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white hover:bg-secondary text-xs font-mono">
                  <Link href="/library">
                    library
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white hover:bg-secondary text-xs font-mono">
                  <Link href="/analytics">
                    analytics
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white hover:bg-secondary text-xs font-mono">
                  <Link href="/account/billing">
                    billing
                  </Link>
                </Button>
              </div>
              
              <Button asChild className="bg-white hover:bg-white/90 text-black font-mono text-xs px-4 h-8 ml-2">
                <Link href="/create">
                  <Plus className="w-3 h-3 mr-1" />
                  create
                </Link>
              </Button>
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-white hover:bg-secondary ml-1"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-card/80 backdrop-blur-sm border-secondary hover:border-primary/50 transition-all duration-300 group hover:shadow-glow animate-fade-in-up">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-cyber-textMuted uppercase tracking-wide">CRÉDITS DISPONIBLES</CardTitle>
              <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-[var(--font-poppins)] font-bold text-white mb-2">
                {stats.creditsTotal - stats.creditsUsed}
              </div>
              <p className="text-sm text-cyber-textMuted mb-4">
                sur <span className="text-white font-semibold">{stats.creditsTotal}</span> disponibles
              </p>
              <div className="space-y-2">
                <Progress 
                  value={stats.creditsTotal > 0 ? (stats.creditsUsed / stats.creditsTotal) * 100 : 0} 
                  className="h-2 bg-secondary"
                />
                <div className="flex justify-between text-xs text-cyber-textMuted">
                  <span>Utilisés: {stats.creditsUsed}</span>
                  <span>{Math.round((stats.creditsUsed / stats.creditsTotal) * 100)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-secondary hover:border-success/50 transition-all duration-300 group hover:shadow-glow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-cyber-textMuted uppercase tracking-wide">CONTENUS GÉNÉRÉS</CardTitle>
              <div className="p-2 bg-success/20 rounded-lg group-hover:bg-success/30 transition-colors">
                <Video className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-[var(--font-poppins)] font-bold text-white mb-2">
                {stats.contentGenerated}
              </div>
              <p className="text-sm text-cyber-textMuted">
                ce mois-ci • <span className="text-success">+12%</span> vs mois dernier
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-secondary hover:border-accent/50 transition-all duration-300 group hover:shadow-glow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-cyber-textMuted uppercase tracking-wide">PUBLICATIONS PROGRAM.</CardTitle>
              <div className="p-2 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-[var(--font-poppins)] font-bold text-white mb-2">
                {stats.scheduledPosts}
              </div>
              <p className="text-sm text-cyber-textMuted">
                cette semaine • <span className="text-accent">En attente</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-secondary hover:border-warning/50 transition-all duration-300 group hover:shadow-glow animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-cyber-textMuted uppercase tracking-wide">TAUX DE RÉUSSITE</CardTitle>
              <div className="p-2 bg-warning/20 rounded-lg group-hover:bg-warning/30 transition-colors">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-[var(--font-poppins)] font-bold text-white mb-2">
                {stats.successRate}%
              </div>
              <p className="text-sm text-cyber-textMuted">
                génération IA • <span className="text-success">Excellent</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status */}
        {subscription && (
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-secondary animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white font-mono">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                ABONNEMENT {subscription.planName.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={
                        subscription.status === 'active' 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {subscription.status === 'active' ? 'Actif' : subscription.status}
                    </Badge>
                    {subscription.cancelAtPeriodEnd && (
                      <Badge variant="outline" className="text-warning">
                        Annulation programmée
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-cyber-textMuted">
                    Prochaine facturation : {subscription.currentPeriodEnd.toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs font-mono">
                  <Link href="/account/billing">
                    Gérer l'abonnement
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade Prompt for Free Users */}
        {(!subscription || subscription.planName === 'free') && (
          <Card className="mb-8 bg-primary/10 border-primary/30 backdrop-blur-sm animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-primary font-mono">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Zap className="w-6 h-6" />
                </div>
                PASSEZ AU NIVEAU SUPÉRIEUR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <p className="text-white font-semibold mb-1">Débloquez plus de fonctionnalités</p>
                  <p className="text-sm text-cyber-textMuted">
                    Plus de crédits, génération avancée, analytics détaillées
                  </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono">
                  <Link href="/pricing">
                    Voir les plans
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Alerts */}
        {((stats.successRate < 90) || (stats.weeklyContent < 3) || (stats.avgGenerationTime > 10)) && (
          <Card className="mb-12 bg-error/10 border-error/30 backdrop-blur-sm animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-error font-[var(--font-poppins)]">
                <div className="p-2 bg-error/20 rounded-lg animate-pulse">
                  <AlertCircle className="w-6 h-6" />
                </div>
                ALERTES PERFORMANCE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.successRate < 90 && (
                  <div className="flex items-center gap-4 p-4 bg-error/20 border border-error/30 rounded-xl backdrop-blur-sm">
                    <div className="p-2 bg-error/30 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-error" />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Taux de réussite critique</p>
                      <p className="text-sm text-cyber-textMuted">
                        Performance actuelle : <span className="text-error font-semibold">{stats.successRate}%</span> (objectif : 90%+)
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.weeklyContent < 3 && (
                  <div className="flex items-center gap-4 p-4 bg-warning/20 border border-warning/30 rounded-xl backdrop-blur-sm">
                    <div className="p-2 bg-warning/30 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Activité en baisse</p>
                      <p className="text-sm text-cyber-textMuted">
                        Contenus cette semaine : <span className="text-warning font-semibold">{stats.weeklyContent}</span> (recommandé : 3+)
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.avgGenerationTime > 10 && (
                  <div className="flex items-center gap-3 p-3 bg-secondary border border-border">
                    <Clock className="w-4 h-4 text-white" />
                    <div>
                      <p className="font-mono text-sm text-white mb-1">high_processing_time</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        avg: {stats.avgGenerationTime}min (target: ≤10min)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar and Content Management */}
        <Tabs defaultValue="calendar" className="space-y-8 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-secondary/50 border-secondary">
              <TabsTrigger value="calendar" className="flex items-center gap-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                <Calendar className="w-4 h-4" />
                CALENDRIER ÉDITORIAL
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                <Video className="w-4 h-4" />
                HISTORIQUE CONTENU
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-cyber-textMuted hover:text-primary transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                EXPORTER
              </Button>
            </div>
          </div>

          <TabsContent value="calendar" className="animate-fade-in-up">
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardContent className="p-6">
                <ContentCalendar
                  events={calendarEvents}
                  onDateSelect={_setSelectedDate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="animate-fade-in-up">
            <Card className="bg-card/80 backdrop-blur-sm border-secondary">
              <CardContent className="p-6">
                <ContentHistory
                  content={contentHistory}
                  isLoading={!userAssets}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}