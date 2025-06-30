import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  FileText, 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  UserPlus,
  Share2,
  Star,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InviteMemberModal from '../components/Team/InviteMemberModal';
import TeamMembersModal from '../components/Team/TeamMembersModal';

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      navigate('/');
    }
  };

  // Mock data for dashboard
  const stats = {
    totalForms: 247,
    completedToday: 18,
    avgCompletionTime: '2.3 min',
    accuracy: '99.7%'
  };

  const recentActivity = [
    {
      id: 1,
      type: 'form_completed',
      title: 'Patient Intake Form completed',
      time: '5 minutes ago',
      user: 'Dr. Sarah Martinez'
    },
    {
      id: 2,
      type: 'template_created',
      title: 'New HR Onboarding template created',
      time: '1 hour ago',
      user: 'You'
    },
    {
      id: 3,
      type: 'team_invite',
      title: 'Alex Chen joined your team',
      time: '2 hours ago',
      user: 'System'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Template',
      description: 'Build a voice-powered form template',
      icon: FileText,
      color: 'bg-blue-500',
      href: '/templates'
    },
    {
      title: 'Schedule Event',
      description: 'Plan form reviews and meetings',
      icon: Calendar,
      color: 'bg-emerald-500',
      href: '/scheduler'
    },
    {
      title: 'Invite Team Member',
      description: 'Add collaborators to your workspace',
      icon: UserPlus,
      color: 'bg-purple-500',
      action: () => setShowInviteModal(true)
    },
    {
      title: 'View Analytics',
      description: 'Track performance and usage',
      icon: BarChart3,
      color: 'bg-orange-500',
      href: '#'
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
                <span className="text-2xl font-bold text-gray-900">Audentra</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome back, {user?.user_metadata?.first_name || user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-700 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your voice-powered forms, templates, and team collaboration
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Forms</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalForms}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-gray-600">Avg: {stats.avgCompletionTime}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accuracy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.accuracy}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Shield className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">Blockchain verified</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => setShowTeamModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage team →
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <div key={index}>
                    {action.href ? (
                      <Link
                        to={action.href}
                        className="block p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center mb-4">
                          <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                            <action.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </Link>
                    ) : (
                      <button
                        onClick={action.action}
                        className="block w-full text-left p-6 border border-gray-200 rounded-xl hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-center mb-4">
                          <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                            <action.icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/templates" className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  Templates
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Create and manage voice-powered form templates
                </p>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link to="/scheduler" className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  Scheduler
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Schedule events and manage your calendar
                </p>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </Link>

              <button 
                onClick={() => setShowTeamModal(true)}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group text-left w-full"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  Team
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Manage team members and collaboration
                </p>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {activity.type === 'form_completed' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'template_created' && <FileText className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'team_invite' && <Users className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.time} • {activity.user}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all activity →
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InviteMemberModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
      
      <TeamMembersModal 
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onInvite={() => {
          setShowTeamModal(false);
          setShowInviteModal(true);
        }}
      />
    </div>
  );
}

export default Dashboard;