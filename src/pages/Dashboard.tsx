import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Plus, 
  FileText, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  Search,
  Filter,
  Star,
  Download,
  Share2,
  Eye,
  Clock,
  TrendingUp,
  Award,
  Globe,
  Lock,
  Heart,
  MessageSquare,
  BarChart3,
  Zap,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Mail,
  Copy,
  X,
  Loader2,
  Crown,
  Shield,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  Bookmark,
  Tag,
  Building2,
  Stethoscope,
  HardHat,
  UserCheck,
  Scale,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserTemplates, getTemplatesByCategory, Template } from '../lib/templates';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'pending' | 'inactive';
}

interface SharedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  authorAvatar?: string;
  downloads: number;
  rating: number;
  reviews: number;
  tags: string[];
  isBookmarked: boolean;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateReview {
  id: string;
  templateId: string;
  reviewer: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

const CATEGORY_ICONS = {
  healthcare: Stethoscope,
  fieldwork: HardHat,
  hr: UserCheck,
  legal: Scale,
  education: GraduationCap,
  realestate: Building2
};

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [templateReviews, setTemplateReviews] = useState<TemplateReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SharedTemplate | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user templates
      const { data: userTemplates } = await getUserTemplates();
      setTemplates(userTemplates || []);
      
      // Load shared templates (mock data for now)
      setSharedTemplates(mockSharedTemplates);
      
      // Load team members (mock data for now)
      setTeamMembers(mockTeamMembers);
      
      // Load template reviews (mock data for now)
      setTemplateReviews(mockTemplateReviews);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    setInviteLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add new pending member
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'pending'
      };
      
      setTeamMembers([...teamMembers, newMember]);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedTemplate || !reviewComment.trim()) return;
    
    try {
      const newReview: TemplateReview = {
        id: Date.now().toString(),
        templateId: selectedTemplate.id,
        reviewer: user?.email?.split('@')[0] || 'Anonymous',
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
        helpful: 0
      };
      
      setTemplateReviews([newReview, ...templateReviews]);
      setReviewComment('');
      setReviewRating(5);
      setShowReviewModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const filteredSharedTemplates = sharedTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalTemplates: templates.length,
    sharedTemplates: sharedTemplates.length,
    teamMembers: teamMembers.filter(m => m.status === 'active').length,
    totalDownloads: sharedTemplates.reduce((sum, t) => sum + t.downloads, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">VoiceForm Pro</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'marketplace', name: 'Template Marketplace', icon: Globe },
              { id: 'my-templates', name: 'My Templates', icon: FileText },
              { id: 'team', name: 'Team Collaboration', icon: Users },
              { id: 'reviews', name: 'Reviews & Ratings', icon: Star }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">My Templates</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTemplates}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Shared Templates</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.sharedTemplates}</p>
                  </div>
                  <Globe className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Team Members</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.teamMembers}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Downloads</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalDownloads}</p>
                  </div>
                  <Download className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <Link
                  to="/templates"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-8 h-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Create Template</h3>
                    <p className="text-sm text-gray-600">Build a new voice form template</p>
                  </div>
                </Link>
                <Link
                  to="/ai-voice-autofill"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Zap className="w-8 h-8 text-purple-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Voice Auto-Fill</h3>
                    <p className="text-sm text-gray-600">Fill forms using voice commands</p>
                  </div>
                </Link>
                <Link
                  to="/scheduler"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-8 h-8 text-emerald-600 mr-4" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Schedule Events</h3>
                    <p className="text-sm text-gray-600">Manage form-related tasks</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  { action: 'Created template', item: 'Patient Intake Form', time: '2 hours ago', icon: Plus, color: 'text-blue-600' },
                  { action: 'Downloaded template', item: 'Safety Inspection Checklist', time: '4 hours ago', icon: Download, color: 'text-emerald-600' },
                  { action: 'Invited team member', item: 'sarah@company.com', time: '1 day ago', icon: UserPlus, color: 'text-purple-600' },
                  { action: 'Reviewed template', item: 'Employee Onboarding Form', time: '2 days ago', icon: Star, color: 'text-orange-600' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <activity.icon className={`w-5 h-5 ${activity.color}`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.action}</span> "{activity.item}"
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Template Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center space-x-4 mb-4">
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
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="fieldwork">Field Work</option>
                  <option value="hr">Human Resources</option>
                  <option value="legal">Legal</option>
                  <option value="education">Education</option>
                  <option value="realestate">Real Estate</option>
                </select>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{filteredSharedTemplates.length} templates found</span>
                <div className="flex items-center space-x-4">
                  <button className="flex items-center text-blue-600 hover:text-blue-700">
                    <Filter className="w-4 h-4 mr-1" />
                    More Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Templates */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Featured Templates</h2>
              <p className="text-blue-100 mb-6">Discover the most popular and highly-rated templates from our community</p>
              <div className="grid md:grid-cols-3 gap-4">
                {filteredSharedTemplates.slice(0, 3).map(template => (
                  <div key={template.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs bg-white/20 text-white px-2 py-1 rounded capitalize">
                        {template.category}
                      </span>
                      <div className="flex items-center text-yellow-400">
                        <Star className="w-4 h-4 fill-current mr-1" />
                        <span className="text-sm">{template.rating}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                    <p className="text-blue-100 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-200">{template.downloads} downloads</span>
                      <button className="text-white hover:text-blue-200 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSharedTemplates.map(template => (
                <div key={template.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                          {React.createElement(
                            CATEGORY_ICONS[template.category as keyof typeof CATEGORY_ICONS] || FileText,
                            { className: "w-6 h-6 text-blue-600" }
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-600">by {template.author}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {template.isPremium && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        <button
                          onClick={() => {
                            // Toggle bookmark
                            setSharedTemplates(templates => 
                              templates.map(t => 
                                t.id === template.id ? { ...t, isBookmarked: !t.isBookmarked } : t
                              )
                            );
                          }}
                          className={`p-1 rounded transition-colors ${
                            template.isBookmarked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${template.isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4">{template.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                          <span>{template.rating}</span>
                          <span className="ml-1">({template.reviews})</span>
                        </div>
                        <div className="flex items-center">
                          <Download className="w-4 h-4 mr-1" />
                          <span>{template.downloads}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowReviewModal(true);
                        }}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Templates Tab */}
        {activeTab === 'my-templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Templates</h2>
              <Link
                to="/templates"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Link>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                <p className="text-gray-600 mb-6">Create your first template to get started</p>
                <Link
                  to="/templates"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Template
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                  <div key={template.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          {React.createElement(
                            CATEGORY_ICONS[template.category as keyof typeof CATEGORY_ICONS] || FileText,
                            { className: "w-5 h-5 text-blue-600" }
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded capitalize">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{template.form_data?.fields?.length || 0} fields</span>
                      <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/templates?edit=${template.id}`}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                      >
                        Edit
                      </Link>
                      <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Collaboration Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Team Collaboration</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </button>
            </div>

            {/* Team Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Members</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teamMembers.filter(m => m.status === 'active').length}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Invites</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {teamMembers.filter(m => m.status === 'pending').length}
                    </p>
                  </div>
                  <Mail className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Shared Templates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.filter(t => t.visibility === 'visible').length}
                    </p>
                  </div>
                  <Share2 className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {teamMembers.map(member => (
                  <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                          <span className="text-white text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              member.status === 'active' ? 'bg-green-100 text-green-800' :
                              member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.status}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                              {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                              {member.role}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Last active: {new Date(member.lastActive).toLocaleDateString()}
                          </p>
                        </div>
                        {member.role !== 'owner' && (
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reviews & Ratings Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>

            {/* Review Stats */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">{templateReviews.length}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templateReviews.length > 0 
                        ? (templateReviews.reduce((sum, r) => sum + r.rating, 0) / templateReviews.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">5-Star Reviews</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templateReviews.filter(r => r.rating === 5).length}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Helpful Votes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templateReviews.reduce((sum, r) => sum + r.helpful, 0)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {templateReviews.slice(0, 10).map(review => (
                  <div key={review.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-medium">
                            {review.reviewer.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{review.reviewer}</h4>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{review.comment}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <button className="flex items-center hover:text-blue-600 transition-colors">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Helpful ({review.helpful})
                      </button>
                      <span>Template: {sharedTemplates.find(t => t.id === review.templateId)?.name || 'Unknown'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="colleague@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={inviteLoading || !inviteEmail.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {inviteLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedTemplate.name}</h4>
                <p className="text-sm text-gray-600">by {selectedTemplate.author}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setReviewRating(rating)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          rating <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share your experience with this template..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={!reviewComment.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                <Star className="w-4 h-4 mr-2" />
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data
const mockSharedTemplates: SharedTemplate[] = [
  {
    id: '1',
    name: 'Patient Intake Form',
    description: 'Comprehensive patient intake form for medical practices with HIPAA compliance',
    category: 'healthcare',
    author: 'Dr. Sarah Johnson',
    downloads: 1247,
    rating: 4.8,
    reviews: 89,
    tags: ['medical', 'intake', 'hipaa', 'patient'],
    isBookmarked: false,
    isPremium: true,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    name: 'Safety Inspection Checklist',
    description: 'Detailed safety inspection form for construction and industrial sites',
    category: 'fieldwork',
    author: 'Mike Rodriguez',
    downloads: 892,
    rating: 4.6,
    reviews: 67,
    tags: ['safety', 'inspection', 'construction', 'compliance'],
    isBookmarked: true,
    isPremium: false,
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z'
  },
  {
    id: '3',
    name: 'Employee Onboarding Form',
    description: 'Complete employee onboarding checklist with document collection',
    category: 'hr',
    author: 'Lisa Chen',
    downloads: 634,
    rating: 4.9,
    reviews: 45,
    tags: ['hr', 'onboarding', 'employee', 'documents'],
    isBookmarked: false,
    isPremium: false,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z'
  },
  {
    id: '4',
    name: 'Legal Consultation Intake',
    description: 'Client intake form for law firms with conflict checking',
    category: 'legal',
    author: 'James Wilson',
    downloads: 423,
    rating: 4.7,
    reviews: 32,
    tags: ['legal', 'client', 'consultation', 'intake'],
    isBookmarked: false,
    isPremium: true,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z'
  },
  {
    id: '5',
    name: 'Student Enrollment Form',
    description: 'Comprehensive student enrollment form for educational institutions',
    category: 'education',
    author: 'Maria Garcia',
    downloads: 567,
    rating: 4.5,
    reviews: 38,
    tags: ['education', 'student', 'enrollment', 'academic'],
    isBookmarked: true,
    isPremium: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z'
  },
  {
    id: '6',
    name: 'Property Listing Form',
    description: 'Real estate property listing form with photo upload capabilities',
    category: 'realestate',
    author: 'David Thompson',
    downloads: 345,
    rating: 4.4,
    reviews: 28,
    tags: ['realestate', 'property', 'listing', 'photos'],
    isBookmarked: false,
    isPremium: false,
    createdAt: '2023-12-28T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
];

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@company.com',
    role: 'owner',
    joinedAt: '2023-12-01T00:00:00Z',
    lastActive: '2024-01-15T10:30:00Z',
    status: 'active'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'admin',
    joinedAt: '2023-12-15T00:00:00Z',
    lastActive: '2024-01-15T09:15:00Z',
    status: 'active'
  },
  {
    id: '3',
    name: 'Mike Rodriguez',
    email: 'mike@company.com',
    role: 'member',
    joinedAt: '2024-01-05T00:00:00Z',
    lastActive: '2024-01-14T16:45:00Z',
    status: 'active'
  },
  {
    id: '4',
    name: 'Lisa Chen',
    email: 'lisa@company.com',
    role: 'member',
    joinedAt: '2024-01-10T00:00:00Z',
    lastActive: '2024-01-10T00:00:00Z',
    status: 'pending'
  }
];

const mockTemplateReviews: TemplateReview[] = [
  {
    id: '1',
    templateId: '1',
    reviewer: 'Dr. Michael Brown',
    rating: 5,
    comment: 'Excellent template! Saved us hours of work and patients love the voice interface.',
    createdAt: '2024-01-14T00:00:00Z',
    helpful: 12
  },
  {
    id: '2',
    templateId: '2',
    reviewer: 'Construction Manager',
    rating: 4,
    comment: 'Very comprehensive checklist. Could use a few more customization options.',
    createdAt: '2024-01-13T00:00:00Z',
    helpful: 8
  },
  {
    id: '3',
    templateId: '3',
    reviewer: 'HR Director',
    rating: 5,
    comment: 'Perfect for our onboarding process. The voice feature is a game-changer.',
    createdAt: '2024-01-12T00:00:00Z',
    helpful: 15
  },
  {
    id: '4',
    templateId: '1',
    reviewer: 'Clinic Administrator',
    rating: 4,
    comment: 'Great template, but would like more integration options with our EMR system.',
    createdAt: '2024-01-11T00:00:00Z',
    helpful: 6
  },
  {
    id: '5',
    templateId: '4',
    reviewer: 'Legal Assistant',
    rating: 5,
    comment: 'Streamlined our client intake process significantly. Highly recommended!',
    createdAt: '2024-01-10T00:00:00Z',
    helpful: 9
  }
];

export default Dashboard;