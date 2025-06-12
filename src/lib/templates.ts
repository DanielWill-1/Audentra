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
    .select('*')
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
    .select('*')
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
    .select('*')
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