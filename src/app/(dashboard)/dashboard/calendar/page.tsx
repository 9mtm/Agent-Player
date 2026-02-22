'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Settings, RefreshCw, Link as LinkIcon, Trash2 } from "lucide-react";
import { config } from '@/lib/config';
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  event_type: string;
  calendar_name?: string;
  calendar_color?: string;
  calendar_source_id?: string;
}

interface CalendarSource {
  id: string;
  name: string;
  type: string;
  color: string;
  is_enabled: boolean;
  is_primary: boolean;
  sync_enabled: boolean;
  sync_status?: string;
  url?: string;
  description?: string;
  permission?: string;
  allow_agent_access?: number;
}

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [sources, setSources] = useState<CalendarSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEventDialog, setShowEventDialog] = useState(false);
    const [showSourceDialog, setShowSourceDialog] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);

    // Event form state
    const [eventForm, setEventForm] = useState({
        title: "",
        description: "",
        location: "",
        start_time: "",
        end_time: "",
        is_all_day: false,
        event_type: "event",
        calendar_source_id: "",
    });

    // Source form state
    const [sourceForm, setSourceForm] = useState({
        name: "",
        type: "manual",
        url: "",
        color: "#3b82f6",
        description: "",
        permission: "read_write",
        allow_agent_access: true,
    });

    const authHeaders = () => ({
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    });

    // Load events and sources
    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Get start and end of current month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const start = new Date(year, month, 1).toISOString();
            const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            // Fetch events
            const eventsRes = await fetch(
                `${config.backendUrl}/api/calendar/events?start=${start}&end=${end}`,
                { headers: authHeaders() }
            );
            const eventsData = await eventsRes.json();
            setEvents(eventsData.events || []);

            // Fetch sources
            const sourcesRes = await fetch(`${config.backendUrl}/api/calendar/sources`, {
                headers: authHeaders(),
            });
            const sourcesData = await sourcesRes.json();
            setSources(sourcesData.sources || []);

            // Set default calendar for new events
            const primarySource = sourcesData.sources?.find((s: CalendarSource) => s.is_primary);
            if (primarySource && !eventForm.calendar_source_id) {
                setEventForm((prev) => ({ ...prev, calendar_source_id: primarySource.id }));
            }
        } catch (error) {
            console.error('[Calendar] Failed to load data:', error);
            toast.error('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    };

    const toggleCalendarFilter = (calendarId: string) => {
        setSelectedCalendars(prev =>
            prev.includes(calendarId)
                ? prev.filter(id => id !== calendarId)
                : [...prev, calendarId]
        );
    };

    // Get current month and year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Get events for a specific day
    const getEventsForDay = (day: number, eventsToFilter = events) => {
        return eventsToFilter.filter(event => {
            const eventDate = new Date(event.start_time);
            return eventDate.getDate() === day &&
                   eventDate.getMonth() === currentMonth &&
                   eventDate.getFullYear() === currentYear;
        });
    };

    // Filter events if calendars are selected
    const filteredEvents = selectedCalendars.length > 0
        ? events.filter(e => e.calendar_source_id && selectedCalendars.includes(e.calendar_source_id))
        : events;

    // Generate calendar grid
    const calendarDays = [];
    const totalCells = 42; // 6 rows × 7 days

    for (let i = 0; i < totalCells; i++) {
        let day;
        let isCurrentMonth = true;
        let isToday = false;

        if (i < firstDayOfMonth) {
            // Previous month days
            day = daysInPrevMonth - firstDayOfMonth + i + 1;
            isCurrentMonth = false;
        } else if (i >= firstDayOfMonth + daysInMonth) {
            // Next month days
            day = i - firstDayOfMonth - daysInMonth + 1;
            isCurrentMonth = false;
        } else {
            // Current month days
            day = i - firstDayOfMonth + 1;
            const today = new Date();
            isToday = day === today.getDate() &&
                     currentMonth === today.getMonth() &&
                     currentYear === today.getFullYear();
        }

        const dayEvents = isCurrentMonth ? getEventsForDay(day, filteredEvents) : [];

        calendarDays.push({
            day,
            isCurrentMonth,
            isToday,
            events: dayEvents,
        });
    }

    // Create new event
    const handleCreateEvent = async () => {
        try {
            const res = await fetch(`${config.backendUrl}/api/calendar/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
                body: JSON.stringify(eventForm),
            });

            if (!res.ok) throw new Error('Failed to create event');

            toast.success('Event created successfully');
            setShowEventDialog(false);
            resetEventForm();
            loadData();
        } catch (error) {
            console.error('[Calendar] Failed to create event:', error);
            toast.error('Failed to create event');
        }
    };

    // Delete event
    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            const res = await fetch(`${config.backendUrl}/api/calendar/events/${eventId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (!res.ok) throw new Error('Failed to delete event');

            toast.success('Event deleted successfully');
            loadData();
        } catch (error) {
            console.error('[Calendar] Failed to delete event:', error);
            toast.error('Failed to delete event');
        }
    };

    // Add calendar source
    const handleAddSource = async () => {
        try {
            const res = await fetch(`${config.backendUrl}/api/calendar/sources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders(),
                },
                body: JSON.stringify(sourceForm),
            });

            if (!res.ok) throw new Error('Failed to add calendar source');

            toast.success('Calendar source added successfully');
            setShowSourceDialog(false);
            resetSourceForm();
            loadData();
        } catch (error) {
            console.error('[Calendar] Failed to add source:', error);
            toast.error('Failed to add calendar source');
        }
    };

    // Sync calendar source
    const handleSyncSource = async (sourceId: string) => {
        try {
            const res = await fetch(`${config.backendUrl}/api/calendar/sources/${sourceId}/sync`, {
                method: 'POST',
                headers: authHeaders(),
            });

            if (!res.ok) throw new Error('Failed to sync calendar');

            toast.success('Calendar sync started');
            setTimeout(loadData, 2000); // Reload after 2 seconds
        } catch (error) {
            console.error('[Calendar] Failed to sync:', error);
            toast.error('Failed to sync calendar');
        }
    };

    // Delete calendar source
    const handleDeleteSource = async (sourceId: string) => {
        if (!confirm('Are you sure? This will delete all events from this calendar.')) return;

        try {
            const res = await fetch(`${config.backendUrl}/api/calendar/sources/${sourceId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });

            if (!res.ok) throw new Error('Failed to delete calendar source');

            toast.success('Calendar source deleted');
            loadData();
        } catch (error) {
            console.error('[Calendar] Failed to delete source:', error);
            toast.error('Failed to delete calendar source');
        }
    };

    const resetEventForm = () => {
        setEventForm({
            title: "",
            description: "",
            location: "",
            start_time: "",
            end_time: "",
            is_all_day: false,
            event_type: "event",
            calendar_source_id: sources.find(s => s.is_primary)?.id || "",
        });
    };

    const resetSourceForm = () => {
        setSourceForm({
            name: "",
            type: "manual",
            url: "",
            color: "#3b82f6",
            description: "",
            permission: "read_write",
            allow_agent_access: true,
        });
    };

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'meeting': return 'bg-blue-500/10 text-blue-500';
            case 'deadline': return 'bg-red-500/10 text-red-500';
            case 'reminder': return 'bg-yellow-500/10 text-yellow-500';
            default: return 'bg-green-500/10 text-green-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
                    <p className="text-muted-foreground">
                        Manage events and sync with Google Calendar
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowSourceDialog(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Calendars
                    </Button>
                    <Button onClick={() => { resetEventForm(); setShowEventDialog(true); }}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Event
                    </Button>
                </div>
            </div>

            {/* Calendar Sources */}
            {sources.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {sources.map(source => (
                        <Badge
                            key={source.id}
                            variant={selectedCalendars.length === 0 || selectedCalendars.includes(source.id) ? "default" : "secondary"}
                            className="gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                                borderLeft: `4px solid ${source.color}`,
                                opacity: selectedCalendars.length > 0 && !selectedCalendars.includes(source.id) ? 0.5 : 1
                            }}
                            onClick={() => toggleCalendarFilter(source.id)}
                        >
                            {source.name}
                            {source.type === 'google' && ' (Google)'}
                            {source.type === 'ical' && ' (iCal)'}
                            {source.permission === 'read_only' && ' 🔒'}
                        </Badge>
                    ))}
                    {selectedCalendars.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCalendars([])}
                            className="h-6 px-2 text-xs"
                        >
                            Clear Filter
                        </Button>
                    )}
                </div>
            )}

            {/* Calendar Grid */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5" />
                            {monthNames[currentMonth]} {currentYear}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={goToToday}>
                                Today
                            </Button>
                            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={goToNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading events...</div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {/* Day Headers */}
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="text-center font-medium text-sm text-muted-foreground py-2">
                                    {day}
                                </div>
                            ))}

                            {/* Calendar Days */}
                            {calendarDays.map((item, index) => (
                                <div
                                    key={index}
                                    className={`
                                        min-h-[100px] border rounded-lg p-2
                                        ${item.isCurrentMonth ? 'bg-card' : 'bg-muted/50'}
                                        ${item.isToday ? 'border-primary border-2' : 'border-border'}
                                        hover:bg-accent cursor-pointer transition-colors
                                    `}
                                >
                                    <div className={`
                                        text-sm font-medium mb-1
                                        ${item.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                                        ${item.isToday ? 'text-primary' : ''}
                                    `}>
                                        {item.day}
                                    </div>

                                    {/* Events for this day */}
                                    <div className="space-y-1">
                                        {item.events.slice(0, 2).map((event) => (
                                            <div
                                                key={event.id}
                                                className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.event_type)}`}
                                                style={event.calendar_color ? { borderLeft: `3px solid ${event.calendar_color}` } : {}}
                                                onClick={() => setSelectedEvent(event)}
                                            >
                                                {new Date(event.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {event.title}
                                            </div>
                                        ))}
                                        {item.events.length > 2 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{item.events.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
                <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                    <CardDescription>
                        Your scheduled events for this month
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {filteredEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {selectedCalendars.length > 0 ? 'No events in selected calendars' : 'No events scheduled'}
                        </div>
                    ) : (
                        filteredEvents
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .slice(0, 10)
                            .map((event) => (
                                <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                    <div className="flex flex-col items-center min-w-[60px]">
                                        <div className="text-2xl font-bold">
                                            {new Date(event.start_time).getDate()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {monthNames[new Date(event.start_time).getMonth()].substring(0, 3)}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold">{event.title}</h4>
                                                {event.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {new Date(event.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {event.location && (
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-4 w-4" />
                                                            {event.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={
                                                event.event_type === 'meeting' ? 'default' :
                                                event.event_type === 'deadline' ? 'destructive' :
                                                'secondary'
                                            }>
                                                {event.event_type}
                                            </Badge>
                                        </div>
                                    </div>

                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                    )}
                </CardContent>
            </Card>

            {/* New Event Dialog */}
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create Event</DialogTitle>
                        <DialogDescription>Add a new event to your calendar</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={eventForm.title}
                                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                placeholder="Event title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="start_time">Start Time</Label>
                            <Input
                                id="start_time"
                                type="datetime-local"
                                value={eventForm.start_time}
                                onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="end_time">End Time</Label>
                            <Input
                                id="end_time"
                                type="datetime-local"
                                value={eventForm.end_time}
                                onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={eventForm.location}
                                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                                placeholder="Event location"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={eventForm.description}
                                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                placeholder="Event description"
                                rows={3}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="event_type">Type</Label>
                            <Select value={eventForm.event_type} onValueChange={(v) => setEventForm({ ...eventForm, event_type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="event">Event</SelectItem>
                                    <SelectItem value="meeting">Meeting</SelectItem>
                                    <SelectItem value="deadline">Deadline</SelectItem>
                                    <SelectItem value="reminder">Reminder</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateEvent} disabled={!eventForm.title || !eventForm.start_time || !eventForm.end_time}>
                            Create Event
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Calendar Sources Dialog */}
            <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Manage Calendars</DialogTitle>
                        <DialogDescription>Add Google Calendar or iCal/WebCal URL</DialogDescription>
                    </DialogHeader>

                    {/* Existing Sources */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {sources.map(source => (
                            <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded" style={{ backgroundColor: source.color }} />
                                    <div>
                                        <div className="font-medium">{source.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {source.type === 'google' && 'Google Calendar'}
                                            {source.type === 'ical' && `iCal (${source.url})`}
                                            {source.type === 'manual' && 'Manual'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {source.sync_enabled && (
                                        <Button size="sm" variant="ghost" onClick={() => handleSyncSource(source.id)}>
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {source.type !== 'manual' && (
                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteSource(source.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add New Source */}
                    <div className="border-t pt-4 space-y-4">
                        <h4 className="font-medium">Add Calendar</h4>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="source_name">Name</Label>
                                <Input
                                    id="source_name"
                                    value={sourceForm.name}
                                    onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                                    placeholder="My Calendar"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="source_type">Type</Label>
                                <Select value={sourceForm.type} onValueChange={(v) => setSourceForm({ ...sourceForm, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="ical">iCal URL</SelectItem>
                                        <SelectItem value="webcal">WebCal URL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {(sourceForm.type === 'ical' || sourceForm.type === 'webcal') && (
                                <div className="grid gap-2">
                                    <Label htmlFor="source_url">Calendar URL</Label>
                                    <Input
                                        id="source_url"
                                        value={sourceForm.url}
                                        onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                                        placeholder="https://calendar.google.com/calendar/ical/..."
                                    />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="source_color">Color</Label>
                                <Input
                                    id="source_color"
                                    type="color"
                                    value={sourceForm.color}
                                    onChange={(e) => setSourceForm({ ...sourceForm, color: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="source_description">Description (Optional)</Label>
                                <Textarea
                                    id="source_description"
                                    value={sourceForm.description}
                                    onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
                                    placeholder="What is this calendar for?"
                                    rows={2}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="source_permission">Permission Level</Label>
                                <Select
                                    value={sourceForm.permission}
                                    onValueChange={(v) => setSourceForm({ ...sourceForm, permission: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="read_write">Read & Write - Can create/edit events</SelectItem>
                                        <SelectItem value="read_only">Read-Only - View events only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="allow_agent"
                                    checked={sourceForm.allow_agent_access}
                                    onChange={(e) => setSourceForm({ ...sourceForm, allow_agent_access: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="allow_agent" className="cursor-pointer text-sm">
                                    Allow AI agents to access this calendar
                                </Label>
                            </div>
                        </div>
                        <Button onClick={handleAddSource} disabled={!sourceForm.name}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Calendar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
