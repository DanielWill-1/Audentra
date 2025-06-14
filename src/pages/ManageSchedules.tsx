import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Settings,
  Users,
  MapPin,
  FileText,
  Archive,
  Star
} from 'lucide-react';

interface ScheduledEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
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

const EVENT_TYPES = [
  { id: 'all', name: 'All Types' },
  { id: 'form_review', name: 'Form Review', color: 'bg-blue-500' },
  { id: 'team_meeting', name: 'Team Meeting', color: 'bg-emerald-500' },
  { id: 'training', name: 'Training Session', color: 'bg-purple-500' },
  { id: 'maintenance', name: 'System Maintenance', color: 'bg-orange-500' },
  { id: 'other', name: 'Other', color: 'bg-gray-500' }
];

const STATUS_OPTIONS = [
  { id: 'all', name: 'All Status' },
  { id: 'scheduled', name: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { id: 'in_progress', name: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'completed', name: 'Completed', color: 'bg-green-100 text-green-800' },
  { id: 'cancelled', name: 'Cancelled', color: 'bg-red-100 text-red-800' }
];

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

function ManageSchedules() {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

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
        status: 'completed',
        createdAt: '2024-01-16T14:00:00Z',
        updatedAt: '2024-01-22T16:00:00Z'
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
      },
      {
        id: '4',
        title: 'System Maintenance Window',
        description: 'Scheduled maintenance for voice processing servers',
        date: '2024-01-25',
        time: '02:00',
        duration: 180,
        type: 'maintenance',
        priority: 'high',
        location: 'Data Center',
        reminderMinutes: 60,
        status: 'scheduled',
        createdAt: '2024-01-18T11:00:00Z',
        updatedAt: '2024-01-18T11:00:00Z'
      },
      {
        id: '5',
        title: 'Client Demo Preparation',
        description: 'Prepare demo materials for upcoming client presentation',
        date: '2024-01-19',
        time: '15:30',
        duration: 90,
        type: 'other',
        priority: 'high',
        attendees: ['Sales Team', 'Product Team'],
        location: 'Conference Room C',
        reminderMinutes: 30,
        status: 'cancelled',
        createdAt: '2024-01-14T13:00:00Z',
        updatedAt: '2024-01-19T12:00:00Z'
      }
    ];
    setEvents(mockEvents);
    setLoading(false);
  }, []);

  // Filter and sort events
  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           event.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || event.type === filterType;
      const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'date':
          aValue = new Date(`${a.date} ${a.time}`).getTime();
          bValue = new Date(`${b.date} ${b.time}`).getTime();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.id === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find(t => t.id === type)?.color || 'bg-gray-500';
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event.id));
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on events:`, selectedEvents);
    // Implement bulk actions here
    setSelectedEvents([]);
    setShowBulkActions(false);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getEventStats = () => {
    return {
      total: events.length,
      scheduled: events.filter(e => e.status === 'scheduled').length,
      completed: events.filter(e => e.status === 'completed').length,
      cancelled: events.filter(e => e.status === 'cancelled').length,
      highPriority: events.filter(e => e.priority === 'high').length
    };
  };

  const stats = getEventStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link to="/scheduler" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage All Schedules</h1>
                <p className="text-gray-600">View, edit, and manage all scheduled events</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setLoading(true)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link 
                to="/scheduler-settings"
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <Link 
                to="/scheduler"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{stats.highPriority}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
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
                {EVENT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {filteredEvents.length} of {events.length} events
              </span>
              {selectedEvents.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedEvents.length} selected
                  </span>
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Actions
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {showBulkActions && selectedEvents.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">Bulk Actions:</span>
                <button
                  onClick={() => handleBulkAction('complete')}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                >
                  Cancel Events
                </button>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                >
                  Export
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('title')}
                  >
                    Event {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('date')}
                  >
                    Date & Time {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Type</th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('priority')}
                  >
                    Priority {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('status')}
                  >
                    Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Location</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={() => handleSelectEvent(event.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-600 truncate max-w-xs">{event.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{formatDate(event.date)}</div>
                        <div className="text-gray-600">{formatTime(event.time)} ({event.duration}m)</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${getEventTypeColor(event.type)}`}></div>
                        <span className="text-sm text-gray-900 capitalize">
                          {event.type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[event.priority]}`}>
                        {event.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                        {event.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        {event.location && (
                          <>
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="truncate max-w-xs">{event.location}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first scheduled event'
                }
              </p>
              <Link 
                to="/scheduler"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageSchedules;