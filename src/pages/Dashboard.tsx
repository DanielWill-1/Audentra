import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Plus, 
  FileText, 
  BarChart3, 
  Users, 
  Settings, 
  Bell, 
  Search,
  ArrowRight,
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
  Brain,
  Shield,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      navigate('/');
    }
  };

  const recentForms = [
    {
      id: 1,
      name: 'Patient Intake - John Smith',
      type: 'Healthcare',
      completedAt: '2 hours ago',
      duration: '3:45',
      status: 'completed'
    },
    {
      id: 2,
      name: 'Safety Inspection - Building A',
      type: 'Field Work',
      completedAt: '5 hours ago',
      duration: '7:20',
      status: 'completed'
    },
    {
      id: 3,
      name: 'Employee Onboarding - Sarah Wilson',
      type: 'HR',
      completedAt: '1 day ago',
      duration: '12:15',
      status: 'completed'
    }
  ];

  const stats = [
    {
      label: 'Forms Completed',
      value: '247',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'blue'
    },
    {
      label: 'Time Saved',
      value: '18.5h',
      change: '+8%',
      trend: 'up',
      icon: Clock,
      color: 'emerald'
    },
    {
      label: 'Accuracy Rate',
      value: '99.7%',
      change: '+0.3%',
      trend: 'up',
      icon: CheckCircle,
      color: 'purple'
    },
    {
      label: 'Team Members',
      value: '12',
      change: '+2',
      trend: 'up',
      icon: Users,
      color: 'orange'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Form',
      description: 'Start with a template or build from scratch',
      icon: Plus,
      color: 'bg-blue-600 hover:bg-blue-700',
      href: '/templates'
    },
    {
      title: 'Voice Training',
      description: 'Improve AI accuracy for your vocabulary',
      icon: Brain,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      href: '#'
    },
    {
      title: 'Team Settings',
      description: 'Manage users and permissions',
      icon: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      href: '#'
    },
    {
      title: 'Analytics',
      description: 'View detailed usage reports',
      icon: BarChart3,
      color: 'bg-orange-600 hover:bg-orange-700',
      href: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 mr-8">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">VoiceForm Pro</span>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link to="/dashboard" className="text-blue-600 font-medium">Dashboard</Link>
                <Link to="/templates" className="text-gray-700 hover:text-blue-600 transition-colors">Templates</Link>
                <Link to="#" className="text-gray-700 hover:text-blue-600 transition-colors">Analytics</Link>
                <Link to="#" className="text-gray-700 hover:text-blue-600 transition-colors">Team</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search forms..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-xs text-gray-600">{user?.email}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center text-gray-600 hover:text-red-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your voice-powered forms today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'emerald' ? 'bg-emerald-100' :
                  stat.color === 'purple' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  <stat.icon className={`w-6 h-6 ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'emerald' ? 'text-emerald-600' :
                    stat.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                </div>
                <div className="flex items-center text-emerald-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">{stat.change}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.href}
                    className={`${action.color} text-white p-6 rounded-xl transition-colors group`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <action.icon className="w-8 h-8" />
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                    <p className="text-sm opacity-90">{action.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Forms</h2>
                <Link to="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {recentForms.map((form) => (
                  <div key={form.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{form.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{form.type}</span>
                          <span>•</span>
                          <span>{form.completedAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{form.duration}</div>
                        <div className="text-xs text-gray-600">Duration</div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center text-emerald-600 mb-2">
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Accuracy Improved</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your voice recognition accuracy increased by 2.3% this week thanks to vocabulary training.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center text-blue-600 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Time Savings</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    You've saved 18.5 hours this month compared to traditional form filling.
                  </p>
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Security Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Encryption</span>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Blockchain Verification</span>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">HIPAA Compliance</span>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Compliant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pro Tips</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  💡 Speak clearly and at a normal pace for best accuracy
                </div>
                <div className="text-sm text-gray-600">
                  🎯 Use industry-specific terms to improve AI understanding
                </div>
                <div className="text-sm text-gray-600">
                  ⚡ Create templates for frequently used forms
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;