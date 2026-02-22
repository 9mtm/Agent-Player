/**
 * Calendar Card Widget
 * Displays upcoming calendar events
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
  type?: string;
  calendar?: string;
  color?: string;
}

interface CalendarCardProps {
  title?: string;
  events: CalendarEvent[];
}

export function CalendarCard({ title, events }: CalendarCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-full flex flex-col">
      {title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 overflow-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                style={event.color ? { borderLeftWidth: '3px', borderLeftColor: event.color } : {}}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.start)}
                      </div>
                      {!event.allDay && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start)}
                        </div>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                  {event.type && (
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full whitespace-nowrap
                      ${event.type === 'meeting' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}
                      ${event.type === 'deadline' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : ''}
                      ${event.type === 'reminder' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : ''}
                      ${event.type === 'event' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                    `}>
                      {event.type}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
