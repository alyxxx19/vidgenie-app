'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Users, 
  Activity, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Settings,
  Shield,
  Database,
  Server,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock admin data
const mockAdminData = {
  overview: {
    totalUsers: 12847,
    activeUsers: 8934,
    totalGenerations: 245670,
    totalRevenue: 47825.50,
    systemHealth: 99.2,
    supportTickets: 23,
  },
  
  userGrowth: [
    { date: '2024-01', users: 1250, active: 890, revenue: 8420 },
    { date: '2024-02', users: 2340, active: 1670, revenue: 15680 },
    { date: '2024-03', users: 4560, active: 3240, revenue: 28340 },
    { date: '2024-04', users: 7890, active: 5610, revenue: 39670 },
    { date: '2024-05', users: 10450, active: 7430, revenue: 44820 },
    { date: '2024-06', users: 12847, active: 8934, revenue: 47825 },
  ],
  
  systemMetrics: {
    cpuUsage: 34,
    memoryUsage: 67,
    diskUsage: 45,
    apiLatency: 120,
    errorRate: 0.8,
    uptime: 99.2,
  },
  
  recentUsers: [
    {
      id: '1',
      name: 'Marie Dubois',
      email: 'marie@example.com',
      plan: 'Pro',
      status: 'active',
      joinedAt: new Date('2024-03-15'),
      lastActive: new Date('2024-03-20'),
      generations: 47,
    },
    {
      id: '2',
      name: 'Julien Martin',
      email: 'julien@example.com',
      plan: 'Starter',
      status: 'active',
      joinedAt: new Date('2024-03-10'),
      lastActive: new Date('2024-03-19'),
      generations: 23,
    },
    {
      id: '3',
      name: 'Sophie Laurent',
      email: 'sophie@example.com',
      plan: 'Free',
      status: 'inactive',
      joinedAt: new Date('2024-02-28'),
      lastActive: new Date('2024-03-05'),
      generations: 12,
    },
  ],
  
  systemAlerts: [
    {
      id: '1',
      type: 'warning',
      message: 'Taux d\'erreur API légèrement élevé (0.8%)',
      timestamp: new Date('2024-03-20T10:30:00'),
      severity: 'medium',
    },
    {
      id: '2',
      type: 'info',
      message: 'Maintenance programmée demain à 02:00',
      timestamp: new Date('2024-03-20T09:15:00'),
      severity: 'low',
    },
    {
      id: '3',
      type: 'success',
      message: 'Nouvelle version déployée avec succès',
      timestamp: new Date('2024-03-19T14:45:00'),
      severity: 'low',
    },
  ],
};

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

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

  // Mock admin check - in real app, check user role
  if (user.email !== 'admin@vidgenie.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Accès restreint</h2>
          <p className="text-slate-600 mb-4">Vous n&apos;avez pas les permissions d&apos;admin</p>
          <Button asChild>
            <Link href="/dashboard">Retour au dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactif</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspendu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
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
                  Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Administration</h1>
                <p className="text-slate-600">Gestion système et utilisateurs</p>
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
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
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
                  <p className="text-sm font-medium text-slate-600">Utilisateurs totaux</p>
                  <p className="text-2xl font-bold">{mockAdminData.overview.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">+12.5% ce mois</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Utilisateurs actifs</p>
                  <p className="text-2xl font-bold">{mockAdminData.overview.activeUsers.toLocaleString()}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-slate-500">
                  {Math.round((mockAdminData.overview.activeUsers / mockAdminData.overview.totalUsers) * 100)}% du total
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Revenus</p>
                  <p className="text-2xl font-bold">{formatCurrency(mockAdminData.overview.totalRevenue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">+8.2% ce mois</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Santé système</p>
                  <p className="text-2xl font-bold">{mockAdminData.overview.systemHealth}%</p>
                </div>
                <Server className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-xs text-green-600">Tous systèmes OK</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="system">Système</TabsTrigger>
            <TabsTrigger value="billing">Facturation</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Croissance des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={mockAdminData.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="users"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Utilisateurs totaux"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="active"
                      stackId="2"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Utilisateurs actifs"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Revenus (€)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gestion des utilisateurs</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Rechercher un utilisateur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAdminData.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0)}
                        </div>
                        
                        <div>
                          <h4 className="font-medium">{user.name}</h4>
                          <p className="text-sm text-slate-500">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{user.plan}</Badge>
                            {getStatusBadge(user.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">{user.generations} générations</div>
                        <div className="text-xs text-slate-500">
                          Inscrit: {user.joinedAt.toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-slate-500">
                          Actif: {user.lastActive.toLocaleDateString('fr-FR')}
                        </div>
                        
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="outline">
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Shield className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Serveurs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU</span>
                      <span>{mockAdminData.systemMetrics.cpuUsage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${mockAdminData.systemMetrics.cpuUsage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Mémoire</span>
                      <span>{mockAdminData.systemMetrics.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${mockAdminData.systemMetrics.memoryUsage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Disque</span>
                      <span>{mockAdminData.systemMetrics.diskUsage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${mockAdminData.systemMetrics.diskUsage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Latence API</span>
                    <span className="font-medium">{mockAdminData.systemMetrics.apiLatency}ms</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Taux d&apos;erreur</span>
                    <span className="font-medium text-yellow-600">{mockAdminData.systemMetrics.errorRate}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Uptime</span>
                    <span className="font-medium text-green-600">{mockAdminData.systemMetrics.uptime}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Générations/min</span>
                    <span className="font-medium">247</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Base de données
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Connexions actives</span>
                    <span className="font-medium">47</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Taille DB</span>
                    <span className="font-medium">2.4 GB</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Requêtes/sec</span>
                    <span className="font-medium">1,247</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Cache hit rate</span>
                    <span className="font-medium text-green-600">94.2%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(mockAdminData.overview.totalRevenue)}
                    </div>
                    <p className="text-sm text-slate-600">Revenus totaux</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(mockAdminData.overview.totalRevenue * 0.23)}
                    </div>
                    <p className="text-sm text-slate-600">MRR (ce mois)</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">4.2%</div>
                    <p className="text-sm text-slate-600">Taux de conversion</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">2.1%</div>
                    <p className="text-sm text-slate-600">Taux de churn</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alertes système</CardTitle>
                <CardDescription>
                  Surveillance en temps réel de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAdminData.systemAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-4 border rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-slate-500">
                          {alert.timestamp.toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          alert.severity === 'high' 
                            ? 'border-red-200 text-red-800'
                            : alert.severity === 'medium'
                            ? 'border-yellow-200 text-yellow-800'
                            : 'border-green-200 text-green-800'
                        }
                      >
                        {alert.severity === 'high' ? 'Critique' : alert.severity === 'medium' ? 'Moyen' : 'Info'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}