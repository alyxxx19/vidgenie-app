'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  Video,
  Clock,
  Target,
  Download,
  Filter,
  Calendar,
  Eye,
  Heart,
  Share,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock analytics data
const mockAnalytics = {
  overview: {
    totalViews: 2456780,
    totalLikes: 145230,
    totalShares: 23450,
    totalComments: 12340,
    avgEngagementRate: 8.7,
    totalVideos: 127,
    totalProjects: 8,
    avgVideoLength: 32,
  },
  
  performance: {
    viewsGrowth: 23.5,
    engagementGrowth: 12.8,
    followersGrowth: 18.2,
    conversionRate: 4.2,
  },
  
  platforms: [
    { name: 'TikTok', views: 1456780, engagement: 9.2, color: '#FF0050' },
    { name: 'Instagram', views: 678450, engagement: 7.8, color: '#E4405F' },
    { name: 'YouTube', views: 321550, engagement: 6.4, color: '#FF0000' },
  ],
  
  timelineData: [
    { date: '2024-01', views: 156780, engagement: 7.2, videos: 12 },
    { date: '2024-02', views: 234560, engagement: 8.1, videos: 18 },
    { date: '2024-03', views: 345670, engagement: 8.7, videos: 24 },
    { date: '2024-04', views: 456780, engagement: 9.2, videos: 21 },
    { date: '2024-05', views: 567890, engagement: 8.9, videos: 27 },
    { date: '2024-06', views: 634520, engagement: 9.5, videos: 25 },
  ],
  
  topContent: [
    {
      id: '1',
      title: 'Morning Routine Productive',
      views: 245670,
      engagement: 12.4,
      platform: 'TikTok',
      createdAt: new Date('2024-02-15'),
    },
    {
      id: '2',
      title: 'React Tips & Tricks',
      views: 198450,
      engagement: 11.2,
      platform: 'YouTube',
      createdAt: new Date('2024-03-02'),
    },
    {
      id: '3',
      title: 'Fashion Haul Spring',
      views: 176320,
      engagement: 10.8,
      platform: 'Instagram',
      createdAt: new Date('2024-02-28'),
    },
  ],
  
  audienceInsights: {
    demographics: [
      { name: '18-24', value: 35, color: '#8884d8' },
      { name: '25-34', value: 42, color: '#82ca9d' },
      { name: '35-44', value: 18, color: '#ffc658' },
      { name: '45+', value: 5, color: '#ff7c7c' },
    ],
    
    topCountries: [
      { country: 'France', percentage: 45, users: 125670 },
      { country: 'Canada', percentage: 22, users: 61450 },
      { country: 'Belgique', percentage: 15, users: 41230 },
      { country: 'Suisse', percentage: 18, users: 50120 },
    ],
    
    peakHours: [
      { hour: '08:00', engagement: 67 },
      { hour: '12:00', engagement: 89 },
      { hour: '18:00', engagement: 95 },
      { hour: '21:00', engagement: 78 },
    ],
  },
};

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cyber-gradient flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-glow-pulse">
            <BarChart3 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-cyber-textMuted">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-cyber-gradient relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-lg border-b border-secondary relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 animate-fade-in-up">
              <Button variant="ghost" asChild className="text-cyber-textMuted hover:text-primary transition-colors">
                <Link href="/dashboard">
                  <ArrowLeft className="w-5 h-5 mr-3" />
                  RETOUR
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Analytics avancées</h1>
                <p className="text-slate-600">Analysez les performances de votre contenu</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="90d">90 jours</SelectItem>
                  <SelectItem value="1y">1 an</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Vues totales</p>
                  <p className="text-2xl font-bold">{formatNumber(mockAnalytics.overview.totalViews)}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">+{mockAnalytics.performance.viewsGrowth}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Engagement</p>
                  <p className="text-2xl font-bold">{mockAnalytics.overview.avgEngagementRate}%</p>
                </div>
                <Heart className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">+{mockAnalytics.performance.engagementGrowth}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Vidéos créées</p>
                  <p className="text-2xl font-bold">{mockAnalytics.overview.totalVideos}</p>
                </div>
                <Video className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-slate-500">Durée moyenne: {mockAnalytics.overview.avgVideoLength}s</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Taux de conversion</p>
                  <p className="text-2xl font-bold">{mockAnalytics.performance.conversionRate}%</p>
                </div>
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">+2.1% ce mois</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="platforms">Plateformes</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="content">Top contenu</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des performances</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={mockAnalytics.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="views"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Vues"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="engagement"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Engagement (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {mockAnalytics.platforms.map((platform) => (
                <Card key={platform.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      {platform.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Vues</span>
                        <span className="font-bold">{formatNumber(platform.views)}</span>
                      </div>
                      <Progress 
                        value={(platform.views / mockAnalytics.overview.totalViews) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Engagement</span>
                        <span className="font-bold">{platform.engagement}%</span>
                      </div>
                      <Progress value={platform.engagement * 10} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Répartition des vues par plateforme</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={mockAnalytics.platforms}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="views"
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {mockAnalytics.platforms.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatNumber(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Démographie par âge</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={mockAnalytics.audienceInsights.demographics}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }: any) => `${name}: ${value}%`}
                      >
                        {mockAnalytics.audienceInsights.demographics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Pays principaux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockAnalytics.audienceInsights.topCountries.map((country) => (
                    <div key={country.country}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{country.country}</span>
                        <span>{country.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span>{formatNumber(country.users)} utilisateurs</span>
                      </div>
                      <Progress value={country.percentage} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Heures de pic d'engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mockAnalytics.audienceInsights.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="engagement" fill="#3b82f6" name="Engagement %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contenu le plus performant</CardTitle>
                <CardDescription>
                  Vos vidéos avec les meilleures performances cette période
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalytics.topContent.map((content, index) => (
                    <div key={content.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                        #{index + 1}
                      </div>
                      
                      <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium">{content.title}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {content.platform}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {content.createdAt.toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {formatNumber(content.views)}
                        </div>
                        <div className="text-sm text-slate-500">vues</div>
                        <div className="text-sm font-medium text-green-600">
                          {content.engagement}% engagement
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Performance Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Métriques moyennes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Vues par vidéo</span>
                    <span className="font-medium">
                      {formatNumber(Math.round(mockAnalytics.overview.totalViews / mockAnalytics.overview.totalVideos))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Likes par vidéo</span>
                    <span className="font-medium">
                      {formatNumber(Math.round(mockAnalytics.overview.totalLikes / mockAnalytics.overview.totalVideos))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Partages par vidéo</span>
                    <span className="font-medium">
                      {formatNumber(Math.round(mockAnalytics.overview.totalShares / mockAnalytics.overview.totalVideos))}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Croissance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Vues</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-green-600 font-medium">+{mockAnalytics.performance.viewsGrowth}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Engagement</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-green-600 font-medium">+{mockAnalytics.performance.engagementGrowth}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Followers</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-green-600 font-medium">+{mockAnalytics.performance.followersGrowth}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Objectifs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Engagement cible</span>
                      <span>8.7% / 10%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Vidéos/mois</span>
                      <span>25 / 30</span>
                    </div>
                    <Progress value={83} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Croissance</span>
                      <span>23.5% / 20%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}