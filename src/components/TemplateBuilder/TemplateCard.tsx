import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  Edit, 
  Share2, 
  Trash2, 
  MoreHorizontal,
  Users,
  Clock,
  Globe,
  Lock,
  EyeOff,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  FileText,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { Template, deleteTemplate, toggleTemplateVisibility, exportTemplate, generateShareLink } from '../../lib/templates';

interface TemplateCardProps {
  template: Template;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onToggleVisibility: (templateId: string, visibility: 'visible' | 'hidden') => void;
}

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

export default function TemplateCard({ template, onEdit, onDelete, onToggleVisibility }: TemplateCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (!dropdownRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;
      setCanScrollUp(scrollTop > 0);
      setCanScrollDown(scrollHeight - scrollTop > clientHeight);
    };

    checkScrollable();
    const observer = new ResizeObserver(checkScrollable);
    if (dropdownRef.current) {
      observer.observe(dropdownRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [showActions]);

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || FileText;
    return IconComponent;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
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
    const link = generateShareLink(template.id);
    setShareLink(link);
    setShowShareModal(true);
    setShowActions(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleExport = async () => {
    try {
      await exportTemplate(template);
      setShowActions(false);
    } catch (error) {
      console.error('Failed to export template:', error);
    }
  };

  const handleDuplicate = () => {
    // Create a copy of the template for editing
    const duplicateTemplate = {
      ...template,
      id: '',
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    onEdit(duplicateTemplate);
    setShowActions(false);
  };

  const scrollStep = 40;

  const scrollUp = () => {
    if (dropdownRef.current) {
      dropdownRef.current.scrollTop -= scrollStep;
    }
  };

  const scrollDown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.scrollTop += scrollStep;
    }
  };

  const IconComponent = getCategoryIcon(template.category);

  return (
    <>
      <div className="relative"> {/* Make the card relative for absolute positioning of actions */}
        <div className={`bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden ${
          template.visibility === 'hidden' ? 'opacity-60 bg-gray-50' : ''
        }`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                  template.visibility === 'hidden' ? 'bg-gray-100' : 'bg-blue-100'
                }`}>
                  <IconComponent className={`w-6 h-6 ${
                    template.visibility === 'hidden' ? 'text-gray-500' : 'text-blue-600'
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
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"> {/* Adjusted positioning */}
                      <div className="relative">
                        {canScrollUp && (
                          <button
                            onClick={scrollUp}
                            className="absolute left-0 right-0 top-0 p-2 bg-white border-b border-gray-200 hover:bg-gray-50 text-gray-600 z-10"
                          >
                            <ChevronUp className="mx-auto w-4 h-4" />
                          </button>
                        )}
                        <div 
                          ref={dropdownRef}
                          style={{ maxHeight: '200px', overflowY: 'auto' }}
                          className="scrollable-content"
                        >
                          <button
                            onClick={() => {
                              setShowActions(false);
                              // Handle view action - could navigate to template detail page
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
                            onClick={handleDuplicate}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </button>
                          <button
                            onClick={handleExport}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </button>
                          <button
                            onClick={handleShare}
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
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50"
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
                        {canScrollDown && (
                          <button
                            onClick={scrollDown}
                            className="absolute left-0 right-0 bottom-0 p-2 bg-white border-t border-gray-200 hover:bg-gray-50 text-gray-600 z-10"
                          >
                            <ChevronDown className="mx-auto w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
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
                {template.visibility === 'hidden' && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Hidden
                  </span>
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
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
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

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Share Template</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Share this template with others using the link below:
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 truncate mr-2">{shareLink}</span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> This is a placeholder link. The sharing functionality will be implemented in a future update.
                </p>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}