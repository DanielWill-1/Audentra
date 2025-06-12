import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  ArrowLeft,
  FileText,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserTemplates, getTemplatesByCategory, Template } from '../lib/templates';
import TemplateBuilderModal from '../components/TemplateBuilder/TemplateBuilderModal';
import TemplateCard from '../components/TemplateBuilder/TemplateCard';

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: FileText },
  { id: 'healthcare', name: 'Healthcare', icon: Stethoscope },
  { id: 'fieldwork', name: 'Field Work', icon: HardHat },
  { id: 'hr', name: 'Human Resources', icon: UserCheck },
  { id: 'legal', name: 'Legal', icon: Scale },
  { id: 'education', name: 'Education', icon: GraduationCap },
  { id: 'realestate', name: 'Real Estate', icon: Building2 }
];

function Templates() {
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Load templates
  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getTemplatesByCategory(selectedCategory);
      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get category counts
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return templates.length;
    return templates.filter(t => t.category === categoryId).length;
  };

  const handleCreateSuccess = () => {
    loadTemplates();
    setShowCreateModal(false);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDelete = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
  };

  const handleToggleVisibility = (templateId: string, visibility: 'visible' | 'hidden') => {
    setTemplates(templates.map(t => 
      t.id === templateId ? { ...t, visibility } : t
    ));
  };

  const TemplateListItem = ({ template }: { template: Template }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            {React.createElement(
              CATEGORIES.find(c => c.id === template.category)?.icon || FileText, 
              { className: "w-5 h-5 text-blue-600" }
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize">
                {template.category}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{template.form_data?.fields?.length || 0} fields</span>
              <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
              <span className={`px-2 py-1 rounded ${
                template.visibility === 'visible' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {template.visibility}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
                <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
                <p className="text-gray-600">Create, manage, and share voice-powered form templates</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadTemplates}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <category.icon className="w-4 h-4 mr-3" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {getCategoryCount(category.id)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{filteredTemplates.length} templates found</span>
                <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                  <option>Sort by: Most Recent</option>
                  <option>Sort by: Name</option>
                  <option>Sort by: Category</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading templates...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-red-800 font-medium">Error loading templates</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
                <button
                  onClick={loadTemplates}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Templates Grid/List */}
            {!loading && !error && (
              <>
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery 
                        ? 'Try adjusting your search or create a new template'
                        : 'Get started by creating your first template'
                      }
                    </p>
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Template
                    </button>
                  </div>
                ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map(template => (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggleVisibility={handleToggleVisibility}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredTemplates.map(template => (
                          <TemplateListItem key={template.id} template={template} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Template Builder Modal */}
      <TemplateBuilderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

export default Templates;