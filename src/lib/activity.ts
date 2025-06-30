import { supabase } from './supabase';

export interface ActivityItem {
  id: string;
  type: 'form_completed' | 'template_created' | 'team_invite' | 'template_shared' | 'form_started' | 'template_reviewed';
  title: string;
  description?: string;
  time: string; // ISO string
  user: string;
  metadata?: any;
}

// Storage key for activity items
const STORAGE_KEY = 'recentActivity';

// Get recent activity
export const getRecentActivity = async (limit: number = 10): Promise<ActivityItem[]> => {
  try {
    // First try to get from localStorage
    const storedActivity = localStorage.getItem(STORAGE_KEY);
    if (storedActivity) {
      const parsedActivity = JSON.parse(storedActivity);
      return parsedActivity.slice(0, limit);
    }
    
    // If no stored activity, create some example data
    const mockActivity: ActivityItem[] = [
      {
        id: '1',
        type: 'form_completed',
        title: 'Patient Intake - John Smith',
        description: 'Completed in 1:34 minutes',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        user: 'You'
      },
      {
        id: '2',
        type: 'form_started',
        title: 'Safety Inspection Report',
        description: 'Started 30 minutes ago',
        time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        user: 'You'
      },
      {
        id: '3',
        type: 'template_created',
        title: 'HR Onboarding Template',
        description: 'New template created',
        time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        user: 'You'
      },
      {
        id: '4',
        type: 'team_invite',
        title: 'Alex Chen joined your team',
        description: 'Accepted invitation',
        time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        user: 'System'
      },
      {
        id: '5',
        type: 'template_shared',
        title: 'Patient Intake Form shared',
        description: 'Shared with 2 team members',
        time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        user: 'You'
      },
      {
        id: '6',
        type: 'form_completed',
        title: 'Employee Onboarding - Maria Garcia',
        description: 'Completed in 2:15 minutes',
        time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        user: 'Alex Chen'
      },
      {
        id: '7',
        type: 'template_reviewed',
        title: 'Safety Inspection Checklist reviewed',
        description: 'Approved with 5-star rating',
        time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        user: 'Maria Johnson'
      }
    ];
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockActivity));
    
    return mockActivity.slice(0, limit);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
};

// Add a new activity item
export const addActivityItem = async (item: Omit<ActivityItem, 'id' | 'time'>): Promise<ActivityItem> => {
  try {
    // Get existing activity
    const existingActivity = localStorage.getItem(STORAGE_KEY);
    const parsedActivity: ActivityItem[] = existingActivity ? JSON.parse(existingActivity) : [];
    
    // Create new activity item
    const newItem: ActivityItem = {
      id: `activity_${Date.now()}`,
      time: new Date().toISOString(),
      ...item
    };
    
    // Add to beginning of array
    const updatedActivity = [newItem, ...parsedActivity];
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivity));
    
    return newItem;
  } catch (error) {
    console.error('Error adding activity item:', error);
    throw error;
  }
};

// Delete an activity item
export const deleteActivityItem = async (id: string): Promise<void> => {
  try {
    // Get existing activity
    const existingActivity = localStorage.getItem(STORAGE_KEY);
    if (!existingActivity) return;
    
    const parsedActivity: ActivityItem[] = JSON.parse(existingActivity);
    
    // Filter out the item to delete
    const updatedActivity = parsedActivity.filter(item => item.id !== id);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActivity));
  } catch (error) {
    console.error('Error deleting activity item:', error);
    throw error;
  }
};

// Clear all activity
export const clearAllActivity = async (): Promise<void> => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing activity:', error);
    throw error;
  }
};

// Format time ago for activity items
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};