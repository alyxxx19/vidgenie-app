'use client';

import React, { useState, useEffect } from 'react';
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
  CreditCard,
  User
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/app/providers';
import { LazyWrapper } from '@/components/lazy/LazyWrapper';
import { LazyContentCalendar, LazyContentHistory, preloadComponentsByRoute } from '@/components/lazy';
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
  const { data: creditBalance, refetch: refetchCredits } = api.credits.getBalance.useQuery(
    undefined,
    { enabled: !!user, staleTime: 30000, refetchInterval: 60000 } // Refetch every minute
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
  
  // Préchargement intelligent des composants - MUST be before any conditional returns
  useEffect(() => {
    if (user && !isLoading) {
      // Précharger les composants de dashboard après le chargement initial
      preloadComponentsByRoute('/dashboard');
    }
  }, [user, isLoading]);
  
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
    creditsTotal: creditBalance?.balance ?? 0, // Show 0 instead of 1000 to reflect real data
    contentGenerated: userAssets?.assets?.length ?? 0,
    scheduledPosts: scheduledPosts?.length ?? 0,
    successRate: generationMetrics?.successRate ?? 0,
    weeklyContent: usagePatterns?.weeklyContent ?? 0,
    avgGenerationTime: generationMetrics?.avgGenerationTime ? Math.round(generationMetrics.avgGenerationTime / 60) : 0,
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
  })) || [];

  const _getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-secondary text-foreground font-mono text-xs">terminé</Badge>;
      case 'running':
        return <Badge className="bg-secondary text-foreground font-mono text-xs">en cours</Badge>;
      case 'pending':
        return <Badge className="bg-secondary text-muted-foreground font-mono text-xs">en attente</Badge>;
      case 'failed':
        return <Badge className="bg-secondary text-muted-foreground font-mono text-xs">échec</Badge>;
      default:
        return <Badge className="bg-secondary text-muted-foreground font-mono text-xs">{status}</Badge>;
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-mono uppercase tracking-wide text-foreground">dashboard</h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-xs font-mono text-muted-foreground">
                  {user?.email?.split('@')[0] || 'user'} • online
                </p>
                <TimeDisplay />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground font-mono lowercase text-xs transition-all duration-200 hover:scale-105">
                  <Link href="/projects">
                    projects
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground font-mono lowercase text-xs transition-all duration-200 hover:scale-105">
                  <Link href="/library">
                    library
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground font-mono lowercase text-xs transition-all duration-200 hover:scale-105">
                  <Link href="/analytics">
                    analytics
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground font-mono lowercase text-xs transition-all duration-200 hover:scale-105">
                  <Link href="/account/billing">
                    billing
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground font-mono lowercase text-xs transition-all duration-200 hover:scale-105">
                  <Link href="/profile">
                    <User className="w-3 h-3 mr-1" />
                    profile
                  </Link>
                </Button>
              </div>
              
              <Button asChild className="bg-foreground text-background hover:bg-transparent hover:text-foreground hover:border-foreground border border-transparent transition-all duration-300 hover:scale-105 font-mono lowercase text-xs px-4 h-8 ml-2">
                <Link href="/create">
                  <Plus className="w-3 h-3 mr-1" />
                  create
                </Link>
              </Button>
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-foreground ml-1 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-card border border-border hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">crédits disponibles</CardTitle>
              <div className="p-2 bg-background border border-border">
                <Zap className="h-5 w-5 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono text-foreground mb-2">
                {creditBalance !== undefined ? (
                  creditBalance.balance - creditBalance.usedThisMonth
                ) : (
                  <span className="inline-block w-20 h-8 bg-secondary animate-pulse" />
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-4">
                {creditBalance !== undefined ? (
                  <>sur <span className="text-foreground">{creditBalance.balance}</span> disponibles</>
                ) : (
                  <span className="inline-block w-32 h-4 bg-secondary animate-pulse" />
                )}
              </p>
              <div className="space-y-2">
                <Progress 
                  value={creditBalance && creditBalance.balance > 0 ? (creditBalance.usedThisMonth / creditBalance.balance) * 100 : 0} 
                  className="h-2 bg-secondary"
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>{creditBalance ? `Utilisés: ${creditBalance.usedThisMonth}` : ''}</span>
                  <span>
                    {creditBalance && creditBalance.balance > 0 
                      ? Math.round((creditBalance.usedThisMonth / creditBalance.balance) * 100) + '%'
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">contenus générés</CardTitle>
              <div className="p-2 bg-background border border-border">
                <Video className="h-5 w-5 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono text-foreground mb-2">
                {stats.contentGenerated}
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                {stats.contentGenerated > 0 ? 'ce mois-ci' : 'Aucun contenu généré'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">publications programmées</CardTitle>
              <div className="p-2 bg-background border border-border">
                <Calendar className="h-5 w-5 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono text-foreground mb-2">
                {stats.scheduledPosts}
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                {stats.scheduledPosts > 0 ? `cette semaine • ${stats.scheduledPosts} post${stats.scheduledPosts > 1 ? 's' : ''}` : 'Aucune publication programmée'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">taux de réussite</CardTitle>
              <div className="p-2 bg-background border border-border">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono text-foreground mb-2">
                {stats.successRate > 0 ? `${stats.successRate}%` : '-'}
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                {stats.successRate > 0 ? (
                  <>génération IA • <span className="text-foreground">
                    {stats.successRate >= 90 ? 'excellent' : stats.successRate >= 70 ? 'bon' : 'à améliorer'}
                  </span></>
                ) : 'aucune donnée'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Status */}
        {subscription && (
          <Card className="mb-8 bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-foreground font-mono">
                <div className="p-2 bg-background border border-border">
                  <CreditCard className="w-6 h-6 text-foreground" />
                </div>
                abonnement {subscription.planName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className="bg-secondary text-foreground font-mono text-xs"
                    >
                      {subscription.status === 'active' ? 'actif' : subscription.status}
                    </Badge>
                    {subscription.cancelAtPeriodEnd && (
                      <Badge className="bg-secondary text-muted-foreground font-mono text-xs">
                        annulation programmée
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    Prochaine facturation : {subscription.currentPeriodEnd.toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground font-mono text-xs">
                  <Link href="/account/billing">
                    gérer l'abonnement
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade Prompt for Free Users */}
        {(!subscription || subscription.planName === 'free') && (
          <Card className="mb-8 bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-foreground font-mono">
                <div className="p-2 bg-background border border-border">
                  <Zap className="w-6 h-6 text-foreground" />
                </div>
                passez au niveau supérieur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <p className="text-foreground font-mono mb-1">débloquez plus de fonctionnalités</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    plus de crédits, génération avancée, analytics détaillées
                  </p>
                </div>
                <Button asChild className="bg-foreground text-background hover:bg-transparent hover:text-foreground hover:border-foreground border border-transparent transition-all duration-300 hover:scale-105 font-mono text-xs">
                  <Link href="/pricing">
                    voir les plans
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Alerts */}
        {((stats.successRate < 90 && stats.successRate > 0) || (stats.weeklyContent < 3) || (stats.avgGenerationTime > 10 && stats.avgGenerationTime > 0)) && (
          <Card className="mb-12 bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-foreground font-mono">
                <div className="p-2 bg-background border border-border">
                  <AlertCircle className="w-6 h-6 text-foreground" />
                </div>
                alertes performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.successRate < 90 && stats.successRate > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-secondary border border-border">
                    <div className="p-2 bg-background border border-border">
                      <AlertCircle className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-mono text-foreground mb-1">taux de réussite critique</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        performance actuelle : <span className="text-foreground">{stats.successRate}%</span> (objectif : 90%+)
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.weeklyContent < 3 && (
                  <div className="flex items-center gap-4 p-4 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="p-2 bg-orange-200 dark:bg-orange-900/50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Activité en baisse</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Contenus cette semaine : <span className="text-orange-600 dark:text-orange-400 font-semibold">{stats.weeklyContent}</span> (recommandé : 3+)
                      </p>
                    </div>
                  </div>
                )}
                
                {stats.avgGenerationTime > 10 && stats.avgGenerationTime > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="p-2 bg-yellow-200 dark:bg-yellow-900/50 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Temps de traitement élevé</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Moyenne : <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{stats.avgGenerationTime} min</span> (objectif : ≤10 min)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar and Content Management */}
        <Tabs defaultValue="calendar" className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
                <Calendar className="w-4 h-4" />
                calendrier éditorial
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-xs">
                <Video className="w-4 h-4" />
                historique contenu
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground font-mono text-xs transition-all duration-200">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                exporter
              </Button>
            </div>
          </div>

          <TabsContent value="calendar">
            <Card className="bg-card border border-border">
              <CardContent className="p-6">
                <LazyWrapper name="calendrier éditorial" retryable={true}>
                  <LazyContentCalendar
                    events={calendarEvents}
                    onDateSelect={_setSelectedDate}
                  />
                </LazyWrapper>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-card border border-border">
              <CardContent className="p-6">
                <LazyWrapper name="historique contenu" retryable={true}>
                  <LazyContentHistory
                    content={contentHistory}
                    isLoading={!userAssets}
                  />
                </LazyWrapper>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}