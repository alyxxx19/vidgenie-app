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
      <div className="min-h-screen bg-minimal-gradient flex items-center justify-center">
        <div className="text-center animate-slide-in">
          <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-xs">loading_analytics...</p>
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
    <div className="min-h-screen bg-minimal-gradient relative">
      {/* Minimal grid */}
      <div className="absolute inset-0 bg-grid-minimal opacity-30" />
      
      {/* Header */}
      <header className="bg-card border-b border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 animate-slide-in">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-white">
                <Link href="/dashboard">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  back
                </Link>
              </Button>
              <div>
                <h1 className="font-mono text-lg text-white mb-1">analytics</h1>
                <p className="text-muted-foreground text-xs font-mono">performance metrics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-20 h-8 bg-input border-border text-white font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="90d">90d</SelectItem>
                  <SelectItem value="1y">1y</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="border-border text-muted-foreground font-mono text-xs h-8">
                <Download className="w-3 h-3 mr-1" />
                export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Overview Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border-border hover:border-white/20 transition-colors animate-slide-in">
            <CardContent className="pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">total_views</p>
                  <p className="text-lg font-mono text-white">{formatNumber(mockAnalytics.overview.totalViews)}</p>
                </div>
                <Eye className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-xs text-white font-mono">+{mockAnalytics.performance.viewsGrowth}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border hover:border-white/20 transition-colors animate-slide-in">
            <CardContent className="pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">engagement</p>
                  <p className="text-lg font-mono text-white">{mockAnalytics.overview.avgEngagementRate}%</p>
                </div>
                <Heart className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-xs text-white font-mono">+{mockAnalytics.performance.engagementGrowth}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border hover:border-white/20 transition-colors animate-slide-in">
            <CardContent className="pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">videos_created</p>
                  <p className="text-lg font-mono text-white">{mockAnalytics.overview.totalVideos}</p>
                </div>
                <Video className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground font-mono">avg: {mockAnalytics.overview.avgVideoLength}s</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border hover:border-white/20 transition-colors animate-slide-in">
            <CardContent className="pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">conversion_rate</p>
                  <p className="text-lg font-mono text-white">{mockAnalytics.performance.conversionRate}%</p>
                </div>
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-white" />
                <span className="text-xs text-white font-mono">+2.1% monthly</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-secondary border-border">
            <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:text-black font-mono text-xs">performance</TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-white data-[state=active]:text-black font-mono text-xs">platforms</TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-white data-[state=active]:text-black font-mono text-xs">audience</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-white data-[state=active]:text-black font-mono text-xs">top_content</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm text-white">performance_timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockAnalytics.timelineData}>
                    <CartesianGrid strokeDasharray="1 1" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#737373" fontSize={10} />
                    <YAxis yAxisId="right" orientation="right" stroke="#737373" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#111111', 
                        border: '1px solid #262626', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }} 
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="views"
                      stroke="#ffffff"
                      strokeWidth={1}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="engagement"
                      stroke="#737373"
                      strokeWidth={1}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {mockAnalytics.platforms.map((platform) => (
                <Card key={platform.name} className="bg-card border-border hover:border-white/20 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-mono text-sm text-white">
                      <div className="w-2 h-2 bg-white" />
                      {platform.name.toLowerCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-mono text-muted-foreground">views</span>
                        <span className="font-mono text-white">{formatNumber(platform.views)}</span>
                      </div>
                      <Progress 
                        value={(platform.views / mockAnalytics.overview.totalViews) * 100} 
                        className="h-1 bg-secondary"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-mono text-muted-foreground">engagement</span>
                        <span className="font-mono text-white">{platform.engagement}%</span>
                      </div>
                      <Progress value={platform.engagement * 10} className="h-1 bg-secondary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm text-white">platform_distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAnalytics.platforms.map((platform, index) => (
                    <div key={platform.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white" />
                        <span className="font-mono text-xs text-muted-foreground">{platform.name.toLowerCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white">{formatNumber(platform.views)}</span>
                        <span className="font-mono text-xs text-muted-foreground">({Math.round((platform.views / mockAnalytics.overview.totalViews) * 100)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">age_demographics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mockAnalytics.audienceInsights.demographics.map((demo, index) => (
                      <div key={demo.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-white" />
                          <span className="font-mono text-xs text-muted-foreground">{demo.name}</span>
                        </div>
                        <span className="font-mono text-xs text-white">{demo.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">top_countries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockAnalytics.audienceInsights.topCountries.map((country) => (
                    <div key={country.country}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-mono text-muted-foreground">{country.country.toLowerCase()}</span>
                        <span className="font-mono text-white">{country.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className="font-mono">{formatNumber(country.users)} users</span>
                      </div>
                      <Progress value={country.percentage} className="h-1 bg-secondary" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm text-white">peak_engagement_hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockAnalytics.audienceInsights.peakHours.map((hour) => (
                    <div key={hour.hour} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground">{hour.hour}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-secondary h-1 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white transition-all duration-300"
                            style={{ width: `${hour.engagement}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-white">{hour.engagement}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-mono text-sm text-white">top_performing_content</CardTitle>
                <CardDescription className="font-mono text-xs text-muted-foreground">
                  highest performance videos this period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAnalytics.topContent.map((content, index) => (
                    <div key={content.id} className="flex items-center gap-3 p-3 border-b border-border last:border-b-0">
                      <div className="flex items-center justify-center w-6 h-6 bg-white text-black font-mono text-xs">
                        #{index + 1}
                      </div>
                      
                      <div className="w-12 h-12 bg-black flex items-center justify-center">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-mono text-sm text-white">{content.title.toLowerCase().replace(/\s+/g, '_')}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                            {content.platform.toLowerCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {content.createdAt.toLocaleDateString('en-US')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-mono text-white">
                          {formatNumber(content.views)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">views</div>
                        <div className="text-xs font-mono text-white">
                          {content.engagement}% engagement
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Performance Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">avg_metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-mono text-muted-foreground">views/video</span>
                    <span className="font-mono text-xs text-white">
                      {formatNumber(Math.round(mockAnalytics.overview.totalViews / mockAnalytics.overview.totalVideos))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-mono text-muted-foreground">likes/video</span>
                    <span className="font-mono text-xs text-white">
                      {formatNumber(Math.round(mockAnalytics.overview.totalLikes / mockAnalytics.overview.totalVideos))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-mono text-muted-foreground">shares/video</span>
                    <span className="font-mono text-xs text-white">
                      {formatNumber(Math.round(mockAnalytics.overview.totalShares / mockAnalytics.overview.totalVideos))}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">growth_metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-muted-foreground">views</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-white" />
                      <span className="text-white font-mono text-xs">+{mockAnalytics.performance.viewsGrowth}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-muted-foreground">engagement</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-white" />
                      <span className="text-white font-mono text-xs">+{mockAnalytics.performance.engagementGrowth}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-muted-foreground">followers</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-white" />
                      <span className="text-white font-mono text-xs">+{mockAnalytics.performance.followersGrowth}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">targets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono text-muted-foreground">engagement_target</span>
                      <span className="font-mono text-white">8.7% / 10%</span>
                    </div>
                    <Progress value={87} className="h-1 bg-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono text-muted-foreground">videos/month</span>
                      <span className="font-mono text-white">25 / 30</span>
                    </div>
                    <Progress value={83} className="h-1 bg-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono text-muted-foreground">growth_target</span>
                      <span className="font-mono text-white">23.5% / 20%</span>
                    </div>
                    <Progress value={100} className="h-1 bg-secondary" />
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