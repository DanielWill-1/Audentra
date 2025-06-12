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

// Get all templates for the current user
export const getUserTemplates = async () => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
};

// Get templates by category
export const getTemplatesByCategory = async (category: string) => {
  let query = supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });

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