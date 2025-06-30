import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Star, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Share2,
  Loader2,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2
} from 'lucide-react';
import { getUserTemplates, Template } from '../../lib/templates';

interface TeamTemplatesProps {
  limit?: number;
  showViewAll?: boolean;
}

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

const TeamTemplates: React.FC<TeamTemplatesProps> = ({ 
  limit = 3,
  showViewAll = true
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getUserTemplates('created_at', false);
      
      if (error) throw error;
      
      // Filter templates and limit the number
      const filteredTemplates = (data || [])
        .filter(template => template.visibility === 'visible')
        .slice(0, limit);
      
      setTemplates(filteredTemplates);
    } catch (err: any) {
      console.error('Failed to load team templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || FileText;
    return IconComponent;
  };

  const getAverageRating = (template: Template) => {
    if (!template.reviews || template.reviews.length === 0) return 0;
    const sum = template.reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / template.reviews.length;
  };

  const getReviewStatus = (template: Template) => {
    if (!template.reviews || template.reviews.length === 0) return null;
    
    const latestReview = template.reviews.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    
    return latestReview.status;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading templates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center text-red-600 mb-2">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span className="font-medium">Error loading templates</span>
        </div>
        <p className="text-gray-600 text-sm">{error}</p>
        <button 
          onClick={loadTemplates}
          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="text-center py-6">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your first template to get started
          </p>
          <Link 
            to="/templates"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Create Template
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="space-y-4">
        {templates.map((template) => {
          const IconComponent = getCategoryIcon(template.category);
          const averageRating = getAverageRating(template);
          const reviewStatus = getReviewStatus(template);
          
          return (
            <div key={template.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <IconComponent className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
                  <p className="text-xs text-gray-500">
                    {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                    {reviewStatus && (
                      <>
                        {' • '}
                        {reviewStatus === 'approved' ? 'Approved' : 
                         reviewStatus === 'pending' ? 'Pending Review' : 
                         reviewStatus === 'needs_changes' ? 'Needs Changes' : 
                         'Rejected'}
                      </>
                    )}
                    {template.shared_with && template.shared_with.length > 0 && (
                      <> • Shared with team</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {averageRating > 0 && (
                  <>
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-xs text-gray-500">{averageRating.toFixed(1)}</span>
                  </>
                )}
                
                {reviewStatus && (
                  <>
                    {reviewStatus === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    ) : reviewStatus === 'pending' ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500 ml-2" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                    )}
                  </>
                )}
                
                {template.shared_with && template.shared_with.length > 0 && (
                  <Share2 className="w-4 h-4 text-blue-500 ml-2" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showViewAll && (
        <Link to="/templates" className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium py-2 block text-center">
          Browse All Templates
        </Link>
      )}
    </div>
  );
};

export default TeamTemplates;