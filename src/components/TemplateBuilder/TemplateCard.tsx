import React, { useState } from 'react';
import { 
  Eye, 
  Edit, 
  Share2, 
  Trash2, 
  MoreHorizontal,
  Star,
  Users,
  Clock,
  Globe,
  Lock,
  EyeOff,
  Copy,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Template, deleteTemplate, toggleTemplateVisibility } from '../../lib/templates';

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onToggleVisibility: (templateId: string, visibility: 'visible' | 'hidden') => void;
}

export default function TemplateCard({ template, onEdit, onDelete, onToggleVisibility }: TemplateCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getCategoryIcon = (category: string) => {
    // This would map to the same icons used in the main Templates page
    return '📋'; // Placeholder
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await deleteTemplate(template.id);
      if (error) throw error;
      onDelete(template.id);
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleVisibility = async () => {
    setLoading(true);
    try {
      const newVisibility = template.visibility === 'visible' ? 'hidden' : 'visible';
      const { error } = await toggleTemplateVisibility(template.id, newVisibility);
      if (error) throw error;
      onToggleVisibility(template.id, newVisibility);
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    // Copy template link to clipboard
    const link = `${window.location.origin}/templates/${template.id}`;
    navigator.clipboard.writeText(link);
    // You could show a toast notification here
  };

  const handleDuplicate = () => {
    // Create a copy of the template
    onEdit({ ...template, id: '', name: `${template.name} (Copy)` });
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center flex-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-xl">{getCategoryIcon(template.category)}</span>
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
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                  <button
                    onClick={() => {
                      setShowActions(false);
                      // Handle view action
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onEdit(template);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      handleDuplicate();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      handleShare();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      handleToggleVisibility();
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    {template.visibility === 'visible' ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show
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
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {template.form_data?.fields?.length || 0} fields
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatDate(template.updated_at)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize">
                {template.category}
              </span>
              {template.visibility === 'visible' ? (
                <Globe className="w-4 h-4 text-blue-500" title="Visible to team" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" title="Private" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(template)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleVisibility}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title={template.visibility === 'visible' ? 'Hide' : 'Show'}
              >
                {template.visibility === 'visible' ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
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
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Template</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "<strong>{template.name}</strong>"? 
              This will permanently remove the template and all its data.
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}