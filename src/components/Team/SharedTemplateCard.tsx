import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Trash2, 
  MoreHorizontal,
  FileText,
  Clock,
  Users,
  Star,
  MessageSquare,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2
} from 'lucide-react';
import { Template, deleteSharedTemplate, toggleSharedTemplateVisibility, addTemplateToReviewQueue } from '../../lib/templates';
import { addActivityItem } from '../../lib/activity';

interface SharedTemplateCardProps {
  template: Template;
  shareId: string;
  sharedBy?: string;
  sharedAt?: string;
  role?: string;
  isHidden?: boolean;
  onUpdate: () => void;
}

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

export default function SharedTemplateCard({ 
  template, 
  shareId, 
  sharedBy, 
  sharedAt, 
  role = 'user',
  isHidden = false,
  onUpdate 
}: SharedTemplateCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || FileText;
    return IconComponent;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await deleteSharedTemplate(shareId);
      if (error) throw error;
      setSuccess('Template removed from shared successfully');
      
      // Add activity
      await addActivityItem({
        type: 'template_shared',
        title: `${template.name} removed from shared`,
        description: 'Template sharing removed',
        user: 'You'
      });
      
      setTimeout(() => {
        setShowDeleteConfirm(false);
        onUpdate();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete shared template');
      setLoading(false);
      console.error('Failed to delete shared template:', err);
    }
  };

  const handleToggleVisibility = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await toggleSharedTemplateVisibility(shareId, !isHidden);
      if (error) throw error;
      setSuccess(isHidden ? 'Template is now visible' : 'Template is now hidden');
      
      // Add activity
      await addActivityItem({
        type: 'template_shared',
        title: `${template.name} ${isHidden ? 'unhidden' : 'hidden'}`,
        description: `Template visibility changed to ${isHidden ? 'visible' : 'hidden'}`,
        user: 'You'
      });
      
      setTimeout(() => {
        onUpdate();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle visibility');
      setLoading(false);
      console.error('Failed to toggle visibility:', err);
    }
  };

  const handleAddToReviewQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await addTemplateToReviewQueue(template.id, 'medium');
      if (error) throw error;
      
      setSuccess('Template added to review queue successfully');
      
      // Add activity
      await addActivityItem({
        type: 'template_reviewed',
        title: `${template.name} added to review queue`,
        description: 'Template added for review',
        user: 'You'
      });
      
      setTimeout(() => {
        setShowActions(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to add to review queue');
      console.error('Failed to add to review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = getCategoryIcon(template.category);
  const averageRating = template.reviews && template.reviews.length > 0 
    ? template.reviews.reduce((acc, review) => acc + review.rating, 0) / template.reviews.length 
    : 0;
  const reviewCount = template.reviews?.length || 0;

  return (
    <>
      <div className={`bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden ${
        isHidden ? 'opacity-60 bg-gray-50' : ''
      }`}>
        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center mb-4">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-green-800 text-sm">{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                isHidden ? 'bg-gray-100' : 'bg-blue-100'
              }`}>
                <IconComponent className={`w-6 h-6 ${
                  isHidden ? 'text-gray-500' : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showActions && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                    <button
                      onClick={() => {
                        setShowActions(false);
                        // Handle view action
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Template
                    </button>
                    <button
                      onClick={() => {
                        setShowActions(false);
                        handleAddToReviewQueue();
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Add to Review Queue
                    </button>
                    <button
                      onClick={() => {
                        setShowActions(false);
                        handleToggleVisibility();
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50"
                    >
                      {isHidden ? (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide
                        </>
                      )}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        setShowActions(false);
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from Shared
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              {template.form_data?.fields?.length || 0} fields
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {sharedAt ? formatTimeAgo(sharedAt) : 'Recently shared'}
            </div>
            {sharedBy && (
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                Shared by {sharedBy}
              </div>
            )}
          </div>

          {/* Rating and Reviews */}
          {reviewCount > 0 && (
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= averageRating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {averageRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize">
                {template.category}
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded capitalize">
                {role}
              </span>
              {isHidden && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  Hidden
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // Handle view action
                }}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Template"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleAddToReviewQueue}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                title="Add to Review Queue"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleVisibility}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                title={isHidden ? 'Show' : 'Hide'}
              >
                {isHidden ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Remove Shared Template</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove "<strong>{template.name}</strong>" from your shared templates? 
              You will no longer have access to this template.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}