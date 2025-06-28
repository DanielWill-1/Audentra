import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Users,
  Share2,
  AlertTriangle,
  Filter,
  Search,
  Eye,
  MessageSquare,
  MoreHorizontal,
  UserPlus,
  FileText,
  Clock,
  CheckCircle,
  Star,
  TrendingUp,
  Calendar,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSharedTemplates, getUserTemplates } from '../lib/templates';
import InviteMemberModal from '../components/Team/InviteMemberModal';
import TeamMembersModal from '../components/Team/TeamMembersModal';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  lastActive: string;
}

interface SharedTemplate {
  id: string;
  name: string;
  sharedBy: string;
  uses: number;
  status: 'pending_review' | 'approved' | 'shared';
  lastUpdated: string;
  category: string;
}

interface TeamActivity {
  id: string;
  user: {
    name: string;
    initials: string;
    avatar?: string;
  };
  action: string;
  template?: string;
  time: string;
  type: 'completed' | 'shared' | 'requested' | 'approved';
}

const TABS = [
  { id: 'overview', name: 'Overview' },
  { id: 'marketplace', name: 'Template Marketplace' },
  { id: 'collaboration', name: 'Team Collaboration' },
  { id: 'settings', name: 'Settings & Customization' }
];

export default function TeamCollaboration() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('collaboration');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplate[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in real app this would come from API
  useEffect(() => {
    const loadTeamData = async () => {
      setLoading(true);
      
      // Mock team members
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          name: 'Dr. Sarah Martinez',
          email: 'sarah@company.com',
          initials: 'SM',
          role: 'admin',
          status: 'active',
          lastActive: '2 minutes ago'
        },
        {
          id: '2',
          name: 'Mike Johnson',
          email: 'mike@company.com',
          initials: 'MJ',
          role: 'editor',
          status: 'active',
          lastActive: '1 hour ago'
        },
        {
          id: '3',
          name: 'Lisa Chen',
          email: 'lisa@company.com',
          initials: 'LC',
          role: 'editor',
          status: 'active',
          lastActive: '3 hours ago'
        },
        {
          id: '4',
          name: 'David Rodriguez',
          email: 'david@company.com',
          initials: 'DR',
          role: 'viewer',
          status: 'active',
          lastActive: '5 hours ago'
        },
        {
          id: '5',
          name: 'Kevin Wilson',
          email: 'kevin@company.com',
          initials: 'KW',
          role: 'viewer',
          status: 'active',
          lastActive: '1 day ago'
        }
      ];

      // Mock shared templates
      const mockSharedTemplates: SharedTemplate[] = [
        {
          id: '1',
          name: 'Patient Intake v2.1',
          sharedBy: 'Dr. Johnson',
          uses: 15,
          status: 'pending_review',
          lastUpdated: '2 hours ago',
          category: 'healthcare'
        },
        {
          id: '2',
          name: 'Safety Checklist Pro',
          sharedBy: 'Mike Chen',
          uses: 8,
          status: 'approved',
          lastUpdated: 'yesterday',
          category: 'fieldwork'
        },
        {
          id: '3',
          name: 'HR Performance Review',
          sharedBy: 'Lisa Chen',
          uses: 12,
          status: 'shared',
          lastUpdated: '3 days ago',
          category: 'hr'
        }
      ];

      // Mock team activity
      const mockActivity: TeamActivity[] = [
        {
          id: '1',
          user: { name: 'Mike Johnson', initials: 'MJ' },
          action: 'completed Safety Inspection template',
          time: '2 hours ago',
          type: 'completed'
        },
        {
          id: '2',
          user: { name: 'Lisa Chen', initials: 'LC' },
          action: 'shared new HR template with team',
          time: '4 hours ago',
          type: 'shared'
        },
        {
          id: '3',
          user: { name: 'Dr. Rodriguez', initials: 'DR' },
          action: 'requested approval for Patient Intake v2.1',
          time: '6 hours ago',
          type: 'requested'
        }
      ];

      setTeamMembers(mockMembers);
      setSharedTemplates(mockSharedTemplates);
      setTeamActivity(mockActivity);
      setLoading(false);
    };

    loadTeamData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'shared': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'shared': return <Share2 className="w-4 h-4 text-emerald-600" />;
      case 'requested': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'approved': return <Star className="w-4 h-4 text-purple-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionButton = (type: string) => {
    switch (type) {
      case 'completed': return { text: 'View', color: 'text-blue-600' };
      case 'shared': return { text: 'Review', color: 'text-emerald-600' };
      case 'requested': return { text: 'Approve', color: 'text-orange-600' };
      default: return { text: 'View', color: 'text-gray-600' };
    }
  };

  const activeMembers = teamMembers.filter(m => m.status === 'active').length;
  const templatesSharedThisMonth = 28;
  const templatesAwaitingApproval = 5;
  const growthPercentage = 15;

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
                <h1 className="text-2xl font-bold text-gray-900">Team Collaboration</h1>
                <p className="text-gray-600">Manage team members, shared templates, and collaboration</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'collaboration' && (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Team Members */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{activeMembers}</div>
                <p className="text-sm text-gray-600 mb-4">Active collaborators</p>
                
                {/* Member Avatars */}
                <div className="flex items-center space-x-2 mb-4">
                  {teamMembers.slice(0, 4).map((member) => (
                    <div
                      key={member.id}
                      className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      title={member.name}
                    >
                      {member.initials}
                    </div>
                  ))}
                  {teamMembers.length > 4 && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold">
                      +{teamMembers.length - 4}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowTeamModal(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Manage team →
                </button>
              </div>

              {/* Shared Templates */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                      <Share2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Shared Templates</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-600 mb-2">{templatesSharedThisMonth}</div>
                <p className="text-sm text-gray-600 mb-4">Templates shared this month</p>
                
                <div className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+{growthPercentage}% from last month</span>
                </div>
              </div>

              {/* Pending Reviews */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Pending Reviews</h3>
                  </div>
                </div>
                <div className="text-3xl font-bold text-orange-600 mb-2">{templatesAwaitingApproval}</div>
                <p className="text-sm text-gray-600 mb-4">Templates awaiting approval</p>
                
                <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                  Review Now →
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Shared Templates */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Shared Templates</h2>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <Filter className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {sharedTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>Shared by {template.sharedBy}</span>
                              <span>•</span>
                              <span>{template.uses} uses</span>
                              <span>•</span>
                              <span>Updated {template.lastUpdated}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(template.status)}`}>
                            {template.status === 'pending_review' ? 'Pending Review' : 
                             template.status === 'approved' ? 'Approved' : 'Shared'}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-emerald-600 transition-colors">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 text-center">
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Share New Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Team Activity & Quick Actions */}
              <div className="space-y-6">
                {/* Team Activity */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Team Activity</h2>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View All
                    </button>
                  </div>

                  <div className="space-y-4">
                    {teamActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {activity.user.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getActivityIcon(activity.type)}
                            <p className="text-sm font-medium text-gray-900">{activity.user.name}</p>
                          </div>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                        <button className={`text-sm font-medium ${getActionButton(activity.type).color} hover:underline`}>
                          {getActionButton(activity.type).text}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="w-full flex items-center justify-center p-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </button>
                    
                    <button className="w-full flex items-center justify-center p-3 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Template
                    </button>
                    
                    <button className="w-full flex items-center justify-center p-3 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Team Chat
                    </button>
                    
                    <button className="w-full flex items-center justify-center p-3 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors">
                      <Star className="w-4 h-4 mr-2" />
                      Review Queue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Other tab content placeholders */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Overview</h2>
            <p className="text-gray-600">Overview content coming soon...</p>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Template Marketplace</h2>
            <p className="text-gray-600">Marketplace content coming soon...</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings & Customization</h2>
            <p className="text-gray-600">Settings content coming soon...</p>
          </div>
        )}
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