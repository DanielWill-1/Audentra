import { supabase } from './supabase';

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  invited_by: string;
  invited_at: string;
  joined_at?: string;
  last_active?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamActivity {
  id: string;
  team_id: string;
  user_id: string;
  action_type: 'template_shared' | 'template_completed' | 'member_joined' | 'template_reviewed' | 'template_approved';
  description: string;
  metadata?: any;
  created_at: string;
}

export interface TeamStats {
  total_members: number;
  active_members: number;
  pending_invites: number;
  templates_shared_this_month: number;
  templates_awaiting_approval: number;
  growth_percentage: number;
}

// Get team members
export const getTeamMembers = async (teamId: string) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  return { data, error };
};

// Invite team member
export const inviteTeamMember = async (inviteData: {
  team_id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  message?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const invite = {
    ...inviteData,
    invited_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    status: 'pending' as const
  };

  const { data, error } = await supabase
    .from('team_invites')
    .insert([invite])
    .select()
    .single();

  return { data, error };
};

// Get pending invites
export const getPendingInvites = async (teamId: string) => {
  const { data, error } = await supabase
    .from('team_invites')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data, error };
};

// Accept team invite
export const acceptTeamInvite = async (inviteId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  // Get the invite
  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (inviteError || !invite) {
    return { data: null, error: inviteError || new Error('Invite not found') };
  }

  // Create team member record
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .insert([{
      team_id: invite.team_id,
      user_id: user.id,
      email: user.email,
      name: user.user_metadata?.first_name + ' ' + user.user_metadata?.last_name || user.email,
      role: invite.role,
      status: 'active',
      invited_by: invite.invited_by,
      invited_at: invite.created_at,
      joined_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (memberError) {
    return { data: null, error: memberError };
  }

  // Update invite status
  await supabase
    .from('team_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId);

  return { data: member, error: null };
};

// Remove team member
export const removeTeamMember = async (memberId: string) => {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);

  return { error };
};

// Update team member role
export const updateTeamMemberRole = async (memberId: string, role: 'admin' | 'editor' | 'viewer') => {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  return { data, error };
};

// Get team activity
export const getTeamActivity = async (teamId: string, limit: number = 10) => {
  const { data, error } = await supabase
    .from('team_activity')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
};

// Log team activity
export const logTeamActivity = async (activityData: {
  team_id: string;
  action_type: string;
  description: string;
  metadata?: any;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const activity = {
    ...activityData,
    user_id: user.id
  };

  const { data, error } = await supabase
    .from('team_activity')
    .insert([activity])
    .select()
    .single();

  return { data, error };
};

// Get team stats
export const getTeamStats = async (teamId: string): Promise<{ data: TeamStats | null; error: any }> => {
  try {
    // Get team members count
    const { data: members } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId);

    // Get pending invites count
    const { data: invites } = await supabase
      .from('team_invites')
      .select('id')
      .eq('team_id', teamId)
      .eq('status', 'pending');

    // Mock data for templates (would be real queries in production)
    const stats: TeamStats = {
      total_members: members?.length || 0,
      active_members: members?.filter(m => m.status === 'active').length || 0,
      pending_invites: invites?.length || 0,
      templates_shared_this_month: 28,
      templates_awaiting_approval: 5,
      growth_percentage: 15
    };

    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Cancel team invite
export const cancelTeamInvite = async (inviteId: string) => {
  const { error } = await supabase
    .from('team_invites')
    .delete()
    .eq('id', inviteId);

  return { error };
};

// Resend team invite
export const resendTeamInvite = async (inviteId: string) => {
  const { data, error } = await supabase
    .from('team_invites')
    .update({ 
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', inviteId)
    .select()
    .single();

  return { data, error };
};