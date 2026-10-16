import { supabase } from './supabase';

export interface ScheduledEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: 'form_review' | 'team_meeting' | 'training' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high';
  attendees?: string[];
  location?: string;
  form_id?: string;
  reminder_minutes?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: 'form_review' | 'team_meeting' | 'training' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high';
  attendees?: string[];
  location?: string;
  form_id?: string;
  reminder_minutes?: number;
  created_by: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  duration?: number;
  type?: 'form_review' | 'team_meeting' | 'training' | 'maintenance' | 'other';
  priority?: 'low' | 'medium' | 'high';
  attendees?: string[];
  location?: string;
  form_id?: string;
  reminder_minutes?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

// Create a new scheduled event
export const createEvent = async (eventData: CreateEventData) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .insert([{
      title: eventData.title,
      description: eventData.description,
      date: eventData.date,
      time: eventData.time,
      duration: eventData.duration,
      type: eventData.type,
      priority: eventData.priority,
      attendees: eventData.attendees || [],
      location: eventData.location || '',
      form_id: eventData.form_id,
      reminder_minutes: eventData.reminder_minutes || 15,
      created_by: eventData.created_by
    }])
    .select()
    .single();

  return { data, error };
};

// Get all events for the current user with optional filtering
export const getUserEvents = async (
  startDate?: string,
  endDate?: string,
  type?: string,
  status?: string
) => {
  let query = supabase
    .from('scheduled_events')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (startDate) {
    query = query.gte('date', startDate);
  }
  
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }
  
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  return { data, error };
};

// Get events for a specific date range (useful for calendar views)
export const getEventsInRange = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  return { data, error };
};

// Get a single event by ID
export const getEventById = async (id: string) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
};

// Update an event
export const updateEvent = async (id: string, updates: UpdateEventData) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

// Delete an event
export const deleteEvent = async (id: string) => {
  const { error } = await supabase
    .from('scheduled_events')
    .delete()
    .eq('id', id);

  return { error };
};

// Get upcoming events (next 7 days)
export const getUpcomingEvents = async (limit: number = 10) => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .gte('date', today)
    .lte('date', nextWeekStr)
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(limit);

  return { data, error };
};

// Get events by status
export const getEventsByStatus = async (status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .eq('status', status)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  return { data, error };
};

// Get events by type
export const getEventsByType = async (type: 'form_review' | 'team_meeting' | 'training' | 'maintenance' | 'other') => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .eq('type', type)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  return { data, error };
};

// Mark event as completed
export const markEventCompleted = async (id: string) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .update({ 
      status: 'completed'
    })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

// Cancel an event
export const cancelEvent = async (id: string) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .update({ 
      status: 'cancelled'
    })
    .eq('id', id)
    .select()
    .single();

  return { data, error };
};

// Get event statistics for dashboard
export const getEventStats = async () => {
  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

  // Get total events this month
  const { data: totalEvents } = await supabase
    .from('scheduled_events')
    .select('id')
    .gte('date', startOfMonthStr);

  // Get completed events this month
  const { data: completedEvents } = await supabase
    .from('scheduled_events')
    .select('id')
    .gte('date', startOfMonthStr)
    .eq('status', 'completed');

  // Get upcoming events
  const { data: upcomingEvents } = await supabase
    .from('scheduled_events')
    .select('id')
    .gte('date', today)
    .eq('status', 'scheduled');

  // Get high priority events
  const { data: highPriorityEvents } = await supabase
    .from('scheduled_events')
    .select('id')
    .gte('date', today)
    .eq('priority', 'high')
    .eq('status', 'scheduled');

  return {
    total: totalEvents?.length || 0,
    completed: completedEvents?.length || 0,
    upcoming: upcomingEvents?.length || 0,
    highPriority: highPriorityEvents?.length || 0
  };
};

// Search events
export const searchEvents = async (query: string) => {
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  return { data, error };
};