import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface StatsCardProps {
  formsCompleted: number;
  weeklyChange?: number;
  accuracy: string;
  avgTime?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  formsCompleted, 
  weeklyChange, 
  accuracy, 
  avgTime 
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">{formsCompleted}</div>
          <div className="text-sm text-gray-600">Forms Completed</div>
          {weeklyChange !== undefined && (
            <div className="text-xs text-green-600 flex items-center justify-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{weeklyChange} this week
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          {avgTime && (
            <div>
              <div className="text-lg font-bold text-gray-900">{avgTime}</div>
              <div className="text-xs text-gray-600">Avg. Time</div>
            </div>
          )}
          <div className={avgTime ? '' : 'col-span-2'}>
            <div className="text-lg font-bold text-gray-900">{accuracy}</div>
            <div className="text-xs text-gray-600">Accuracy</div>
          </div>
        </div>

        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
          <BarChart3 className="w-4 h-4 inline mr-2" />
          View Detailed Analytics
        </button>
      </div>
    </div>
  );
};

export default StatsCard;