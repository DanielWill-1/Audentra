import { supabase } from './supabase';

export interface Template {
  id: string;
  name: string;
  category: string;
  description?: string;
  form_data?: any;
  uploaded_file?: string;
  visibility: 'visible' | 'hidden';
  created_by: string;
  created_at: string;
  updated_at: string;
  shared_with?: SharedUser[];
  reviews?: TemplateReview[];
}

export interface SharedUser {
  id: string;
  user_id: string;
  template_id: string;
  role: 'viewer' | 'editor' | 'admin';
  shared_by: string;
  shared_at: string;
  user_email: string;
  user_name: string;
  message?: string;
}

export interface TemplateReview {
  id: string;
  template_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number; // 1-5 stars
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  name: string;
  category: string;
  description?: string;
  form_data?: any;
  uploaded_file?: string;
  visibility?: 'visible' | 'hidden';
  created_by: string;
}

export interface UpdateTemplateData {
  name?: string;
  category?: string;
  description?: string;
  form_data?: any;
  uploaded_file?: string;
  visibility?: 'visible' | 'hidden';
}

export interface ShareTemplateData {
  template_id: string;
  user_emails: string[];
  role: 'viewer' | 'editor' | 'admin';
  message?: string;
}

// Helper function to get user info from public users table
const getUserInfo = async (userId: string) => {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    // Fallback to auth user if public users table doesn't have the data
    const { data: { user } } = await supabase.auth.getUser();
    return {
      name: user?.email || 'Unknown User',
      email: user?.email || ''
    };
  }

  const name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email || 'Unknown User';
  return {
    name,
    email: userData.email
  };
};

// Create a new template
export const createTemplate = async (templateData: CreateTemplateData) => {
  const { data, error } = await supabase
    .from('templates')
    .insert([templateData])
    .select()
    .single();

  return { data, error };
};

// Get all templates for the current user with sorting
export const getUserTemplates = async (sortBy: 'created_at' | 'name' | 'category' = 'created_at', ascending = false) => {
  const { data, error } = await supabase
    .from('templates')
    .select(`
      *,
      shared_with:template_shares(
        id,
        user_id,
        role,
        shared_by,
        shared_at,
        user_email,
        user_name,
        message
      ),
      reviews:template_reviews(
        id,
        reviewer_id,
        reviewer_name,
        reviewer_email,
        rating,
        comment,
        status,
        created_at,
        updated_at
      )
    `)
    .order(sortBy, { ascending });

  return { data, error };
};

// Get templates by category with sorting
export const getTemplatesByCategory = async (
  category: string, 
  sortBy: 'created_at' | 'name' | 'category' = 'created_at', 
  ascending = false
) => {
  let query = supabase
    .from('templates')
    .select(`
      *,
      shared_with:template_shares(
        id,
        user_id,
        role,
        shared_by,
        shared_at,
        user_email,
        user_name,
        message
      ),
      reviews:template_reviews(
        id,
        reviewer_id,
        reviewer_name,
        reviewer_email,
        rating,
        comment,
        status,
        created_at,
        updated_at
      )
    `)
    .order(sortBy, { ascending });

  if (category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  return { data, error };
};

// Get a single template by ID
export const getTemplateById = async (id: string) => {
  const { data, error } = await supabase
    .from('templates')
    .select(`
      *,
      shared_with:template_shares(
        id,
        user_id,
        role,
        shared_by,
        shared_at,
        user_email,
        user_name,
        message
      ),
      reviews:template_reviews(
        id,
        reviewer_id,
        reviewer_name,
        reviewer_email,
        rating,
        comment,
        status,
        created_at,
        updated_at
      )
    `)
    .eq('id', id)
    .single();

  return { data, error };
};

// Update a template
export const updateTemplate = async (id: string, updates: UpdateTemplateData) => {
  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

// Delete a template
export const deleteTemplate = async (id: string) => {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);

  return { error };
};

// Toggle template visibility
export const toggleTemplateVisibility = async (id: string, visibility: 'visible' | 'hidden') => {
  const { data, error } = await supabase
    .from('templates')
    .update({ visibility })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

// Share template with users
export const shareTemplate = async (shareData: ShareTemplateData) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const userInfo = await getUserInfo(user.id);

  // Create shares for each email
  const shares = shareData.user_emails.map(email => ({
    template_id: shareData.template_id,
    user_email: email,
    user_name: email.split('@')[0], // Use email prefix as default name
    role: shareData.role,
    shared_by: user.id,
    shared_at: new Date().toISOString(),
    message: shareData.message || ''
  }));

  const { data, error } = await supabase
    .from('template_shares')
    .insert(shares)
    .select();

  return { data, error };
};

// Share multiple templates with team (simplified version for team sharing)
export const shareTemplatesWithTeam = async (templateIds: string[], message?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const userInfo = await getUserInfo(user.id);

  // Share with the current user's email (for demo purposes)
  // In a real app, you'd get actual team member emails from the team_members table
  const teamEmails = [userInfo.email || 'team@company.com']; // Use current user's email for demo

  const allShares = [];
  
  for (const templateId of templateIds) {
    const shares = teamEmails.map(email => ({
      template_id: templateId,
      user_email: email,
      user_name: userInfo.name,
      role: 'viewer' as const,
      shared_by: user.id,
      shared_at: new Date().toISOString(),
      message: message || 'Shared via team collaboration'
    }));
    allShares.push(...shares);
  }

  const { data, error } = await supabase
    .from('template_shares')
    .insert(allShares)
    .select();

  return { data, error };
};

// Get shared templates for current user
export const getSharedTemplates = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const userInfo = await getUserInfo(user.id);

  console.log('Getting shared templates for user:', userInfo.email);

  const { data, error } = await supabase
    .from('template_shares')
    .select(`
      *,
      template:templates(
        id,
        name,
        category,
        description,
        form_data,
        visibility,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('user_email', userInfo.email);

  console.log('Shared templates query result:', { data, error });

  return { data, error };
};

// Get all templates shared by current user (templates they've shared with others)
export const getTemplatesSharedByUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('template_shares')
    .select(`
      *,
      template:templates(
        id,
        name,
        category,
        description,
        form_data,
        visibility,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('shared_by', user.id);

  return { data, error };
};

// Remove user from template sharing
export const removeTemplateShare = async (templateId: string, userEmail: string) => {
  const { error } = await supabase
    .from('template_shares')
    .delete()
    .eq('template_id', templateId)
    .eq('user_email', userEmail);

  return { error };
};

// Delete shared template (remove from sharing)
export const deleteSharedTemplate = async (shareId: string) => {
  const { error } = await supabase
    .from('template_shares')
    .delete()
    .eq('id', shareId);

  return { error };
};

// Hide/unhide shared template for current user
export const toggleSharedTemplateVisibility = async (shareId: string, hidden: boolean) => {
  // For now, we'll use a metadata field to track if user has hidden the shared template
  // In a real implementation, you might want a separate user_template_preferences table
  const { data, error } = await supabase
    .from('template_shares')
    .update({ 
      message: hidden ? 'hidden_by_user' : '',
      updated_at: new Date().toISOString()
    })
    .eq('id', shareId)
    .select()
    .single();

  return { data, error };
};

// Update template share role
export const updateTemplateShareRole = async (shareId: string, role: 'viewer' | 'editor' | 'admin') => {
  const { data, error } = await supabase
    .from('template_shares')
    .update({ role })
    .eq('id', shareId)
    .select()
    .single();

  return { data, error };
};

// Add template to review queue
export const addTemplateToReviewQueue = async (templateId: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const userInfo = await getUserInfo(user.id);

  const review = {
    template_id: templateId,
    reviewer_id: user.id,
    reviewer_name: userInfo.name,
    reviewer_email: userInfo.email,
    rating: 0, // Will be set when review is completed
    comment: '',
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('template_reviews')
    .insert([review])
    .select()
    .single();

  return { data, error };
};

// Get templates in review queue
export const getReviewQueue = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('template_reviews')
    .select(`
      *,
      template:templates(
        id,
        name,
        category,
        description,
        form_data,
        visibility,
        created_by,
        created_at,
        updated_at
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data, error };
};

// Add template review
export const addTemplateReview = async (reviewData: {
  template_id: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const userInfo = await getUserInfo(user.id);

  const review = {
    ...reviewData,
    reviewer_id: user.id,
    reviewer_name: userInfo.name,
    reviewer_email: userInfo.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('template_reviews')
    .insert([review])
    .select()
    .single();

  return { data, error };
};

// Update template review
export const updateTemplateReview = async (reviewId: string, updates: {
  rating?: number;
  comment?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'needs_changes';
}) => {
  const { data, error } = await supabase
    .from('template_reviews')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .select()
    .single();

  return { data, error };
};

// Get template reviews
export const getTemplateReviews = async (templateId: string) => {
  const { data, error } = await supabase
    .from('template_reviews')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });

  return { data, error };
};

// Export template as JSON
export const exportTemplate = async (template: Template) => {
  const exportData = {
    name: template.name,
    category: template.category,
    description: template.description,
    form_data: template.form_data,
    created_at: template.created_at,
    exported_at: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate shareable link for template
export const generateShareLink = (templateId: string) => {
  return `${window.location.origin}/templates/shared/${templateId}`;
};

// Upload file for template
export const uploadTemplateFile = async (file: File, templateId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${templateId}.${fileExt}`;
  const filePath = `templates/${fileName}`;

  const { data, error } = await supabase.storage
    .from('template-files')
    .upload(filePath, file);

  if (error) {
    return { data: null, error };
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('template-files')
    .getPublicUrl(filePath);

  return { data: { path: filePath, url: publicUrl }, error: null };
};