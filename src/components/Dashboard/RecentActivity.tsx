import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
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
  ArrowRight
} from 'lucide-react';
import { getRecentActivity, ActivityItem, formatTimeAgo } from '../../lib/activity';

interface RecentActivityProps {
  limit?: number;
  showViewAll?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  limit = 3,
  showViewAll = true
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const activityData = await getRecentActivity(limit);
      setActivities(activityData);
    } catch (err: any) {
      console.error('Failed to load activity:', err);
      setError('Failed to load recent activity');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center mb-3">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-700 font-medium">Error loading activity</span>
        </div>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button 
          onClick={loadActivity}
          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3 inline mr-1" />
          Try Again
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const bgClass = getActivityBackground(activity.type);
        const status = getActivityStatus(activity.type);
        const icon = getActivityIcon(activity.type);
        
        return (
          <div key={activity.id} className={`flex items-center justify-between p-4 rounded-lg border ${bgClass}`}>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-4">
                {icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{activity.title}</h4>
                <p className="text-sm text-gray-600">
                  {formatTimeAgo(activity.time)} • {activity.user}
                  {activity.description && ` • ${activity.description}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                {status.text}
              </span>
              {activity.type === 'form_completed' && (
                <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
              )}
              {activity.type === 'form_started' && (
                <button className="text-blue-600 hover:text-blue-700 text-sm">Continue</button>
              )}
              {activity.type === 'form_completed' && (
                <button className="text-gray-600 hover:text-gray-700">
                  <Download className="w-4 h-4" />
                </button>
              )}
              {activity.type === 'template_created' && (
                <button className="text-gray-600 hover:text-gray-700">
                  <Share2 className="w-4 h-4" />
                </button>
              )}
              {activity.type === 'template_shared' && (
                <button className="text-gray-600 hover:text-gray-700">
                  <Users className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {showViewAll && activities.length >= limit && (
        <Link to="/activity" className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2">
          View All Activity <ArrowRight className="w-4 h-4 inline ml-1" />
        </Link>
      )}
    </div>
  );
};

export default RecentActivity;