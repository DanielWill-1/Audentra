import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Share2, 
  Search, 
  Filter, 
  FileText, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Send,
  Eye,
  Calendar,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2
} from 'lucide-react';
import { getUserTemplates, shareTemplatesWithTeam, Template } from '../../lib/templates';
import { useAuth } from '../../contexts/AuthContext';

interface ShareNewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'fieldwork', name: 'Field Work' },
  { id: 'hr', name: 'Human Resources' },
  { id: 'legal', name: 'Legal' },
  { id: 'education', name: 'Education' },
  { id: 'realestate', name: 'Real Estate' }
];

export default function ShareNewTemplateModal({ isOpen, onClose, onSuccess }: ShareNewTemplateModalProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const templatesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  // Add scroll wheel event handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (templatesContainerRef.current) {
        templatesContainerRef.current.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };

    const container = templatesContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getUserTemplates('created_at', false);
      if (error) throw error;
      
      // Only show templates that are owned by the user
      const userTemplates = (data || []).filter(template => 
        template.visibility === 'visible' || template.visibility === 'hidden'
      );
      
      setTemplates(userTemplates);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    setFilteredTemplates(filtered);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === filteredTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(filteredTemplates.map(t => t.id));
    }
  };

  const handleShareTemplates = async () => {
    if (selectedTemplates.length === 0) {
      setError('Please select at least one template to share');
      return;
    }

    setSharing(true);
    setError(null);

    try {
      const { error } = await shareTemplatesWithTeam(
        selectedTemplates,
        'Shared via team collaboration'
      );

      if (error) throw error;

      setSuccess(`Successfully shared ${selectedTemplates.length} template${selectedTemplates.length > 1 ? 's' : ''} with the team!`);
      
      setTimeout(() => {
        setSelectedTemplates([]);
        setSuccess(null);
        onSuccess?.();
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to share templates');
    } finally {
      setSharing(false);
    }
  };

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

  const handleClose = () => {
    setSelectedTemplates([]);
    setSearchQuery('');
    setSelectedCategory('all');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                <Share2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Share Templates with Team</h2>
                <p className="text-gray-600">Select templates to share with your team members</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
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

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedTemplates.length} of {filteredTemplates.length} selected
              </span>
              {filteredTemplates.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  {selectedTemplates.length === filteredTemplates.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>

          {/* Templates List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading your templates...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create some templates first to share with your team'
                }
              </p>
            </div>
          ) : (
            <div 
              className="space-y-3 max-h-96 overflow-y-auto pr-2"
              ref={templatesContainerRef}
            >
              {filteredTemplates.map((template) => {
                const IconComponent = getCategoryIcon(template.category);
                const isSelected = selectedTemplates.includes(template.id);
                const isAlreadyShared = template.shared_with && template.shared_with.length > 0;
                
                return (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTemplateSelect(template.id)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{template.name}</h3>
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize flex-shrink-0">
                            {template.category}
                          </span>
                          {template.visibility === 'hidden' && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex-shrink-0">
                              Private
                            </span>
                          )}
                          {isAlreadyShared && (
                            <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded flex-shrink-0">
                              Already Shared
                            </span>
                          )}
                        </div>
                        
                        {template.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            {template.form_data?.fields?.length || 0} fields
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Created {formatDate(template.created_at)}
                          </div>
                          {isAlreadyShared && (
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {template.shared_with?.length} shared
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle preview
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Preview Template"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Templates Summary */}
          {selectedTemplates.length > 0 && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h4 className="text-sm font-medium text-emerald-900 mb-2">
                Selected Templates ({selectedTemplates.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedTemplates.slice(0, 5).map(templateId => {
                  const template = templates.find(t => t.id === templateId);
                  return template ? (
                    <span key={templateId} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      {template.name}
                    </span>
                  ) : null;
                })}
                {selectedTemplates.length > 5 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                    +{selectedTemplates.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Team Sharing Info */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Sharing with Team</h4>
            <p className="text-blue-800 text-sm">
              Selected templates will be shared with all active team members with viewer access. 
              Team members will be able to view and use these templates in their own workflows.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShareTemplates}
            disabled={sharing || selectedTemplates.length === 0}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sharing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {sharing 
              ? 'Sharing...' 
              : `Share ${selectedTemplates.length} Template${selectedTemplates.length !== 1 ? 's' : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}