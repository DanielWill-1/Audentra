import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Bell,
  Users,
  MapPin,
  FileText,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Settings,
  Database
} from 'lucide-react';

interface ScheduledEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: 'form_review' | 'team_meeting' | 'training' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high';
  attendees?: string[];
  location?: string;
  formId?: string;
  reminderMinutes?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'month' | 'week';

const EVENT_TYPES = [
  { id: 'form_review', name: 'Form Review', color: 'bg-blue-500' },
  { id: 'team_meeting', name: 'Team Meeting', color: 'bg-emerald-500' },
  { id: 'training', name: 'Training Session', color: 'bg-purple-500' },
  { id: 'maintenance', name: 'System Maintenance', color: 'bg-orange-500' },
  { id: 'other', name: 'Other', color: 'bg-gray-500' }
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

function Scheduler() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockEvents: ScheduledEvent[] = [
      {
        id: '1',
        title: 'Healthcare Forms Review',
        description: 'Review and update patient intake forms for Q1',
        date: '2024-01-20',
        time: '09:00',
        duration: 60,
        type: 'form_review',
        priority: 'high',
        attendees: ['Dr. Sarah Martinez', 'Alex Chen'],
        location: 'Conference Room A',
        formId: 'form_123',
        reminderMinutes: 15,
        status: 'scheduled',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        title: 'Voice AI Training Session',
        description: 'Training new team members on voice form technology',
        date: '2024-01-22',
        time: '14:00',
        duration: 120,
        type: 'training',
        priority: 'medium',
        attendees: ['Maria Johnson', 'Team Members'],
        location: 'Training Room B',
        reminderMinutes: 30,
        status: 'scheduled',
        createdAt: '2024-01-16T14:00:00Z',
        updatedAt: '2024-01-16T14:00:00Z'
      },
      {
        id: '3',
        title: 'Weekly Team Sync',
        description: 'Regular team synchronization meeting',
        date: '2024-01-24',
        time: '10:00',
        duration: 45,
        type: 'team_meeting',
        priority: 'medium',
        attendees: ['All Team Members'],
        location: 'Virtual Meeting',
        reminderMinutes: 10,
        status: 'scheduled',
        createdAt: '2024-01-17T09:00:00Z',
        updatedAt: '2024-01-17T09:00:00Z'
      }
    ];
    setEvents(mockEvents);
  }, []);

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  // Get upcoming events
  const getUpcomingEvents = () => {
    const today = new Date();
    const upcoming = events
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today && event.status === 'scheduled';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
    
    return upcoming;
  };

  // Filter events based on search and type
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    return matchesSearch && matchesType;
  });

  // Generate calendar days for month view
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Generate week days for week view
  const generateWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find(t => t.id === type)?.color || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scheduler</h1>
                <p className="text-gray-600">Manage form-related events and tasks</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/manage-schedules"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center"
              >
                <Database className="w-4 h-4 mr-2" />
                Manage All Schedules
              </Link>
              <Link 
                to="/scheduler-settings"
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Scheduler Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Main Calendar */}
          <div className="flex-1">
            {/* Calendar Controls */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentDate.toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h2>
                  <button
                    onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateWeek('next')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      viewMode === 'month' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4 mr-2 inline" />
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      viewMode === 'week' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="w-4 h-4 mr-2 inline" />
                    Week
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  {EVENT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {viewMode === 'month' ? (
                <>
                  {/* Month View Header */}
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-4 text-center text-sm font-medium text-gray-700 bg-gray-50">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Month View Grid */}
                  <div className="grid grid-cols-7">
                    {generateCalendarDays().map((day, index) => {
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isToday = day.toDateString() === new Date().toDateString();
                      const dayEvents = getEventsForDate(day);
                      
                      return (
                        <div
                          key={index}
                          className={`min-h-[120px] p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                          }`}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className={`text-sm font-medium mb-2 ${
                            isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''
                          }`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                              >
                                {formatTime(event.time)} {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Week View Header */}
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="p-4 bg-gray-50"></div>
                    {generateWeekDays().map(day => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div key={day.toISOString()} className={`p-4 text-center bg-gray-50 ${isToday ? 'bg-blue-50' : ''}`}>
                          <div className="text-sm font-medium text-gray-700">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                            {day.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Week View Time Slots */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                        <div className="p-2 text-xs text-gray-500 bg-gray-50 border-r border-gray-200">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        {generateWeekDays().map(day => {
                          const dayEvents = getEventsForDate(day).filter(event => {
                            const eventHour = parseInt(event.time.split(':')[0]);
                            return eventHour === hour;
                          });
                          
                          return (
                            <div key={`${day.toISOString()}-${hour}`} className="min-h-[60px] p-1 border-r border-gray-100 hover:bg-gray-50 transition-colors">
                              {dayEvents.map(event => (
                                <div
                                  key={event.id}
                                  className={`text-xs p-2 rounded text-white mb-1 cursor-pointer ${getEventTypeColor(event.type)}`}
                                  onClick={() => setEditingEvent(event)}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  <div className="opacity-90">{formatTime(event.time)}</div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
              <div className="space-y-3">
                {getUpcomingEvents().map(event => (
                  <div key={event.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                          <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{event.description}</p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(event.time)}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${PRIORITY_COLORS[event.priority]}`}>
                        {event.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {getUpcomingEvents().length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No upcoming events</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Events</span>
                  <span className="font-semibold text-gray-900">{events.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">
                    {events.filter(e => e.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Upcoming</span>
                  <span className="font-semibold text-blue-600">
                    {events.filter(e => e.status === 'scheduled').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">High Priority</span>
                  <span className="font-semibold text-red-600">
                    {events.filter(e => e.priority === 'high').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Types Legend */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Types</h3>
              <div className="space-y-2">
                {EVENT_TYPES.map(type => (
                  <div key={type.id} className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                    <span className="text-sm text-gray-700">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Event Modal */}
      {(showCreateModal || editingEvent) && (
        <EventModal
          event={editingEvent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          onSave={(event) => {
            if (editingEvent) {
              setEvents(events.map(e => e.id === event.id ? event : e));
            } else {
              setEvents([...events, { ...event, id: Date.now().toString() }]);
            }
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

// Event Modal Component
interface EventModalProps {
  event?: ScheduledEvent | null;
  onClose: () => void;
  onSave: (event: ScheduledEvent) => void;
  selectedDate?: Date | null;
}

function EventModal({ event, onClose, onSave, selectedDate }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date || selectedDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    time: event?.time || '09:00',
    duration: event?.duration || 60,
    type: event?.type || 'other',
    priority: event?.priority || 'medium',
    location: event?.location || '',
    reminderMinutes: event?.reminderMinutes || 15
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.time) {
      newErrors.time = 'Time is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const eventData: ScheduledEvent = {
      id: event?.id || '',
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      type: formData.type as any,
      priority: formData.priority as any,
      location: formData.location,
      reminderMinutes: formData.reminderMinutes,
      status: event?.status || 'scheduled',
      createdAt: event?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(eventData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {event ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter event title"
              />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {EVENT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter event description"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="text-red-600 text-sm mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.time ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.time && <p className="text-red-600 text-sm mt-1">{errors.time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder (minutes before)
              </label>
              <select
                value={formData.reminderMinutes}
                onChange={(e) => setFormData({ ...formData, reminderMinutes: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={1440}>1 day</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter location or meeting link"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Scheduler;