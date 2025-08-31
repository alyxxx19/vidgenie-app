'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Video,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'generated' | 'scheduled' | 'published';
  platforms: string[];
  status: string;
}

interface ContentCalendarProps {
  events?: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
}

export default function ContentCalendar({ events = [], onDateSelect }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const getEventsForDay = (day: number) => {
    const dayDate = new Date(year, month, day);
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === dayDate.toDateString();
    });
  };
  
  const getEventIcon = (type: string, status: string) => {
    if (type === 'generated') return <Video className="w-3 h-3" />;
    if (type === 'scheduled') return <Clock className="w-3 h-3" />;
    if (type === 'published') return <CheckCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };
  
  const getEventColor = (type: string, status: string) => {
    if (type === 'generated') return 'bg-blue-100 text-blue-800';
    if (type === 'scheduled') return 'bg-yellow-100 text-yellow-800';
    if (type === 'published') return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendrier de contenu
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-slate-500">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="p-2 h-24" />;
            }
            
            const dayEvents = getEventsForDay(day);
            const isToday = today.getDate() === day && 
                          today.getMonth() === month && 
                          today.getFullYear() === year;
            
            return (
              <div
                key={day}
                className={`p-2 h-24 border rounded cursor-pointer hover:bg-slate-50 transition-colors ${
                  isToday ? 'bg-blue-50 border-blue-200' : 'border-slate-200'
                }`}
                onClick={() => onDateSelect?.(new Date(year, month, day))}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs px-1 py-0.5 rounded flex items-center gap-1 ${getEventColor(event.type, event.status)}`}
                    >
                      {getEventIcon(event.type, event.status)}
                      <span className="truncate flex-1">{event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-slate-500 px-1">
                      +{dayEvents.length - 2} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 rounded" />
            <span>Généré</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-100 rounded" />
            <span>Programmé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 rounded" />
            <span>Publié</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}