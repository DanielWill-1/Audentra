import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  CheckCircle, 
  FileText, 
  Users, 
  Clock, 
  Share2, 
  MessageSquare, 
  AlertCircle, 
  Download, 
  Archive, 
  Loader2, 
  RefreshCw,
  Filter,
  Search,
  Calendar,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { getRecentActivity, ActivityItem, formatTimeAgo, deleteActivityItem } from '../lib/activity';

function ActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (activities && Array.isArray(activities)) {
      filterActivities();
    }
    // eslint-disable-next-line
  }, [activities, searchQuery, filterType, dateRange]);

  const loadActivity = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all activities (no limit)
      const activityData = await getRecentActivity(100);
      setActivities(Array.isArray(activityData) ? activityData : []);
    } catch (err: any) {
      console.error('Failed to load activity:', err);
      setError('Failed to load activity log');
      setActivities([]); // Ensure activities is always an array
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.user.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by activity type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }
    
    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(activity => new Date(activity.time) >= cutoffDate);
    }
    
    setFilteredActivities(filtered);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'form_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'template_created':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'team_invite':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'template_shared':
        return <Share2 className="w-5 h-5 text-emerald-600" />;
      case 'form_started':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'template_reviewed':
        return <MessageSquare className="w-5 h-5 text-indigo-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityBackground = (type: string) => {
    switch (type) {
      case 'form_completed':
        return 'bg-green-50 border-green-200';
      case 'template_created':
        return 'bg-blue-50 border-blue-200';
      case 'team_invite':
        return 'bg-purple-50 border-purple-200';
      case 'template_shared':
        return 'bg-emerald-50 border-emerald-200';
      case 'form_started':
        return 'bg-orange-50 border-orange-200';
      case 'template_reviewed':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'hover:bg-gray-50';
    }
  };

  const getActivityStatus = (type: string) => {
    switch (type) {
      case 'form_completed':
        return { text: 'Completed', color: 'bg-green-100 text-green-800' };
      case 'template_created':
        return { text: 'Created', color: 'bg-blue-100 text-blue-800' };
      case 'team_invite':
        return { text: 'Joined', color: 'bg-purple-100 text-purple-800' };
      case 'template_shared':
        return { text: 'Shared', color: 'bg-emerald-100 text-emerald-800' };
      case 'form_started':
        return { text: 'In Progress', color: 'bg-orange-100 text-orange-800' };
      case 'template_reviewed':
        return { text: 'Reviewed', color: 'bg-indigo-100 text-indigo-800' };
      default:
        return { text: 'Updated', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getActivityTypeName = (type: string) => {
    switch (type) {
      case 'form_completed':
        return 'Form Completed';
      case 'template_created':
        return 'Template Created';
      case 'team_invite':
        return 'Team Invitation';
      case 'template_shared':
        return 'Template Shared';
      case 'form_started':
        return 'Form Started';
      case 'template_reviewed':
        return 'Template Reviewed';
      default:
        return 'Activity';
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteActivityItem(id);
      setActivities(activities.filter(activity => activity.id !== id));
      setSuccess('Activity deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete activity');
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
                <p className="text-gray-600">View all your recent activity and actions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadActivity}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center mb-6">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-800 text-sm">{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search activity..."
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
                <option value="form_completed">Form Completed</option>
                <option value="template_created">Template Created</option>
                <option value="team_invite">Team Invitations</option>
                <option value="template_shared">Template Shared</option>
                <option value="form_started">Form Started</option>
                <option value="template_reviewed">Template Reviewed</option>
              </select>
              
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
              </span>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading activity log...</span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterType !== 'all' || dateRange !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'Start using the platform to see your activity here'
              }
            </p>
            <Link 
              to="/dashboard"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
              <p className="text-gray-600">Showing your recent activity and actions</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredActivities.map((activity) => {
                const bgClass = getActivityBackground(activity.type);
                const status = getActivityStatus(activity.type);
                const icon = getActivityIcon(activity.type);
                
                return (
                  <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgClass}`}>
                          {icon}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                              {status.text}
                            </span>
                          </div>
                          
                          {activity.description && (
                            <p className="text-gray-600 mb-2">{activity.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDate(activity.time)}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {activity.user}
                            </div>
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              {getActivityTypeName(activity.type)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {activity.type === 'form_completed' && (
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {activity.type === 'form_started' && (
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Continue">
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityLog;

/*
  IMPORTANT:
  Make sure your route path in your router config matches the case and spelling of this file's import path.
  If your file is ActivityLog.tsx, your route should be:
    <Route path="/activitylog" element={<ActivityLog />} />
  All <Link> and <Navigate> to this page should use "/activitylog" (all lowercase).
  React Router is case-sensitive by default.
*/