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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      navigate('/');
    }
  };

  // Get user's first name for welcome message
  const getUserName = () => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
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
      duration: '6:20',
      status: 'completed'
    },
    {
      id: 3,
      name: 'Employee Onboarding - Sarah Wilson',
      type: 'HR',
      completedAt: '1 day ago',
      duration: '8:15',
      status: 'completed'
    }
  ];

  const quickStats = [
    {
      label: 'Forms Completed',
      value: '47',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'blue'
    },
    {
      label: 'Time Saved',
      value: '23.5h',
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
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search forms..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {getUserName().charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700">{getUserName()}</span>
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
            Welcome back, {getUserName()}!
          </h1>
          <p className="text-gray-600">Here's what's happening with your voice forms today.</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Start New Form</h3>
                <p className="text-blue-100 text-sm">Create a form with voice commands</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
            </div>
            <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>

          <Link to="/templates" className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Templates</h3>
                <p className="text-gray-600 text-sm">Choose from pre-built forms</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="text-emerald-600 font-medium flex items-center">
              View Templates
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Analytics</h3>
                <p className="text-gray-600 text-sm">Track your form performance</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-purple-600 font-medium flex items-center">
              View Reports
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {stat.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Forms */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Forms</h2>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {recentForms.map((form) => (
                  <div key={form.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{form.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {form.type}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {form.duration}
                          </span>
                          <span>{form.completedAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Brain className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center text-blue-800 mb-2">
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="font-medium">Performance Boost</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Your form completion speed improved by 23% this week!
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center text-emerald-800 mb-2">
                    <Shield className="w-4 h-4 mr-2" />
                    <span className="font-medium">Security Update</span>
                  </div>
                  <p className="text-emerald-700 text-sm">
                    All your forms are blockchain verified and secure.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Settings</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-gray-600 mr-3" />
                    <span className="text-gray-700">Team Management</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center">
                    <Settings className="w-4 h-4 text-gray-600 mr-3" />
                    <span className="text-gray-700">Account Settings</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center">
                    <Bell className="w-4 h-4 text-gray-600 mr-3" />
                    <span className="text-gray-700">Notifications</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;