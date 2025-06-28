import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Crown, 
  Edit, 
  Trash2, 
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Shield,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  lastActive?: string;
  avatar?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  sentAt: string;
  sentBy: string;
  status: 'pending' | 'expired';
}

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-green-100 text-green-700'
};

const ROLE_ICONS = {
  admin: Crown,
  editor: Edit,
  viewer: Eye
};

export default function TeamMembersModal({ isOpen, onClose, onInvite }: TeamMembersModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const membersContainerRef = useRef<HTMLDivElement>(null);
  const invitesContainerRef = useRef<HTMLDivElement>(null);

  // Load team data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadTeamData();
    }
  }, [isOpen, user]);

  // Add scroll wheel event handlers
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (membersContainerRef.current && activeTab === 'members') {
        membersContainerRef.current.scrollTop += e.deltaY;
        e.preventDefault();
      }
      if (invitesContainerRef.current && activeTab === 'invites') {
        invitesContainerRef.current.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };

    const membersContainer = membersContainerRef.current;
    const invitesContainer = invitesContainerRef.current;

    if (membersContainer) {
      membersContainer.addEventListener('wheel', handleWheel, { passive: false });
    }
    if (invitesContainer) {
      invitesContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (membersContainer) {
        membersContainer.removeEventListener('wheel', handleWheel);
      }
      if (invitesContainer) {
        invitesContainer.removeEventListener('wheel', handleWheel);
      }
    };
  }, [activeTab]);

  const loadTeamData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get current user details
      const firstName = user.user_metadata?.first_name || '';
      const lastName = user.user_metadata?.last_name || '';
      const userName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
      
      // Create current user as admin
      const currentUserMember: TeamMember = {
        id: '1',
        name: userName,
        email: user.email || 'user@example.com',
        role: 'admin',
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastActive: '2 minutes ago'
      };
      
      // Fetch team members from database (in a real app)
      // For now, we'll use some example team members
      const otherMembers: TeamMember[] = [
        {
          id: '2',
          name: 'Alex Chen',
          email: 'alex@voiceformpro.com',
          role: 'editor',
          status: 'active',
          joinedAt: '2024-01-16',
          lastActive: '1 hour ago'
        },
        {
          id: '3',
          name: 'Maria Johnson',
          email: 'maria@voiceformpro.com',
          role: 'editor',
          status: 'active',
          joinedAt: '2024-01-18',
          lastActive: '3 hours ago'
        }
      ];
      
      setTeamMembers([currentUserMember, ...otherMembers]);
      
      // Fetch pending invites from database (in a real app)
      // For now, we'll use some example invites
      setPendingInvites([
        {
          id: '1',
          email: 'john@company.com',
          role: 'editor',
          sentAt: '2024-01-20',
          sentBy: userName,
          status: 'pending'
        },
        {
          id: '2',
          email: 'lisa@company.com',
          role: 'viewer',
          sentAt: '2024-01-19',
          sentBy: userName,
          status: 'pending'
        }
      ]);
    } catch (err) {
      console.error('Failed to load team data:', err);
      setError('Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'inactive': return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'expired': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      // In a real implementation, this would call an API to resend the invite
      console.log('Resending invite:', inviteId);
      
      // Update the invite's sent date
      setPendingInvites(prevInvites => 
        prevInvites.map(invite => 
          invite.id === inviteId 
            ? { ...invite, sentAt: new Date().toISOString() } 
            : invite
        )
      );
    } catch (error) {
      console.error('Failed to resend invite:', error);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      // In a real implementation, this would call an API to cancel the invite
      console.log('Canceling invite:', inviteId);
      
      // Remove the invite from the UI
      setPendingInvites(prevInvites => 
        prevInvites.filter(invite => invite.id !== inviteId)
      );
    } catch (error) {
      console.error('Failed to cancel invite:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      // In a real implementation, this would call an API to remove the member
      console.log('Removing member:', memberId);
      
      // Remove the member from the UI
      setTeamMembers(prevMembers => 
        prevMembers.filter(member => member.id !== memberId)
      );
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      // In a real implementation, this would call an API to change the role
      console.log('Changing role:', memberId, newRole);
      
      // Update the member's role in the UI
      setTeamMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, role: newRole as 'admin' | 'editor' | 'viewer' } 
            : member
        )
      );
      setShowRoleModal(null);
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                <p className="text-gray-600">Manage team members and pending invitations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onInvite}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Team Members ({teamMembers.length})
            </button>
            <button
              onClick={() => setActiveTab('invites')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'invites'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Invites ({pendingInvites.filter(i => i.status === 'pending').length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading team data...</span>
            </div>
          ) : (
            <>
              {activeTab === 'members' ? (
                <div 
                  className="space-y-4 max-h-[400px] overflow-y-auto pr-2" 
                  ref={membersContainerRef}
                >
                  {teamMembers.map((member) => {
                    const RoleIcon = ROLE_ICONS[member.role];
                    return (
                      <div key={member.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {getInitials(member.name)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                                  <RoleIcon className="w-3 h-3 mr-1" />
                                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                </span>
                                {getStatusIcon(member.status)}
                              </div>
                              <p className="text-gray-600">{member.email}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                                {member.lastActive && (
                                  <span>Last active {member.lastActive}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {member.role !== 'admin' && (
                              <>
                                <button
                                  onClick={() => setShowRoleModal(member.id)}
                                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Change Role"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Role Change Modal */}
                        {showRoleModal === member.id && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Change Role for {member.name}</h4>
                            <div className="space-y-2">
                              {Object.entries(ROLE_COLORS).map(([role, colorClass]) => {
                                const RoleIcon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
                                return (
                                  <button
                                    key={role}
                                    onClick={() => handleChangeRole(member.id, role)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                      member.role === role
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <RoleIcon className="w-4 h-4" />
                                      <span className="font-medium capitalize">{role}</span>
                                      {member.role === role && (
                                        <span className="text-xs text-blue-600">(Current)</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                              <button
                                onClick={() => setShowRoleModal(null)}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  className="space-y-4 max-h-[400px] overflow-y-auto pr-2" 
                  ref={invitesContainerRef}
                >
                  {pendingInvites.length > 0 ? (
                    pendingInvites.map((invite) => (
                      <div key={invite.id} className={`rounded-lg p-4 border ${
                        invite.status === 'expired' 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <Mail className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900">{invite.email}</h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[invite.role]}`}>
                                  {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                                </span>
                                {getStatusIcon(invite.status)}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                <span>Sent {new Date(invite.sentAt).toLocaleDateString()}</span>
                                <span>by {invite.sentBy}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {invite.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleResendInvite(invite.id)}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Resend
                                </button>
                                <button
                                  onClick={() => handleCancelInvite(invite.id)}
                                  className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCancelInvite(invite.id)}
                                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                      <p className="text-gray-600 mb-4">All team members have joined your workspace</p>
                      <button
                        onClick={onInvite}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Invite New Member
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {activeTab === 'members' 
              ? `${teamMembers.filter(m => m.status === 'active').length} active members`
              : `${pendingInvites.filter(i => i.status === 'pending').length} pending invitations`
            }
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}