import React, { useState } from 'react';
import { 
  Mic, 
  Plus, 
  Clock, 
  Users, 
  FileText, 
  Shield, 
  BarChart3, 
  ArrowRight,
  Play,
  Star,
  CheckCircle,
  Brain,
  Zap,
  ExternalLink,
  Share2,
  Eye,
  Settings,
  Bell,
  Calendar,
  AlertTriangle,
  Download,
  Upload,
  UserPlus,
  MessageSquare,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Archive,
  Send,
  Globe,
  Lock,
  Unlock,
  Target,
  TrendingUp,
  Activity,
  Heart,
  Bookmark,
  ThumbsUp,
  MessageCircle,
  Repeat2
} from 'lucide-react';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderOverview = () => (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Start a New Form */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Start a New Form</h2>
            <Link to="/templates" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Templates
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <Play className="w-8 h-8 text-white/80 hover:text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Quick Voice Form</h3>
              <p className="text-blue-100 text-sm mb-4">
                Start speaking immediately. Our AI will intelligently structure your input into the right format.
              </p>
              <div className="flex items-center text-sm text-blue-200">
                <Zap className="w-4 h-4 mr-1" />
                Average completion: 2 minutes
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Template</h3>
              <p className="text-gray-600 text-sm mb-4">
                Select from industry-specific templates optimized for your workflow and compliance needs.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="w-4 h-4 mr-1" />
                50+ professional templates
              </div>
            </div>
          </div>

          {/* External Forms Integration */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <ExternalLink className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">External Forms Integration</h3>
                  <p className="text-gray-600 text-sm">Import and voice-enable your existing Google Forms, Microsoft Forms, and other platforms</p>
                </div>
              </div>
              <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                Connect Forms
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="flex items-center p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">G</span>
                </div>
                <span className="text-sm text-gray-700">Google Forms</span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-blue-100 rounded mr-3 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">M</span>
                </div>
                <span className="text-sm text-gray-700">Microsoft Forms</span>
              </div>
              <div className="flex items-center p-3 bg-white rounded-lg border">
                <div className="w-8 h-8 bg-purple-100 rounded mr-3 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">T</span>
                </div>
                <span className="text-sm text-gray-700">Typeform</span>
              </div>
            </div>
          </div>
        </section>

        {/* Scheduling & Automation */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Scheduling & Automation</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Manage All Schedules
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Weekly Safety Inspection</h4>
                  <button className="text-blue-600 hover:text-blue-700">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">Every Monday at 9:00 AM</p>
                <div className="flex items-center text-xs text-blue-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  Next: Tomorrow at 9:00 AM
                </div>
              </div>
              
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Monthly HR Review</h4>
                  <button className="text-emerald-600 hover:text-emerald-700">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">First Friday of each month at 2:00 PM</p>
                <div className="flex items-center text-xs text-emerald-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  Next: March 1st at 2:00 PM
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <button className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4 inline mr-2" />
                Add New Schedule
              </button>
              <button className="bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                <Settings className="w-4 h-4 inline mr-2" />
                Automation Settings
              </button>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Activity
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Patient Intake - John Smith</h4>
                    <p className="text-sm text-gray-600">Completed 2 hours ago • 1:34 duration</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Verified</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                  <button className="text-gray-600 hover:text-gray-700">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Safety Inspection Report</h4>
                    <p className="text-sm text-gray-600">In progress • Started 30 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Draft</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">Continue</button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Employee Onboarding - Maria Garcia</h4>
                    <p className="text-sm text-gray-600">Completed yesterday • 2:15 duration</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Archived</span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                  <button className="text-gray-600 hover:text-gray-700">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-8">
        {/* Team Templates */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Team Templates</h2>
            <button className="text-blue-600 hover:text-blue-700">
              <Eye className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Patient Intake</h4>
                    <p className="text-xs text-gray-500">Healthcare • Pending Review</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">4.9</span>
                  <button className="text-orange-600 hover:text-orange-700 ml-2">
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Safety Inspection</h4>
                    <p className="text-xs text-gray-500">Field Work • Approved</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">4.8</span>
                  <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm">Employee Review</h4>
                    <p className="text-xs text-gray-500">HR • Shared with team</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">4.7</span>
                  <Share2 className="w-4 h-4 text-blue-500 ml-2" />
                </div>
              </div>
            </div>

            <Link to="/templates" className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium py-2 block text-center">
              Browse All Templates
            </Link>
          </div>
        </section>

        {/* Quick Stats */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Stats</h2>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">47</div>
                <div className="text-sm text-gray-600">Forms Completed</div>
                <div className="text-xs text-green-600">+12 this week</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">2:14</div>
                  <div className="text-xs text-gray-600">Avg. Time</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">99.2%</div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
              </div>

              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors">
                <BarChart3 className="w-4 h-4 inline mr-2" />
                View Detailed Analytics
              </button>
            </div>
          </div>
        </section>

        {/* Alerts & Reminders */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Alerts & Reminders</h2>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Bell className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">Template Review Due</h4>
                  <p className="text-xs text-gray-600">Patient Intake template needs supervisor approval</p>
                  <p className="text-xs text-yellow-600 mt-1">Due in 2 hours</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">Scheduled Form</h4>
                  <p className="text-xs text-gray-600">Weekly safety inspection reminder</p>
                  <p className="text-xs text-blue-600 mt-1">Tomorrow at 9:00 AM</p>
                </div>
              </div>

              <div className="flex items-start p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">Compliance Update</h4>
                  <p className="text-xs text-gray-600">All forms are HIPAA compliant</p>
                  <p className="text-xs text-green-600 mt-1">Last checked: 1 hour ago</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium py-2">
              Manage Alerts & Schedules
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div className="space-y-8">
      {/* Marketplace Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Template Marketplace</h2>
            <p className="text-purple-100 text-lg">Discover, share, and collaborate on templates with the community</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">2.4K+</div>
            <div className="text-purple-200 text-sm">Community Templates</div>
          </div>
        </div>
      </div>

      {/* Marketplace Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-6">
            <button className="text-purple-600 border-b-2 border-purple-600 pb-2 font-medium">
              Trending
            </button>
            <button className="text-gray-600 hover:text-purple-600 pb-2">
              Most Liked
            </button>
            <button className="text-gray-600 hover:text-purple-600 pb-2">
              Recent
            </button>
            <button className="text-gray-600 hover:text-purple-600 pb-2">
              Following
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search marketplace..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Featured Templates */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Template Card 1 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  DM
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Dr. Maria Santos</h4>
                  <p className="text-xs text-gray-500">Cardiologist • 2.1k followers</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Advanced Cardiac Assessment</h3>
              <p className="text-gray-600 text-sm mb-3">
                Comprehensive cardiac evaluation form with ECG interpretation guidelines and risk stratification.
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Cardiology</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">HIPAA</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Advanced</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  342
                </div>
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  28
                </div>
                <div className="flex items-center">
                  <Repeat2 className="w-4 h-4 mr-1" />
                  156
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                4.9
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button className="flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium">
                <Heart className="w-4 h-4 mr-1" />
                Like
              </button>
              <button className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                <Download className="w-4 h-4 mr-1" />
                Use Template
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-700 text-sm font-medium">
                <Bookmark className="w-4 h-4 mr-1" />
                Save
              </button>
            </div>
          </div>

          {/* Template Card 2 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  JC
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Jake Chen</h4>
                  <p className="text-xs text-gray-500">Safety Manager • 1.8k followers</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Construction Site Safety Audit</h3>
              <p className="text-gray-600 text-sm mb-3">
                Complete OSHA-compliant safety inspection checklist with photo documentation and immediate hazard reporting.
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Construction</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">OSHA</span>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Safety</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  289
                </div>
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  45
                </div>
                <div className="flex items-center">
                  <Repeat2 className="w-4 h-4 mr-1" />
                  203
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                4.8
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button className="flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium">
                <Heart className="w-4 h-4 mr-1 fill-current" />
                Liked
              </button>
              <button className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                <Download className="w-4 h-4 mr-1" />
                Use Template
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-700 text-sm font-medium">
                <Bookmark className="w-4 h-4 mr-1" />
                Save
              </button>
            </div>
          </div>

          {/* Template Card 3 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                  AR
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Alex Rodriguez</h4>
                  <p className="text-xs text-gray-500">HR Director • 3.2k followers</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">360° Performance Review</h3>
              <p className="text-gray-600 text-sm mb-3">
                Comprehensive performance evaluation with peer feedback, goal tracking, and development planning.
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">HR</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Performance</span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">360 Review</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  567
                </div>
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  89
                </div>
                <div className="flex items-center">
                  <Repeat2 className="w-4 h-4 mr-1" />
                  234
                </div>
              </div>
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                4.9
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button className="flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium">
                <Heart className="w-4 h-4 mr-1" />
                Like
              </button>
              <button className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                <Download className="w-4 h-4 mr-1" />
                Use Template
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-700 text-sm font-medium">
                <Bookmark className="w-4 h-4 mr-1 fill-current" />
                Saved
              </button>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="mt-8 grid md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">2.4K+</div>
            <div className="text-sm text-gray-600">Templates Shared</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">15K+</div>
            <div className="text-sm text-gray-600">Downloads</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">890+</div>
            <div className="text-sm text-gray-600">Contributors</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">4.8</div>
            <div className="text-sm text-gray-600">Avg. Rating</div>
          </div>
        </div>
      </div>

      {/* Your Contributions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Your Contributions</h3>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            <Share2 className="w-4 h-4 inline mr-2" />
            Share Template
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Patient Intake v2.1</h4>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Published</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Your enhanced patient intake form with voice summaries</p>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-3">
                <span className="flex items-center">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  45
                </span>
                <span className="flex items-center">
                  <Download className="w-3 h-3 mr-1" />
                  128
                </span>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-xs">View Stats</button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">HR Exit Interview</h4>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Pending Review</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Comprehensive exit interview with sentiment analysis</p>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-gray-400">Not published yet</span>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-xs">Edit Draft</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollaboration = () => (
    <div className="space-y-8">
      {/* Team Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <button className="text-blue-600 hover:text-blue-700">
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">12</div>
          <p className="text-sm text-gray-600">Active collaborators</p>
          <div className="mt-4 flex -space-x-2">
            {['SM', 'MJ', 'LC', 'DR', 'KW'].map((initials, index) => (
              <div key={index} className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                {initials}
              </div>
            ))}
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium border-2 border-white">
              +7
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Shared Templates</h3>
            <Share2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 mb-2">28</div>
          <p className="text-sm text-gray-600">Templates shared this month</p>
          <div className="mt-4 text-xs text-emerald-600">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            +15% from last month
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Reviews</h3>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">5</div>
          <p className="text-sm text-gray-600">Templates awaiting approval</p>
          <button className="mt-4 text-xs text-orange-600 hover:text-orange-700 font-medium">
            Review Now →
          </button>
        </div>
      </div>

      {/* Collaboration Features */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Shared Templates */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Shared Templates</h3>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Patient Intake v2.1</h4>
                  <p className="text-sm text-gray-600">Shared by Dr. Johnson • 15 uses</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full mr-2">Pending Review</span>
                    <span className="text-xs text-gray-500">Updated 2 hours ago</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-700 p-1">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-green-600 hover:text-green-700 p-1">
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-700 p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Safety Checklist Pro</h4>
                  <p className="text-sm text-gray-600">Shared by Mike Chen • 8 uses</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mr-2">Approved</span>
                    <span className="text-xs text-gray-500">Updated yesterday</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-700 p-1">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-blue-600 hover:text-blue-700 p-1">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-700 p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">HR Performance Review</h4>
                  <p className="text-sm text-gray-600">Shared by Lisa Chen • 12 uses</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">Shared</span>
                    <span className="text-xs text-gray-500">Updated 3 days ago</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="text-blue-600 hover:text-blue-700 p-1">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="text-blue-600 hover:text-blue-700 p-1">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="text-gray-600 hover:text-gray-700 p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <button className="w-full mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Share New Template
          </button>
        </div>

        {/* Team Activity & Communication */}
        <div className="space-y-6">
          {/* Team Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Team Activity</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                  MJ
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Mike Johnson completed Safety Inspection template</p>
                  <p className="text-xs text-gray-600">2 hours ago</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-xs">
                  View
                </button>
              </div>

              <div className="flex items-start p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                  LC
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Lisa Chen shared new HR template with team</p>
                  <p className="text-xs text-gray-600">4 hours ago</p>
                </div>
                <button className="text-green-600 hover:text-green-700 text-xs">
                  Review
                </button>
              </div>

              <div className="flex items-start p-3 bg-orange-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                  DR
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Dr. Rodriguez requested approval for Patient Intake v2.1</p>
                  <p className="text-xs text-gray-600">6 hours ago</p>
                </div>
                <button className="text-orange-600 hover:text-orange-700 text-xs">
                  Approve
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <UserPlus className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm text-gray-700">Invite Member</span>
              </button>
              
              <button className="flex items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Share2 className="w-4 h-4 mr-2 text-emerald-600" />
                <span className="text-sm text-gray-700">Share Template</span>
              </button>
              
              <button className="flex items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <MessageSquare className="w-4 h-4 mr-2 text-purple-600" />
                <span className="text-sm text-gray-700">Team Chat</span>
              </button>
              
              <button className="flex items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Eye className="w-4 h-4 mr-2 text-orange-600" />
                <span className="text-sm text-gray-700">Review Queue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8">
      {/* Settings Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Voice & AI Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Voice & AI Settings</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Voice Sensitivity</label>
              <input type="range" className="w-full" min="1" max="10" defaultValue="7" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Processing Speed</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Real-time (Recommended)</option>
                <option>Fast</option>
                <option>Balanced</option>
                <option>Accurate</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry Specialization</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Healthcare</option>
                <option>Field Work & Construction</option>
                <option>Human Resources</option>
                <option>Legal Services</option>
                <option>Education</option>
                <option>General Business</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Notifications & Alerts</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Form completion alerts</h4>
                <p className="text-xs text-gray-600">Get notified when forms are completed</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Template review reminders</h4>
                <p className="text-xs text-gray-600">Reminders for pending template approvals</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Team collaboration updates</h4>
                <p className="text-xs text-gray-600">Updates when team members share templates</p>
              </div>
              <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Scheduled form reminders</h4>
                <p className="text-xs text-gray-600">Reminders for recurring forms</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Security alerts</h4>
                <p className="text-xs text-gray-600">Important security and compliance notifications</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-blue-500" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notification Frequency</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Immediate</option>
                <option>Hourly digest</option>
                <option>Daily digest</option>
                <option>Weekly digest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Security & Privacy</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Two-factor authentication</h4>
                <p className="text-xs text-gray-600">Add an extra layer of security</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Enable
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Session timeout</h4>
                <p className="text-xs text-gray-600">Auto-logout after inactivity</p>
              </div>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
                <option>8 hours</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Data retention</h4>
                <p className="text-xs text-gray-600">How long to keep completed forms</p>
              </div>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>30 days</option>
                <option>90 days</option>
                <option>1 year</option>
                <option>7 years</option>
              </select>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-medium text-gray-900">Compliance Status</h4>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                  HIPAA Compliant
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                  SOC 2 Certified
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                  GDPR Compliant
                </div>
              </div>
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
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, User</h1>
              <p className="text-gray-600">Ready to streamline your workflow with voice-powered forms?</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <Shield className="w-4 h-4 mr-1" />
                Blockchain Trust Active
              </div>
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <Brain className="w-4 h-4 mr-1" />
                AI Assistant Ready
              </div>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'marketplace'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Template Marketplace
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Team Collaboration
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings & Customization
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'marketplace' && renderMarketplace()}
        {activeTab === 'collaboration' && renderCollaboration()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
}

export default Dashboard;