const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { captureSourceProvenance } = require('./p7_source_provenance.cjs');

const browserLaunchOptions = {
  headless: true,
  ...(process.env.P7_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.P7_CHROMIUM_EXECUTABLE_PATH }
    : {}),
};

const root = path.resolve(__dirname, '..', '..', '..');
const wave = process.argv.find((argument) => /^--wave=w[3-7]$/.test(argument))?.slice(-2) || 'w4';
const routeFilter = process.argv.find((argument) => argument.startsWith('--route='))?.slice(8) || '';
const currentOnly = process.argv.includes('--current-only');
const run = process.env.P7_EVIDENCE_RUN || 'post-wave-review-20261012';
const referenceRun = process.env.P7_REFERENCE_RUN || '';
const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const activityClock = process.env.P7_ACTIVITY_CLOCK || new Date().toISOString();
const p9EvidenceDir = process.env.P9_EVIDENCE_DIR ? path.resolve(process.env.P9_EVIDENCE_DIR) : null;
const output = p9EvidenceDir
  ? path.join(p9EvidenceDir, 'django', wave)
  : path.join(root, 'docs', 'pages', 'evidence', wave, run, 'django');
const sourceOutput = p9EvidenceDir
  ? path.join(p9EvidenceDir, 'source', wave)
  : path.join(root, 'docs', 'pages', 'evidence', wave, referenceRun, 'legacy');
const appRoutes = {
  w3: [
    ['login', '/login', 200],
    ['signup', '/signup', 200],
    ['forgot-password', '/forgot-password', 200],
    ['reset-password', '/reset-password', 404],
  ],
  w4: [['dashboard', '/dashboard', 200]],
  w5: [['templates', '/templates', 200]],
  w6: [
    ['scheduler', '/scheduler', 200],
    ['manage-schedules', '/manage-schedules', 200],
    ['scheduler-settings', '/scheduler-settings', 200],
  ],
  w7: [
    ['voice-autofill', '/AIVoiceAutoFill', 200],
    ['filled-templates', '/filledtemplates', 200],
    ['activity-log', '/activitylog', 200],
  ],
};
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const settingsAdditionalViewports = [
  { name: 'narrow', width: 320, height: 844 },
  { name: 'zoom-200-equivalent', width: 720, height: 900 },
];
const results = {
  wave: wave.toUpperCase(),
  captured_at: new Date().toISOString(),
  source: 'Django DEBUG=False browser settings with isolated synthetic identity/data fixtures',
  fixture_identity: '11111111-1111-4111-8111-111111111111 (non-hosted synthetic account)',
  fixture_data: 'Patient intake template, one schedule, one filled-form row; no database or provider writes',
  base_url: baseUrl,
  source_reference: null,
  browser: null,
  pages: [],
  interactions: [],
  route_contracts: [],
};

let sourceReferenceManifest;
let sourceReferencePages;

const ROUTE_CONTRACTS = {
  login: {
    source_heading: 'Welcome back',
    heading: 'Welcome back', fields: ['email', 'password', 'remember_me', 'next'],
    buttons: ['Continue with Google','Sign in', 'Show password'], destinations: ['/','/forgot-password','/signup'],
    accepted: ['Google auth remains unavailable under P4 and the matching control is visibly disabled with an explanation.', 'Source remember-me field maps to Django remember_me; hidden next and CSRF fields support the authenticated route contract.'],
    source_sections: [],
    source_fields: ['email', 'password', 'remember-me'],
    source_controls: ['Sign in', 'Show password', 'Forgot password?', 'Create account'],
    source_destinations: ['/', '/forgot-password', '/signup'],
    control_map: { Audentra: 'Audentra home' },
    field_map: { 'remember-me': 'remember_me' },
    target_only: {
      fields: [{ feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' }],
      copy: [{ feature: 'Google sign-in is unavailable on this development site.', reason: 'The existing OAuth route is intentionally unavailable under P4 and the page explains the disabled control.' }],
    },
    source_only: { controls: [{ feature: 'Continue with Google', reason: 'P4 OAuth remains unavailable and the Django page presents the accepted disabled state.' }] },
  },
  signup: {
    source_heading: 'Create your account',
    heading: 'Create your account', fields: ['first_name','last_name','email','password','confirm_password','accepted_terms'],
    buttons: ['Create account','Show password'], destinations: ['/','/login','/terms','/privacy'],
    accepted: ['Source Google OAuth is unavailable under P4.', 'Source camelCase fields map to Django snake_case fields.', 'Source custom submit validation requires consent; Django exposes the same requirement through its native required checkbox.', 'Consent is retained and linked to the local Terms and Privacy routes.'],
    source_sections: [],
    source_fields: ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'acceptedTerms'],
    source_controls: ['Create account', 'Show password', 'Sign in'],
    source_destinations: ['/', '/login', '/terms', '/privacy'],
    control_map: {
      Audentra: 'Audentra home',
      'Sign in': 'Already have an account? Sign in',
      'View source on GitHub →': 'View Audentra on GitHub →',
    },
    copy_map: { 'View source on GitHub →': 'View Audentra on GitHub →' },
    field_map: { firstName: 'first_name', lastName: 'last_name', confirmPassword: 'confirm_password', acceptedTerms: 'accepted_terms' },
    field_required_map: { acceptedTerms: true },
    source_only: { controls: [{ feature: 'Continue with Google', reason: 'P4 OAuth remains unavailable and the Django page presents the accepted disabled state.' }] },
    target_only: {
      fields: [{ feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' }],
      controls: [{ feature: 'Continue with Google', reason: 'P4 OAuth remains unavailable and the Django page presents the accepted disabled state.' }],
      copy: [{ feature: 'Google sign-in is unavailable on this development site.', reason: 'The existing OAuth route is intentionally unavailable under P4 and the page explains the disabled control.' }],
    },
  },
  'forgot-password': {
    source_heading: 'Reset Your Password',
    heading: 'Email recovery unavailable', text: ['Email-based forgotten-password recovery is not configured'], destinations: ['/login','/signup'],
    accepted: ['Source recovery email form is unavailable under P4; no email delivery is implemented.', 'The source-only account-creation prompt is omitted while the Django page keeps the destination as a direct link.'],
    source_sections: [],
    source_fields: ['email'],
    source_controls: ['Send reset link'],
    source_destinations: ['/','/login','/signup'],
    source_only: {
      fields: [{ feature: 'email', reason: 'P4 keeps password recovery unavailable because email delivery is not configured.' }],
      controls: [{ feature: 'Send reset link', reason: 'P4 keeps email recovery unavailable because email delivery is not configured.' }],
      copy: [
        { feature: "Enter your email address and we'll send you a link to reset your password.", reason: 'P4 keeps email recovery unavailable because email delivery and reset tokens are not configured.' },
        { feature: "Don't have an account?", reason: 'The Django recovery-unavailable page retains a direct Create an account link but omits the source prompt copy.' },
      ],
    },
    control_map: {
      Audentra: 'Audentra home',
      'VoiceForm Pro': 'Audentra home',
      'Back to sign in': 'Sign in',
      'Create one here': 'Create an account',
    },
    copy_map: { "Don't have an account? Create one here": 'Create an account' },
  },
  'reset-password': {
    source_heading: 'Reset Your Password',
    heading: 'Reset link unavailable', text: ['Password reset links are not active'], destinations: ['/login'],
    accepted: ['Source reset form is unavailable under P4; reset tokens are not consumed or delivered.'],
    source_sections: [],
    source_fields: ['password', 'confirmPassword'],
    source_controls: ['Update Password'],
    source_destinations: ['/','/login'],
    source_only: {
      fields: [
        { feature: 'password', reason: 'P4 reset links are unavailable; Django does not collect a reset token or password.' },
        { feature: 'confirmPassword', reason: 'P4 reset links are unavailable; Django does not collect a reset token or password.' },
      ],
      controls: [{ feature: 'Update Password', reason: 'P4 reset links are unavailable and the source token is invalid; Django does not accept a password change on this route.' }],
      copy: [
        { feature: 'Enter your new password below to complete the reset process.', reason: 'P4 reset links are unavailable and the source token is invalid.' },
        { feature: 'Your new password will be encrypted and secured with enterprise-grade protection.', reason: 'The P4 migration contract avoids unsupported storage-security claims on an unavailable reset flow.' },
      ],
    },
    control_map: {
      'VoiceForm Pro': 'Audentra home',
      'Back to sign in': 'Sign in',
    },
  },
  dashboard: {
    source_heading: 'What would you like to work on?',
    heading: 'What would you like to work on?', sections: ['Start with your voice','Recent forms','Templates','Upcoming schedule','Team workspace'],
    buttons: ['Start voice form','Choose a template','View all forms','Save profile','Team options','Open reviews'],
    destinations: ['/AIVoiceAutoFill','/templates','/filledtemplates','/scheduler','/templates#collaboration'],
    fields: ['first_name','last_name','company','industry','language','aiProcessingSpeed','industrySpecialization','voiceSensitivity'],
    accepted: ['Home, Team and Settings are workspace navigation destinations in both implementations.', 'Recent Forms reads saved database records for the signed-in account; browser fixtures supply visibly synthetic rows only in this isolated capture.', 'Invite/member management remains unavailable; sharing and reviews route to P5-backed template flows.', 'Dashboard shortcuts and profile controls are registered target additions; recent form links open exact saved-record IDs.'],
    source_sections: ['Start with your voice', 'Recent forms', 'Templates', 'Upcoming', 'Team'],
    source_controls: ['Start voice form', 'Choose a template', 'View all forms', 'Browse library'],
    source_destinations: ['/AIVoiceAutoFill', '/templates', '/filledtemplates', '/scheduler'],
    section_map: { Upcoming: 'Upcoming schedule', Team: 'Team workspace' },
    control_map: {
      'Reviews': 'Open reviews',
      'Share': 'Share with an existing account',
      '+ Add': 'Open scheduler',
      'Browse library →': 'View all',
      'Use': 'Use template',
    },
    source_copy: ['Speak naturally and Audentra will turn the conversation into structured form data.'],
    source_only: { controls: [
      { feature: 'Resume', reason: 'Recent Forms lists saved records only; unfinished drafts and resume actions are outside the first release.' },
      { feature: 'Manage team →', reason: 'Source team membership actions remain a demo; available P5 sharing and reviews are linked from the Team view.' },
      { feature: 'Invite', reason: 'P4 email invitations and team membership changes are not configured in the current migration contract.' },
    ] },
    target_only: {
      sections: [
        { feature: 'Choose template', reason: 'The Django dashboard adds a direct template shortcut card.' },
        { feature: 'Filled forms', reason: 'The Django dashboard adds a direct saved-forms shortcut card.' },
        { feature: 'Create template', reason: 'The Django dashboard adds a direct template-builder shortcut card.' },
        { feature: 'Patient intake', reason: 'This is the saved-form name in the synthetic browser fixture used for capture.' },
        { feature: 'Profile settings', reason: 'The Django dashboard adds account profile editing below its recent-work sections.' },
        { feature: 'Voice & AI settings', reason: 'The Django Settings panel adds browser-local preferences and does not change provider settings.' },
        { feature: 'Choose a supported action', reason: 'The Django Team dialog explains the supported sharing and review actions.' },
      ],
      fields: [
        { feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' },
        { feature: 'action', reason: 'Django uses an explicit hidden action value to dispatch profile updates safely.' },
      ],
      controls: [
        { feature: 'Close', reason: 'The Django Team dialog provides a keyboard-accessible close control.' },
        { feature: 'Open sharing and reviews', reason: 'The Django Team dialog links to the existing template sharing and review workspace.' },
      ],
      destinations: [
        { feature: '/templates#create-template', reason: 'The Django dashboard adds a direct anchor to the template builder.' },
        { pattern: '^/AIVoiceAutoFill\\?template=[0-9a-f-]{36}$', reason: 'The synthetic recent-template card links to the selected template using its fixture UUID.' },
        { pattern: '^/filledtemplates\\?record=[0-9a-f-]{36}$', reason: 'Recent Forms opens the exact saved record instead of a generic or resumable draft page.' },
      ],
      copy: [
        { feature: 'Ready to listen', reason: 'The Django voice-start card adds a readiness badge.' },
        { feature: 'Your five most recently saved forms.', reason: 'Recent Forms is rendered from saved-form rows on the server.' },
        { feature: 'Your next scheduled events.', reason: 'The Django Upcoming schedule card adds an explanatory subtitle.' },
        { feature: 'No upcoming events. Create one in the scheduler.', reason: 'The Django empty schedule state links users to the local scheduler.' },
        { feature: 'Update your account profile.', reason: 'The Django profile editor adds explanatory copy.' },
      ],
    },
  },
  templates: {
    source_heading: 'Templates',
    heading: 'Templates', sections: ['Categories','Create a template','Your templates','Patient intake','Received shares','Sent shares and review queue'],
    buttons: ['Filter','Create template','Close template builder','Grid view','List view','Next','Back','Add field','Save template','Duplicate','Request review','Save share','Delete'],
    destinations: ['/dashboard','/AIVoiceAutoFill?template=33333333-3333-4333-8333-333333333333'],
    fields: ['q','category','sort','name','form_data','template_file','recipient_ids','role','creation_method'],
    text: ['This development site does not convert file contents into form fields.'],
    accepted: ['Source category buttons map to the counted category navigation and accessible category select.', 'The source grid/list icon controls have no accessible names; Django exposes named Grid view and List view controls.', 'P5-backed edit, sharing, review, export and private-file flows remain available on the Django route. Private uploads are not parsed into fields and no invitation or anonymous share link is created.'],
    source_sections: ['Categories', 'Patient intake'],
    source_fields: ['Search templates...'],
    source_controls: ['Refresh','Create Template','All Templates1','Healthcare1','Field Work0','Human Resources0','Legal0','Education0','Real Estate0','Filters','Edit','Share','Hide'],
    source_destinations: ['/dashboard'],
    field_map: { 'Search templates...': 'q' },
    field_label_map: { 'Search templates...': 'Search templates' },
    control_map: {
      'All Templates1': 'All Templates, 1 template',
      'Healthcare1': 'Healthcare, 1 template',
      'Field Work0': 'Field Work, 0 templates',
      'Human Resources0': 'Human Resources, 0 templates',
      'Legal0': 'Legal, 0 templates',
      'Education0': 'Education, 0 templates',
      'Real Estate0': 'Real Estate, 0 templates',
      Filters: 'Filters',
      Edit: 'Edit fields and details',
      Share: 'Share with existing accounts',
      Hide: 'Make hidden',
    },
    target_only: {
      sections: [
        { feature: 'Choose a creation method', reason: 'The Django template builder exposes a manual or private-file creation step.' },
        { feature: 'Form fields', reason: 'The Django builder and editor expose their field lists as named sections.' },
      ],
      fields: [
        { feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' },
        { feature: 'action', reason: 'Django uses hidden action values to dispatch template operations.' },
        { feature: 'description', reason: 'The Django editor allows the owner to edit a template description.' },
        { feature: 'visibility', reason: 'The Django sharing flow lets the owner choose template visibility.' },
        { feature: 'template_id', reason: 'Django forms carry the selected template identifier for account-scoped actions.' },
        { feature: 'field_identifier_preview', reason: 'The Django builder previews the stable identifier for a new form field.' },
        { feature: 'field_label_preview', reason: 'The Django builder previews the user-facing label for a new form field.' },
        { feature: 'field_placeholder_preview', reason: 'The Django builder previews the optional field placeholder.' },
        { feature: 'field_options_preview', reason: 'The Django builder previews choice-field options.' },
        { feature: 'Field type', reason: 'The Django builder exposes the supported type for a new form field.' },
        { feature: 'Required', reason: 'The Django builder lets the owner set whether a form field is required.' },
        { feature: 'message', reason: 'The Django sharing flow accepts an optional message for an existing account.' },
        { feature: 'rating', reason: 'The Django review flow records a review rating.' },
        { feature: 'comment', reason: 'The Django review flow records an optional comment.' },
      ],
      controls: [
        { feature: 'Move down', reason: 'The Django field editor lets owners change form field order.' },
        { feature: 'Move up', reason: 'The Django field editor lets owners change form field order.' },
        { feature: 'Private file', reason: 'The Django builder identifies the private source-file selection control.' },
        { feature: 'Remove field', reason: 'The Django field editor lets owners remove a field from their template.' },
        { feature: 'Request or submit a review', reason: 'The Django template workspace exposes its existing P5 review flow.' },
        { feature: 'Save changes', reason: 'The Django template editor saves account-owned changes.' },
        { feature: 'Submit review to the owner', reason: 'The Django review flow lets an existing recipient submit feedback.' },
        { feature: 'Upload privately', reason: 'The Django builder stores an uploaded source file privately without parsing it.' },
        { feature: 'Back to dashboard', reason: 'The Django template chooser adds a direct dashboard return control.' },
        { feature: 'Export template JSON', reason: 'The Django template workspace offers a local JSON export action.' },
        { pattern: '^More actions for .+$', reason: 'The Django native overflow disclosure labels its action trigger for assistive technology; the source MoreHorizontal trigger has no accessible name.' },
        { feature: 'Use template', reason: 'The Django template card uses an accessible action to open the selected form.' },
        { feature: 'Collaboration and reviews', reason: 'P5 sharing and review summaries stay in a closed disclosure until requested; the dashboard hash destination opens it.' },
      ],
      destinations: [
        { pattern: '^/templates\\?category=(all|education|fieldwork|healthcare|hr|legal|realestate)$', reason: 'The Django category controls link to the corresponding local template filter.' },
        { pattern: '^/templates\\?export=template&id=[0-9a-f-]{36}$', reason: 'The Django export link carries the selected synthetic template UUID.' },
      ],
    },
  },
  scheduler: {
    source_heading: 'Scheduler', heading: 'Scheduler', sections: ['Upcoming Events','This Month','Event Types'],
    buttons: ['Today','Month','Week','Filter','Save schedule','Save changes'],
    fields: ['q','type','title','date','time','duration','priority','location','reminder_minutes','description','attendees','form_id'],
    destinations: ['/dashboard','/scheduler-settings','/manage-schedules'],
    text: ['October 2026'],
    accepted: ['Source search and event-type filters are usable and persist between month/week views.', 'Calendar weeks start on Sunday to match the source.', 'Stored schedule values retain the existing P5 UTC-derived date behavior.'],
    source_sections: ['Upcoming Events', 'This Month', 'Event Types'],
    source_controls: ['Today', 'Month', 'Week', 'Schedule Event', 'Manage All Schedules'],
    source_fields: ['Search events...'],
    source_destinations: ['/dashboard', '/scheduler-settings', '/manage-schedules'],
    field_map: { 'Search events...': 'q' },
    field_label_map: { 'Search events...': 'Search events' },
    control_map: { 'Schedule Event': '+ Schedule Event' },
    source_only: { fields: [{ feature: 'Search events...', reason: 'Source input is identified by placeholder; the Django search field is identified by its label/name.' }] },
    target_only: {
      fields: [
        { feature: 'month', reason: 'Django calendar navigation carries the currently selected month.' },
        { feature: 'view', reason: 'Django calendar navigation carries the selected month or week view.' },
        { feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' },
        { feature: 'action', reason: 'Django uses hidden action values to dispatch schedule operations.' },
        { feature: 'event_id', reason: 'Django schedule forms carry the selected owned event identifier.' },
      ],
      controls: [
        { pattern: '^\\d{1,2}:\\d{2} [AP]M Review patient intake$', reason: 'The seeded schedule card adds the time and title to its accessible edit action.' },
        { feature: 'Cancel', reason: 'The Django schedule editor provides a local cancel action.' },
        { feature: 'Complete', reason: 'The Django schedule editor provides a local completion action.' },
        { feature: 'Create a schedule', reason: 'The Django scheduler includes a direct create-event action.' },
        { feature: 'Delete', reason: 'The Django schedule editor provides a confirmed delete action.' },
        { feature: 'Edit schedule', reason: 'The Django schedule event card links to its owner-scoped editor.' },
        { feature: 'Back to dashboard', reason: 'The Django scheduler adds a direct dashboard return link.' },
        { feature: 'Next month', reason: 'The Django month calendar includes previous and next month navigation.' },
        { feature: 'Previous month', reason: 'The Django month calendar includes previous and next month navigation.' },
        { feature: 'Scheduler Settings', reason: 'The Django scheduler links to its local preferences page.' },
        { pattern: '^Show week containing [A-Z][a-z]+ \\d{1,2}, \\d{4}$', reason: 'Each Django calendar day offers a direct local week-view action.' },
      ],
      destinations: [
        { feature: '/scheduler#create-schedule', reason: 'The Django scheduler exposes a direct anchor to its event form.' },
        { pattern: '^/scheduler\\?date=\\d{4}-\\d{2}-\\d{2}&view=week&q=&type=all$', reason: 'Django calendar days route to the selected date in week view.' },
        { pattern: '^/scheduler\\?month=\\d{4}-\\d{2}(?:&date=\\d{4}-\\d{2}-\\d{2})?&view=month&q=&type=all$', reason: 'Django month controls preserve the selected month, date, view, and filters.' },
      ],
      copy: [{ feature: 'No upcoming events.', reason: 'The Django schedule sidebar displays its concise empty state.' }],
    },
  },
  'manage-schedules': {
    source_heading: 'Manage All Schedules',
    heading: 'Manage All Schedules', buttons: ['Apply filters','Apply','Complete','Cancel','Delete'],
    fields: ['q','type','status','sort','order','selected_ids','action'],
    destinations: ['/scheduler','/scheduler-settings','/scheduler?edit=44444444-4444-4444-8444-444444444444'],
    accepted: ['Per-row source navigation opens the scheduler edit form for the selected owned event.'],
    source_sections: [],
    source_fields: ['Search events...'],
    source_controls: ['Refresh', 'New Event', 'Mark Complete', 'Cancel', 'Delete'],
    source_destinations: ['/scheduler', '/scheduler-settings'],
    source_copy: ['View, edit, and manage all scheduled events', 'Total Events', 'Scheduled', 'Completed', 'Cancelled', 'High Priority'],
    field_map: { 'Search events...': 'q' },
    field_label_map: { 'Search events...': 'Search events' },
    control_map: { 'Mark Complete': 'Complete' },
    target_only: {
      sections: [{ pattern: '^All scheduled events \\(\\d+\\)$', reason: 'The Django table heading includes the live count of account-owned schedules.' }],
      fields: [
        { feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' },
        { feature: 'event_id', reason: 'Django schedule forms carry the selected owned event identifier.' },
        { feature: 'title', reason: 'The Django management route includes an event edit form.' },
        { feature: 'date', reason: 'The Django management route includes an event edit form.' },
        { feature: 'time', reason: 'The Django management route includes an event edit form.' },
        { feature: 'duration', reason: 'The Django management route includes an event edit form.' },
        { feature: 'priority', reason: 'The Django management route carries the event priority through its edit form.' },
        { feature: 'description', reason: 'The Django management route carries the event description through its edit form.' },
        { feature: 'location', reason: 'The Django management route carries the event location through its edit form.' },
        { feature: 'attendees', reason: 'The Django management route carries event attendees through its edit form.' },
        { feature: 'form_id', reason: 'The Django management route carries the linked form identifier through its edit form.' },
        { feature: 'reminder_minutes', reason: 'The Django management route carries the reminder setting through its edit form.' },
      ],
      controls: [
        { feature: 'Edit details', reason: 'The Django table opens an inline form for account-owned schedule details.' },
        { feature: 'Save', reason: 'The Django inline schedule editor saves its current row.' },
        { feature: 'Sort results', reason: 'The Django management route adds accessible table sorting.' },
        { feature: 'Back to scheduler', reason: 'The Django management route adds a direct calendar return link.' },
        { feature: 'Edit in scheduler', reason: 'The Django management table links to the calendar event editor.' },
        { feature: 'Scheduler settings', reason: 'The Django management route links to its local scheduler preferences.' },
      ],
      destinations: [
        { feature: '/manage-schedules', reason: 'The Django table sort and filter forms submit to their current local route.' },
        { feature: '/scheduler#create-schedule', reason: 'The Django management view adds a direct anchor to the calendar event form.' },
      ],
      copy: [{ feature: 'Synthetic browser-capture schedule', reason: 'This event description belongs to the local browser test fixture.' }],
    },
  },
  'scheduler-settings': {
    source_heading: 'Scheduler Settings',
    heading: 'Scheduler Settings', sections: ['Scheduling preferences', 'Working hours', 'Working days', 'Calendar display', 'Notification delivery', 'Connections & privacy'],
    buttons: ['Scheduling','Calendar display','Notifications','Connections & privacy','Reset draft','Discard changes','Export','Import','Save settings'],
    fields: ['defaultDuration','defaultReminderMinutes','workingHours.start','workingHours.end','workingDays','defaultView','weekStartsOn','showWeekends','compactView'],
    destinations: ['/scheduler','/privacy','/security','/documentation#settings-preview'],
    accepted: ['Settings are a versioned browser-local preview only. No setting changes real scheduler behavior, requests permissions, sends notifications, or connects a provider.', 'The redesigned page replaces six inert preference groups with four sections, an example calendar, visible draft/save state, and honest unavailable-capability cards.'],
    source_sections: ['General Settings', 'Working Hours', 'Working Days'],
    source_fields: ['Default Event Duration (minutes)', 'Default Reminder (minutes before)', 'Start Time', 'End Time'],
    source_controls: ['General', 'Notifications', 'Calendar', 'Privacy', 'Appearance', 'Integrations', 'Save Changes', 'Reset', 'Export'],
    source_destinations: ['/scheduler'],
    source_copy: ['Configure your scheduling preferences and integrations'],
    field_map: {
      'Default Event Duration (minutes)': 'defaultDuration',
      'Default Reminder (minutes before)': 'defaultReminderMinutes',
      'Start Time': 'workingHours.start',
      'End Time': 'workingHours.end',
      Import: 'Import',
    },
    control_map: {},
    target_only: {
      controls: [
        { feature: 'Browser preview section rail', reason: 'The new four-section layout groups supported preview preferences and accurately marks real integrations as unavailable.' },
        { feature: 'Example schedule', reason: 'The browser renders fictional sample dates locally; it does not read or create saved schedules.' },
        { feature: 'Discard changes', reason: 'The revised browser-only state contract can restore the saved preference snapshot.' },
      ],
      copy: [{ feature: 'These settings change only the fictional example on this page.', reason: 'The current scheduler does not consume the saved browser preferences.' }],
    },
  },
  'voice-autofill': {
    source_heading: 'AI Voice Auto-Fill',
    heading: 'AI Voice Auto-Fill', sections: ['Choose a Form Template'],
    buttons: ['Use template'],
    destinations: ['/dashboard','/AIVoiceAutoFill?template=33333333-3333-4333-8333-333333333333'],
    accepted: ['Both captures start at template selection; the source template card has no button or link semantics, so Django exposes an accessible Use template button. Selected-template review is captured and tested separately.', 'Browser API interception is synthetic and does not establish live provider or hosted persistence.', 'The Django chooser adds a direct return link to the dashboard.'],
    source_sections: ['Choose a Form Template'],
    source_controls: [],
    source_destinations: ['/dashboard'],
    target_only: {
      controls: [{ feature: 'Back to dashboard', reason: 'The Django template chooser adds a direct dashboard return link.' }],
    },
  },
  'filled-templates': {
    source_heading: 'Your Filled Templates',
    heading: 'Saved forms', buttons: ['View form', 'Download JSON', 'Delete', 'Back to Dashboard'],
    fields: ['action','record_id'], destinations: ['/dashboard','/filledtemplates?record=55555555-5555-4555-8555-555555555555','/filledtemplates?download=55555555-5555-4555-8555-555555555555'],
    accepted: ['Saved-form cards use owner-scoped summaries; answer values are shown only after opening the exact record or downloading its JSON.', 'The list supports bounded server pagination and POST/redirect/GET deletion. Browser fixtures are synthetic and do not prove hosted persistence.'],
    source_sections: ['Form Data:'],
    source_controls: ['Delete Template', 'Back to Dashboard'],
    source_destinations: [],
    source_copy: ['Manage all your previously filled templates here.'],
    control_map: { 'Delete Template': 'Delete' },
    target_only: {
      sections: [{ feature: 'Patient intake', reason: 'This is the synthetic saved-form fixture title.' }],
      fields: [{ feature: 'csrfmiddlewaretoken', reason: 'Django CSRF form protection is required for local authenticated POST routes.' }],
      controls: [{ feature: 'Delete confirmation', reason: 'Django confirms before deleting a saved form through its authenticated server route.' }],
      destinations: [{ feature: '/dashboard', reason: 'The source Back to Dashboard action uses a React navigation handler, while Django renders the same local destination as a link.' }],
      copy: [{ feature: 'Delete this saved form?', reason: 'This confirmation protects the server-side saved-form delete action.' }],
    },
  },
  'activity-log': {
    source_heading: 'Activity Log',
    heading: 'Activity Log', sections: ['Activity entries'], fields: ['q','type','range','event_id'], buttons: ['Refresh','Apply filters','Remove from activity'], destinations: ['/dashboard','/filledtemplates?record=55555555-5555-4555-8555-555555555555','/templates?focus=33333333-3333-4333-8333-333333333333#template-33333333-3333-4333-8333-333333333333','/scheduler?edit=44444444-4444-4444-8444-444444444444'],
    text: ['Actions saved by your account','This is a personal activity history'],
    accepted: ['The active page now renders owner-scoped database events with GET filters and CSRF-protected removal. Browser fixtures exercise page behavior only; the local PostgreSQL acceptance check proves triggers, RLS, and transaction behavior.'],
    source_sections: ['Activity Log'],
    source_controls: ['Refresh', 'Download', 'Continue', 'Delete'],
    source_destinations: ['/dashboard'],
    source_copy: ['View all your recent activity and actions', 'Showing your recent activity and actions'],
    field_label_map: { 'Search activity...': 'Search activity' },
    control_map: {
      Download: 'Download JSON',
      Continue: 'View saved form',
      Delete: 'Remove from activity',
    },
    target_only: {
      controls: [
        { feature: 'Back to dashboard', reason: 'The Django activity view adds a direct dashboard return link.' },
        { feature: 'Open template', reason: 'Activity entries link to templates only while the current account can still access them.' },
        { feature: 'Open schedule', reason: 'Activity entries link to schedules only while the current account can still access them.' },
      ],
      copy: [{ feature: 'Actions you save will appear here.', reason: 'The server-backed activity page provides an honest empty state.' }],
    },
  },
};

function assertRouteContract(info, contract, routeName = 'route') {
  const failures = [];
  if (contract.heading && info.heading !== contract.heading) failures.push(`heading ${JSON.stringify(contract.heading)}`);
  let sectionCursor = -1;
  for (const heading of contract.sections || []) {
    const position = info.section_headings.indexOf(heading, sectionCursor + 1);
    if (position < 0) failures.push(`ordered section ${JSON.stringify(heading)}`);
    else sectionCursor = position;
  }
  const fields = new Set(info.field_names || []);
  for (const field of contract.fields || []) if (!fields.has(field)) failures.push(`field ${JSON.stringify(field)}`);
  const buttons = [...(info.button_labels || []), ...(info.link_labels || [])];
  buttons.push(...(info.label_texts || []));
  for (const button of contract.buttons || []) if (!buttons.includes(button)) failures.push(`button ${JSON.stringify(button)}`);
  const destinations = new Set(info.local_destinations || []);
  for (const destination of contract.destinations || []) {
    if (!destinations.has(destination)) failures.push(`destination ${JSON.stringify(destination)}`);
  }
  for (const fragment of contract.text || []) {
    if (!String(info.text || '').includes(fragment)) failures.push(`text ${JSON.stringify(fragment)}`);
  }
  assert.deepEqual(failures, [], `${routeName} route contract failed`);
}

function featureKey(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function hasFeature(values, expected) {
  const expectedKey = featureKey(expected);
  return values.some((value) => featureKey(value) === expectedKey);
}

function sourceOnly(contract, category, value) {
  const exceptions = contract.source_only?.[category] || [];
  return exceptions.some((entry) => {
    const feature = typeof entry === 'string' ? entry : entry.feature;
    return featureKey(feature) === featureKey(value);
  });
}

function targetOnly(contract, category, value) {
  const allowances = contract.target_only?.[category] || [];
  return allowances.some((entry) => {
    if (entry.pattern) return new RegExp(entry.pattern).test(String(value));
    const feature = typeof entry === 'string' ? entry : entry.feature;
    return featureKey(feature) === featureKey(value);
  });
}

function assertSourceRouteContract(sourceInfo, djangoInfo, contract, routeName = 'route') {
  const failures = [];
  const mappedSection = (section) => contract.section_map?.[section] || section;
  const mappedField = (field) => contract.field_map?.[field.identity] || contract.field_map?.[field.label] || null;
  const mappedControl = (control) => contract.control_map?.[control] || control;
  const mappedDestination = (destination) => contract.destination_map?.[destination] || destination;
  const mappedCopy = (copy) => contract.copy_map?.[copy] || copy;
  const djangoFieldIdentities = [...(djangoInfo.field_names || []), ...(djangoInfo.label_texts || [])];
  const djangoFieldDescriptors = djangoInfo.field_descriptors || [];
  const djangoActions = [
    ...(djangoInfo.button_labels || []),
    ...(djangoInfo.link_labels || []),
    ...(djangoInfo.label_texts || []),
    ...djangoFieldDescriptors.flatMap((field) => field.options || []),
  ];

  if (sourceInfo.heading !== contract.source_heading) {
    failures.push(`source heading changed from ${JSON.stringify(contract.source_heading)}`);
  }
  if (contract.heading && djangoInfo.heading !== contract.heading) {
    failures.push(`Django heading changed from ${JSON.stringify(contract.heading)}`);
  }
  for (const section of contract.source_sections || []) {
    if (!hasFeature(sourceInfo.section_headings || [], section)) {
      failures.push(`required source section ${JSON.stringify(section)} is absent`);
    }
  }
  let sourceSectionCursor = -1;
  for (const section of contract.source_sections || []) {
    const position = (sourceInfo.section_headings || []).findIndex(
      (item, index) => index > sourceSectionCursor && featureKey(item) === featureKey(section),
    );
    if (position < 0) failures.push(`source section ${JSON.stringify(section)} is out of order`);
    else sourceSectionCursor = position;
  }
  for (const section of sourceInfo.section_headings || []) {
    const target = mappedSection(section);
    if (!hasFeature(djangoInfo.section_headings || [], target) && !sourceOnly(contract, 'sections', section)) {
      failures.push(`source section ${JSON.stringify(section)} has no mapped Django section ${JSON.stringify(target)}`);
    }
  }
  let djangoSectionCursor = -1;
  for (const section of contract.source_sections || []) {
    const target = mappedSection(section);
    const position = (djangoInfo.section_headings || []).findIndex(
      (item, index) => index > djangoSectionCursor && featureKey(item) === featureKey(target),
    );
    if (position < 0 && !sourceOnly(contract, 'sections', section)) {
      failures.push(`mapped Django section ${JSON.stringify(target)} is absent or out of order`);
    } else if (position >= 0) {
      djangoSectionCursor = position;
    }
  }
  const mappedSourceSections = (sourceInfo.section_headings || [])
    .filter((section) => !sourceOnly(contract, 'sections', section))
    .map(mappedSection);
  const expectedTargetSections = [...(contract.sections || []), ...mappedSourceSections];
  for (const section of djangoInfo.section_headings || []) {
    if (!hasFeature(expectedTargetSections, section) && !targetOnly(contract, 'sections', section)) {
      failures.push(`unregistered Django-only section ${JSON.stringify(section)}`);
    }
  }

  const sourceFieldKeys = (sourceInfo.field_descriptors || []).flatMap((field) => [field.identity, field.label].filter(Boolean));
  for (const field of contract.source_fields || []) {
    if (!hasFeature(sourceFieldKeys, field) && !sourceOnly(contract, 'fields', field)) {
      failures.push(`required source field ${JSON.stringify(field)} is absent`);
    }
  }
  for (const field of sourceInfo.field_descriptors || []) {
    if (sourceOnly(contract, 'fields', field.identity) || sourceOnly(contract, 'fields', field.label)) continue;
    const mapped = mappedField(field);
    const expectedKeys = mapped ? [mapped] : [field.identity, field.label].filter(Boolean);
    const matches = [...djangoFieldIdentities, ...djangoFieldDescriptors.flatMap((item) => [item.identity, item.label])];
    if (!expectedKeys.some((expected) => hasFeature(matches, expected))) {
      failures.push(`source field ${JSON.stringify(field.label || field.identity)} has no mapped Django field`);
      continue;
    }
    const targetFields = djangoFieldDescriptors.filter((item) =>
      expectedKeys.some((expected) => hasFeature([item.identity, item.label].filter(Boolean), expected)),
    );
    if (targetFields.length) {
      const expectedType = contract.field_type_map?.[field.identity]
        || contract.field_type_map?.[field.label]
        || field.type;
      if (!targetFields.some((item) => item.type === expectedType)) {
        failures.push(
          `source field ${JSON.stringify(field.label || field.identity)} type ${JSON.stringify(field.type)} ` +
          `maps to Django type ${JSON.stringify(expectedType)}; observed ${JSON.stringify(targetFields.map((item) => item.type))}`,
        );
      }
      if (field.label) {
        const expectedLabel = contract.field_label_map?.[field.identity]
          || contract.field_label_map?.[field.label]
          || field.label;
        if (!targetFields.some((item) => hasFeature([item.label].filter(Boolean), expectedLabel))) {
          failures.push(
            `source field label ${JSON.stringify(field.label)} maps to Django label ${JSON.stringify(expectedLabel)}; ` +
            `observed ${JSON.stringify(targetFields.map((item) => item.label))}`,
          );
        }
      }
      const expectedRequired = contract.field_required_map?.[field.identity]
        ?? contract.field_required_map?.[field.label]
        ?? field.required;
      if (!targetFields.some((item) => item.required === expectedRequired)) {
        failures.push(
          `source field ${JSON.stringify(field.label || field.identity)} required=${JSON.stringify(field.required)} ` +
          `maps to Django required=${JSON.stringify(expectedRequired)}; ` +
          `observed ${JSON.stringify(targetFields.map((item) => item.required))}`,
        );
      }
    }
  }
  const mappedSourceFields = (sourceInfo.field_descriptors || [])
    .filter((field) => !sourceOnly(contract, 'fields', field.identity) && !sourceOnly(contract, 'fields', field.label))
    .map((field) => {
      const mapped = mappedField(field);
      return mapped ? [mapped] : [field.identity, field.label].filter(Boolean);
    });
  for (const field of djangoFieldDescriptors) {
    const keys = [field.identity, field.label].filter(Boolean);
    const sourceMapped = mappedSourceFields.some((expected) => expected.some((item) => hasFeature(keys, item)));
    const targetRequired = (contract.fields || []).some((expected) => hasFeature(keys, expected));
    if (!sourceMapped && !targetRequired && !targetOnly(contract, 'fields', field.identity || field.label)) {
      failures.push(`unregistered Django-only field ${JSON.stringify({ identity: field.identity, label: field.label, type: field.type })}`);
    }
  }

  const sourceActions = [...(sourceInfo.button_labels || []), ...(sourceInfo.link_labels || [])];
  for (const control of contract.source_controls || []) {
    if (!hasFeature(sourceActions, control) && !sourceOnly(contract, 'controls', control)) {
      failures.push(`required source control ${JSON.stringify(control)} is absent`);
    }
  }
  for (const control of sourceActions) {
    const target = mappedControl(control);
    if (!hasFeature(djangoActions, target) && !sourceOnly(contract, 'controls', control)) {
      failures.push(`source control ${JSON.stringify(control)} has no mapped Django control ${JSON.stringify(target)}; observed ${JSON.stringify(djangoActions)}`);
    }
  }
  const expectedTargetActions = [
    ...(contract.buttons || []),
    ...sourceActions.filter((control) => !sourceOnly(contract, 'controls', control)).map(mappedControl),
  ];
  const djangoActionsOnly = [...(djangoInfo.button_labels || []), ...(djangoInfo.link_labels || [])];
  for (const control of djangoActionsOnly) {
    if (!hasFeature(expectedTargetActions, control) && !targetOnly(contract, 'controls', control)) {
      failures.push(`unregistered Django-only control ${JSON.stringify(control)}`);
    }
  }

  for (const destination of contract.source_destinations || []) {
    if (!hasFeature(sourceInfo.local_destinations || [], destination)) {
      failures.push(`required source destination ${JSON.stringify(destination)} is absent`);
    }
  }
  for (const destination of sourceInfo.local_destinations || []) {
    const target = mappedDestination(destination);
    if (!hasFeature(djangoInfo.local_destinations || [], target) && !sourceOnly(contract, 'destinations', destination)) {
      failures.push(`source destination ${JSON.stringify(destination)} has no mapped Django destination ${JSON.stringify(target)}`);
    }
  }
  const expectedTargetDestinations = [
    ...(contract.destinations || []),
    ...(sourceInfo.local_destinations || [])
      .filter((destination) => !sourceOnly(contract, 'destinations', destination))
      .map(mappedDestination),
  ];
  for (const destination of djangoInfo.local_destinations || []) {
    if (!hasFeature(expectedTargetDestinations, destination) && !targetOnly(contract, 'destinations', destination)) {
      failures.push(`unregistered Django-only destination ${JSON.stringify(destination)}`);
    }
  }

  for (const copy of contract.source_copy || []) {
    if (!String(sourceInfo.text || '').includes(copy)) failures.push(`required source copy ${JSON.stringify(copy)} is absent`);
  }
  for (const copy of sourceInfo.copy_blocks || []) {
    const target = mappedCopy(copy);
    if (!featureKey(djangoInfo.text || '').includes(featureKey(target)) && !sourceOnly(contract, 'copy', copy)) {
      failures.push(`source copy ${JSON.stringify(copy)} is missing from Django`);
    }
  }
  for (const copy of djangoInfo.copy_blocks || []) {
    const mapsSourceCopy = (sourceInfo.copy_blocks || []).some((sourceCopy) => {
      if (sourceOnly(contract, 'copy', sourceCopy)) return false;
      return featureKey(copy).includes(featureKey(mappedCopy(sourceCopy)));
    });
    const requiredTargetCopy = (contract.text || []).some((fragment) => featureKey(copy).includes(featureKey(fragment)));
    if (!mapsSourceCopy && !requiredTargetCopy && !targetOnly(contract, 'copy', copy)) {
      failures.push(`unregistered Django-only copy ${JSON.stringify(copy)}`);
    }
  }

  assert.deepEqual(failures, [], `${routeName} source/Django comparison failed`);
}

function cloneInfo(info) {
  return JSON.parse(JSON.stringify(info));
}

function checkRealRouteNegativeControls(sourceInfo, djangoInfo, contract, routeName) {
  assertSourceRouteContract(sourceInfo, djangoInfo, contract, `${routeName} negative-control baseline`);
  const checks = [];
  const section = (contract.source_sections || []).find((item) => hasFeature(sourceInfo.section_headings || [], item));
  if (section) {
    const mutatedSource = cloneInfo(sourceInfo);
    const mutatedDjango = cloneInfo(djangoInfo);
    mutatedSource.section_headings = mutatedSource.section_headings.filter((item) => featureKey(item) !== featureKey(section));
    mutatedDjango.section_headings = mutatedDjango.section_headings.filter((item) =>
      featureKey(item) !== featureKey(contract.section_map?.[section] || section));
    assert.throws(() => assertSourceRouteContract(mutatedSource, mutatedDjango, contract, routeName));
    checks.push('removed required source/Django section rejected');
  }
  const control = (contract.source_controls || []).find((item) => hasFeature(
    [...(sourceInfo.button_labels || []), ...(sourceInfo.link_labels || [])], item,
  ));
  if (control) {
    const mutatedSource = cloneInfo(sourceInfo);
    const mutatedDjango = cloneInfo(djangoInfo);
    mutatedSource.button_labels = mutatedSource.button_labels.filter((item) => featureKey(item) !== featureKey(control));
    mutatedSource.link_labels = mutatedSource.link_labels.filter((item) => featureKey(item) !== featureKey(control));
    const targetControl = contract.control_map?.[control] || control;
    mutatedDjango.button_labels = mutatedDjango.button_labels.filter((item) => featureKey(item) !== featureKey(targetControl));
    mutatedDjango.link_labels = mutatedDjango.link_labels.filter((item) => featureKey(item) !== featureKey(targetControl));
    assert.throws(() => assertSourceRouteContract(mutatedSource, mutatedDjango, contract, routeName));
    checks.push('removed required source/Django control rejected');
  }
  const destination = (contract.source_destinations || []).find((item) => hasFeature(sourceInfo.local_destinations || [], item));
  if (destination) {
    const mutatedSource = cloneInfo(sourceInfo);
    const mutatedDjango = cloneInfo(djangoInfo);
    mutatedSource.local_destinations = mutatedSource.local_destinations.filter((item) => featureKey(item) !== featureKey(destination));
    const targetDestination = contract.destination_map?.[destination] || destination;
    mutatedDjango.local_destinations = mutatedDjango.local_destinations.filter((item) => featureKey(item) !== featureKey(targetDestination));
    assert.throws(() => assertSourceRouteContract(mutatedSource, mutatedDjango, contract, routeName));
    checks.push('removed required source/Django destination rejected');
  }
  const field = (contract.source_fields || []).find((item) => hasFeature(
    (sourceInfo.field_descriptors || []).flatMap((descriptor) => [descriptor.identity, descriptor.label].filter(Boolean)), item,
  ));
  if (field) {
    const mutatedSource = cloneInfo(sourceInfo);
    const mutatedDjango = cloneInfo(djangoInfo);
    mutatedSource.field_descriptors = mutatedSource.field_descriptors.filter((item) =>
      featureKey(item.identity) !== featureKey(field) && featureKey(item.label) !== featureKey(field));
    mutatedDjango.field_names = mutatedDjango.field_names.filter((item) => featureKey(item) !== featureKey(field));
    mutatedDjango.label_texts = mutatedDjango.label_texts.filter((item) => featureKey(item) !== featureKey(field));
    mutatedDjango.field_descriptors = mutatedDjango.field_descriptors.filter((item) =>
      featureKey(item.identity) !== featureKey(field) && featureKey(item.label) !== featureKey(field));
    assert.throws(() => assertSourceRouteContract(mutatedSource, mutatedDjango, contract, routeName));
    checks.push('removed required source/Django field rejected');
  }
  const constrainedField = (sourceInfo.field_descriptors || []).find((item) =>
    !sourceOnly(contract, 'fields', item.identity) && !sourceOnly(contract, 'fields', item.label),
  );
  if (constrainedField) {
    const mutatedDjango = cloneInfo(djangoInfo);
    const mapped = contract.field_map?.[constrainedField.identity]
      || contract.field_map?.[constrainedField.label]
      || constrainedField.identity;
    const targetField = (mutatedDjango.field_descriptors || []).find((item) =>
      hasFeature([item.identity, item.label].filter(Boolean), mapped)
      || hasFeature([item.identity, item.label].filter(Boolean), constrainedField.label),
    );
    if (targetField) {
      const expectedRequired = contract.field_required_map?.[constrainedField.identity]
        ?? contract.field_required_map?.[constrainedField.label]
        ?? constrainedField.required;
      targetField.required = !expectedRequired;
      assert.throws(() => assertSourceRouteContract(sourceInfo, mutatedDjango, contract, routeName));
      checks.push('changed field required constraint rejected');
    }
  }
  const copy = (contract.source_copy || []).find((item) => String(sourceInfo.text || '').includes(item));
  if (copy) {
    const mutatedSource = cloneInfo(sourceInfo);
    const mutatedDjango = cloneInfo(djangoInfo);
    mutatedSource.text = mutatedSource.text.replace(copy, '');
    mutatedDjango.text = mutatedDjango.text.replace(copy, '');
    mutatedSource.copy_blocks = mutatedSource.copy_blocks.filter((item) => !item.includes(copy));
    assert.throws(() => assertSourceRouteContract(mutatedSource, mutatedDjango, contract, routeName));
    checks.push('removed required source/Django copy rejected');
  }
  const mutatedDjangoOnly = cloneInfo(djangoInfo);
  mutatedDjangoOnly.button_labels = [...(mutatedDjangoOnly.button_labels || []), 'Unregistered injected P9 control'];
  assert.throws(() => assertSourceRouteContract(sourceInfo, mutatedDjangoOnly, contract, routeName));
  checks.push('unregistered Django-only control rejected');
  const mutatedDjangoSection = cloneInfo(djangoInfo);
  mutatedDjangoSection.section_headings = [...(mutatedDjangoSection.section_headings || []), 'Unregistered injected P9 section'];
  assert.throws(() => assertSourceRouteContract(sourceInfo, mutatedDjangoSection, contract, routeName));
  checks.push('unregistered Django-only section rejected');
  const mutatedDjangoField = cloneInfo(djangoInfo);
  mutatedDjangoField.field_descriptors = [
    ...(mutatedDjangoField.field_descriptors || []),
    { identity: 'unregistered_injected_p9_field', label: '', type: 'text', options: [] },
  ];
  assert.throws(() => assertSourceRouteContract(sourceInfo, mutatedDjangoField, contract, routeName));
  checks.push('unregistered Django-only field rejected');
  const mutatedDjangoDestination = cloneInfo(djangoInfo);
  mutatedDjangoDestination.local_destinations = [
    ...(mutatedDjangoDestination.local_destinations || []),
    '/p9-unregistered-injected-destination',
  ];
  assert.throws(() => assertSourceRouteContract(sourceInfo, mutatedDjangoDestination, contract, routeName));
  checks.push('unregistered Django-only destination rejected');
  const mutatedDjangoCopy = cloneInfo(djangoInfo);
  mutatedDjangoCopy.copy_blocks = [...(mutatedDjangoCopy.copy_blocks || []), 'Unregistered injected P9 copy'];
  assert.throws(() => assertSourceRouteContract(sourceInfo, mutatedDjangoCopy, contract, routeName));
  checks.push('unregistered Django-only copy rejected');
  return { route: routeName, passed: checks.length > 0, mutations_rejected: checks };
}

async function capture(browser, [slug, route, expectedStatus], viewport) {
  const page = await browser.newPage({ viewport });
  const schedulerRequestTrace = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === baseUrl && url.pathname.replace(/\/$/, '') === '/scheduler') {
      schedulerRequestTrace.push(`${request.method()} ${url.pathname}${url.search}`);
    }
  });
  await page.route(`${baseUrl}/**`, async (requestRoute) => {
    const request = requestRoute.request();
    const requestUrl = new URL(request.url());
    const headers = await request.allHeaders();
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'x-p7-fixture-reset') delete headers[name];
    }
    const resetFixture = request.method() === 'GET' && requestUrl.search === '';
    await requestRoute.continue({
      headers: resetFixture ? { ...headers, 'x-p7-fixture-reset': '1' } : headers,
    });
  });
  const consoleErrors = [];
  const failedRequests = [];
  const responses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl) responses.push({ path: url.pathname, status: response.status() });
  });

  if (route === '/activitylog') await page.clock.setFixedTime(new Date(activityClock));
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), expectedStatus, `${route} should return ${expectedStatus}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const info = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.innerText.trim() || null,
    filled_titles: [...document.querySelectorAll('article.card > .text-lg')].map((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        text: element.innerText,
        color: style.color,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        title_color: getComputedStyle(element.querySelector('span') || element).color,
      };
    }),
    document_width: document.documentElement.scrollWidth,
    viewport_width: document.documentElement.clientWidth,
    has_react_root: Boolean(document.querySelector('#root,[data-reactroot]')),
    has_react_bootstrap: [...document.scripts].some((script) =>
      script.type === 'module' || /\/assets\/index-/.test(script.src)),
  }));
  const expectedNotFoundDiagnostic =
    expectedStatus === 404 &&
    consoleErrors.length === 1 &&
    consoleErrors[0] === 'Failed to load resource: the server responded with a status of 404 (Not Found)';
  assert.deepEqual(
    expectedNotFoundDiagnostic ? [] : consoleErrors,
    [],
    `${route} should not emit unexpected browser errors`,
  );
  assert.deepEqual(failedRequests, [], `${route} should not fail network requests`);
  assert.ok(responses.filter((item) => item.path.startsWith('/static/')).every((item) => item.status < 400));
  assert.equal(info.document_width > info.viewport_width, false, `${route} should not overflow`);
  assert.equal(info.has_react_root, false, `${route} must not mount React`);
  assert.equal(info.has_react_bootstrap, false, `${route} must not load the React bundle`);
  if (expectedStatus === 200) assert.ok(info.heading, `${route} should render its heading`);
  if (route === '/filledtemplates' && expectedStatus === 200) {
    const templateTitle = page.locator('article.card .text-lg').first();
    try {
      await templateTitle.waitFor({ state: 'visible', timeout: 5000 });
    } catch (error) {
      const state = await page.evaluate(() => ({
        title: document.title,
        heading: document.querySelector('h1')?.innerText.trim() || null,
        body: document.body.innerText.slice(0, 1200),
        cards: [...document.querySelectorAll('article.card')].map((card) => {
          const title = card.querySelector('.text-lg');
          const style = title ? getComputedStyle(title) : null;
          const bounds = title?.getBoundingClientRect();
          return {
            text: title?.innerText || null,
            display: style?.display || null,
            visibility: style?.visibility || null,
            opacity: style?.opacity || null,
            bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
          };
        }),
      }));
      throw new Error(`Filled Templates initial title was not visible: ${JSON.stringify(state)}; ${error.message}`);
    }
    assert.equal(await templateTitle.innerText(), 'Patient intake');
  }

  const screenshot = `${slug}-${viewport.name}.png`;
  await page.screenshot({ path: path.join(output, screenshot), fullPage: false });
  const djangoMarkup = await page.content();
  const djangoDigest = crypto.createHash('sha256').update(djangoMarkup).digest('hex');
  const sourceMarkup = currentOnly ? '' : await fs.readFile(path.join(sourceOutput, `${slug}-${viewport.name}.html`), 'utf8');
  const sourceDigest = currentOnly ? null : crypto.createHash('sha256').update(sourceMarkup).digest('hex');
  const sourceCapturePage = currentOnly ? null : sourceReferencePages.find((item) =>
    new URL(item.route, baseUrl).pathname === new URL(route, baseUrl).pathname
      && item.viewport?.name === viewport.name,
  );
  if (!currentOnly) {
    assert.ok(sourceCapturePage, `${route} ${viewport.name} must exist in source run ${referenceRun}`);
    assert.equal(sourceCapturePage.source_html_sha256, sourceDigest,
      `${route} ${viewport.name} source HTML does not match the recorded source-run digest`);
  }
  const sourceInfo = currentOnly ? {
    heading: null,
    section_headings: [],
    field_names: [],
    field_descriptors: [],
    button_labels: [],
    link_labels: [],
    label_texts: [],
    local_destinations: [],
    text: '',
    copy_blocks: [],
  } : await page.evaluate((markup) => {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    const target = parsed.querySelector('main') || parsed.querySelector('#root') || parsed.body;
    target.querySelectorAll('script,style,svg,.sr-only,[aria-hidden="true"]').forEach((item) => item.remove());
    const labelText = (label) => {
      const copy = label.cloneNode(true);
      copy.querySelectorAll('input,select,textarea,button').forEach((control) => control.remove());
      return copy.textContent.replace(/\s+/g, ' ').trim();
    };
    return {
      heading: target.querySelector('h1')?.textContent?.trim() || null,
      section_headings: [...target.querySelectorAll('h2,h3')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
      field_names: [...target.querySelectorAll('input,select,textarea')]
        .map((item) => item.getAttribute('name') || item.getAttribute('data-setting') || item.getAttribute('data-setting-array') || '')
        .filter(Boolean).sort(),
      field_descriptors: [...target.querySelectorAll('input,select,textarea')].map((item) => {
        const labels = [...(item.labels || [])].map(labelText).filter(Boolean);
        const explicitLabelNode = item.id
          ? [...target.querySelectorAll('label[for]')].find((label) => label.htmlFor === item.id)
          : null;
        const explicitLabel = explicitLabelNode ? labelText(explicitLabelNode) : '';
        const wrappingLabel = item.closest('label') ? labelText(item.closest('label')) : '';
        const adjacentLabel = item.previousElementSibling?.tagName === 'LABEL'
          ? labelText(item.previousElementSibling)
          : '';
        return {
          identity: item.getAttribute('name') || item.getAttribute('data-setting') || item.getAttribute('data-setting-array') || item.id || '',
          label: labels[0] || explicitLabel || wrappingLabel || adjacentLabel || item.getAttribute('aria-label') || item.getAttribute('placeholder') || '',
          type: item.type || item.tagName.toLowerCase(),
          required: item.required,
          options: item.tagName === 'SELECT' ? [...item.options].map((option) => option.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean) : [],
        };
      }).filter((item) => item.identity || item.label),
      button_labels: [...target.querySelectorAll('button,[role="button"],summary')]
        .map((item) => (item.getAttribute('aria-label') || item.textContent || item.getAttribute('title') || item.value || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .sort(),
      link_labels: [...target.querySelectorAll('a[href]')]
        .map((item) => (item.getAttribute('aria-label') || item.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean).sort(),
      label_texts: [...target.querySelectorAll('label')]
        .map((item) => item.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).sort(),
      local_destinations: [...target.querySelectorAll('a[href]')]
        .map((anchor) => {
          const url = new URL(anchor.getAttribute('href'), location.href);
          return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
        })
        .filter(Boolean)
        .sort(),
      text: target.textContent?.replace(/\s+/g, ' ').trim() || '',
      copy_blocks: [...target.querySelectorAll('p')]
        .filter((item) => !item.closest('[hidden],.hidden,[aria-hidden="true"],dialog:not([open]),li,article,[role="listitem"]'))
        .map((item) => {
          const paragraph = item.cloneNode(true);
          paragraph.querySelectorAll('a,button,input,select,textarea').forEach((control) => control.remove());
          return paragraph.innerText.replace(/\s+/g, ' ').trim();
        }).filter(Boolean),
    };
  }, sourceMarkup);
  const djangoInfo = await page.evaluate(() => {
    const target = document.querySelector('#main-content') || document.querySelector('main') || document.body;
    const copy = target.cloneNode(true);
    copy.querySelectorAll('script,style,svg,.sr-only,[aria-hidden="true"]').forEach((item) => item.remove());
    const labelText = (label) => {
      const labelCopy = label.cloneNode(true);
      labelCopy.querySelectorAll('input,select,textarea,button').forEach((control) => control.remove());
      return labelCopy.textContent.replace(/\s+/g, ' ').trim();
    };
    return {
      text: copy.textContent?.replace(/\s+/g, ' ').trim() || '',
      section_headings: [...copy.querySelectorAll('h2,h3,legend')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
      field_names: [...copy.querySelectorAll('input,select,textarea')]
        .map((item) => item.getAttribute('name') || item.getAttribute('data-setting') || item.getAttribute('data-setting-array') || '')
        .filter(Boolean).sort(),
      field_descriptors: [...copy.querySelectorAll('input,select,textarea')].map((item) => {
        const labels = [...(item.labels || [])].map(labelText).filter(Boolean);
        const explicitLabelNode = item.id
          ? [...copy.querySelectorAll('label[for]')].find((label) => label.htmlFor === item.id)
          : null;
        const explicitLabel = explicitLabelNode ? labelText(explicitLabelNode) : '';
        const wrappingLabel = item.closest('label') ? labelText(item.closest('label')) : '';
        const adjacentLabel = item.previousElementSibling?.tagName === 'LABEL'
          ? labelText(item.previousElementSibling)
          : '';
        return {
          identity: item.getAttribute('name') || item.getAttribute('data-setting') || item.getAttribute('data-setting-array') || item.id || '',
          label: labels[0] || explicitLabel || wrappingLabel || adjacentLabel || item.getAttribute('aria-label') || item.getAttribute('placeholder') || '',
          type: item.type || item.tagName.toLowerCase(),
          required: item.required,
          options: item.tagName === 'SELECT' ? [...item.options].map((option) => option.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean) : [],
        };
      }).filter((item) => item.identity || item.label),
      button_labels: [...copy.querySelectorAll('button,[role="button"],summary')]
        .map((item) => (item.getAttribute('aria-label') || item.textContent || item.getAttribute('title') || item.value || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .sort(),
      link_labels: [...copy.querySelectorAll('a[href]')]
        .map((item) => (item.getAttribute('aria-label') || item.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean).sort(),
      label_texts: [...copy.querySelectorAll('label')]
        .map((item) => item.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).sort(),
      local_destinations: [...copy.querySelectorAll('a[href]')]
        .map((anchor) => {
          const url = new URL(anchor.getAttribute('href'), location.href);
          return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
        })
        .filter(Boolean)
        .sort(),
      copy_blocks: [...copy.querySelectorAll('p')]
        .filter((item) => !item.closest('[hidden],.hidden,[aria-hidden="true"],dialog:not([open]),li,article,[role="listitem"]'))
        .map((item) => {
        const paragraph = item.cloneNode(true);
        paragraph.querySelectorAll('a,button,input,select,textarea').forEach((control) => control.remove());
        return paragraph.innerText.replace(/\s+/g, ' ').trim();
      }).filter(Boolean),
    };
  });
  const contract = ROUTE_CONTRACTS[slug];
  assert.ok(contract, `A route contract must be registered for ${slug}`);
  if (!currentOnly && contract.source_heading) {
    assert.equal(sourceInfo.heading, contract.source_heading, `${route} source heading changed without a reviewed contract`);
  }
  assertRouteContract({ ...djangoInfo, heading: info.heading }, contract, `${route} (${viewport.name})`);
  if (!currentOnly && !['filled-templates', 'activity-log'].includes(slug)) {
    assertSourceRouteContract(sourceInfo, { ...djangoInfo, heading: info.heading }, contract, `${route} (${viewport.name})`);
  }
  if (!currentOnly && viewport.name === 'desktop' && ['dashboard', 'scheduler-settings'].includes(slug)) {
    results.negative_control_checks.push(checkRealRouteNegativeControls(
      sourceInfo,
      { ...djangoInfo, heading: info.heading },
      contract,
      `${route} (${viewport.name})`,
    ));
  }
  results.route_contracts.push({
    route,
    viewport: viewport.name,
    passed: true,
    source_html_sha256: sourceDigest,
    django_html_sha256: djangoDigest,
    source_run_id: currentOnly ? null : referenceRun,
    source_worktree_digest: currentOnly ? null : sourceReferenceManifest.source_provenance.worktree_digest,
    source_heading: sourceInfo.heading,
    expected_heading: contract.heading,
    required_sections: contract.sections || [],
    required_fields: contract.fields || [],
    required_controls: contract.buttons || [],
    required_destinations: contract.destinations || [],
    accepted_source_differences: contract.accepted,
    mapped_source_sections: contract.section_map || {},
    mapped_source_fields: contract.field_map || {},
    mapped_source_field_types: contract.field_type_map || {},
    mapped_source_field_labels: contract.field_label_map || {},
    mapped_source_field_required: contract.field_required_map || {},
    mapped_source_controls: contract.control_map || {},
    source_contract: {
      sections: sourceInfo.section_headings,
      fields: sourceInfo.field_descriptors,
      buttons: sourceInfo.button_labels,
      links: sourceInfo.link_labels,
      destinations: sourceInfo.local_destinations,
      copy_blocks: sourceInfo.copy_blocks,
    },
    django_contract: {
      sections: djangoInfo.section_headings,
      fields: djangoInfo.field_descriptors,
      buttons: djangoInfo.button_labels,
      links: djangoInfo.link_labels,
      destinations: djangoInfo.local_destinations,
      copy_blocks: djangoInfo.copy_blocks,
    },
    source_feature_counts: {
      sections: sourceInfo.section_headings.length,
      fields: sourceInfo.field_descriptors.length,
      controls: sourceInfo.button_labels.length + sourceInfo.link_labels.length,
      destinations: sourceInfo.local_destinations.length,
      copy_blocks: sourceInfo.copy_blocks.length,
    },
  });
  const djangoText = djangoInfo.text;
  const wordCounts = (value) => {
    const counts = new Map();
    for (const word of value.split(/\s+/).filter(Boolean)) counts.set(word, (counts.get(word) || 0) + 1);
    return counts;
  };
  const sourceWords = wordCounts(sourceInfo.text);
  const djangoWords = wordCounts(djangoText);
  const missingWords = [];
  const addedWords = [];
  for (const [word, count] of sourceWords) {
    for (let index = djangoWords.get(word) || 0; index < count; index += 1) missingWords.push(word);
  }
  for (const [word, count] of djangoWords) {
    for (let index = sourceWords.get(word) || 0; index < count; index += 1) addedWords.push(word);
  }
  results.pages.push({
    route,
    viewport,
    response_status: response.status(),
    ...info,
    console_errors: consoleErrors,
    expected_local_404_diagnostic: expectedNotFoundDiagnostic,
    responses,
    screenshot,
    comparison: {
      source_heading: sourceInfo.heading,
      django_heading: info.heading,
      source_text_characters: sourceInfo.text.length,
      django_text_characters: djangoText.length,
      normalized_text_exact_match: sourceInfo.text === djangoText,
      source_section_headings: sourceInfo.section_headings,
      django_section_headings: djangoInfo.section_headings,
      source_field_names: sourceInfo.field_names,
      django_field_names: djangoInfo.field_names,
      source_field_names_missing_from_django: sourceInfo.field_names.filter((name) => !djangoInfo.field_names.includes(name)),
      source_button_labels: sourceInfo.button_labels,
      django_button_labels: djangoInfo.button_labels,
      source_button_labels_missing_from_django: sourceInfo.button_labels.filter((label) => !djangoInfo.button_labels.includes(label)),
      source_local_destinations: sourceInfo.local_destinations,
      django_local_destinations: djangoInfo.local_destinations,
      django_link_labels: djangoInfo.link_labels,
      source_local_destinations_missing_from_django: sourceInfo.local_destinations.filter((destination) => !djangoInfo.local_destinations.includes(destination)),
      source_text_tokens_missing_from_django: missingWords,
      django_text_tokens_added: addedWords,
    },
  });

  if (wave === 'w4') {
    await page.setExtraHTTPHeaders({ 'X-P7-Fixture-Reset': '1' });
    await page.goto(baseUrl + '/dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('voiceform_activity_11111111-1111-4111-8111-111111111111', JSON.stringify([
        { id: 'fake', type: 'form_started', title: 'Fake browser-local form', time: new Date().toISOString() },
      ]));
      localStorage.setItem('recentActivity', JSON.stringify([
        { id: 'old', type: 'form_completed', title: 'Unscoped fake form', time: new Date().toISOString() },
      ]));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const savedForm = page.locator('a[href="/filledtemplates?record=55555555-5555-4555-8555-555555555555"]');
    await savedForm.waitFor();
    assert.equal(await savedForm.count(), 1);
    assert.equal(await page.getByText('Patient intake', { exact: true }).count() > 0, true);
    assert.equal(await page.getByText('Fake browser-local form').count(), 0);
    assert.equal(await page.getByText('Unscoped fake form').count(), 0);
    assert.equal(await page.locator('[data-dashboard-recent-forms]').count(), 0);
    results.interactions.push({
      route: '/dashboard',
      state: 'Recent Forms shows the saved database record and exact-record link; localStorage examples have no effect',
    });

    await page.setExtraHTTPHeaders({ 'X-P11-Recent-Forms-Empty': '1' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('No saved forms yet. Start a voice form to see it here.', { exact: true }).waitFor();

    await page.setExtraHTTPHeaders({ 'X-P9-Filled-Error': '1' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('alert').getByText('Recent forms are temporarily unavailable.', { exact: true }).waitFor();
    assert.equal(await page.getByText('No saved forms yet. Start a voice form to see it here.', { exact: true }).count(), 0);
    results.interactions.push({
      route: '/dashboard',
      state: 'empty and unavailable saved-form queries render separate honest states',
    });
    await page.setExtraHTTPHeaders({});
  }
  if (wave === 'w4' && viewport.name === 'desktop') {

    await page.getByRole('link', { name: 'Settings', exact: true }).click();
        await page.waitForURL('**/dashboard#settings');
    await page.locator('#settings').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#settings').isVisible(), true);
    const language = page.locator('[data-dashboard-preferences] [name="language"]');
    await language.selectOption('Spanish');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('voiceform_dashboard_settings')).language), 'Spanish');
    assert.equal(await page.locator('[data-dashboard-settings-status]').innerText(), 'Preferences saved in this browser.');
    await page.screenshot({ path: path.join(output, 'dashboard-settings-desktop.png'), fullPage: false });

    await page.getByRole('link', { name: 'Team', exact: true }).click();
        await page.waitForURL('**/dashboard#team');
    await page.locator('#team').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#team').isVisible(), true);
    assert.equal(await page.locator('#dashboard-home').isVisible(), false);
    await page.screenshot({ path: path.join(output, 'dashboard-team-desktop.png'), fullPage: false });
    await page.getByRole('link', { name: 'Open reviews' }).click();
    await page.waitForURL('**/templates#collaboration');
    assert.equal(await page.locator('[data-template-collaboration]').evaluate((details) => details.open), true);
    await page.getByRole('heading', { name: 'Sent shares and review queue' }).waitFor();
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Team', exact: true }).click();
    await page.getByRole('button', { name: 'Team options' }).click();
    assert.equal(await page.locator('#team-demo').evaluate((dialog) => dialog.open), true);
    assert.match(await page.locator('#team-demo').innerText(), /Membership directories and email invitations are unavailable/);
    await page.screenshot({ path: path.join(output, 'dashboard-team-dialog-desktop.png'), fullPage: false });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#team-demo').evaluate((dialog) => dialog.open), false);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Team options');
    await page.getByRole('link', { name: 'Settings', exact: true }).focus();
    await page.keyboard.press('Enter');
        await page.waitForURL('**/dashboard#settings');
    await page.locator('#settings').waitFor({ state: 'visible' });
    await page.getByRole('link', { name: 'Team', exact: true }).focus();
    await page.keyboard.press('Enter');
        await page.waitForURL('**/dashboard#team');
    await page.locator('#team').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#team').isVisible(), true);
    results.interactions.push({ route: '/dashboard', state: 'Team and Settings navigation links work by click and keyboard activation; the team dialog closes on Escape and restores focus' });
    await page.screenshot({ path: path.join(output, 'dashboard-team-keyboard-desktop.png'), fullPage: false });
  }
  if (wave === 'w7' && slug === 'voice-autofill') {
    const useTemplate = page.getByRole('link', { name: 'Use template' });
    await useTemplate.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/AIVoiceAutoFill\?template=/);
    await page.getByRole('heading', { name: 'Your draft form' }).waitFor();
    await page.getByRole('button', { name: 'Send', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, `voice-autofill-selected-${viewport.name}.png`), fullPage: false });
    results.interactions.push({ route: '/AIVoiceAutoFill', state: `keyboard Enter activates the selected synthetic template chooser link and exposes the review, assistant, recorder, and save paths at ${viewport.name}` });
  }
  if (wave === 'w7' && slug === 'filled-templates') {
    const savedCard = page.locator('article.card').filter({ hasText: 'Patient intake' });
    await savedCard.waitFor();
    const renderedDate = await savedCard.locator('[data-local-datetime]').textContent();
    const expectedDate = await savedCard.locator('[data-local-datetime]').evaluate((element) => new Date(element.dateTime).toLocaleString());
    assert.equal(renderedDate, expectedDate, 'saved dates should use the same browser-local formatting as the React source page');
    await savedCard.getByRole('link', { name: 'View form' }).click();
    await page.waitForURL(/\/filledtemplates\?record=/);
    await page.getByText('"Sample Patient"', { exact: true }).waitFor();
    const [savedDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Download JSON' }).click(),
    ]);
    const savedDownloadPath = await savedDownload.path();
    assert.ok(savedDownloadPath, 'saved-form download should produce readable JSON bytes');
    const savedPayload = JSON.parse(await fs.readFile(savedDownloadPath, 'utf8'));
    assert.equal(savedPayload.form_data.patient_name, 'Sample Patient');
    page.once('dialog', (dialog) => dialog.accept());
    const deleteSavedForm = page.getByRole('button', { name: 'Delete form' });
    await deleteSavedForm.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Filled form deleted.').waitFor();
    await page.getByRole('heading', { name: 'No saved forms yet' }).waitFor();
    assert.equal(await page.locator('article.card').filter({ hasText: 'Patient intake' }).count(), 0);
    await page.screenshot({ path: path.join(output, `filled-templates-empty-${viewport.name}.png`), fullPage: false });
    const chooseTemplate = page.getByRole('link', { name: 'Choose a template' });
    await chooseTemplate.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/templates');
    await page.getByRole('heading', { name: 'Templates', exact: true }).waitFor();
    results.interactions.push({ route: '/filledtemplates', state: 'summary opens the exact saved record, JSON download preserves stored answers, and confirmed deletion returns to an honest empty state' });
  }
  if (wave === 'w7' && slug === 'filled-templates') {
    await page.setExtraHTTPHeaders({ 'X-P9-Filled-Error': '1' });
    const unavailableResponse = await page.goto(`${baseUrl}/filledtemplates`, { waitUntil: 'domcontentloaded' });
    assert.equal(unavailableResponse?.status(), 200);
    await page.getByRole('alert').getByText('Filled forms are temporarily unavailable.').waitFor();
    assert.equal(await page.getByRole('heading', { name: 'No saved forms yet' }).count(), 0);
    assert.equal(await page.locator('article.card').count(), 0);
    await page.screenshot({ path: path.join(output, `filled-templates-error-${viewport.name}.png`), fullPage: false });
    results.interactions.push({ route: '/filledtemplates', state: `synthetic listing failure displays safe recovery feedback and an empty state at ${viewport.name}` });
  }
  if (wave === 'w4' && viewport.name === 'mobile') {
    const drawerOpener = page.getByRole('button', { name: 'Open workspace navigation' });
    await drawerOpener.click();
    const drawer = page.locator('#mobile-navigation');
    assert.equal(await drawer.evaluate((dialog) => dialog.open), true);
    assert.equal(await drawer.getByRole('link', { name: 'Templates' }).isVisible(), true);
    await page.screenshot({ path: path.join(output, 'dashboard-navigation-drawer-mobile.png'), fullPage: false });
    await page.keyboard.press('Escape');
    assert.equal(await drawer.evaluate((dialog) => dialog.open), false);
    await page.waitForFunction(() => document.querySelector('[data-modal-open="mobile-navigation"]')?.getAttribute('aria-expanded') === 'false');
    assert.equal(await drawerOpener.getAttribute('aria-expanded'), 'false');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Open workspace navigation');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Open workspace navigation');
    await drawerOpener.click();
    await drawer.getByRole('link', { name: 'Templates' }).click();
    await page.waitForURL('**/templates');
    await page.getByRole('heading', { name: 'Templates', exact: true }).waitFor();
    results.interactions.push({ route: '/dashboard', state: 'mobile navigation drawer opens, closes on Escape with focus restored, and reaches Templates through its fixed local link' });
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await drawerOpener.click();
    await drawer.getByRole('link', { name: 'Team', exact: true }).click();
        await page.waitForURL('**/dashboard#team');
    await page.locator('#team').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#team').isVisible(), true);
    await page.waitForFunction(() => document.querySelector('#mobile-navigation')?.open === false);
    await page.screenshot({ path: path.join(output, 'dashboard-team-mobile.png'), fullPage: false });
    await drawerOpener.click();
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
        await page.waitForURL('**/dashboard#settings');
    await page.locator('#settings').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#settings').isVisible(), true);
    await page.waitForFunction(() => document.querySelector('#mobile-navigation')?.open === false);
    await drawerOpener.click();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
        await page.waitForURL('**/dashboard');
    await page.locator('#dashboard-home').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#dashboard-home').isVisible(), true);
    await page.waitForFunction(() => document.querySelector('#mobile-navigation')?.open === false);
    const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.equal(width[0] > width[1], false, 'dashboard navigation should not overflow on mobile');
    results.interactions.push({ route: '/dashboard', state: 'Home, Team and Settings are reachable from the mobile drawer without overflow' });
  }
  if (wave === 'w5' && viewport.name === 'desktop') {
    const resultsView = page.locator('[data-template-results]');
    const openTemplateActions = async (card) => {
      const disclosure = card.locator('[data-template-actions]');
      if (!await disclosure.evaluate((element) => element.open)) {
        await disclosure.locator(':scope > summary').focus();
        await page.keyboard.press('Enter');
      }
      assert.equal(await disclosure.evaluate((element) => element.open), true);
      return disclosure;
    };
    const seededCard = page.locator('article[data-template-card]').filter({
      has: page.getByRole('heading', { name: 'Patient intake', exact: true }),
    });
    const seededActions = seededCard.locator('[data-template-actions]');
    assert.equal(await seededActions.evaluate((element) => element.open), false);
    await seededActions.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await seededActions.evaluate((element) => element.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await seededActions.evaluate((element) => element.open), false);
    assert.equal(await seededActions.locator(':scope > summary').evaluate((summary) => summary === document.activeElement), true);
    const filterDisclosure = page.locator('[data-template-filters]');
    assert.equal(await filterDisclosure.evaluate((element) => element.open), false);
    await filterDisclosure.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await filterDisclosure.evaluate((element) => element.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await filterDisclosure.evaluate((element) => element.open), false);
    assert.equal(await filterDisclosure.locator(':scope > summary').evaluate((summary) => summary === document.activeElement), true);
    await page.getByRole('button', { name: 'List view' }).click();
    assert.equal(await resultsView.getAttribute('data-template-layout'), 'list');
    assert.equal(await page.getByRole('button', { name: 'List view' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Grid view' }).click();
    assert.equal(await resultsView.getAttribute('data-template-layout'), 'grid');
    assert.match(await page.locator('[data-template-path="upload"]').textContent(), /not parsed or converted into fields/i);
    const createTemplate = page.getByRole('button', { name: 'Create template' });
    await createTemplate.focus();
    await page.keyboard.press('Enter');
    const builderDialog = page.locator('#create-template');
    assert.equal(await builderDialog.evaluate((dialog) => dialog.open), true);
    assert.equal(await createTemplate.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await builderDialog.evaluate((dialog) => dialog.open), false);
    await page.waitForFunction(() => document.querySelector('[data-template-dialog-open]')?.getAttribute('aria-expanded') === 'false');
    assert.equal(await createTemplate.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Create template');
    await createTemplate.focus();
    await page.keyboard.press('Enter');
    const builder = page.locator('form[data-template-builder]').first();
    await builder.locator('[name="name"]').fill('Synthetic browser template');
    await builder.locator('[name="category"]').selectOption('healthcare');
    await builder.locator('[name="description"]').fill('Deterministic browser CRUD fixture');
    await builder.getByRole('button', { name: 'Next' }).focus();
    await page.keyboard.press('Enter');
    const manualChoice = builder.getByLabel('Build manually');
    await manualChoice.focus();
    await page.keyboard.press('Space');
    await builder.getByRole('button', { name: 'Next' }).focus();
    await page.keyboard.press('Enter');
    await builder.getByRole('button', { name: 'Save template' }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('Add at least one field before creating a voice-enabled form.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Synthetic browser template', exact: true }).count(), 0);
    const addField = page.getByRole('button', { name: 'Add field' });
    await addField.focus();
    await page.keyboard.press('Enter');
    assert.equal(await builder.locator('[data-template-flow-status]').textContent(), '', 'adding a field clears the prior empty-form validation error');
    const fields = builder.locator('[data-fields] fieldset');
    await fields.nth(0).locator('[data-property="label"]').fill('Patient name');
    const requiredField = fields.nth(0).locator('[data-property="required"]');
    await requiredField.focus();
    await page.keyboard.press('Space');
    await fields.nth(0).locator('[data-property="type"]').selectOption('text');
    await addField.focus();
    await page.keyboard.press('Enter');
    await fields.nth(1).locator('[data-property="label"]').fill('Contact method');
    await fields.nth(1).locator('[data-property="type"]').selectOption('select');
    await fields.nth(1).locator('[data-property="options"]').fill('Email\nPhone');
    const moveUp = fields.nth(1).getByRole('button', { name: 'Move up' });
    await moveUp.focus();
    await page.keyboard.press('Enter');
    assert.equal(await fields.nth(0).locator('[data-property="label"]').inputValue(), 'Contact method');
    const moveDown = fields.nth(0).getByRole('button', { name: 'Move down' });
    await moveDown.focus();
    await page.keyboard.press('Enter');
    assert.equal(await fields.nth(0).locator('[data-property="label"]').inputValue(), 'Patient name');
    const removeField = fields.nth(1).getByRole('button', { name: 'Remove field' });
    await removeField.focus();
    await page.keyboard.press('Enter');
    const payload = JSON.parse(await builder.locator('[data-form-data]').inputValue());
    assert.deepEqual(payload.fields.map(({ id, label, type, required, options }) => ({ id, label, type, required, options })), [
      { id: payload.fields[0].id, label: 'Patient name', type: 'text', required: true, options: undefined },
    ]);
    await page.screenshot({ path: path.join(output, 'templates-builder-manual-desktop.png'), fullPage: false });

    await builder.getByRole('button', { name: 'Save template' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Template created.').waitFor();
    const createdCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic browser template', exact: true }) });
    await createdCard.waitFor();
    const createdId = await createdCard.locator('input[name="template_id"]').first().inputValue();
    assert.ok(createdId);
    await openTemplateActions(createdCard);
    const editDisclosure = createdCard.locator('[data-template-edit] > summary');
    await editDisclosure.focus();
    await page.keyboard.press('Enter');
    const editForm = createdCard.locator('form[data-template-builder]').last();
    await editForm.locator('[name="name"]').fill('Synthetic browser template edited');
    await editForm.locator('[name="description"]').fill('Persisted synthetic edit');
    const saveChanges = editForm.getByRole('button', { name: 'Save changes' });
    await saveChanges.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Template saved.').waitFor();

    const editedCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic browser template edited', exact: true }) });
    await editedCard.waitFor();
    await openTemplateActions(editedCard);
    const [templateDownload] = await Promise.all([
      page.waitForEvent('download'),
      editedCard.getByRole('link', { name: 'Export template JSON' }).click(),
    ]);
    const templateExportPath = await templateDownload.path();
    assert.ok(templateExportPath);
    const templateExport = JSON.parse(await fs.readFile(templateExportPath, 'utf8'));
    assert.equal(templateExport.name, 'Synthetic browser template edited');
    assert.equal(templateExport.form_data.fields[0].label, 'Patient name');

    const duplicateButton = editedCard.getByRole('button', { name: 'Duplicate' });
    await duplicateButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Template duplicated.').waitFor();
    const duplicateName = 'Synthetic browser template edited copy';
    const duplicateCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: duplicateName, exact: true }) });
    await duplicateCard.waitFor();
    const duplicateId = await duplicateCard.locator('input[name="template_id"]').first().inputValue();
    await openTemplateActions(duplicateCard);
    const hideButton = duplicateCard.getByRole('button', { name: 'Make hidden' });
    await hideButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Template visibility updated.').waitFor();
    assert.equal(await duplicateCard.locator('.badge').filter({ hasText: 'Hidden' }).count(), 1);
    await openTemplateActions(duplicateCard);
    const showButton = duplicateCard.getByRole('button', { name: 'Make visible' });
    await showButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Template visibility updated.').waitFor();

    const filters = page.locator('form[role="search"]');
    const openTemplateFilters = async () => {
      const disclosure = filters.locator('[data-template-filters]');
      if (!await disclosure.evaluate((element) => element.open)) {
        await disclosure.locator(':scope > summary').focus();
        await page.keyboard.press('Enter');
      }
      assert.equal(await disclosure.evaluate((element) => element.open), true);
    };
    await filters.locator('[name="q"]').fill('Synthetic browser template');
    await openTemplateFilters();
    await filters.locator('[name="category"]').selectOption('healthcare');
    await filters.locator('[name="sort"]').selectOption('name-asc');
    const applyFilters = filters.getByRole('button', { name: 'Filter', exact: true });
    await applyFilters.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(/q=Synthetic\+browser\+template/);
    await page.getByRole('heading', { name: duplicateName, exact: true }).waitFor();

    const deleteDuplicate = page.locator('article.card').filter({ has: page.getByRole('heading', { name: duplicateName, exact: true }) });
    await openTemplateActions(deleteDuplicate);
    page.once('dialog', (dialog) => dialog.accept());
    const deleteDuplicateButton = deleteDuplicate.getByRole('button', { name: 'Delete' });
    await deleteDuplicateButton.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Template deleted.').waitFor();
    assert.equal(await page.getByRole('heading', { name: duplicateName, exact: true }).count(), 0);
    await filters.locator('[name="q"]').fill('no template should match this term');
    await openTemplateFilters();
    await filters.getByRole('button', { name: 'Filter', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('No templates match these filters. Create a template to get started.', { exact: true }).waitFor();
    await page.goto(`${baseUrl}/templates`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Create template' }).click();
    const uploadBuilder = page.locator('form[data-template-builder]').first();
    await uploadBuilder.locator('[name="name"]').fill('Synthetic private upload');
    await uploadBuilder.locator('[name="category"]').selectOption('healthcare');
    await uploadBuilder.getByRole('button', { name: 'Next' }).click();
    await uploadBuilder.getByLabel('Upload existing form').check();
    await uploadBuilder.getByRole('button', { name: 'Next' }).click();
    const originalFile = Buffer.from('{"source":"first synthetic file"}');
    await uploadBuilder.locator('[name="template_file"]').setInputFiles({
      name: 'source.json', mimeType: 'application/json', buffer: originalFile,
    });
    await page.screenshot({ path: path.join(output, 'templates-upload-step-desktop.png'), fullPage: false });
    await uploadBuilder.getByRole('button', { name: 'Save template' }).click();
    await page.getByRole('status').getByText('Template created. Private file saved.').waitFor();
    const uploadCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic private upload', exact: true }) });
    await uploadCard.waitFor();
    const uploadId = await uploadCard.locator('input[name="template_id"]').first().inputValue();
    await openTemplateActions(uploadCard);
    const [firstPrivateDownload] = await Promise.all([
      page.waitForEvent('download'),
      uploadCard.getByRole('button', { name: 'Download private file' }).click(),
    ]);
    assert.deepEqual(await fs.readFile(await firstPrivateDownload.path()), originalFile);
    const privateDetails = uploadCard.locator('[data-template-file]');
    await privateDetails.locator('summary').click();
    const replacementFile = Buffer.from('source,replacement\nprivate,fixture\n');
    await privateDetails.locator('[name="template_file"]').setInputFiles({
      name: 'replacement.csv', mimeType: 'text/csv', buffer: replacementFile,
    });
    await privateDetails.getByRole('button', { name: 'Upload privately' }).click();
    await page.getByRole('status').getByText('Private template file saved.').waitFor();
    const replacementCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic private upload', exact: true }) });
    await openTemplateActions(replacementCard);
    const [replacementDownload] = await Promise.all([
      page.waitForEvent('download'),
      replacementCard.getByRole('button', { name: 'Download private file' }).click(),
    ]);
    assert.deepEqual(await fs.readFile(await replacementDownload.path()), replacementFile);
    await openTemplateActions(replacementCard);
    page.once('dialog', (dialog) => dialog.accept());
    await replacementCard.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').getByText('Template deleted.').waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Synthetic private upload', exact: true }).count(), 0);

    const reviewerId = '88888888-8888-4888-8888-888888888888';
    const openDisclosureByKeyboard = async (details) => {
      const summary = details.locator(':scope > summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.equal(await details.evaluate((element) => element.open), true,
        'Enter should open the template collaboration disclosure');
      assert.equal(await summary.evaluate((element) => element === document.activeElement), true,
        'opening a template disclosure should retain focus on its summary');
      return summary;
    };
    await openTemplateActions(seededCard);
    const shareDisclosure = seededCard.locator('[data-template-actions] details')
      .filter({ hasText: 'Share with existing accounts' }).last();
    await openDisclosureByKeyboard(shareDisclosure);
    const shareForm = shareDisclosure.locator('form:has(input[name="action"][value="share"])');
    await shareForm.locator('[name="recipient_ids"]').fill(reviewerId);
    await shareForm.locator('[name="role"]').selectOption('viewer');
    await shareForm.locator('[name="message"]').fill('Synthetic P9 UI review access');
    await shareForm.getByRole('button', { name: 'Save share' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Share saved for the selected account IDs.').waitFor();

    const ownerCollaboration = page.locator('[data-template-collaboration]');
    await openDisclosureByKeyboard(ownerCollaboration);
    const sentShares = ownerCollaboration.locator('article').filter({ hasText: reviewerId });
    const sentShareForm = sentShares.locator('form:has(input[name="action"][value="share-role"])');
    await sentShareForm.locator('[name="role"]').selectOption('admin');
    await sentShareForm.getByRole('button', { name: 'Update role' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Share role updated.').waitFor();
    await openDisclosureByKeyboard(ownerCollaboration);
    await sentShareForm.locator('[name="role"]').selectOption('viewer');
    await sentShareForm.getByRole('button', { name: 'Update role' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Share role updated.').waitFor();

    const reviewerPage = await browser.newPage({ viewport });
    await reviewerPage.setExtraHTTPHeaders({ 'X-P7-Fixture-User': 'reviewer' });
    await reviewerPage.goto(`${baseUrl}/templates?p9_fixture=reviewer`, { waitUntil: 'domcontentloaded' });
    const reviewerCard = reviewerPage.locator('article[data-template-card]')
      .filter({ has: reviewerPage.getByRole('heading', { name: 'Patient intake', exact: true }) });
    await reviewerCard.waitFor();
    const reviewerActions = reviewerCard.locator('[data-template-actions]');
    await reviewerActions.locator(':scope > summary').focus();
    await reviewerPage.keyboard.press('Enter');
    assert.equal(await reviewerActions.evaluate((element) => element.open), true,
      'the shared template action menu should open for its synthetic recipient');
    const reviewerRequestDisclosure = reviewerActions.locator('details')
      .filter({ hasText: 'Request or submit a review' }).last();
    const reviewerRequestSummary = reviewerRequestDisclosure.locator(':scope > summary');
    await reviewerRequestSummary.focus();
    await reviewerPage.keyboard.press('Enter');
    assert.equal(await reviewerRequestDisclosure.evaluate((element) => element.open), true);
    assert.equal(await reviewerRequestSummary.evaluate((element) => element === document.activeElement), true);
    const requestReview = reviewerRequestDisclosure.locator('form:has(input[name="action"][value="request-review"])');
    await requestReview.getByRole('button', { name: 'Request review' }).focus();
    await reviewerPage.keyboard.press('Enter');
    await reviewerPage.getByRole('status').getByText('Review request submitted.').waitFor();

    await reviewerActions.locator(':scope > summary').focus();
    await reviewerPage.keyboard.press('Enter');
    assert.equal(await reviewerActions.evaluate((element) => element.open), true);
    const reviewerReviewDisclosure = reviewerCard.locator('details')
      .filter({ hasText: 'Reviews (1)' }).last();
    const reviewerReviewSummary = reviewerReviewDisclosure.locator(':scope > summary');
    await reviewerReviewSummary.focus();
    await reviewerPage.keyboard.press('Enter');
    assert.equal(await reviewerReviewDisclosure.evaluate((element) => element.open), true,
      'a submitted review should be disclosed in the shared template card');
    const reviewerUpdateForm = reviewerReviewDisclosure.locator('form:has(input[name="action"][value="update-review"])');
    await reviewerUpdateForm.locator('[name="rating"]').selectOption('4');
    await reviewerUpdateForm.locator('[name="comment"]').fill('Synthetic browser review feedback');
    await reviewerUpdateForm.getByRole('button', { name: 'Save my review' }).focus();
    await reviewerPage.keyboard.press('Enter');
    await reviewerPage.getByRole('status').getByText('Review updated.').waitFor();
    await reviewerPage.close();

    const ownerPage = await browser.newPage({ viewport });
    await ownerPage.goto(`${baseUrl}/templates?p9_fixture=owner`, { waitUntil: 'domcontentloaded' });
    const ownerCollaborationPanel = ownerPage.locator('[data-template-collaboration]');
    const ownerCollaborationSummary = ownerCollaborationPanel.locator(':scope > summary');
    await ownerCollaborationSummary.focus();
    await ownerPage.keyboard.press('Enter');
    const pendingReview = ownerCollaborationPanel.locator('article')
      .filter({ hasText: 'Review: Patient intake' });
    const moderateReviewForm = pendingReview.locator('form:has(input[name="action"][value="moderate-review"])');
    await moderateReviewForm.locator('[name="status"]').selectOption('approved');
    await moderateReviewForm.getByRole('button', { name: 'Save review' }).focus();
    await ownerPage.keyboard.press('Enter');
    await ownerPage.getByRole('status').getByText('Review decision saved.').waitFor();
    await ownerCollaborationSummary.focus();
    await ownerPage.keyboard.press('Enter');
    assert.equal(await ownerCollaborationPanel.evaluate((element) => element.open), true);
    await ownerPage.getByText('No reviews are waiting for a decision.', { exact: true }).waitFor();

    const ownerCard = ownerPage.locator('article[data-template-card]')
      .filter({ has: ownerPage.getByRole('heading', { name: 'Patient intake', exact: true }) });
    const ownerActions = ownerCard.locator('[data-template-actions]');
    await ownerActions.locator(':scope > summary').focus();
    await ownerPage.keyboard.press('Enter');
    const ownerReviewDisclosure = ownerCard.locator('details')
      .filter({ hasText: 'Reviews (1)' }).last();
    const ownerReviewSummary = ownerReviewDisclosure.locator(':scope > summary');
    await ownerReviewSummary.focus();
    await ownerPage.keyboard.press('Enter');
    await ownerPage.getByText('4/5 · Approved', { exact: true }).waitFor();
    await ownerPage.getByText('Synthetic browser review feedback', { exact: true }).waitFor();

    const revokeShareForm = ownerCollaborationPanel.locator('form:has(input[name="action"][value="remove-share"])');
    await revokeShareForm.getByRole('button', { name: 'Revoke' }).focus();
    await ownerPage.keyboard.press('Enter');
    await ownerPage.getByRole('status').getByText('Share removed.').waitFor();
    await ownerCollaborationSummary.focus();
    await ownerPage.keyboard.press('Enter');
    await ownerPage.getByText('No outgoing shares.', { exact: true }).waitFor();
    await ownerPage.close();

    const revokedReviewerPage = await browser.newPage({ viewport });
    await revokedReviewerPage.setExtraHTTPHeaders({ 'X-P7-Fixture-User': 'reviewer' });
    await revokedReviewerPage.goto(`${baseUrl}/templates?p9_fixture=revoked`, { waitUntil: 'domcontentloaded' });
    await revokedReviewerPage.getByText('No templates match these filters. Create a template to get started.', { exact: true }).waitFor();
    await revokedReviewerPage.close();

    results.interactions.push({
      route: '/templates',
      state: 'grid/list display, category/search/sort and empty state, three-step manual/upload flow, add/reorder/remove/required/options builder, create/edit/duplicate/visibility/confirmed-delete, JSON export bytes, private upload/download/replacement/delete bytes pass through the actual Django page with mutable synthetic fixtures',
      exported_template_name: templateExport.name,
      exported_field: templateExport.form_data.fields[0].label,
      created_id: createdId,
      duplicate_id: duplicateId,
      uploaded_template_id: uploadId,
      first_private_file_bytes_verified: originalFile.length,
      replacement_private_file_bytes_verified: replacementFile.length,
      storage_boundary: 'The browser route uses an in-memory synthetic Storage adapter; hosted route probe separately verifies real private Storage behavior.',
    });
    results.interactions.push({
      route: '/templates',
      state: 'two-account keyboard UI flow shares a template, updates and revokes a share, requests and edits a recipient review, and approves it as the owner',
      owner_fixture_id: '11111111-1111-4111-8111-111111111111',
      reviewer_fixture_id: reviewerId,
      share_and_review_boundary: 'Both accounts and every write are in-memory browser fixtures; no hosted request or email is sent.',
    });
    await page.screenshot({ path: path.join(output, 'templates-crud-complete-desktop.png'), fullPage: false });
  }
  if (wave === 'w5' && viewport.name === 'mobile') {
    await page.getByRole('button', { name: 'Create template' }).click();
    const builder = page.locator('form[data-template-builder]').first();
    await builder.locator('[name="name"]').fill('Mobile stepper fixture');
    await builder.locator('[name="category"]').selectOption('healthcare');
    const firstNext = builder.getByRole('button', { name: 'Next' });
    await firstNext.focus();
    await page.keyboard.press('Enter');
    await builder.getByLabel('Build manually').check();
    const secondNext = builder.getByRole('button', { name: 'Next' });
    await secondNext.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Add field' }).waitFor();
    assert.equal(await page.locator('[data-template-path="manual"]').isVisible(), true);
    const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.equal(width[0] > width[1], false, 'template builder stepper should not overflow on mobile');
    await page.screenshot({ path: path.join(output, 'templates-builder-mobile.png'), fullPage: false });
    const builderDialog = page.locator('#create-template');
    await page.keyboard.press('Escape');
    assert.equal(await builderDialog.evaluate((dialog) => dialog.open), false,
      'Escape should close the mobile template builder dialog');
    assert.equal(await page.getByRole('button', { name: 'Create template' }).evaluate((button) => button === document.activeElement), true,
      'closing the mobile builder should return focus to Create template');

    const mobileCard = page.locator('article[data-template-card]')
      .filter({ has: page.getByRole('heading', { name: 'Patient intake', exact: true }) });
    const mobileActions = mobileCard.locator('[data-template-actions]');
    const mobileActionsSummary = mobileActions.locator(':scope > summary');
    await mobileActionsSummary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await mobileActions.evaluate((details) => details.open), true);
    assert.equal(await mobileActionsSummary.evaluate((summary) => summary === document.activeElement), true);
    await page.screenshot({ path: path.join(output, 'templates-card-actions-mobile.png'), fullPage: true });
    await page.keyboard.press('Space');
    assert.equal(await mobileActions.evaluate((details) => details.open), false);
    assert.equal(await mobileActionsSummary.evaluate((summary) => summary === document.activeElement), true);

    const mobileFilters = page.locator('[data-template-filters]');
    const mobileFiltersSummary = mobileFilters.locator(':scope > summary');
    await mobileFiltersSummary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await mobileFilters.evaluate((details) => details.open), true);
    assert.equal(await mobileFiltersSummary.evaluate((summary) => summary === document.activeElement), true);
    await page.keyboard.press('Space');
    assert.equal(await mobileFilters.evaluate((details) => details.open), false);
    assert.equal(await mobileFiltersSummary.evaluate((summary) => summary === document.activeElement), true);

    const mobileCollaboration = page.locator('[data-template-collaboration]');
    const mobileCollaborationSummary = mobileCollaboration.locator(':scope > summary');
    await mobileCollaborationSummary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await mobileCollaboration.evaluate((details) => details.open), true);
    assert.equal(await mobileCollaborationSummary.evaluate((summary) => summary === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
      'expanded collaboration content should fit the mobile viewport');
    await page.screenshot({ path: path.join(output, 'templates-collaboration-mobile.png'), fullPage: true });
    await page.keyboard.press('Space');
    assert.equal(await mobileCollaboration.evaluate((details) => details.open), false);
    assert.equal(await mobileCollaborationSummary.evaluate((summary) => summary === document.activeElement), true);
    results.interactions.push({ route: '/templates', viewport: viewport.name, state: 'mobile builder Escape returns focus; card actions, filters, and collaboration disclosures open with Enter, close with Space, retain focus, and fit without overflow' });
  }
  if (wave === 'w6' && slug === 'scheduler' && viewport.name === 'desktop') {
    const calendarTitle = page.locator('#calendar-title');
    assert.match(await calendarTitle.innerText(), /October 2026/);
    const scheduleFilters = page.locator('form[role="search"]');
    await scheduleFilters.locator('[name="q"]').fill('patient intake');
    await scheduleFilters.locator('[name="type"]').selectOption('form_review');
    await scheduleFilters.getByRole('button', { name: 'Filter' }).click();
    await page.waitForURL(/q=patient\+intake/);
    await page.locator('section[aria-labelledby="calendar-title"] summary').filter({ hasText: 'Review patient intake' }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('type'), 'form_review');
    await scheduleFilters.locator('[name="q"]').fill('no matching schedule');
    await scheduleFilters.getByRole('button', { name: 'Filter' }).click();
    await page.getByText('No events match these filters.', { exact: true }).waitFor();
    await scheduleFilters.locator('[name="q"]').fill('');
    await scheduleFilters.locator('[name="type"]').selectOption('all');
    await scheduleFilters.getByRole('button', { name: 'Filter' }).click();
    await page.locator('section[aria-labelledby="calendar-title"] summary')
      .filter({ hasText: 'Review patient intake' })
      .waitFor({ state: 'visible' });
    const nextMonth = page.getByRole('link', { name: 'Next month' });
    await nextMonth.focus();
    await page.keyboard.press('Enter');
    assert.match(await calendarTitle.innerText(), /November 2026/);
    await page.getByRole('link', { name: 'Previous month' }).click();
    assert.match(await calendarTitle.innerText(), /October 2026/);
    await page.getByRole('link', { name: 'Today', exact: true }).click();
    await page.getByRole('link', { name: 'Week', exact: true }).click();
    assert.match(await calendarTitle.innerText(), /Oct 11/);
    await page.getByRole('link', { name: 'Previous week' }).click();
    await page.getByRole('link', { name: 'Next week' }).click();
    await page.getByRole('link', { name: 'Show week containing October 15, 2026' }).click();
    assert.match(await calendarTitle.innerText(), /Oct 11/);

    const createForm = page.locator('form:has(input[name="action"][value="create"])');
    await createForm.locator('[name="title"]').fill('Synthetic browser-created review');
    await createForm.locator('[name="type"]').selectOption('form_review');
    await createForm.locator('[name="date"]').fill('2026-10-15');
    await createForm.locator('[name="time"]').fill('14:15');
    await createForm.locator('[name="duration"]').fill('45');
    await createForm.locator('[name="priority"]').selectOption('high');
    await createForm.locator('[name="location"]').fill('Browser review room');
    await createForm.getByRole('button', { name: 'Save schedule' }).click();
    await page.getByRole('status').getByText('Schedule created.').waitFor();
    await page.getByText('Synthetic browser-created review', { exact: true }).first().waitFor();

    const editLink = page.locator('li').filter({ hasText: 'Synthetic browser-created review' }).getByRole('link', { name: 'Edit schedule' });
    const editHref = await editLink.getAttribute('href');
    assert.ok(editHref);
    const eventId = new URL(editHref, baseUrl).searchParams.get('edit');
    assert.ok(eventId);
    const editResponse = await page.goto(`${baseUrl}${editHref}`, { waitUntil: 'domcontentloaded' });
    const editForm = page.locator(`details.card form:has(input[name="event_id"][value="${eventId}"])`);
    if (!(await editForm.count())) {
      const body = (await page.locator('body').innerText()).slice(0, 1600);
      throw new Error(`Scheduler edit route did not render the created event (HTTP ${editResponse?.status()}, URL ${page.url()}, href ${editHref}, requests ${JSON.stringify(schedulerRequestTrace)}, body ${body})`);
    }
    const schedulerEditTitle = editForm.locator('[name="title"]');
    assert.equal(await schedulerEditTitle.inputValue(), 'Synthetic browser-created review');
    await schedulerEditTitle.fill('Synthetic browser-updated review');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('status').getByText('Schedule updated.').waitFor();

    const eventAction = (action) => page.locator(`form:has(input[name="event_id"][value="${eventId}"]):has(input[name="action"][value="${action}"])`);
    const openEventActions = async () => {
      const eventDetails = page.locator(`details:has(form input[name="event_id"][value="${eventId}"])`).first();
      if (!(await eventDetails.evaluate((details) => details.open))) {
        const summary = eventDetails.locator(':scope > summary');
        await summary.focus();
        await page.keyboard.press('Enter');
        assert.equal(await summary.evaluate((element) => element === document.activeElement), true,
          'opening a Scheduler event disclosure should retain keyboard focus');
      }
      assert.equal(await eventDetails.evaluate((details) => details.open), true);
    };
    await openEventActions();
    await eventAction('complete').getByRole('button', { name: 'Complete' }).click();
    await page.getByRole('status').getByText('Schedule marked completed.').waitFor();
    await openEventActions();
    await eventAction('cancel').getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('status').getByText('Schedule marked cancelled.').waitFor();
    await openEventActions();
    page.once('dialog', (dialog) => dialog.accept());
    await eventAction('delete').getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').getByText('Schedule deleted.').waitFor();
    await page.goto(`${baseUrl}/scheduler?view=week`, { waitUntil: 'domcontentloaded' });
    const emptyCreateForm = page.locator('form:has(input[name="action"][value="create"])');
    const emptyTitle = emptyCreateForm.locator('[name="title"]');
    await emptyTitle.fill('');
    const invalidSubmit = emptyCreateForm.getByRole('button', { name: 'Save schedule' });
    await invalidSubmit.focus();
    await page.keyboard.press('Enter');
    assert.equal(await emptyTitle.evaluate((field) => field.validity.valueMissing), true, 'required schedule title blocks keyboard submission');
    results.interactions.push({ route: '/scheduler', state: 'search/type filters and empty state, month/week navigation, Today/date selection, create/edit/complete/cancel/confirmed-delete, keyboard required-field validation, upcoming events, and statistics work with a mutable synthetic schedule' });
    await page.getByRole('link', { name: 'Week', exact: true }).click();
    assert.match(await calendarTitle.innerText(), /Oct 11/);
    await page.screenshot({ path: path.join(output, 'scheduler-week-desktop.png'), fullPage: false });
  }
  if (wave === 'w6' && slug === 'scheduler' && viewport.name === 'mobile') {
    const calendarTitle = page.locator('#calendar-title');
    assert.match(await calendarTitle.innerText(), /October 2026/);
    const nextMonth = page.getByRole('link', { name: 'Next month' });
    await nextMonth.focus();
    await page.keyboard.press('Enter');
    assert.match(await calendarTitle.innerText(), /November 2026/);
    await page.getByRole('link', { name: 'Previous month' }).focus();
    await page.keyboard.press('Enter');
    assert.match(await calendarTitle.innerText(), /October 2026/);
    await page.getByRole('link', { name: 'Week', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.match(await calendarTitle.innerText(), /Oct 11/);
    await page.getByRole('link', { name: 'Show week containing October 12, 2026' }).focus();
    await page.keyboard.press('Enter');
    assert.match(await calendarTitle.innerText(), /Oct 11/);

    const eventDetails = page.locator('section[aria-labelledby="calendar-title"] details')
      .filter({ hasText: 'Review patient intake' }).first();
    const eventSummary = eventDetails.locator(':scope > summary');
    await eventSummary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await eventDetails.evaluate((details) => details.open), true,
      'Enter should expand the mobile calendar event summary');
    assert.equal(await eventSummary.evaluate((summary) => summary === document.activeElement), true);
    await page.screenshot({ path: path.join(output, 'scheduler-event-details-mobile.png'), fullPage: true });

    const editDetails = eventDetails.locator('details').filter({ hasText: 'Edit schedule' }).first();
    const editSummary = editDetails.locator(':scope > summary');
    await editSummary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await editDetails.evaluate((details) => details.open), true,
      'Enter should expand the mobile schedule edit form');
    assert.equal(await editSummary.evaluate((summary) => summary === document.activeElement), true);
    await page.keyboard.press('Space');
    assert.equal(await editDetails.evaluate((details) => details.open), false,
      'Space should close the mobile schedule edit form');
    assert.equal(await editSummary.evaluate((summary) => summary === document.activeElement), true);
    await eventSummary.focus();
    await page.keyboard.press('Space');
    assert.equal(await eventDetails.evaluate((details) => details.open), false,
      'Space should collapse the mobile calendar event summary');
    assert.equal(await eventSummary.evaluate((summary) => summary === document.activeElement), true);

    const createForm = page.locator('form:has(input[name="action"][value="create"])');
    const emptyTitle = createForm.locator('[name="title"]');
    await emptyTitle.fill('');
    const invalidSubmit = createForm.getByRole('button', { name: 'Save schedule' });
    await invalidSubmit.focus();
    await page.keyboard.press('Enter');
    assert.equal(await emptyTitle.evaluate((field) => field.validity.valueMissing), true,
      'required schedule title blocks mobile keyboard submission');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
      'mobile scheduler keyboard states should not overflow');
    results.interactions.push({ route: '/scheduler', viewport: viewport.name, state: 'keyboard month/week/date navigation, nested event/edit disclosures, required-field validation, and focus retention pass at 390px' });
  }
  if (wave === 'w6' && slug === 'manage-schedules') {
    const sortDisclosure = page.locator('form[role="search"] details').filter({ hasText: 'Sort results' });
    const sortSummary = sortDisclosure.locator(':scope > summary');
    await sortSummary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await sortDisclosure.evaluate((details) => details.open), true,
      'Enter should open the Sort results disclosure');
    assert.equal(await sortSummary.evaluate((summary) => summary === document.activeElement), true,
      'keyboard focus should remain on the Sort results summary');
    await page.screenshot({ path: path.join(output, `manage-schedules-sort-disclosure-${viewport.name}.png`), fullPage: false });
    await page.keyboard.press('Space');
    assert.equal(await sortDisclosure.evaluate((details) => details.open), false,
      'Space should close the Sort results disclosure');
    assert.equal(await sortSummary.evaluate((summary) => summary === document.activeElement), true,
      'closing the disclosure should retain keyboard focus on its summary');
    results.interactions.push({
      route: '/manage-schedules',
      viewport: viewport.name,
      state: 'Sort results disclosure opens with Enter and closes with Space while retaining focus on its summary',
    });
  }
  if (wave === 'w6' && slug === 'manage-schedules' && viewport.name === 'desktop') {
    assert.equal(await page.getByRole('link', { name: 'Scheduler settings' }).getAttribute('href'), '/scheduler-settings');
    assert.equal(await page.getByRole('link', { name: 'Edit in scheduler' }).getAttribute('href'), '/scheduler?edit=44444444-4444-4444-8444-444444444444');
    assert.equal(await page.getByText('Private schedule for another account', { exact: true }).count(), 0);
    const seedRow = page.locator('tbody tr').filter({ hasText: 'Review patient intake' });
    const rowDetails = seedRow.locator('details').first();
    await rowDetails.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await rowDetails.evaluate((details) => details.open), true);
    await rowDetails.locator('[name="duration"]').fill('45');
    await rowDetails.getByRole('button', { name: 'Save' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('Schedule updated.').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('tbody td')].some((cell) => cell.textContent.includes('(45m)')));
    const filters = page.locator('form[role="search"]');
    await filters.locator('[name="q"]').fill('Review patient intake');
    await filters.locator('[name="type"]').selectOption('form_review');
    await filters.locator('[name="status"]').selectOption('scheduled');
    const sortDisclosure = filters.locator('details').filter({ hasText: 'Sort results' });
    await sortDisclosure.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await sortDisclosure.evaluate((details) => details.open), true);
    await filters.locator('[name="sort"]').selectOption('title');
    await filters.locator('[name="order"]').selectOption('desc');
    await filters.getByRole('button', { name: 'Apply filters' }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('Review patient intake', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Review patient intake');
    const selection = page.getByRole('checkbox', { name: 'Select Review patient intake' });
    await selection.focus();
    await page.keyboard.press('Space');
    const bulkForm = page.locator('#bulk-schedules');
    await bulkForm.evaluate((form) => {
      const foreign = document.createElement('input');
      foreign.type = 'hidden';
      foreign.name = 'selected_ids';
      foreign.value = '66666666-6666-4666-8666-666666666666';
      form.append(foreign);
    });
    await page.locator('#bulk-action').selectOption('complete');
    page.once('dialog', (dialog) => dialog.accept());
    await bulkForm.getByRole('button', { name: 'Apply' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('alert').getByText('The selected schedules could not be updated. Review the selection and try again.').waitFor();
    await page.getByRole('cell', { name: 'Scheduled', exact: true }).waitFor();

    await page.goto(`${baseUrl}/manage-schedules?q=Review%20patient%20intake&type=form_review&status=scheduled&sort=title&order=desc`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).focus();
    await page.keyboard.press('Space');
    await page.locator('#bulk-action').selectOption('export');
    page.once('dialog', (dialog) => dialog.accept());
    const [scheduleDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).focus().then(() => page.keyboard.press('Enter')),
    ]);
    const exportPath = await scheduleDownload.path();
    assert.ok(exportPath);
    const exportData = JSON.parse(await fs.readFile(exportPath, 'utf8'));
    assert.equal(exportData.events.length, 1);
    assert.equal(exportData.events[0].title, 'Review patient intake');

    await page.goto(`${baseUrl}/manage-schedules?q=Review%20patient%20intake&type=form_review&status=all&sort=title&order=desc`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).focus();
    await page.keyboard.press('Space');
    await page.locator('#bulk-action').selectOption('complete');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('1 schedules updated.').waitFor();
    await page.getByRole('cell', { name: 'Completed', exact: true }).waitFor();

    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).focus();
    await page.keyboard.press('Space');
    await page.locator('#bulk-action').selectOption('cancel');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').getByText('1 schedules updated.').waitFor();
    await page.getByRole('cell', { name: 'Cancelled', exact: true }).waitFor();

    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).focus();
    await page.keyboard.press('Space');
    await page.locator('#bulk-action').selectOption('delete');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).focus();
    await page.keyboard.press('Enter');
    await page.getByText('No schedules match these filters.', { exact: true }).waitFor();
    results.interactions.push({ route: '/manage-schedules', state: 'keyboard row edit, search/type/status/sort filters, source edit/settings destinations, mixed-owner rejection before mutation, export bytes, bulk complete/cancel/delete, and empty result pass' });
    await page.screenshot({ path: path.join(output, 'manage-schedules-empty-desktop.png'), fullPage: false });
  }
  if (wave === 'w6' && slug === 'scheduler-settings' && viewport.name === 'mobile') {
    const tabs = page.getByRole('tab');
    const tabNames = ['Scheduling', 'Calendar display', 'Notifications', 'Connections & privacy'];
    assert.equal(await tabs.count(), tabNames.length);
    assert.equal(await page.getByRole('tablist').getAttribute('aria-orientation'), 'horizontal');
    for (const name of tabNames) {
      assert.equal(await page.getByRole('tab', { name }).isVisible(), true, name + ' section must be visible on mobile');
    }
    const firstTab = page.getByRole('tab', { name: tabNames[0] });
    await firstTab.focus();
    for (const name of tabNames.slice(1)) {
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), name);
      assert.equal(await page.getByRole('tab', { name }).getAttribute('aria-selected'), 'true');
    }
    assert.equal(await page.locator('[data-settings-panel="connections"]').isVisible(), true);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), tabNames[0], 'mobile tab movement should wrap');
    assert.equal(await firstTab.getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.screenshot({ path: path.join(output, 'scheduler-settings-mobile.png'), fullPage: false });
    results.interactions.push({ route: '/scheduler-settings', viewport: 'mobile', state: 'four responsive settings sections are visible, selectable by horizontal arrow keys, and fit the viewport' });
  }
  if (wave === 'w6' && slug === 'scheduler-settings' && viewport.name === 'desktop') {
    const tabNames = ['Scheduling', 'Calendar display', 'Notifications', 'Connections & privacy'];
    const tabs = page.getByRole('tab');
    assert.equal(await tabs.count(), tabNames.length);
    assert.equal(await page.getByRole('tablist').getAttribute('aria-orientation'), 'vertical');
    for (const name of tabNames) {
      const tab = page.getByRole('tab', { name });
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      const panelId = await tab.getAttribute('aria-controls');
      assert.equal(await page.locator('#' + panelId).isVisible(), true);
      assert.equal(await tab.getAttribute('id'), await page.locator('#' + panelId).getAttribute('aria-labelledby'));
    }
    const scheduleTab = page.getByRole('tab', { name: 'Scheduling' });
    await scheduleTab.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('tab', { name: 'Calendar display' }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await scheduleTab.getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { name: 'Connections & privacy' }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowDown');
    assert.equal(await scheduleTab.getAttribute('aria-selected'), 'true');
    await scheduleTab.click();

    const keyElement = page.locator('[data-settings-key]');
    const settingsKey = await keyElement.getAttribute('data-settings-key');
    assert.match(settingsKey, /^scheduler_settings_/);
    assert.equal(await keyElement.getAttribute('data-settings-user-id'), null, 'the DOM and exported preferences must not expose an account identifier');
    assert.equal(await page.locator('[data-settings-status]').isVisible(), true, 'save and error feedback must be visible');
    assert.equal(await page.locator('[data-settings-dirty]').isVisible(), false);
    assert.equal(await page.locator('[data-settings-save]').isDisabled(), true);
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '60');

    const serviceRequests = [];
    page.on('request', (request) => {
      if (['fetch', 'xhr'].includes(request.resourceType())) serviceRequests.push(request.url());
    });
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), null);
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Using local defaults. Changes preview only.');
    await page.screenshot({ path: path.join(output, 'scheduler-settings-desktop.png'), fullPage: false });

    await page.locator('[data-setting="defaultDuration"]').fill('75');
    await page.locator('[data-setting="defaultReminderMinutes"]').selectOption('0');
    await page.locator('[data-setting="workingHours.start"]').fill('10:00');
    await page.locator('[data-setting="workingHours.end"]').fill('16:00');
    for (const day of ['tuesday', 'wednesday', 'thursday', 'friday']) {
      await page.locator('[data-setting-array="workingDays"][value="' + day + '"]').uncheck();
    }
    assert.equal(await page.locator('[data-settings-dirty]').isVisible(), true);
    assert.equal(await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }), true, 'a dirty draft warns before leaving the page');
    assert.match(await page.locator('[data-preview-event-time]').innerText(), /1 hr 15 min/);
    assert.equal(await page.locator('[data-preview-reminder]').innerText(), 'No reminder in this example');
    assert.equal(await page.locator('[data-preview-hours]').innerText(), '10:00–16:00');
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), null,
      'editing updates the fictional preview but not saved browser state');

    await page.getByRole('tab', { name: 'Calendar display' }).click();
    await page.locator('[data-setting="defaultView"]').selectOption('week');
    assert.equal(await page.locator('[data-preview-title]').innerText(), 'Example week');
    assert.equal(await page.locator('[data-preview-weekdays] span').first().innerText(), 'MO');
    await page.locator('[data-setting="weekStartsOn"]').selectOption('0');
    assert.equal(await page.locator('[data-preview-weekdays] span').first().innerText(), 'SU');
    await page.locator('[data-setting="showWeekends"]').uncheck();
    assert.equal(await page.locator('[data-preview-weekdays] span').count(), 5);
    assert.equal(await page.locator('[data-preview-calendar] > div').count(), 5,
      'disabling weekends should remove weekend columns from the sample week');
    await page.locator('[data-setting="compactView"]').check();
    assert.equal(await page.locator('[data-preview-event]').evaluate((element) => element.classList.contains('p-2')), true);

    await page.getByRole('tab', { name: 'Notifications' }).click();
    assert.equal(await page.getByText('Email reminders', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Unavailable', { exact: true }).count(), 4);
    assert.equal(await page.locator('[data-setting^="email"],[data-setting^="push"],[data-setting^="google"],[data-setting^="outlook"]').count(), 0);
    await page.getByRole('tab', { name: 'Connections & privacy' }).click();
    assert.equal(await page.getByText('Not connected', { exact: true }).count(), 2);

    await page.locator('[data-settings-save]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Settings saved in this browser on this device.');
    assert.equal(await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }), false, 'a saved draft no longer warns before leaving');
    let stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey));
    assert.equal(stored.schema_version, 1);
    assert.deepEqual(Object.keys(stored).sort(), ['schema_version', 'settings']);
    assert.equal(stored.settings.defaultDuration, 75);
    assert.equal(stored.settings.defaultReminderMinutes, 0);
    assert.equal(stored.settings.workingHours.start, '10:00');
    assert.deepEqual(stored.settings.workingDays, ['monday']);
    assert.equal(stored.settings.weekStartsOn, 0);
    assert.equal(stored.settings.compactView, true);
    assert.deepEqual(serviceRequests, [], 'Settings save must not call scheduler, activity, or provider services');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '75');
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Saved settings loaded from this browser. Changes preview only.');
    assert.equal(await page.locator('[data-preview-title]').innerText(), 'Example week');

    await page.locator('[data-setting-array="workingDays"][value="monday"]').uncheck();
    assert.equal(await page.locator('[data-preview-days]').innerText(), 'No working days selected');
    assert.match(await page.locator('[data-preview-event-time]').innerText(), /No sample event/);
    assert.equal(await page.locator('[data-preview-calendar] .bg-blue-700').count(), 0,
      'an empty workweek should show availability without inventing an event');
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).settings.workingDays.length, settingsKey), 1);
    await page.locator('[data-settings-discard]').click();
    assert.equal(await page.locator('[data-preview-days]').innerText(), 'Monday');

    await page.locator('[data-settings-import]').setInputFiles({
      name: 'legacy-wrapper.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ exported_at: '2026-01-01T00:00:00Z', user_id: 'another-account', settings: { defaultDuration: 105, workingDays: [] } })),
    });
    await page.getByText('Settings imported into the draft. Review it, then save to keep the changes.').waitFor();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '105');
    assert.equal(await page.locator('[data-preview-days]').innerText(), 'No working days selected');
    assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey)).settings.defaultDuration, 75,
      'an import must leave saved settings unchanged until Save');
    await page.locator('[data-settings-save]').click();
    stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey));
    assert.equal(stored.settings.defaultDuration, 105);
    assert.deepEqual(stored.settings.workingDays, []);

    await page.locator('[data-settings-import]').setInputFiles({
      name: 'legacy-raw.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ defaultDuration: 90, defaultView: 'week', timezone: 'America/New_York' })),
    });
    await page.getByText('Settings imported into the draft. Review it, then save to keep the changes.').waitFor();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '90');
    assert.equal(await page.locator('[data-setting="defaultView"]').inputValue(), 'week');
    const beforeExport = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-settings-export]').click(),
    ]);
    const downloadPath = await download.path();
    assert.ok(downloadPath, 'settings export should produce readable bytes');
    const exported = JSON.parse(await fs.readFile(downloadPath, 'utf8'));
    assert.deepEqual(Object.keys(exported).sort(), ['schema_version', 'settings']);
    assert.equal(exported.schema_version, 1);
    assert.equal(exported.settings.defaultDuration, 90, 'export should use the current draft');
    assert.equal(exported.settings.defaultView, 'week');
    assert.equal(Object.hasOwn(exported, 'user_id'), false);
    assert.equal(Object.hasOwn(exported.settings, 'timezone'), false, 'retired legacy settings are not re-exported');
    assert.deepEqual(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey)), beforeExport,
      'export must not persist the draft');

    const beforeInvalidDraft = await page.locator('[data-setting="defaultDuration"]').inputValue();
    const savedBeforeInvalid = await page.evaluate((key) => localStorage.getItem(key), settingsKey);
    await page.locator('[data-settings-import]').setInputFiles({
      name: 'invalid-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ settings: { defaultDuration: 0 } })),
    });
    await page.getByText('Choose a duration from 15 to 10,080 minutes in 15-minute steps.', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), beforeInvalidDraft,
      'invalid imports must not partially update the draft');
    await page.locator('[data-settings-import]').setInputFiles({
      name: 'future-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ schema_version: 2, settings: { defaultDuration: 120 } })),
    });
    await page.getByText('This settings file uses a newer format. Update VoiceForm before importing it.', { exact: true }).waitFor();
    await page.locator('[data-settings-import]').setInputFiles({
      name: 'oversized-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.alloc(100001, 'x'),
    });
    await page.getByText('Settings file is too large. Choose a file smaller than 100 KB.', { exact: true }).waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalid);

    await page.locator('[data-setting="defaultDuration"]').fill('0');
    assert.equal(await page.locator('[data-settings-error="defaultDuration"]').innerText(), 'Choose a duration from 15 to 10,080 minutes in 15-minute steps.');
    await page.locator('[data-settings-save]').click();
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Fix the highlighted fields before saving.');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-setting')), 'defaultDuration');
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalid);
    await page.locator('[data-setting="defaultDuration"]').fill('90');
    await page.locator('[data-setting="workingHours.start"]').fill('18:00');
    await page.locator('[data-setting="workingHours.end"]').fill('17:00');
    await page.locator('[data-settings-save]').click();
    assert.equal(await page.locator('[data-settings-error="workingHours.end"]').innerText(), 'End time must be later than start time.');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-setting')), 'workingHours.end');
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalid);
    await page.locator('[data-settings-discard]').click();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '105');
    assert.equal(await page.locator('[data-setting="workingHours.start"]').inputValue(), '10:00');
    assert.equal(await page.locator('[data-settings-dirty]').isVisible(), false);

    await page.locator('[data-setting="defaultDuration"]').fill('90');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('[data-settings-reset]').click();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '60');
    assert.equal(await page.locator('[data-settings-dirty]').isVisible(), true);
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).settings.defaultDuration, settingsKey), 105,
      'Reset changes the draft and does not overwrite saved preferences');
    await page.locator('[data-settings-save]').click();
    assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey)).settings.defaultDuration, 60);

    const storageContext = await browser.newContext({ viewport });
    const storagePage = await storageContext.newPage();
    await storagePage.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem() { throw new Error('synthetic storage read denied'); },
          setItem() { throw new Error('synthetic storage write denied'); },
        },
      });
    });
    await storagePage.goto(baseUrl + '/scheduler-settings', { waitUntil: 'domcontentloaded' });
    await storagePage.getByText(/Saved settings could not be read.*synthetic storage read denied/).waitFor();
    await storagePage.locator('[data-setting="defaultDuration"]').fill('45');
    await storagePage.locator('[data-settings-save]').click();
    await storagePage.getByText(/Settings could not be saved.*synthetic storage write denied/).waitFor();
    assert.equal(await storagePage.locator('[data-setting="defaultDuration"]').inputValue(), '45');
    assert.equal(await storagePage.locator('[data-settings-dirty]').isVisible(), true);
    await storageContext.close();

    const quotaContext = await browser.newContext({ viewport });
    const quotaPage = await quotaContext.newPage();
    await quotaPage.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem() { return null; },
          setItem() { throw new DOMException('synthetic quota limit', 'QuotaExceededError'); },
        },
      });
    });
    await quotaPage.goto(baseUrl + '/scheduler-settings', { waitUntil: 'domcontentloaded' });
    await quotaPage.locator('[data-setting="defaultDuration"]').fill('45');
    await quotaPage.locator('[data-settings-save]').click();
    await quotaPage.getByText(/QuotaExceededError|synthetic quota limit/).waitFor();
    assert.equal(await quotaPage.locator('[data-settings-dirty]').isVisible(), true);
    await quotaContext.close();

    const corruptContext = await browser.newContext({ viewport });
    const corruptPage = await corruptContext.newPage();
    await corruptPage.addInitScript(() => {
      localStorage.setItem('scheduler_settings_11111111-1111-4111-8111-111111111111', '{');
    });
    await corruptPage.goto(baseUrl + '/scheduler-settings', { waitUntil: 'domcontentloaded' });
    await corruptPage.getByText(/Saved settings could not be read/).waitFor();
    await corruptPage.locator('[data-setting="defaultDuration"]').fill('45');
    await corruptPage.locator('[data-settings-save]').click();
    assert.equal(JSON.parse(await corruptPage.evaluate(() => localStorage.getItem('scheduler_settings_11111111-1111-4111-8111-111111111111'))).schema_version, 1,
      'a corrupt value is replaced only after an explicit successful Save');
    await corruptContext.close();

    results.interactions.push({
      route: '/scheduler-settings',
      viewport: 'desktop',
      state: 'four accessible sections, every preview control, unsaved/discard/reset, versioned save/reload, both legacy import formats, identity-free draft export, atomic invalid/future/oversized rejection, empty workweek, invalid field focus, corrupt/denied/quota storage recovery, and zero service requests pass',
      download_name: download.suggestedFilename(),
      verified_fields: ['defaultDuration', 'defaultReminderMinutes', 'workingHours', 'workingDays', 'defaultView', 'weekStartsOn', 'showWeekends', 'compactView'],
    });
  }
  if (wave === 'w7' && slug === 'activity-log') {
    const rows = page.locator('[data-activity-list] li');
    assert.equal(await rows.count(), 5);
    assert.equal(await page.locator('[data-activity-root]').count(), 0);
    const activityList = page.locator('[data-activity-list]');
    assert.equal(await activityList.getByText('Forms', { exact: true }).count(), 1);
    assert.equal(await activityList.getByText('Templates', { exact: true }).count(), 1);
    assert.equal(await activityList.getByText('Sharing', { exact: true }).count(), 1);
    assert.equal(await activityList.getByText('Reviews', { exact: true }).count(), 1);
    assert.equal(await activityList.getByText('Schedules', { exact: true }).count(), 1);

    await page.evaluate(() => {
      localStorage.setItem('voiceform_activity_11111111-1111-4111-8111-111111111111', JSON.stringify([
        { id: 'fake', type: 'form_completed', title: 'Fake browser activity', time: new Date().toISOString() },
      ]));
      localStorage.setItem('recentActivity', JSON.stringify([
        { id: 'old', type: 'form_completed', title: 'Unscoped fake activity', time: new Date().toISOString() },
      ]));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('[data-activity-list] li').count(), 5);
    assert.equal(await page.getByText('Fake browser activity').count(), 0);
    assert.equal(await page.getByText('Unscoped fake activity').count(), 0);

    await page.locator('[data-activity-filter] [name="q"]').fill('no matching activity');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByRole('heading', { name: 'No activity found' }).waitFor();
    assert.equal(await page.locator('[data-activity-list] li').count(), 0);
    await page.screenshot({ path: path.join(output, 'activity-empty-filter-desktop.png'), fullPage: false });

    await page.goto(baseUrl + '/activitylog', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-activity-filter] [name="type"]').selectOption('forms');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByText('Form saved', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-activity-list] li').count(), 1);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Remove from activity' }).click();
    await page.getByRole('status').getByText('Activity entry removed.', { exact: false }).waitFor();
    assert.equal(await page.locator('[data-activity-list] li').count(), 0);
    await page.screenshot({ path: path.join(output, 'activity-removed-desktop.png'), fullPage: false });

    await page.goto(baseUrl + '/dashboard', { waitUntil: 'domcontentloaded' });
    const savedForm = page.locator('a[href="/filledtemplates?record=55555555-5555-4555-8555-555555555555"]');
    await savedForm.waitFor();
    assert.equal(await savedForm.count(), 1, 'removing activity leaves the saved form available');
    results.interactions.push({
      route: '/activitylog',
      state: 'server-rendered activity categories and filters work; browser-local examples do not affect entries; confirmed activity removal leaves the saved form intact',
    });

    await page.setExtraHTTPHeaders({ 'X-P7-Fixture-User': 'reviewer' });
    await page.goto(baseUrl + '/activitylog', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'No activity found' }).waitFor();
    assert.equal(await page.locator('[data-activity-list] li').count(), 0);
    assert.deepEqual(consoleErrors, [], 'activity interactions should not emit browser errors');
    results.interactions.push({
      route: '/activitylog',
      state: 'a separate synthetic account receives an honest empty activity state',
    });
  }  await page.close();
}

async function checkSettingsWithoutJavaScript(browser) {
  const page = await browser.newPage({
    viewport: { width: 320, height: 844 },
    javaScriptEnabled: false,
  });
  const response = await page.goto(`${baseUrl}/scheduler-settings`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  assert.equal(await page.getByRole('heading', { name: 'Scheduler Settings', level: 1 }).count(), 1);
  await page.getByText(/JavaScript is needed to load your saved preferences, update the preview, import, or save\./).waitFor();
  for (const [href, label] of [
    ['/scheduler', 'Back to scheduler'],
    ['/privacy', 'Privacy'],
    ['/security', 'Security'],
    ['/documentation', 'Documentation'],
  ]) {
    const link = page.locator(`noscript a[href="${href}"]`);
    assert.equal(await link.count(), 1, `${label} fallback link should remain available without JavaScript`);
    assert.equal((await link.textContent()).trim(), label);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
    'narrow Settings fallback must not overflow without JavaScript');
  await page.screenshot({ path: path.join(output, 'scheduler-settings-no-javascript-narrow.png'), fullPage: false });
  results.interactions.push({
    route: '/scheduler-settings',
    viewport: 'narrow-no-javascript',
    state: 'visible JavaScript explanation and Back, Privacy, Security, and Documentation links remain usable',
  });
  await page.close();
}

async function checkAuthJourneys(browser) {
  const context = await browser.newContext({
    viewport: viewports[0],
  });
  const page = await context.newPage();
  const postResponses = [];
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/login') {
      postResponses.push(response);
    }
  });
  const authLoginPage = await page.goto(`${baseUrl}/login/?p7_auth_flow=1&next=https%3A%2F%2Fevil.example%2Fsteal`, { waitUntil: 'domcontentloaded' });
  const authLoginMode = await authLoginPage.headerValue('x-p7-auth-flow-active');
  assert.equal(await page.locator('input[name="next"]').inputValue(), '/dashboard');
  assert.equal(await page.locator('form[data-submit-once]').count(), 1);
  await page.screenshot({ path: path.join(output, 'auth-login-desktop.png'), fullPage: false });
  await page.locator('#id_email').fill('browser-auth@example.invalid');
  await page.locator('#id_password').fill('synthetic-passphrase');
  const passwordToggle = page.locator('[data-password-toggle="id_password"]');
  await passwordToggle.focus();
  await passwordToggle.press('Space');
  assert.equal(await page.locator('#id_password').getAttribute('type'), 'text');
  await passwordToggle.press('Enter');
  assert.equal(await page.locator('#id_password').getAttribute('type'), 'password');
  const rememberMe = page.locator('#id_remember_me');
  await rememberMe.focus();
  await rememberMe.press('Space');
  assert.equal(await rememberMe.isChecked(), true, 'Space activates the remember-me checkbox');
  const loginPost = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/login');
  await page.getByRole('button', { name: 'Sign in' }).dblclick({ delay: 25 });
  const loginResponse = await loginPost;
  assert.equal(
    loginResponse.status(),
    200,
    `synthetic sign-in response should succeed; calls=${await loginResponse.headerValue('x-p7-auth-flow-signin-calls')}; ` +
      `getMode=${authLoginMode}; postMode=${await loginResponse.headerValue('x-p7-auth-flow-active')}; ` +
      `url=${loginResponse.url()}`,
  );
  assert.equal(await loginResponse.headerValue('x-p7-auth-flow-signin-calls'), '1');
  assert.match(await loginResponse.headerValue('hx-redirect') || '', /\/dashboard$/);
  await page.waitForURL(/\/dashboard\/?$/);
  await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
  await page.goto(`${baseUrl}/auth/session/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Signed in' }).waitFor();
  assert.equal(postResponses.length, 1, 'the guarded login form submits once for a rapid double click');
  const sessionCookie = (await context.cookies(baseUrl)).find((cookie) => /session/i.test(cookie.name));
  assert.ok(sessionCookie && sessionCookie.expires > Date.now() / 1000, 'Keep me signed in should persist the bounded cookie');
  assert.ok(sessionCookie.expires <= Date.now() / 1000 + 14 * 24 * 60 * 60 + 2, 'remember-me remains within the session absolute limit');
  assert.equal(await page.getByText('browser-auth@example.invalid').count(), 1);
  assert.deepEqual(consoleErrors, [], 'successful auth interactions should not emit console errors');
  await page.screenshot({ path: path.join(output, 'auth-session-desktop.png'), fullPage: false });
  results.interactions.push({
    route: '/login',
    state: 'safe-next rejects an external URL; password visibility supports Space and Enter; remember-me supports Space and produces a bounded persistent session cookie; rapid duplicate click creates one synthetic sign-in call',
  });

  await page.goto(`${baseUrl}/login/`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\/?$/);
  await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
  await page.goto(`${baseUrl}/signup/`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/dashboard\/?$/);
  await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
  results.interactions.push({
    route: '/login and /signup',
    state: 'an authenticated synthetic session redirects both Auth entry routes to the local Dashboard',
  });

  await page.goto(`${baseUrl}/change-password/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#id_password').fill('new synthetic passphrase');
  await page.locator('#id_confirm_password').fill('new synthetic passphrase');
  await page.getByRole('button', { name: 'Save password' }).click();
  await page.waitForURL(/\/login\/?(?:\?.*)?$/);
  const protectedResponse = await page.goto(`${baseUrl}/auth/session/`, { waitUntil: 'domcontentloaded' });
  assert.ok([200, 302].includes(protectedResponse.status()));
  await page.waitForURL(/\/login\/?(?:\?.*)?$/);
  assert.equal(new URL(page.url()).searchParams.get('next'), '/auth/session/');
  assert.deepEqual(consoleErrors, [], 'session clear and protected redirect should not emit console errors');
  results.interactions.push({ route: '/change-password', state: 'password update clears the old session and protected session route redirects to sign-in' });

  await page.goto(`${baseUrl}/signup/?p7_auth_flow=1`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#id_accepted_terms').evaluate((input) => input.required), true);
  assert.equal(await page.locator('#id_first_name').evaluate((input) => input.required), true);
  assert.equal(await page.locator('#id_last_name').evaluate((input) => input.required), true);
  assert.equal(await page.getByRole('link', { name: 'Terms of Service' }).getAttribute('href'), '/terms');
  assert.equal(await page.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href'), '/privacy');
  await page.setViewportSize(viewports[1]);
  await page.locator('#id_first_name').fill('Browser');
  await page.locator('#id_last_name').fill('Fixture');
  await page.locator('#id_email').fill('mismatch-browser-auth@example.invalid');
  await page.locator('#id_password').fill('synthetic-passphrase');
  await page.locator('#id_confirm_password').fill('different-synthetic-passphrase');
  const acceptedTerms = page.locator('#id_accepted_terms');
  await acceptedTerms.focus();
  await acceptedTerms.press('Space');
  assert.equal(await acceptedTerms.isChecked(), true, 'Space activates the signup consent checkbox');
  await page.screenshot({ path: path.join(output, 'auth-signup-mobile.png'), fullPage: false });
  const mismatchSignupPost = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/signup');
  await page.getByRole('button', { name: 'Create account' }).focus();
  await page.keyboard.press('Enter');
  const mismatchSignupResponse = await mismatchSignupPost;
  assert.equal(mismatchSignupResponse.status(), 400, 'a password mismatch is rejected before Auth signup');
  await page.getByText('Passwords do not match.', { exact: true }).waitFor();
  assert.equal(await page.locator('#id_email').inputValue(), 'mismatch-browser-auth@example.invalid');
  assert.equal(await page.locator('#id_password').inputValue(), '');
  assert.equal(await page.locator('#id_confirm_password').inputValue(), '');
  results.interactions.push({ route: '/signup', state: 'mobile keyboard submission reports a mismatched password, retains the email, clears password values, and does not create a session' });

  await page.locator('#id_email').fill('duplicate-browser-auth@example.invalid');
  await page.locator('#id_password').fill('synthetic-passphrase');
  await page.locator('#id_confirm_password').fill('synthetic-passphrase');
  assert.equal(await acceptedTerms.isChecked(), true, 'the valid consent remains checked after form feedback');
  const duplicateSignupPost = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/signup');
  await page.getByRole('button', { name: 'Create account' }).focus();
  await page.keyboard.press('Enter');
  const duplicateSignupResponse = await duplicateSignupPost;
  assert.equal(duplicateSignupResponse.status(), 400);
  await page.getByRole('alert').getByText('Those details could not be accepted. Check them and try again.').waitFor();
  assert.equal(await page.locator('#id_email').inputValue(), 'duplicate-browser-auth@example.invalid');
  results.interactions.push({ route: '/signup', state: 'a synthetic duplicate-account response provides safe live feedback and keeps the email without creating a session' });

  await page.setViewportSize(viewports[0]);
  await page.locator('#id_email').fill('new-browser-auth@example.invalid');
  await page.locator('#id_password').fill('synthetic-passphrase');
  await page.locator('#id_confirm_password').fill('synthetic-passphrase');
  await page.screenshot({ path: path.join(output, 'auth-signup-desktop.png'), fullPage: false });
  const signupPost = page.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/signup');
  await page.getByRole('button', { name: 'Create account' }).press('Enter');
  const signupResponse = await signupPost;
  assert.equal(signupResponse.status(), 200, 'the boosted signup form accepts keyboard submission');
  assert.match(await signupResponse.headerValue('hx-redirect') || '', /\/dashboard$/);
  await page.waitForURL(/\/dashboard\/?$/);
  await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
  await page.goto(`${baseUrl}/auth/session/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Signed in' }).waitFor();
  assert.equal(await page.getByText('new-browser-auth@example.invalid').count(), 1);
  await page.screenshot({ path: path.join(output, 'auth-signup-session-desktop.png'), fullPage: false });
  results.interactions.push({ route: '/signup', state: 'Space activates required consent and Enter submits valid signup to create a synthetic authenticated Django session without provider or email calls' });

  const signedInRecovery = await page.goto(`${baseUrl}/forgot-password/`, { waitUntil: 'domcontentloaded' });
  assert.equal(signedInRecovery.status(), 200, 'P4 keeps the recovery-unavailable explanation visible to signed-in users');
  await page.getByRole('heading', { name: 'Email recovery unavailable' }).waitFor();
  const signedInReset = await page.goto(`${baseUrl}/reset-password/`, { waitUntil: 'domcontentloaded' });
  assert.equal(signedInReset.status(), 404, 'P4 keeps reset-token use unavailable regardless of session state');
  await page.getByRole('heading', { name: 'Reset link unavailable' }).waitFor();
  results.interactions.push({ route: '/forgot-password and /reset-password', state: 'signed-in P4 state keeps recovery explanation and intentional reset-token 404; no email or provider request occurs' });

  await page.goto(`${baseUrl}/auth/session/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Signed in' }).waitFor();
  await page.locator('form[action="/logout/"] button[type="submit"]').click();
  await page.waitForURL(/\/login\/?(?:\?.*)?$/);
  const afterLogout = await page.goto(`${baseUrl}/auth/session/`, { waitUntil: 'domcontentloaded' });
  assert.ok([200, 302].includes(afterLogout.status()));
  await page.waitForURL(/\/login\/?(?:\?.*)?$/);
  assert.equal(new URL(page.url()).searchParams.get('next'), '/auth/session/');
  results.interactions.push({ route: '/logout', state: 'logout clears the session and protected route requires sign-in again' });

  const resetDesktop = await page.goto(`${baseUrl}/reset-password/`, { waitUntil: 'domcontentloaded' });
  assert.equal(resetDesktop.status(), 404);
  assert.equal(resetDesktop.headers()['referrer-policy'], 'no-referrer');
  await page.screenshot({ path: path.join(output, 'auth-reset-notfound-desktop.png'), fullPage: false });
  await page.getByRole('link', { name: 'Sign in' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/login\/?$/);
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();

  const resetMobileContext = await browser.newContext({ viewport: viewports[1] });
  const resetMobilePage = await resetMobileContext.newPage();
  const resetMobile = await resetMobilePage.goto(`${baseUrl}/reset-password/`, { waitUntil: 'domcontentloaded' });
  assert.equal(resetMobile.status(), 404);
  assert.equal(resetMobile.headers()['referrer-policy'], 'no-referrer');
  await resetMobilePage.screenshot({ path: path.join(output, 'auth-reset-notfound-mobile.png'), fullPage: false });
  await resetMobilePage.getByRole('link', { name: 'Sign in' }).focus();
  await resetMobilePage.keyboard.press('Enter');
  await resetMobilePage.waitForURL(/\/login\/?$/);
  await resetMobilePage.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await resetMobileContext.close();
  results.interactions.push({ route: '/reset-password', state: 'the intentional 404 protects the reset token and its Sign in link activates by Enter on desktop and mobile' });

  await context.close();

  const validationContext = await browser.newContext({ viewport: viewports[0] });
  const validationPage = await validationContext.newPage();
  await validationPage.goto(`${baseUrl}/login/?p7_auth_flow=1`, { waitUntil: 'domcontentloaded' });
  const csrfResult = await validationPage.evaluate(async () => {
    const form = document.querySelector('form');
    const body = new FormData(form);
    body.delete('csrfmiddlewaretoken');
    body.append('p7_auth_flow', '1');
    const response = await fetch(`${location.pathname}?p7_auth_flow=1`, {
      method: 'POST',
      body,
      credentials: 'same-origin',
    });
    return {
      status: response.status,
      signInCalls: response.headers.get('x-p7-auth-flow-signin-calls'),
    };
  });
  assert.equal(csrfResult.status, 403, 'a browser form request without its CSRF token is rejected');
  assert.equal(csrfResult.signInCalls, '0', 'CSRF rejection happens before authentication is attempted');

  await validationPage.locator('body').evaluate((body) => body.setAttribute('hx-boost', 'false'));
  await validationPage.locator('#id_email').fill('invalid-auth@example.invalid');
  await validationPage.locator('#id_password').fill('wrong-synthetic-password');
  const fullPageError = validationPage.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/login');
  await validationPage.getByRole('button', { name: 'Sign in' }).press('Enter');
  const fullPageErrorResponse = await fullPageError;
  assert.equal(fullPageErrorResponse.status(), 400);
  await validationPage.getByRole('alert').getByText('Those details could not be accepted. Check them and try again.').waitFor();
  assert.equal(await validationPage.locator('#id_email').inputValue(), 'invalid-auth@example.invalid');
  assert.equal(await validationPage.locator('#id_password').inputValue(), '');
  assert.equal(await validationPage.getByText('wrong-synthetic-password').count(), 0);
  await validationPage.screenshot({ path: path.join(output, 'auth-invalid-credentials-full-page.png'), fullPage: false });

  await validationPage.goto(`${baseUrl}/login/?p7_auth_flow=1`, { waitUntil: 'domcontentloaded' });
  await validationPage.locator('#id_email').fill('invalid-auth@example.invalid');
  await validationPage.locator('#id_password').fill('wrong-synthetic-password');
  const htmxError = validationPage.waitForResponse((response) =>
    response.request().method() === 'POST' && new URL(response.url()).pathname.replace(/\/$/, '') === '/login');
  await validationPage.getByRole('button', { name: 'Sign in' }).focus();
  await validationPage.keyboard.press('Enter');
  const htmxErrorResponse = await htmxError;
  assert.equal(htmxErrorResponse.status(), 400);
  assert.equal(await htmxErrorResponse.request().headerValue('hx-request'), 'true');
  await validationPage.getByRole('alert').getByText('Those details could not be accepted. Check them and try again.').waitFor();
  assert.equal(await validationPage.locator('#id_email').inputValue(), 'invalid-auth@example.invalid');
  assert.equal(await validationPage.locator('#id_password').inputValue(), '');
  assert.equal(await validationPage.getByText('wrong-synthetic-password').count(), 0);
  await validationPage.screenshot({ path: path.join(output, 'auth-invalid-credentials-htmx.png'), fullPage: false });
  results.interactions.push({
    route: '/login',
    state: 'missing CSRF is rejected before sign-in; full-page and boosted HTMX invalid-credential responses show safe feedback, retain the email, and clear the password',
  });
  await validationContext.close();

  const outageContext = await browser.newContext({
    viewport: viewports[1],
  });
  const outagePage = await outageContext.newPage();
  await outagePage.goto(`${baseUrl}/login/?p7_auth_flow=1`, { waitUntil: 'domcontentloaded' });
  await outagePage.locator('#id_email').fill('browser-auth@example.invalid');
  await outagePage.locator('#id_password').fill('provider-down');
  const outageSubmit = outagePage.getByRole('button', { name: 'Sign in' });
  await outageSubmit.focus();
  const outageResponse = await Promise.all([
    outagePage.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/login/'),
    outagePage.keyboard.press('Enter'),
  ]).then(([response]) => response);
  assert.equal(outageResponse.status(), 503);
  await outagePage.getByRole('alert').getByText('Authentication is temporarily unavailable. Please try again.').waitFor();
  assert.equal(await outagePage.getByText('provider-down').count(), 0);
  await outagePage.screenshot({ path: path.join(output, 'auth-provider-unavailable-mobile.png'), fullPage: false });
  results.interactions.push({ route: '/login', state: 'mobile keyboard submission during a synthetic provider outage shows a safe retryable error without exposing credentials; recovery email and OAuth remain unavailable by contract' });
  await outageContext.close();
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  if (currentOnly) {
    sourceReferenceManifest = null;
    sourceReferencePages = [];
    results.source_reference = { mode: 'current-only', note: 'No archived React runtime or source page was used as an acceptance target.' };
  } else {
    assert.ok(referenceRun, 'Set P7_REFERENCE_RUN to the exact freshly captured source evidence run.');
    const sourceManifestPath = path.join(sourceOutput, 'capture-results.json');
    sourceReferenceManifest = JSON.parse(await fs.readFile(sourceManifestPath, 'utf8'));
    assert.equal(sourceReferenceManifest.run_id, referenceRun,
      'The selected source manifest must identify the exact requested source run.');
    assert.equal(sourceReferenceManifest.waves?.[wave]?.wave, wave.toUpperCase(),
      `Source run ${referenceRun} has no ${wave.toUpperCase()} capture.`);
    const currentSourceProvenance = captureSourceProvenance(root);
    assert.deepEqual(sourceReferenceManifest.source_provenance, currentSourceProvenance,
      'The source working tree changed after its captured source run; recapture source before comparison.');
    sourceReferencePages = sourceReferenceManifest.waves[wave].pages;
    results.source_reference = {
      run_id: referenceRun,
      captured_at: sourceReferenceManifest.captured_at,
      git_revision: currentSourceProvenance.git_revision,
      worktree_digest: currentSourceProvenance.worktree_digest,
      file_count: currentSourceProvenance.file_count,
      source_manifest_sha256: crypto.createHash('sha256').update(await fs.readFile(sourceManifestPath)).digest('hex'),
    };
  }
  results.negative_control_checks = [];
  const browser = await chromium.launch(browserLaunchOptions);
  results.browser = browser.version();
  try {
    const routesToCapture = appRoutes[wave].filter(([slug]) => !routeFilter || slug === routeFilter);
    assert.ok(routesToCapture.length, `No ${wave.toUpperCase()} route matches ${routeFilter || 'the requested route set'}.`);
    for (const route of routesToCapture) {
      const routeViewports = route[0] === 'scheduler-settings'
        ? [...viewports, ...settingsAdditionalViewports]
        : viewports;
      for (const viewport of routeViewports) await capture(browser, route, viewport);
    }
    if (wave === 'w6' && routesToCapture.some(([slug]) => slug === 'scheduler-settings')) {
      await checkSettingsWithoutJavaScript(browser);
    }
    if (wave === 'w3' && !routeFilter) await checkAuthJourneys(browser);
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(output, 'browser-results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ pages: results.pages.length, interactions: results.interactions, output }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
