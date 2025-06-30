import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Settings,
  Bell,
  Calendar,
  Clock,
  Users,
  Globe,
  Shield,
  Palette,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2
} from 'lucide-react';

interface SchedulerSettings {
  // General Settings
  defaultDuration: number;
  defaultReminderMinutes: number;
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: string[];
  timezone: string;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderNotifications: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  
  // Calendar Settings
  defaultView: 'month' | 'week';
  weekStartsOn: number; // 0 = Sunday, 1 = Monday
  showWeekends: boolean;
  showDeclinedEvents: boolean;
  
  // Privacy Settings
  shareCalendar: boolean;
  allowGuestInvites: boolean;
  showBusyTime: boolean;
  
  // Appearance Settings
  theme: 'light' | 'dark' | 'auto';
  colorScheme: string;
  compactView: boolean;
  
  // Integration Settings
  googleCalendarSync: boolean;
  outlookSync: boolean;
  slackNotifications: boolean;
  teamsNotifications: boolean;
}

const TIMEZONES = [
  { id: 'America/New_York', name: 'Eastern Time (ET)' },
  { id: 'America/Chicago', name: 'Central Time (CT)' },
  { id: 'America/Denver', name: 'Mountain Time (MT)' },
  { id: 'America/Los_Angeles', name: 'Pacific Time (PT)' },
  { id: 'Europe/London', name: 'Greenwich Mean Time (GMT)' },
  { id: 'Europe/Paris', name: 'Central European Time (CET)' },
  { id: 'Asia/Tokyo', name: 'Japan Standard Time (JST)' },
  { id: 'Australia/Sydney', name: 'Australian Eastern Time (AET)' }
];

const WORKING_DAYS = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' }
];

const COLOR_SCHEMES = [
  { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
  { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
  { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
  { id: 'orange', name: 'Orange', color: 'bg-orange-500' },
  { id: 'pink', name: 'Pink', color: 'bg-pink-500' },
  { id: 'indigo', name: 'Indigo', color: 'bg-indigo-500' }
];

// Storage key for scheduler settings
const STORAGE_KEY = 'schedulerSettings';

function SchedulerSettings() {
  const [settings, setSettings] = useState<SchedulerSettings>(() => {
    // Try to load settings from localStorage
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    
    // Default settings
    return {
      // General Settings
      defaultDuration: 60,
      defaultReminderMinutes: 15,
      workingHours: {
        start: '09:00',
        end: '17:00'
      },
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'America/New_York',
      
      // Notification Settings
      emailNotifications: true,
      pushNotifications: true,
      reminderNotifications: true,
      dailyDigest: false,
      weeklyReport: true,
      
      // Calendar Settings
      defaultView: 'month',
      weekStartsOn: 1, // Monday
      showWeekends: true,
      showDeclinedEvents: false,
      
      // Privacy Settings
      shareCalendar: false,
      allowGuestInvites: true,
      showBusyTime: true,
      
      // Appearance Settings
      theme: 'light',
      colorScheme: 'blue',
      compactView: false,
      
      // Integration Settings
      googleCalendarSync: false,
      outlookSync: false,
      slackNotifications: false,
      teamsNotifications: false
    };
  });

  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Save settings to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaving(false);
      setSaved(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
      setSaving(false);
    }
  };

  const handleReset = () => {
    // Reset to default settings
    setSettings({
      defaultDuration: 60,
      defaultReminderMinutes: 15,
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'America/New_York',
      emailNotifications: true,
      pushNotifications: true,
      reminderNotifications: true,
      dailyDigest: false,
      weeklyReport: true,
      defaultView: 'month',
      weekStartsOn: 1,
      showWeekends: true,
      showDeclinedEvents: false,
      shareCalendar: false,
      allowGuestInvites: true,
      showBusyTime: true,
      theme: 'light',
      colorScheme: 'blue',
      compactView: false,
      googleCalendarSync: false,
      outlookSync: false,
      slackNotifications: false,
      teamsNotifications: false
    });
  };

  const updateSettings = (updates: Partial<SchedulerSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'privacy', name: 'Privacy', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'integrations', name: 'Integrations', icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link to="/scheduler" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scheduler Settings</h1>
                <p className="text-gray-600">Configure your scheduling preferences and integrations</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {error && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
              {saved && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Settings saved</span>
                </div>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-3" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">General Settings</h2>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Event Duration (minutes)
                        </label>
                        <input
                          type="number"
                          min="15"
                          step="15"
                          value={settings.defaultDuration}
                          onChange={(e) => updateSettings({ defaultDuration: parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Reminder (minutes before)
                        </label>
                        <select
                          value={settings.defaultReminderMinutes}
                          onChange={(e) => updateSettings({ defaultReminderMinutes: parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={1440}>1 day</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <input
                          type="time"
                          value={settings.workingHours.start}
                          onChange={(e) => updateSettings({ 
                            workingHours: { ...settings.workingHours, start: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <input
                          type="time"
                          value={settings.workingHours.end}
                          onChange={(e) => updateSettings({ 
                            workingHours: { ...settings.workingHours, end: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Days</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {WORKING_DAYS.map(day => (
                        <label key={day.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.workingDays.includes(day.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateSettings({ workingDays: [...settings.workingDays, day.id] });
                              } else {
                                updateSettings({ 
                                  workingDays: settings.workingDays.filter(d => d !== day.id) 
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-gray-700">{day.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSettings({ timezone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.id} value={tz.id}>{tz.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                          <p className="text-sm text-gray-600">Receive email notifications for events and reminders</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ emailNotifications: !settings.emailNotifications })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
                          <p className="text-sm text-gray-600">Receive push notifications in your browser</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ pushNotifications: !settings.pushNotifications })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Event Reminders</h3>
                          <p className="text-sm text-gray-600">Get reminded before events start</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ reminderNotifications: !settings.reminderNotifications })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.reminderNotifications ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.reminderNotifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Daily Digest</h3>
                          <p className="text-sm text-gray-600">Receive a daily summary of your schedule</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ dailyDigest: !settings.dailyDigest })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.dailyDigest ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.dailyDigest ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Weekly Report</h3>
                          <p className="text-sm text-gray-600">Get a weekly summary of completed events</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ weeklyReport: !settings.weeklyReport })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.weeklyReport ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.weeklyReport ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar Settings */}
              {activeTab === 'calendar' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Calendar Settings</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Default View</label>
                        <select
                          value={settings.defaultView}
                          onChange={(e) => updateSettings({ defaultView: e.target.value as 'month' | 'week' })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="month">Month View</option>
                          <option value="week">Week View</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Week Starts On</label>
                        <select
                          value={settings.weekStartsOn}
                          onChange={(e) => updateSettings({ weekStartsOn: parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Show Weekends</h3>
                          <p className="text-sm text-gray-600">Display Saturday and Sunday in calendar views</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ showWeekends: !settings.showWeekends })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.showWeekends ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.showWeekends ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Show Declined Events</h3>
                          <p className="text-sm text-gray-600">Display events you've declined or cancelled</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ showDeclinedEvents: !settings.showDeclinedEvents })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.showDeclinedEvents ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.showDeclinedEvents ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeTab === 'privacy' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Share Calendar</h3>
                          <p className="text-sm text-gray-600">Allow others to view your calendar</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ shareCalendar: !settings.shareCalendar })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.shareCalendar ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.shareCalendar ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Allow Guest Invites</h3>
                          <p className="text-sm text-gray-600">Let others invite you to events</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ allowGuestInvites: !settings.allowGuestInvites })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.allowGuestInvites ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.allowGuestInvites ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Show Busy Time</h3>
                          <p className="text-sm text-gray-600">Display when you're busy to others</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ showBusyTime: !settings.showBusyTime })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.showBusyTime ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.showBusyTime ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Settings */}
              {activeTab === 'appearance' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Appearance Settings</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                        <select
                          value={settings.theme}
                          onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' | 'auto' })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4">Color Scheme</label>
                        <div className="grid grid-cols-3 gap-3">
                          {COLOR_SCHEMES.map(scheme => (
                            <button
                              key={scheme.id}
                              onClick={() => updateSettings({ colorScheme: scheme.id })}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                settings.colorScheme === scheme.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-6 h-6 rounded-full ${scheme.color}`}></div>
                                <span className="text-sm font-medium text-gray-900">{scheme.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Compact View</h3>
                          <p className="text-sm text-gray-600">Use a more compact layout to show more information</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ compactView: !settings.compactView })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.compactView ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.compactView ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Integration Settings */}
              {activeTab === 'integrations' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Integration Settings</h2>
                    
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <Info className="w-5 h-5 text-blue-600 mr-3" />
                          <p className="text-blue-800 text-sm">
                            Integrations allow you to sync your scheduler with external calendar and communication tools.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">Google Calendar</h3>
                              <p className="text-sm text-gray-600">Sync events with your Google Calendar</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSettings({ googleCalendarSync: !settings.googleCalendarSync })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              settings.googleCalendarSync
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {settings.googleCalendarSync ? 'Connected' : 'Connect'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">Microsoft Outlook</h3>
                              <p className="text-sm text-gray-600">Sync events with Outlook Calendar</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSettings({ outlookSync: !settings.outlookSync })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              settings.outlookSync
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {settings.outlookSync ? 'Connected' : 'Connect'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                              <Bell className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">Slack Notifications</h3>
                              <p className="text-sm text-gray-600">Get event notifications in Slack</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSettings({ slackNotifications: !settings.slackNotifications })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              settings.slackNotifications
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {settings.slackNotifications ? 'Connected' : 'Connect'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">Microsoft Teams</h3>
                              <p className="text-sm text-gray-600">Get event notifications in Teams</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateSettings({ teamsNotifications: !settings.teamsNotifications })}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              settings.teamsNotifications
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {settings.teamsNotifications ? 'Connected' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchedulerSettings;