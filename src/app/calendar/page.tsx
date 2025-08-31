'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Video,
  Eye,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time: string;
  type: 'content_creation' | 'publication' | 'review' | 'meeting';
  status: 'scheduled' | 'completed' | 'cancelled';
  platforms?: string[];
  assignedTo?: string[];
  project?: string;
  priority: 'low' | 'medium' | 'high';
}

// Mock calendar events
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Publication: Look printemps casual',
    description: 'Publication du contenu lifestyle sur TikTok et Instagram',
    date: new Date('2024-03-25'),
    time: '14:00',
    type: 'publication',
    status: 'scheduled',
    platforms: ['tiktok', 'instagram'],
    assignedTo: ['marie@example.com'],
    project: 'Campagne Printemps 2024',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Création: Tutoriel React Hooks',
    description: 'Enregistrement du tutoriel sur les hooks React',
    date: new Date('2024-03-26'),
    time: '10:00',
    type: 'content_creation',
    status: 'scheduled',
    platforms: ['youtube'],
    assignedTo: ['julien@example.com'],
    project: 'Série Tutoriels Tech',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Review: Contenu Q2',
    description: 'Révision du planning de contenu pour Q2',
    date: new Date('2024-03-27'),
    time: '16:30',
    type: 'review',
    status: 'scheduled',
    assignedTo: ['marie@example.com', 'sophie@example.com'],
    project: 'Content Marketing Q2',
    priority: 'high',
  },
  {
    id: '4',
    title: 'Meeting équipe créative',
    description: 'Point mensuel sur les performances et nouvelles idées',
    date: new Date('2024-03-28'),
    time: '11:00',
    type: 'meeting',
    status: 'scheduled',
    assignedTo: ['marie@example.com', 'julien@example.com', 'sophie@example.com'],
    priority: 'medium',
  },
];

export default function CalendarPage() {
  const { user, isLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'content_creation',
    priority: 'medium',
    project: '',
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

  // Filter events
  const filteredEvents = mockEvents.filter(event => {
    if (typeFilter === 'all') return true;
    return event.type === typeFilter;
  });

  // Get events for selected date
  const eventsForDate = filteredEvents.filter(event => 
    event.date.toDateString() === selectedDate.toDateString()
  );

  // Get events with dates for calendar highlighting
  const eventDates = filteredEvents.map(event => event.date);

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'content_creation':
        return <Video className="w-4 h-4 text-blue-600" />;
      case 'publication':
        return <CalendarIcon className="w-4 h-4 text-green-600" />;
      case 'review':
        return <Eye className="w-4 h-4 text-orange-600" />;
      case 'meeting':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'content_creation':
        return <Badge className="bg-blue-100 text-blue-800">Création</Badge>;
      case 'publication':
        return <Badge className="bg-green-100 text-green-800">Publication</Badge>;
      case 'review':
        return <Badge className="bg-orange-100 text-orange-800">Révision</Badge>;
      case 'meeting':
        return <Badge className="bg-purple-100 text-purple-800">Réunion</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">Haute</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Moyenne</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Basse</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Simulate event creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Événement créé avec succès!');
      setIsCreateEventOpen(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '',
        type: 'content_creation',
        priority: 'medium',
        project: '',
      });
    } catch (_error) {
      toast.error('Erreur lors de la création de l\'événement');
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
                <h1 className="text-2xl font-bold">Calendrier éditorial</h1>
                <p className="text-slate-600">Planifiez et organisez votre contenu</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mois</SelectItem>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="day">Jour</SelectItem>
                </SelectContent>
              </Select>
              
              <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel événement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un événement</DialogTitle>
                    <DialogDescription>
                      Planifiez une tâche ou un événement dans votre calendrier
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="event-title">Titre *</Label>
                      <Input
                        id="event-title"
                        placeholder="Ex: Publication vidéo lifestyle"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="event-description">Description</Label>
                      <Input
                        id="event-description"
                        placeholder="Détails de l&apos;événement..."
                        value={newEvent.description}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="event-date">Date *</Label>
                        <Input
                          id="event-date"
                          type="date"
                          value={newEvent.date}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="event-time">Heure *</Label>
                        <Input
                          id="event-time"
                          type="time"
                          value={newEvent.time}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="event-type">Type</Label>
                        <Select 
                          value={newEvent.type} 
                          onValueChange={(value) => setNewEvent(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="content_creation">Création contenu</SelectItem>
                            <SelectItem value="publication">Publication</SelectItem>
                            <SelectItem value="review">Révision</SelectItem>
                            <SelectItem value="meeting">Réunion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="event-priority">Priorité</Label>
                        <Select 
                          value={newEvent.priority} 
                          onValueChange={(value) => setNewEvent(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Basse</SelectItem>
                            <SelectItem value="medium">Moyenne</SelectItem>
                            <SelectItem value="high">Haute</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsCreateEventOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleCreateEvent}>
                        Créer l&apos;événement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Aujourd&apos;hui
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="w-full"
                  modifiers={{
                    hasEvents: eventDates,
                  }}
                  modifiersClassNames={{
                    hasEvents: 'bg-blue-100 font-medium',
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Events Sidebar */}
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filtres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Type d&apos;événement</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="content_creation">Création contenu</SelectItem>
                      <SelectItem value="publication">Publication</SelectItem>
                      <SelectItem value="review">Révision</SelectItem>
                      <SelectItem value="meeting">Réunion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter calendrier
                </Button>
              </CardContent>
            </Card>

            {/* Events for Selected Date */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </CardTitle>
                <CardDescription>
                  {eventsForDate.length} événement(s) planifié(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventsForDate.length > 0 ? (
                  <div className="space-y-4">
                    {eventsForDate.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4 hover:bg-slate-50">
                        <div className="flex items-start gap-3">
                          {getEventTypeIcon(event.type)}
                          <div className="flex-1">
                            <h4 className="font-medium">{event.title}</h4>
                            {event.description && (
                              <p className="text-sm text-slate-500 mt-1">{event.description}</p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{event.time}</span>
                              {getEventTypeBadge(event.type)}
                              {getPriorityBadge(event.priority)}
                            </div>
                            
                            {event.project && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {event.project}
                                </Badge>
                              </div>
                            )}
                            
                            {event.platforms && (
                              <div className="flex gap-1 mt-2">
                                {event.platforms.map(platform => (
                                  <Badge key={platform} variant="outline" className="text-xs">
                                    {platform === 'tiktok' ? 'TikTok' : platform === 'instagram' ? 'Instagram' : 'YouTube'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost">
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun événement planifié</p>
                    <Button 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setIsCreateEventOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Ajouter un événement
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cette semaine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Créations programmées</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Publications prévues</span>
                    <span className="font-medium">5</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Réunions</span>
                    <span className="font-medium">2</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}