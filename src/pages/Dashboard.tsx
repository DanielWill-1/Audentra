import React, { useState, useContext, useEffect, useRef } from 'react';
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
  Repeat2,
  Loader2,
  RefreshCw,
  EyeOff
} from 'lucide-react'; //test
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getSharedTemplates, getTemplatesSharedByUser, Template } from '../lib/templates';
import InviteMemberModal from '../components/team/InviteMemberModal';
import TeamMembersModal from '../components/team/TeamMembersModal';
import ShareNewTemplateModal from '../components/team/ShareNewTemplateModal';
import SharedTemplateCard from '../components/team/SharedTemplateCard';
import ReviewQueueModal from '../components/team/ReviewQueueModal';
import StatsCard from '../components/stats/StatsCard';
import ScheduleStats from '../components/Scheduler/ScheduleStats';
import UpcomingEvents from '../components/Scheduler/UpcomingEvents';
import TeamTemplates from '../components/Dashboard/TeamTemplates';
import RecentActivity from '../components/Dashboard/RecentActivity';

interface SharedTemplateData {
  id: string;
  template: Template;
  shared_by: string;
  shared_at: string;
  user_email: string;
  user_name: string;
  role: string;
  message: string;
}

// Get user's first name for welcome message
const getUserName = (user) => {
  if (user?.user_metadata?.first_name) {
    return user.user_metadata.first_name;
  }
  if (user?.email) {
    return user.email.split('@')[0];
  }
  return 'User';
};

function Dashboard() {
  const { user, signOut } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  // Team collaboration state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showShareTemplateModal, setShowShareTemplateModal] = useState(false);
  const [showReviewQueueModal, setShowReviewQueueModal] = useState(false);
  const [sharedWithMeData, setSharedWithMeData] = useState<SharedTemplateData[]>([]);
  const [sharedByMeData, setSharedByMeData] = useState<SharedTemplateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharedTemplatesRef = useRef<HTMLDivElement>(null);
  const sharedByMeRef = useRef<HTMLDivElement>(null);

  // Load team collaboration data when collaboration tab is active
  useEffect(() => {
    if (activeTab === 'collaboration') {
      loadTeamData();
    }
  }, [activeTab]);

  // Add scroll wheel event handlers for collaboration tab
  useEffect(() => {
    if (activeTab !== 'collaboration') return;

    const handleWheel = (e: WheelEvent) => {
      if (sharedTemplatesRef.current && e.target && sharedTemplatesRef.current.contains(e.target as Node)) {
        sharedTemplatesRef.current.scrollLeft += e.deltaY;
        e.preventDefault();
      }
      if (sharedByMeRef.current && e.target && sharedByMeRef.current.contains(e.target as Node)) {
        sharedByMeRef.current.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    const sharedContainer = sharedTemplatesRef.current;
    const sharedByContainer = sharedByMeRef.current;

    if (sharedContainer) {
      sharedContainer.addEventListener('wheel', handleWheel, { passive: false });
    }
    if (sharedByContainer) {
      sharedByContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (sharedContainer) {
        sharedContainer.removeEventListener('wheel', handleWheel);
      }
      if (sharedByContainer) {
        sharedByContainer.removeEventListener('wheel', handleWheel);
      }
    };
  }, [activeTab]);

  const loadTeamData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading team collaboration data...');
      
      // Load templates shared with me
      const { data: sharedWithMeResponse, error: sharedWithMeError } = await getSharedTemplates();
      console.log('Templates shared with me:', { sharedWithMeResponse, sharedWithMeError });
      
      // Load templates I've shared with others
      const { data: sharedByMeResponse, error: sharedByMeError } = await getTemplatesSharedByUser();
      console.log('Templates shared by me:', { sharedByMeResponse, sharedByMeError });
      
      if (sharedWithMeError) {
        console.error('Error loading shared templates:', sharedWithMeError);
        setError('Failed to load shared templates');
      } else {
        // Filter out hidden templates and templates with null template data
        const validSharedWithMe = (sharedWithMeResponse || [])
          .filter(share => share.template !== null && share.message !== 'hidden_by_user');
        
        setSharedWithMeData(validSharedWithMe);
        console.log('Processed templates shared with me:', validSharedWithMe);
      }

      if (sharedByMeError) {
        console.error('Error loading templates shared by me:', sharedByMeError);
      } else {
        // Filter out templates with null template data
        const validSharedByMe = (sharedByMeResponse || [])
          .filter(share => share.template !== null);
        
        setSharedByMeData(validSharedByMe);
        console.log('Processed templates shared by me:', validSharedByMe);
      }
    } catch (err: any) {
      console.error('Error loading team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Refreshing shared templates...');
      
      // Reload templates shared with me
      const { data: sharedWithMeResponse, error: sharedWithMeError } = await getSharedTemplates();
      
      // Reload templates I've shared with others
      const { data: sharedByMeResponse, error: sharedByMeError } = await getTemplatesSharedByUser();
      
      if (sharedWithMeError) {
        throw sharedWithMeError;
      }
      
      if (sharedByMeError) {
        console.error('Error refreshing templates shared by me:', sharedByMeError);
      }
      
      const validSharedWithMe = (sharedWithMeResponse || [])
        .filter(share => share.template !== null && share.message !== 'hidden_by_user');
      
      const validSharedByMe = (sharedByMeResponse || [])
        .filter(share => share.template !== null);
      
      setSharedWithMeData(validSharedWithMe);
      setSharedByMeData(validSharedByMe);
      
      console.log('Refreshed data:', { 
        sharedWithMe: validSharedWithMe.length, 
        sharedByMe: validSharedByMe.length 
      });
    } catch (err: any) {
      setError(err.message || 'Failed to refresh shared templates');
    } finally {
      setLoading(false);
    }
  };

  const handleShareTemplateSuccess = () => {
    // Refresh shared templates data
    console.log('Template shared successfully, refreshing data...');
    handleRefresh();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      console.log('User logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleChooseTemplateRedirect = () => {
    navigate('/templates');
  };

  const handleManageSchedulesRedirect = () => {
    navigate('/manage-schedules');
  };

  const handleAddNewScheduleRedirect = () => {
    navigate('/scheduler');
  };

  const handleQuickVoiceFormRedirect = () => {
    navigate('/AIVoiceAutoFill');
  };
  
  // Update settings and save to localStorage
  const updateSettings = (newSettings: any) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_SETTINGS, JSON.stringify(updatedSettings));
  };

  const statsData = {
    formsCompleted: 47,
    weeklyChange: 12,
    accuracy: "99.2%",
    avgTime: "2:14"
  };

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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow" 
                 onClick={handleQuickVoiceFormRedirect}>
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

            <div
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={handleChooseTemplateRedirect}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mr-3">
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
                Professional templates
              </div>
            </div>

            <div
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/filledtemplates')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Filled Templates</h3>
              <p className="text-gray-600 text-sm mb-4">
                Access and manage all your previously filled templates in one place.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <FileText className="w-4 h-4 mr-1" />
                Organized and accessible
              </div>
            </div>
          </div>

          
        </section>

        {/* Scheduling & Automation */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Scheduling & Automation</h2>
            <button 
              onClick={handleManageSchedulesRedirect} 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Manage All Schedules
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {/* Schedule Stats */}
            <ScheduleStats className="mb-6" />
            
            {/* Upcoming Events */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
              <UpcomingEvents limit={2} showViewAll={false} />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={handleAddNewScheduleRedirect} 
                className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add New Schedule
              </button>
              <Link 
                to="/manage-schedules"
                className="bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-center"
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                View All Schedules
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <Link to="/activitylog" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Activity
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <RecentActivity limit={3} showViewAll={true} />
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
          <TeamTemplates limit={3} showViewAll={true} />
        </section>

        {/* Stats Card */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Stats</h2>
          <StatsCard 
            formsCompleted={statsData.formsCompleted}
            weeklyChange={statsData.weeklyChange}
            accuracy={statsData.accuracy}
            avgTime={statsData.avgTime}
          />
        </section>
      
      </div>
    </div>
  );

  const renderMarketplace = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white flex items-center justify-center min-h-[300px]">
        <div className="text-center w-full">
          <h2 className="text-3xl font-bold mb-4">Template Marketplace</h2>
          <p className="text-xl text-purple-100 mb-6">Coming Soon</p>
          <p className="text-purple-200 text-base">
            We’re working hard to bring you a community-driven template marketplace.<br />
            Stay tuned for updates!
          </p>
        </div>
      </div>
    </div>
  );

  const renderCollaboration = () => {
    const activeMembers = 3;
    const totalSharedTemplates = sharedWithMeData.length + sharedByMeData.length;
    const templatesAwaitingApproval = 2;
    const growthPercentage = 15;

    return (
      <div className="space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">
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
              {/* Current user */}
              <div
                className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                title={user?.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : user?.email}
              >
                {user?.user_metadata?.first_name
                  ? `${user.user_metadata.first_name[0]}${user.user_metadata.last_name ? user.user_metadata.last_name[0] : ''}`
                  : user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              
              {/* Add more avatars here if needed */}
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
            <div className="text-3xl font-bold text-emerald-600 mb-2">{totalSharedTemplates}</div>
            <p className="text-sm text-gray-600 mb-4">
              {sharedWithMeData.length} shared with you, {sharedByMeData.length} shared by you
            </p>
            
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
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Review Queue</h3>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-2">{templatesAwaitingApproval}</div>
            <p className="text-sm text-gray-600 mb-4">Templates awaiting review</p>
            
            <button 
              onClick={() => setShowReviewQueueModal(true)}
              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Review Now →
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <button 
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="w-full flex items-center justify-center p-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </button>
              
              <button 
                onClick={() => setShowShareTemplateModal(true)}
                className="w-full flex items-center justify-center p-2 border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Template
              </button>
              
              <button 
                onClick={() => setShowReviewQueueModal(true)}
                className="w-full flex items-center justify-center p-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Review Queue
              </button>
            </div>
          </div>
        </div>

        {/* Shared Templates */}
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading shared templates...</span>
            </div>
          ) : totalSharedTemplates === 0 ? (
            <div className="text-center py-12">
              <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared templates</h3>
              <p className="text-gray-600 mb-6">
                No templates have been shared yet. Share some of your templates with the team to get started.
              </p>
              <button 
                onClick={() => setShowShareTemplateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Share Your Templates
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Templates shared with me */}
              {sharedWithMeData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shared with You ({sharedWithMeData.length})</h3>
                  <div 
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto"
                    ref={sharedTemplatesRef}
                  >
                    {sharedWithMeData.map((share) => (
                      <SharedTemplateCard
                        key={share.id}
                        template={share.template}
                        shareId={share.id}
                        sharedBy={share.user_name || share.user_email}
                        sharedAt={share.shared_at}
                        role={share.role}
                        isHidden={share.message === 'hidden_by_user'}
                        onUpdate={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Templates shared by me */}
              {sharedByMeData.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Shared by You ({sharedByMeData.length})</h3>
                  <div 
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-x-auto"
                    ref={sharedByMeRef}
                  >
                    {sharedByMeData.map((share) => (
                      <SharedTemplateCard
                        key={share.id}
                        template={share.template}
                        shareId={share.id}
                        sharedBy="You"
                        sharedAt={share.shared_at}
                        role={share.role}
                        onUpdate={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {getUserName(user)}!</h1>
              <p className="text-gray-600">Ready to streamline your workflow with voice-powered forms?</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                Logout
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

      {/* Modals - Only render when collaboration tab is active */}
      {activeTab === 'collaboration' && (
        <>
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

          <ShareNewTemplateModal
            isOpen={showShareTemplateModal}
            onClose={() => setShowShareTemplateModal(false)}
            onSuccess={handleShareTemplateSuccess}
          />

          <ReviewQueueModal
            isOpen={showReviewQueueModal}
            onClose={() => setShowReviewQueueModal(false)}
          />
        </>
      )}
    </div>
  );
}

export default Dashboard;