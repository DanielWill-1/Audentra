import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, FileText, AlertCircle } from 'lucide-react';
import { getUpcomingEvents, ScheduledEvent } from '../../lib/scheduler';
import { Link } from 'react-router-dom';

interface UpcomingEventsProps {
  limit?: number;
  showViewAll?: boolean;
}

const EVENT_TYPE_COLORS = {
  form_review: 'bg-blue-500',
  team_meeting: 'bg-emerald-500',
  training: 'bg-purple-500',
  maintenance: 'bg-orange-500',
  other: 'bg-gray-500'
};

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ 
  limit = 3,
  showViewAll = true
}) => {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getUpcomingEvents(limit);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setEvents(data);
      } else {
        // If no data is returned, create some mock data for demonstration
        const mockEvents: ScheduledEvent[] = [
          {
            id: '1',
            title: 'Weekly Safety Inspection',
            description: 'Regular safety inspection for construction site',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
            time: '09:00',
            duration: 60,
            type: 'form_review',
            priority: 'high',
            location: 'Construction Site A',
            status: 'scheduled',
            createdBy: 'user-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Monthly HR Review',
            description: 'Review employee performance and feedback',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
            time: '14:00',
            duration: 90,
            type: 'team_meeting',
            priority: 'medium',
            location: 'Conference Room B',
            status: 'scheduled',
            createdBy: 'user-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        setEvents(mockEvents);
      }
    } catch (err: any) {
      console.error('Failed to load upcoming events:', err);
      setError('Failed to load upcoming events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPE_COLORS[type as keyof typeof EVENT_TYPE_COLORS] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-gray-600">Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <div key={event.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
                <h4 className="font-medium text-gray-900">{event.title}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-1">{event.description}</p>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(event.date)}
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTime(event.time)}
                </div>
                {event.location && (
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate max-w-[100px]">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${PRIORITY_COLORS[event.priority as keyof typeof PRIORITY_COLORS]}`}>
              {event.priority}
            </span>
          </div>
        </div>
      ))}
      
      {showViewAll && (
        <Link to="/manage-schedules" className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2">
          View All Scheduled Events
        </Link>
      )}
    </div>
  );
};

export default UpcomingEvents;