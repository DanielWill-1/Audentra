import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Star, 
  Eye, 
  Edit, 
  Copy, 
  Share2, 
  Trash2, 
  MoreHorizontal,
  FileText,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap,
  Building2,
  CheckCircle,
  Clock,
  Users,
  Download,
  Upload,
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
  Lock,
  Unlock,
  Globe,
  Settings,
  Mic,
  Brain,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

function Templates() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const categories = [
    { id: 'all', name: 'All Templates', icon: FileText, count: 47 },
    { id: 'healthcare', name: 'Healthcare', icon: Stethoscope, count: 12 },
    { id: 'fieldwork', name: 'Field Work', icon: HardHat, count: 8 },
    { id: 'hr', name: 'Human Resources', icon: UserCheck, count: 10 },
    { id: 'legal', name: 'Legal', icon: Scale, count: 6 },
    { id: 'education', name: 'Education', icon: GraduationCap, count: 5 },
    { id: 'realestate', name: 'Real Estate', icon: Building2, count: 6 }
  ];

  const templates = [
    {
      id: 1,
      name: 'Patient Intake Form',
      description: 'Comprehensive patient information collection with medical history',
      category: 'healthcare',
      rating: 4.9,
      uses: 1247,
      lastUpdated: '2 hours ago',
      status: 'approved',
      author: 'Dr. Sarah Martinez',
      isPublic: true,
      fields: 24,
      avgTime: '3:45',
      tags: ['HIPAA', 'Medical History', 'Insurance']
    },
    {
      id: 2,
      name: 'Safety Inspection Checklist',
      description: 'Complete safety inspection form for construction sites',
      category: 'fieldwork',
      rating: 4.8,
      uses: 892,
      lastUpdated: '1 day ago',
      status: 'approved',
      author: 'Mike Johnson',
      isPublic: true,
      fields: 18,
      avgTime: '5:20',
      tags: ['OSHA', 'Safety', 'Compliance']
    },
    {
      id: 3,
      name: 'Employee Onboarding',
      description: 'New hire paperwork and information collection',
      category: 'hr',
      rating: 4.7,
      uses: 634,
      lastUpdated: '3 days ago',
      status: 'pending',
      author: 'Lisa Chen',
      isPublic: false,
      fields: 32,
      avgTime: '8:15',
      tags: ['HR', 'Onboarding', 'Benefits']
    },
    {
      id: 4,
      name: 'Incident Report',
      description: 'Workplace incident documentation and reporting',
      category: 'fieldwork',
      rating: 4.6,
      uses: 445,
      lastUpdated: '1 week ago',
      status: 'approved',
      author: 'David Rodriguez',
      isPublic: true,
      fields: 16,
      avgTime: '4:30',
      tags: ['Incident', 'Safety', 'Documentation']
    },
    {
      id: 5,
      name: 'Performance Review',
      description: 'Annual employee performance evaluation form',
      category: 'hr',
      rating: 4.5,
      uses: 328,
      lastUpdated: '2 weeks ago',
      status: 'draft',
      author: 'You',
      isPublic: false,
      fields: 28,
      avgTime: '12:45',
      tags: ['Performance', 'Review', 'Goals']
    },
    {
      id: 6,
      name: 'Client Consultation',
      description: 'Legal client intake and consultation notes',
      category: 'legal',
      rating: 4.8,
      uses: 267,
      lastUpdated: '3 days ago',
      status: 'approved',
      author: 'Jennifer Walsh',
      isPublic: true,
      fields: 22,
      avgTime: '6:20',
      tags: ['Legal', 'Client', 'Consultation']
    }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.icon : FileText;
  };

  const CreateTemplateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New Template</h2>
            <button 
              onClick={() => setShowCreateModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Template Basic Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select category</option>
                {categories.slice(1).map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what this template is used for"
            />
          </div>

          {/* Template Builder Options */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How would you like to create this template?</h3>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                  <Mic className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Voice Builder</h4>
                <p className="text-sm text-gray-600">Describe your form requirements and let AI build it</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                  <Edit className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Visual Builder</h4>
                <p className="text-sm text-gray-600">Drag and drop fields to create your form</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Import Existing</h4>
                <p className="text-sm text-gray-600">Upload from Google Forms, PDF, or other formats</p>
              </div>
            </div>
          </div>

          {/* Privacy & Sharing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Sharing</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Globe className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">Public Template</h4>
                    <p className="text-sm text-gray-600">Available to all team members</p>
                  </div>
                </div>
                <input type="radio" name="privacy" value="public" defaultChecked className="text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-emerald-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">Team Only</h4>
                    <p className="text-sm text-gray-600">Visible to your team members only</p>
                  </div>
                </div>
                <input type="radio" name="privacy" value="team" className="text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <Lock className="w-5 h-5 text-gray-600 mr-3" />
                  <div>
                    <h4 className="font-medium text-gray-900">Private</h4>
                    <p className="text-sm text-gray-600">Only you can access this template</p>
                  </div>
                </div>
                <input type="radio" name="privacy" value="private" className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button 
            onClick={() => setShowCreateModal(false)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Template
          </button>
        </div>
      </div>
    </div>
  );

  const TemplateCard = ({ template }) => (
    <div className="bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              {React.createElement(getCategoryIcon(template.category), { 
                className: "w-6 h-6 text-blue-600" 
              })}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
            {template.rating}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {template.uses} uses
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {template.avgTime}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(template.status)}`}>
              {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
            </span>
            {template.isPublic ? (
              <Globe className="w-4 h-4 text-blue-500" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <span className="text-xs text-gray-500">Updated {template.lastUpdated}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">by {template.author}</span>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
              <Copy className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const TemplateListItem = ({ template }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            {React.createElement(getCategoryIcon(template.category), { 
              className: "w-5 h-5 text-blue-600" 
            })}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(template.status)}`}>
                {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
              </span>
              {template.isPublic ? (
                <Globe className="w-4 h-4 text-blue-500" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                {template.rating}
              </span>
              <span>{template.uses} uses</span>
              <span>{template.fields} fields</span>
              <span>Avg: {template.avgTime}</span>
              <span>by {template.author}</span>
              <span>Updated {template.lastUpdated}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
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
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <Brain className="w-4 h-4 mr-1" />
                AI Builder Ready
              </div>
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
                {categories.map(category => (
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
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Upload className="w-4 h-4 text-blue-600 mr-3" />
                  <span className="text-sm text-gray-700">Import Template</span>
                </button>
                <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-emerald-600 mr-3" />
                  <span className="text-sm text-gray-700">Export Templates</span>
                </button>
                <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <Share2 className="w-4 h-4 text-purple-600 mr-3" />
                  <span className="text-sm text-gray-700">Share Collection</span>
                </button>
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
                  <option>Sort by: Most Popular</option>
                  <option>Sort by: Newest</option>
                  <option>Sort by: Rating</option>
                  <option>Sort by: Name</option>
                </select>
              </div>
            </div>

            {/* Templates Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTemplates.map(template => (
                  <TemplateListItem key={template.id} template={template} />
                ))}
              </div>
            )}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or create a new template</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && <CreateTemplateModal />}
    </div>
  );
}

export default Templates;