import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  Mic,
  Home as HomeIcon,
  FileText,
  LayoutGrid,
  Activity as ActivityIcon,
  Users,
  Settings,
  BookOpen,
  LogOut,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Share2,
  MessageSquare,
  UserPlus,
    Github,
    Menu,
    X,
  } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  getSharedTemplates,
  getTemplatesSharedByUser,
  getUserTemplates,
  Template,
} from '../lib/templates';
import { getUpcomingEvents, ScheduledEvent } from '../lib/scheduler';
import { getRecentActivity, ActivityItem, formatTimeAgo } from '../lib/activity';

import InviteMemberModal from '../components/team/InviteMemberModal';
import TeamMembersModal from '../components/team/TeamMembersModal';
import ShareNewTemplateModal from '../components/team/ShareNewTemplateModal';
import SharedTemplateCard from '../components/team/SharedTemplateCard';
import ReviewQueueModal from '../components/team/ReviewQueueModal';

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

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

const STORAGE_KEYS = {
  DASHBOARD_SETTINGS: 'voiceform_dashboard_settings',
};

const DEFAULT_SETTINGS = {
  language: 'English (US)',
  voiceSensitivity: 7,
  aiProcessingSpeed: 'Real-time (Recommended)',
  industrySpecialization: 'Healthcare',
};

// Get user's display name from auth metadata (never hardcode "User")
const getUserName = (user: any) => {
  const first = user?.user_metadata?.first_name;
  const last = user?.user_metadata?.last_name;
  if (first) return [first, last].filter(Boolean).join(' ');
  if (user?.email) return user.email.split('@')[0];
  return '';
};

function Dashboard() {
  const { user, signOut } = useContext(AuthContext);
  const [view, setView] = useState<'home' | 'team' | 'settings'>('home');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const navigate = useNavigate();

  // Team collaboration state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showShareTemplateModal, setShowShareTemplateModal] = useState(false);
  const [showReviewQueueModal, setShowReviewQueueModal] = useState(false);
  const [sharedWithMeData, setSharedWithMeData] = useState<SharedTemplateData[]>([]);
  const [sharedByMeData, setSharedByMeData] = useState<SharedTemplateData[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DASHBOARD_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const sharedTemplatesRef = useRef<HTMLDivElement>(null);
  const sharedByMeRef = useRef<HTMLDivElement>(null);

  // Home overview data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduledEvent[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState<string | null>(null);
  const [recentForms, setRecentForms] = useState<ActivityItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Load team collaboration data on mount
  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    setTeamLoading(true);
    setTeamError(null);

    try {
      const { data: sharedWithMeResponse, error: sharedWithMeError } = await getSharedTemplates();
      const { data: sharedByMeResponse, error: sharedByMeError } = await getTemplatesSharedByUser();

      if (sharedWithMeError) {
        setTeamError('Failed to load shared templates');
      } else {
        const validSharedWithMe = (sharedWithMeResponse || []).filter(
          (share) => share.template !== null && share.message !== 'hidden_by_user'
        );
        setSharedWithMeData(validSharedWithMe);
      }

      if (sharedByMeError) {
        // Non-fatal; keep whatever loaded
      } else {
        const validSharedByMe = (sharedByMeResponse || []).filter((share) => share.template !== null);
        setSharedByMeData(validSharedByMe);
      }
    } catch (err: any) {
      setTeamError(err.message || 'Failed to load team data');
    } finally {
      setTeamLoading(false);
    }
  };

  // Load templates for the home overview
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const { data, error } = await getUserTemplates('created_at', false);
      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      setTemplatesError("Couldn't load templates.");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadUpcoming = async () => {
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const { data, error } = await getUpcomingEvents(5);
      if (error) throw error;
      setUpcoming(data || []);
    } catch (err: any) {
      setUpcomingError("Couldn't load upcoming forms.");
    } finally {
      setUpcomingLoading(false);
    }
  };

  const loadRecent = async () => {
    setRecentLoading(true);
    try {
      const activity = await getRecentActivity(10);
      const forms = activity.filter(
        (a) => a.type === 'form_completed' || a.type === 'form_started'
      );
      setRecentForms(forms.slice(0, 5));
    } catch (err: any) {
      setRecentForms([]);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadUpcoming();
    loadRecent();
  }, []);

  const handleRefresh = async () => {
    await loadTeamData();
  };

  const handleShareTemplateSuccess = () => {
    handleRefresh();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateSettings = (newSettings: any) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.DASHBOARD_SETTINGS, JSON.stringify(updatedSettings));
  };

  const displayName = getUserName(user);

  const statusBadge = (type: string) => {
    if (type === 'form_completed') {
      return { label: 'Completed', cls: 'bg-success/10 text-success' };
    }
    if (type === 'form_started') {
      return { label: 'In Progress', cls: 'bg-warning/15 text-warning' };
    }
    return { label: 'Updated', cls: 'bg-surface-subtle text-text-secondary' };
  };

  // ---------- Sidebar ----------
  const navItem = (active: boolean) =>
    `flex items-center gap-2.5 px-3 h-9 rounded-lg font-body-medium text-body-medium transition-colors ${
      active ? 'bg-surface-subtle text-text-primary' : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
    }`;

  const sidebar = (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-background">
      <div className="px-4 h-16 flex items-center gap-2 border-b border-border">
        <span className="flex items-center gap-[2px] h-4 py-0.5" aria-hidden="true">
          <span className="w-[2.5px] h-2 bg-primary rounded-full" />
          <span className="w-[2.5px] h-3.5 bg-voice rounded-full" />
          <span className="w-[2.5px] h-4 bg-primary rounded-full" />
          <span className="w-[2.5px] h-2.5 bg-voice rounded-full" />
          <span className="w-[2.5px] h-1.5 bg-primary rounded-full" />
        </span>
        <span className="font-headline-h3 text-headline-h3 text-text-primary tracking-tight">Audentra</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 pb-1 font-label-code text-[11px] uppercase tracking-wider text-text-muted">Workspace</p>
        <button onClick={() => setView('home')} className={navItem(view === 'home')}>
          <HomeIcon className="w-4 h-4" aria-hidden="true" /> Home
        </button>
        <Link to="/AIVoiceAutoFill" className={navItem(false)}>
          <Mic className="w-4 h-4" aria-hidden="true" /> Forms
        </Link>
        <Link to="/templates" className={navItem(false)}>
          <LayoutGrid className="w-4 h-4" aria-hidden="true" /> Templates
        </Link>
        <Link to="/activitylog" className={navItem(false)}>
          <ActivityIcon className="w-4 h-4" aria-hidden="true" /> Activity
        </Link>
        <button onClick={() => setView('team')} className={navItem(view === 'team')}>
          <Users className="w-4 h-4" aria-hidden="true" /> Team
        </button>

        <div className="h-px bg-border my-3" />

        <button onClick={() => setView('settings')} className={navItem(view === 'settings')}>
          <Settings className="w-4 h-4" aria-hidden="true" /> Settings
        </button>

        <div className="h-px bg-border my-3" />

        <p className="px-3 pb-1 font-label-code text-[11px] uppercase tracking-wider text-text-muted">Resources</p>
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 h-9 rounded-lg font-body-medium text-body-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
        >
          <Github className="w-4 h-4" aria-hidden="true" /> GitHub
          <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-text-muted" aria-hidden="true" />
        </a>
        <Link to="/documentation" className={navItem(false)}>
          <BookOpen className="w-4 h-4" aria-hidden="true" /> Documentation
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-body-medium text-body-medium">
            {displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '·'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-body-medium text-body-medium text-text-primary">
              {displayName || user?.email || 'Account'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );

  // ---------- Home view ----------
  const homeView = (
    <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-label-code text-label-code text-text-muted mb-2">
          <span>Audentra</span>
          <span>/</span>
          <span className="text-text-primary">Home</span>
        </div>
        <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight">
          What would you like to work on?
        </h1>
        {displayName && (
          <p className="font-body text-body text-text-secondary mt-1">Welcome back, {displayName}.</p>
        )}
      </div>

      {/* Primary action: Start with your voice */}
      <section className="bg-surface rounded-xl border border-border p-6 md:p-8 mb-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-voice-soft text-voice font-label-code text-label-code font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-voice" />
              Ready to listen
            </span>
            <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-2">
              Start with your voice
            </h2>
            <p className="font-body-large text-body-large text-text-secondary max-w-xl leading-relaxed mb-6">
              Speak naturally and Audentra will turn the conversation into structured form data.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/AIVoiceAutoFill"
                className="inline-flex items-center justify-center gap-2 font-body-medium text-body-medium bg-[#2563eb] hover:bg-brand-hover text-white px-5 h-10 rounded-lg transition-colors duration-150"
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
                Start voice form
              </Link>
              <Link
                to="/templates"
                className="inline-flex items-center justify-center gap-2 font-body-medium text-body-medium bg-surface hover:bg-surface-subtle text-text-primary border border-border px-5 h-10 rounded-lg transition-colors duration-150"
              >
                Choose a template
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <span className="hidden lg:flex items-center gap-[3px] h-8 text-voice" aria-hidden="true">
            <span className="w-[3px] h-4 bg-voice/40 rounded-full" />
            <span className="w-[3px] h-7 bg-voice rounded-full" />
            <span className="w-[3px] h-3 bg-voice/60 rounded-full" />
            <span className="w-[3px] h-6 bg-voice rounded-full" />
            <span className="w-[3px] h-8 bg-voice rounded-full" />
            <span className="w-[3px] h-4 bg-voice/80 rounded-full" />
          </span>
        </div>
      </section>

      {/* Secondary quick actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Link
          to="/templates"
          className="bg-surface rounded-xl border border-border p-5 hover:border-border-strong transition-colors"
        >
          <FileText className="w-5 h-5 text-primary mb-3" aria-hidden="true" />
          <p className="font-body-medium text-body-medium text-text-primary">Choose template</p>
          <p className="font-metadata text-metadata text-text-muted">Browse your schemas</p>
        </Link>
        <Link
          to="/filledtemplates"
          className="bg-surface rounded-xl border border-border p-5 hover:border-border-strong transition-colors"
        >
          <CheckCircle className="w-5 h-5 text-success mb-3" aria-hidden="true" />
          <p className="font-body-medium text-body-medium text-text-primary">Filled forms</p>
          <p className="font-metadata text-metadata text-text-muted">Inspect completed records</p>
        </Link>
        <Link
          to="/templates"
          className="bg-surface rounded-xl border border-border p-5 hover:border-border-strong transition-colors"
        >
          <Plus className="w-5 h-5 text-text-primary mb-3" aria-hidden="true" />
          <p className="font-body-medium text-body-medium text-text-primary">Create template</p>
          <p className="font-metadata text-metadata text-text-muted">JSON Schema or Pydantic</p>
        </Link>
      </section>

      {/* Recent forms */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">Recent forms</h2>
          <Link to="/filledtemplates" className="font-metadata text-metadata text-primary hover:text-brand-hover transition-colors">
            View all forms →
          </Link>
        </div>
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {recentLoading ? (
            <div className="flex items-center gap-2 px-6 py-8 text-text-muted font-body text-body">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading recent forms…
            </div>
          ) : recentForms.length === 0 ? (
            <div className="px-6 py-8 font-body text-body text-text-secondary">
              No recent forms yet. Start a voice form to see it here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentForms.map((form) => {
                const st = statusBadge(form.type);
                return (
                  <li key={form.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-body-medium text-body-medium text-text-primary truncate">{form.title}</p>
                      <p className="font-metadata text-metadata text-text-muted">{formatTimeAgo(form.time)}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`px-2.5 py-1 rounded font-label-code text-label-code font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                      {form.type === 'form_completed' ? (
                        <Link to="/filledtemplates" className="font-metadata text-metadata text-primary hover:text-brand-hover">
                          View
                        </Link>
                      ) : (
                        <Link to="/AIVoiceAutoFill" className="font-metadata text-metadata text-primary hover:text-brand-hover">
                          Resume
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Templates */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">Templates</h2>
          <Link to="/templates" className="font-metadata text-metadata text-primary hover:text-brand-hover transition-colors">
            Browse library →
          </Link>
        </div>
        {templatesError ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-4 flex items-center justify-between">
            <span className="font-body text-body text-text-secondary">{templatesError}</span>
            <button onClick={loadTemplates} className="font-metadata text-metadata text-primary hover:text-brand-hover">
              Retry
            </button>
          </div>
        ) : templatesLoading ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-8 text-text-muted font-body text-body flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-8 font-body text-body text-text-secondary">
            No templates yet. Create one to get started.
          </div>
        ) : (
          <ul className="bg-surface rounded-xl border border-border divide-y divide-border">
            {templates.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="font-body-medium text-body-medium text-text-primary truncate">{t.name}</p>
                  <p className="font-metadata text-metadata text-text-muted capitalize">{t.category}</p>
                </div>
                <Link to="/templates" className="font-metadata text-metadata text-primary hover:text-brand-hover shrink-0">
                  Use
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">Upcoming</h2>
          <Link to="/scheduler" className="font-metadata text-metadata text-primary hover:text-brand-hover transition-colors">
            + Add
          </Link>
        </div>
        {upcomingError ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-4 flex items-center justify-between">
            <span className="font-body text-body text-text-secondary">{upcomingError}</span>
            <button onClick={loadUpcoming} className="font-metadata text-metadata text-primary hover:text-brand-hover">
              Retry
            </button>
          </div>
        ) : upcomingLoading ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-8 text-text-muted font-body text-body flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading upcoming forms…
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-6">
            <p className="font-body text-body text-text-secondary">No upcoming scheduled forms.</p>
            <Link to="/scheduler" className="font-metadata text-metadata text-primary hover:text-brand-hover">
              Schedule a form →
            </Link>
          </div>
        ) : (
          <ul className="bg-surface rounded-xl border border-border divide-y divide-border">
            {upcoming.slice(0, 3).map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-body-medium text-body-medium text-text-primary truncate">{ev.title}</p>
                    <p className="font-metadata text-metadata text-text-muted">
                      {ev.date} · {ev.time}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Team (secondary) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">Team</h2>
          <button onClick={() => setView('team')} className="font-metadata text-metadata text-primary hover:text-brand-hover">
            Manage team →
          </button>
        </div>
        {teamError ? (
          <div className="bg-surface rounded-xl border border-border px-6 py-4 flex items-center justify-between">
            <span className="font-body text-body text-text-secondary">{teamError}</span>
            <button onClick={handleRefresh} className="font-metadata text-metadata text-primary hover:text-brand-hover">
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border p-5 flex flex-wrap items-center gap-3">
            <span className="font-body text-body text-text-secondary">
              {teamLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading…
                </span>
              ) : (
                <>{sharedWithMeData.length} shared with you · {sharedByMeData.length} shared by you</>
              )}
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" /> Invite
              </button>
              <button
                onClick={() => setShowShareTemplateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" /> Share
              </button>
              <button
                onClick={() => setShowReviewQueueModal(true)}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" /> Reviews
              </button>
            </span>
          </div>
        )}
      </section>
    </div>
  );

  // ---------- Team view ----------
  const teamView = (
    <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-label-code text-label-code text-text-muted mb-2">
          <span>Audentra</span>
          <span>/</span>
          <span className="text-text-primary">Team</span>
        </div>
        <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight">
          Team collaboration
        </h1>
      </div>

      {teamError && (
        <div className="bg-surface rounded-xl border border-border px-6 py-4 flex items-center justify-between mb-6">
          <span className="font-body text-body text-text-secondary">{teamError}</span>
          <button onClick={handleRefresh} className="font-metadata text-metadata text-primary hover:text-brand-hover">
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-[#2563eb] hover:bg-brand-hover text-white font-body-medium text-body-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" /> Invite member
        </button>
        <button
          onClick={() => setShowShareTemplateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" /> Share template
        </button>
        <button
          onClick={() => setShowReviewQueueModal(true)}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" /> Review queue
        </button>
        <button
          onClick={handleRefresh}
          disabled={teamLoading}
          className="inline-flex items-center gap-1.5 p-2 text-text-muted hover:text-text-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${teamLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {teamLoading ? (
        <div className="bg-surface rounded-xl border border-border px-6 py-10 text-text-muted font-body text-body flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading shared templates…
        </div>
      ) : sharedWithMeData.length === 0 && sharedByMeData.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-6 py-10 text-center">
          <p className="font-body text-body text-text-secondary">
            No shared templates yet. Share a template with your team to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sharedWithMeData.length > 0 && (
            <div>
              <h2 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-4">
                Shared with you ({sharedWithMeData.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" ref={sharedTemplatesRef}>
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

          {sharedByMeData.length > 0 && (
            <div>
              <h2 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-4">
                Shared by you ({sharedByMeData.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" ref={sharedByMeRef}>
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
  );

  // ---------- Settings view (legacy, preserved) ----------
  const settingsView = (
    <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 font-label-code text-label-code text-text-muted mb-2">
          <span>Audentra</span>
          <span>/</span>
          <span className="text-text-primary">Settings</span>
        </div>
        <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight">
          Settings
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-6">Voice & AI</h3>
          <div className="space-y-5">
            <div>
              <label className="block font-body-medium text-body-medium text-text-primary mb-2">Language</label>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-text-primary"
              >
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <div>
              <label className="block font-body-medium text-body-medium text-text-primary mb-2">
                Voice sensitivity
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.voiceSensitivity}
                onChange={(e) => updateSettings({ voiceSensitivity: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block font-body-medium text-body-medium text-text-primary mb-2">Processing speed</label>
              <select
                value={settings.aiProcessingSpeed}
                onChange={(e) => updateSettings({ aiProcessingSpeed: e.target.value })}
                className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-text-primary"
              >
                <option>Real-time (Recommended)</option>
                <option>Fast</option>
                <option>Balanced</option>
                <option>Accurate</option>
              </select>
            </div>
            <div>
              <label className="block font-body-medium text-body-medium text-text-primary mb-2">Specialization</label>
              <select
                value={settings.industrySpecialization}
                onChange={(e) => updateSettings({ industrySpecialization: e.target.value })}
                className="w-full h-10 px-3 border border-border rounded-lg bg-surface text-text-primary"
              >
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

        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-6">Account</h3>
          <div className="space-y-4 font-body text-body text-text-secondary">
            <p>
              Signed in as <span className="font-body-medium text-text-primary">{user?.email}</span>
            </p>
            <p>Authentication is managed by Supabase. To change your password or email, use the recovery options on the sign-in page.</p>
            <div className="pt-2 border-t border-border">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
      <div className="min-h-screen bg-background flex">
        {sidebar}

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-background border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-[2px] h-3.5" aria-hidden="true">
              <span className="w-[2px] h-2 bg-primary rounded-full" />
              <span className="w-[2px] h-3 bg-voice rounded-full" />
              <span className="w-[2px] h-3.5 bg-primary rounded-full" />
              <span className="w-[2px] h-2 bg-voice rounded-full" />
              <span className="w-[2px] h-1 bg-primary rounded-full" />
            </span>
            <span className="font-headline-h3 text-[18px] text-text-primary tracking-tight">Audentra</span>
          </div>
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-30 pt-14">
            <button
              className="absolute inset-0 bg-black/30"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
            />
            <nav className="relative bg-background border-b border-border px-4 py-3 space-y-1">
              <button onClick={() => { setView('home'); setMobileNavOpen(false); }} className={navItem(view === 'home')}>
                <HomeIcon className="w-4 h-4" aria-hidden="true" /> Home
              </button>
              <Link to="/AIVoiceAutoFill" onClick={() => setMobileNavOpen(false)} className={navItem(false)}>
                <Mic className="w-4 h-4" aria-hidden="true" /> Forms
              </Link>
              <Link to="/templates" onClick={() => setMobileNavOpen(false)} className={navItem(false)}>
                <LayoutGrid className="w-4 h-4" aria-hidden="true" /> Templates
              </Link>
              <Link to="/activitylog" onClick={() => setMobileNavOpen(false)} className={navItem(false)}>
                <ActivityIcon className="w-4 h-4" aria-hidden="true" /> Activity
              </Link>
              <button onClick={() => { setView('team'); setMobileNavOpen(false); }} className={navItem(view === 'team')}>
                <Users className="w-4 h-4" aria-hidden="true" /> Team
              </button>
              <div className="h-px bg-border my-2" />
              <button onClick={() => { setView('settings'); setMobileNavOpen(false); }} className={navItem(view === 'settings')}>
                <Settings className="w-4 h-4" aria-hidden="true" /> Settings
              </button>
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className={navItem(false)}>
                <Github className="w-4 h-4" aria-hidden="true" /> GitHub
              </a>
              <Link to="/documentation" onClick={() => setMobileNavOpen(false)} className={navItem(false)}>
                <BookOpen className="w-4 h-4" aria-hidden="true" /> Documentation
              </Link>
              <div className="h-px bg-border my-2" />
              <button
                onClick={() => { handleLogout(); setMobileNavOpen(false); }}
                className={navItem(false)}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 min-w-0 pt-14 md:pt-0">
          {view === 'home' && homeView}
          {view === 'team' && teamView}
          {view === 'settings' && settingsView}
        </main>

      <InviteMemberModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
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
      <ReviewQueueModal isOpen={showReviewQueueModal} onClose={() => setShowReviewQueueModal(false)} />
    </div>
  );
}

export default Dashboard;