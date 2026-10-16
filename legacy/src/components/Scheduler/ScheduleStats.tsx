import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { getEventStats } from '../../lib/scheduler';

interface ScheduleStatsProps {
  className?: string;
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    completed: 0,
    highPriority: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const statsData = await getEventStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load schedule stats:', err);
      setError('Failed to load stats');
      
      // Set mock data if there's an error
      setStats({
        total: 5,
        scheduled: 3,
        completed: 1,
        highPriority: 2
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-gray-600 text-sm">Loading stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 bg-red-50 rounded-lg ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">Total Events</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">Scheduled</p>
            <p className="text-xl font-bold text-blue-600">{stats.scheduled}</p>
          </div>
          <Clock className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">Completed</p>
            <p className="text-xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600">High Priority</p>
            <p className="text-xl font-bold text-orange-600">{stats.highPriority}</p>
          </div>
          <AlertCircle className="w-6 h-6 text-orange-600" />
        </div>
      </div>
    </div>
  );
};

export default ScheduleStats;