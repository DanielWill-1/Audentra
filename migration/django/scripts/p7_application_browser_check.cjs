const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { captureSourceProvenance } = require('./p7_source_provenance.cjs');

const root = path.resolve(__dirname, '..', '..', '..');
const wave = process.argv.find((argument) => /^--wave=w[3-7]$/.test(argument))?.slice(-2) || 'w4';
const run = process.env.P7_EVIDENCE_RUN || 'post-wave-review-20261012';
const referenceRun = process.env.P7_REFERENCE_RUN || '';
const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const output = path.join(root, 'docs', 'pages', 'evidence', wave, run, 'django');
const sourceOutput = path.join(root, 'docs', 'pages', 'evidence', wave, referenceRun, 'legacy');
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
    source_only: { controls: [{ feature: 'Continue with Google', reason: 'P4 OAuth remains unavailable and the Django page presents the accepted disabled state.' }] },
  },
  signup: {
    source_heading: 'Create your account',
    heading: 'Create your account', fields: ['first_name','last_name','email','password','confirm_password','accepted_terms'],
    buttons: ['Create account','Show password'], destinations: ['/','/login','/terms','/privacy'],
    accepted: ['Source Google OAuth is unavailable under P4.', 'Source camelCase fields map to Django snake_case fields.', 'Consent is retained and linked to the local Terms and Privacy routes.'],
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
    source_only: { controls: [{ feature: 'Continue with Google', reason: 'P4 OAuth remains unavailable and the Django page presents the accepted disabled state.' }] },
  },
  'forgot-password': {
    source_heading: 'Reset Your Password',
    heading: 'Email recovery unavailable', text: ['Email-based forgotten-password recovery is not configured'], destinations: ['/login','/signup'],
    accepted: ['Source recovery email form is unavailable under P4; no email delivery is implemented.'],
    source_sections: [],
    source_fields: ['email'],
    source_controls: ['Send reset link'],
    source_destinations: ['/','/login','/signup'],
    source_only: {
      fields: [{ feature: 'email', reason: 'P4 keeps password recovery unavailable because email delivery is not configured.' }],
      controls: [{ feature: 'Send reset link', reason: 'P4 keeps email recovery unavailable because email delivery is not configured.' }],
      copy: [{ feature: "Enter your email address and we'll send you a link to reset your password.", reason: 'P4 keeps email recovery unavailable because email delivery and reset tokens are not configured.' }],
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
    heading: 'What would you like to work on?', sections: ['Start with your voice','Recent forms','Recent templates','Upcoming schedule','Team workspace'],
    buttons: ['Start voice form','Choose a template','View all forms','Save profile','Team options','Open reviews'],
    destinations: ['/AIVoiceAutoFill','/templates','/filledtemplates','/scheduler','/templates#collaboration'],
    fields: ['first_name','last_name','company','industry','language','aiProcessingSpeed','industrySpecialization','voiceSensitivity'],
    accepted: ['Home, Team and Settings are workspace navigation destinations in both implementations.', 'Recent activity is browser-local and account-key scoped.', 'Invite/member management remains unavailable; sharing and reviews route to P5-backed template flows.'],
    source_sections: ['Start with your voice', 'Recent forms', 'Templates', 'Upcoming', 'Team'],
    source_controls: ['Start voice form', 'Choose a template', 'View all forms', 'Browse library'],
    source_destinations: ['/AIVoiceAutoFill', '/templates', '/filledtemplates', '/scheduler'],
    section_map: { Upcoming: 'Upcoming schedule', Templates: 'Recent templates', Team: 'Team workspace' },
    control_map: {
      'Reviews': 'Open reviews',
      'Share': 'Share with an existing account',
      '+ Add': 'Open scheduler',
      'Browse library →': 'View all',
      'Use': 'Use template',
    },
    source_copy: ['Speak naturally and Audentra will turn the conversation into structured form data.'],
    source_only: { controls: [
      { feature: 'Manage team →', reason: 'Source team membership actions remain a demo; available P5 sharing and reviews are linked from the Team view.' },
      { feature: 'Invite', reason: 'P4 email invitations and team membership changes are not configured in the current migration contract.' },
    ] },
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
      Filters: 'Filter',
      Edit: 'Edit fields and details',
      Share: 'Share with existing accounts',
      Hide: 'Make hidden',
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
  },
  'scheduler-settings': {
    source_heading: 'Scheduler Settings',
    heading: 'Scheduler Settings', sections: ['General Settings','Working Hours','Working Days'],
    buttons: ['General','Notifications','Calendar','Privacy','Appearance','Integrations','Save Changes','Reset','Export'],
    fields: ['defaultDuration','defaultReminderMinutes','workingHours.start','workingHours.end','timezone','workingDays','emailNotifications','pushNotifications','reminderNotifications','dailyDigest','weeklyReport','defaultView','weekStartsOn','showWeekends','showDeclinedEvents','shareCalendar','allowGuestInvites','showBusyTime','theme','colorScheme','compactView','googleCalendarSync','outlookSync','slackNotifications','teamsNotifications'],
    destinations: ['/scheduler'],
    accepted: ['Source settings remain local preferences; integrations and notifications do not connect to external services.'],
    source_sections: ['General Settings', 'Working Hours', 'Working Days'],
    source_fields: ['Default Event Duration (minutes)', 'Default Reminder (minutes before)', 'Start Time', 'End Time'],
    source_controls: ['General', 'Notifications', 'Calendar', 'Privacy', 'Appearance', 'Integrations', 'Save Changes', 'Reset', 'Export'],
    source_destinations: ['/scheduler'],
    source_copy: ['Configure your scheduling preferences and integrations'],
    source_fields: ['Default Event Duration (minutes)', 'Default Reminder (minutes before)', 'Start Time', 'End Time', 'Import'],
    field_map: {
      'Default Event Duration (minutes)': 'defaultDuration',
      'Default Reminder (minutes before)': 'defaultReminderMinutes',
      'Start Time': 'workingHours.start',
      'End Time': 'workingHours.end',
      Import: 'Import',
    },
    control_map: { Reset: 'Reset', Export: 'Export', 'Save Changes': 'Save Changes' },
  },
  'voice-autofill': {
    source_heading: 'AI Voice Auto-Fill',
    heading: 'AI Voice Auto-Fill', sections: ['Choose a Form Template'],
    buttons: ['Use template'],
    destinations: ['/dashboard','/AIVoiceAutoFill?template=33333333-3333-4333-8333-333333333333'],
    accepted: ['Both captures start at template selection; the source template card has no button or link semantics, so Django exposes an accessible Use template button. Selected-template review is captured and tested separately.', 'Browser API interception is synthetic and does not establish live provider or hosted persistence.'],
    source_sections: ['Choose a Form Template'],
    source_controls: [],
    source_destinations: ['/dashboard'],
  },
  'filled-templates': {
    source_heading: 'Your Filled Templates',
    heading: 'Filled templates', text: ['Sample Patient'], buttons: ['Delete'],
    fields: ['action','record_id'], destinations: ['/dashboard'],
    accepted: ['Source title capitalization is normalized. Source Form Data is visible by default; Django exposes the same account-owned answers in an initially open details region.', 'The source delete icon title maps to Django’s explicit Delete label. Browser examples are distinguished from hosted persistence evidence.'],
    source_sections: ['Form Data:'],
    source_controls: ['Delete Template', 'Back to Dashboard'],
    source_destinations: [],
    source_copy: ['Manage all your previously filled templates here.'],
    control_map: { 'Delete Template': 'Delete' },
  },
  'activity-log': {
    source_heading: 'Activity Log',
    heading: 'Activity log', fields: ['q','type','range'], buttons: ['Refresh'], destinations: ['/dashboard'],
    accepted: ['Source Activity Log capitalization is normalized. Generic source Delete icons map to Django row-specific accessible labels; synthetic journeys verify row deletion. Source Download and Continue controls remain visibly unavailable because their source actions have no implementation. The feed remains local browser data and is not represented as a server audit log.'],
    source_sections: ['Activity Log'],
    source_controls: ['Refresh', 'Download', 'Continue', 'Delete'],
    source_destinations: ['/dashboard'],
    source_copy: ['View all your recent activity and actions', 'Showing your recent activity and actions'],
    field_label_map: { 'Search activity...': 'Search activity' },
    control_map: {
      Download: 'Download (unavailable)',
      Continue: 'Continue (unavailable)',
      Delete: 'Delete Patient Intake - John Smith',
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

  for (const copy of contract.source_copy || []) {
    if (!String(sourceInfo.text || '').includes(copy)) failures.push(`required source copy ${JSON.stringify(copy)} is absent`);
  }
  for (const copy of sourceInfo.copy_blocks || []) {
    const target = mappedCopy(copy);
    if (!featureKey(djangoInfo.text || '').includes(featureKey(target)) && !sourceOnly(contract, 'copy', copy)) {
      failures.push(`source copy ${JSON.stringify(copy)} is missing from Django`);
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
  return { route: routeName, passed: checks.length > 0, mutations_rejected: checks };
}

async function capture(browser, [slug, route, expectedStatus], viewport) {
  const page = await browser.newPage({ viewport });
  await page.route(`${baseUrl}/**`, async (requestRoute) => {
    const headers = await requestRoute.request().allHeaders();
    await requestRoute.continue({ headers: { ...headers, 'X-P7-Fixture-Reset': '1' } });
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

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), expectedStatus, `${route} should return ${expectedStatus}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const info = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.innerText.trim() || null,
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

  const screenshot = `${slug}-${viewport.name}.png`;
  await page.screenshot({ path: path.join(output, screenshot), fullPage: false });
  const sourceMarkup = await fs.readFile(path.join(sourceOutput, `${slug}-${viewport.name}.html`), 'utf8');
  const sourceDigest = crypto.createHash('sha256').update(sourceMarkup).digest('hex');
  const sourceCapturePage = sourceReferencePages.find((item) =>
    new URL(item.route, baseUrl).pathname === new URL(route, baseUrl).pathname
      && item.viewport?.name === viewport.name,
  );
  assert.ok(sourceCapturePage, `${route} ${viewport.name} must exist in source run ${referenceRun}`);
  assert.equal(sourceCapturePage.source_html_sha256, sourceDigest,
    `${route} ${viewport.name} source HTML does not match the recorded source-run digest`);
  const sourceInfo = await page.evaluate((markup) => {
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
        .filter((item) => !item.closest('li,article,[role="listitem"]'))
        .map((item) => item.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
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
      copy_blocks: [...copy.querySelectorAll('p')].map((item) => item.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
    };
  });
  const contract = ROUTE_CONTRACTS[slug];
  assert.ok(contract, `A route contract must be registered for ${slug}`);
  if (contract.source_heading) {
    assert.equal(sourceInfo.heading, contract.source_heading, `${route} source heading changed without a reviewed contract`);
  }
  assertRouteContract({ ...djangoInfo, heading: info.heading }, contract, `${route} (${viewport.name})`);
  assertSourceRouteContract(sourceInfo, { ...djangoInfo, heading: info.heading }, contract, `${route} (${viewport.name})`);
  if (viewport.name === 'desktop' && ['dashboard', 'scheduler-settings'].includes(slug)) {
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
    source_run_id: referenceRun,
    source_worktree_digest: sourceReferenceManifest.source_provenance.worktree_digest,
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
    mapped_source_controls: contract.control_map || {},
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

  if (wave === 'w4' && viewport.name === 'desktop') {
    await page.evaluate(() => {
      const key = document.querySelector('[data-dashboard-activity-key]')?.dataset.dashboardActivityKey;
      localStorage.setItem(key, JSON.stringify([
        { id: 'current-user-form', type: 'form_started', title: 'Synthetic browser-local form', time: new Date().toISOString(), user: 'Synthetic' },
      ]));
      localStorage.setItem('recentActivity', JSON.stringify([
        { type: 'form_started', title: 'Unscoped prior-account form', time: new Date().toISOString() },
      ]));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const activityRow = page.locator('[data-dashboard-recent-forms] li').filter({ hasText: 'Synthetic browser-local form' });
    assert.equal(await activityRow.count(), 1);
    assert.equal(await page.getByText('Unscoped prior-account form').count(), 0);
    assert.equal(await activityRow.getByRole('link', { name: 'Resume' }).getAttribute('href'), '/AIVoiceAutoFill');
    results.interactions.push({ route: '/dashboard', state: 'reads current-account browser history, ignores the unscoped prior-account key, and uses a fixed resume destination' });

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
  if (wave === 'w7' && slug === 'voice-autofill' && viewport.name === 'desktop') {
    await page.getByRole('link', { name: 'Use template' }).click();
    await page.waitForURL(/\/AIVoiceAutoFill\?template=/);
    await page.getByRole('heading', { name: 'Review form fields' }).waitFor();
    await page.getByRole('button', { name: 'Send to assistant' }).waitFor();
    await page.screenshot({ path: path.join(output, 'voice-autofill-selected-desktop.png'), fullPage: false });
    results.interactions.push({ route: '/AIVoiceAutoFill', state: 'template chooser opens the selected synthetic template and exposes the review, assistant, recorder, and save paths' });
  }
  if (wave === 'w7' && slug === 'filled-templates' && viewport.name === 'mobile') {
    const savedCard = page.locator('article.card').filter({ hasText: 'Sample Patient' });
    await savedCard.waitFor();
    assert.equal(await savedCard.locator('details').evaluate((details) => details.open), true);
    await savedCard.getByRole('heading', { name: 'Form Data:' }).waitFor();
    await savedCard.getByText('Sample Patient', { exact: true }).waitFor();
    page.once('dialog', (dialog) => dialog.accept());
    await savedCard.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').getByText('Filled form deleted.').waitFor();
    await page.getByRole('heading', { name: 'No filled forms yet' }).waitFor();
    assert.equal(await page.locator('article.card').filter({ hasText: 'Sample Patient' }).count(), 0);
    await page.screenshot({ path: path.join(output, 'filled-templates-empty-mobile.png'), fullPage: false });
    await page.getByRole('link', { name: 'Start a form' }).click();
    await page.waitForURL('**/AIVoiceAutoFill');
    await page.getByRole('heading', { name: 'Choose a Form Template' }).waitFor();
    results.interactions.push({ route: '/filledtemplates', state: 'populated saved answers open, confirmed delete reaches the empty state, and the fixed Start a form link returns to the template chooser' });
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
    assert.equal(await drawerOpener.getAttribute('aria-expanded'), 'false');
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
    await page.getByRole('button', { name: 'List view' }).click();
    assert.equal(await resultsView.getAttribute('data-template-layout'), 'list');
    assert.equal(await page.getByRole('button', { name: 'List view' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Grid view' }).click();
    assert.equal(await resultsView.getAttribute('data-template-layout'), 'grid');
    assert.match(await page.locator('[data-template-path="upload"]').textContent(), /not parsed or converted into fields/i);
    const createTemplate = page.getByRole('button', { name: 'Create template' });
    await createTemplate.click();
    const builderDialog = page.locator('#create-template');
    assert.equal(await builderDialog.evaluate((dialog) => dialog.open), true);
    assert.equal(await createTemplate.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await builderDialog.evaluate((dialog) => dialog.open), false);
    await page.waitForFunction(() => document.querySelector('[data-template-dialog-open]')?.getAttribute('aria-expanded') === 'false');
    assert.equal(await createTemplate.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Create template');
    await createTemplate.click();
    const builder = page.locator('form[data-template-builder]').first();
    await builder.locator('[name="name"]').fill('Synthetic browser template');
    await builder.locator('[name="category"]').selectOption('healthcare');
    await builder.locator('[name="description"]').fill('Deterministic browser CRUD fixture');
    await builder.getByRole('button', { name: 'Next' }).click();
    await builder.getByLabel('Build manually').check();
    await builder.getByRole('button', { name: 'Next' }).click();
    await builder.getByRole('button', { name: 'Save template' }).click();
    await page.getByText('Add at least one field before creating a voice-enabled form.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Synthetic browser template', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Add field' }).click();
    assert.equal(await builder.locator('[data-template-flow-status]').textContent(), '', 'adding a field clears the prior empty-form validation error');
    const fields = builder.locator('[data-fields] fieldset');
    await fields.nth(0).locator('[data-property="label"]').fill('Patient name');
    await fields.nth(0).locator('[data-property="required"]').check();
    await fields.nth(0).locator('[data-property="type"]').selectOption('text');
    await page.getByRole('button', { name: 'Add field' }).click();
    await fields.nth(1).locator('[data-property="label"]').fill('Contact method');
    await fields.nth(1).locator('[data-property="type"]').selectOption('select');
    await fields.nth(1).locator('[data-property="options"]').fill('Email\nPhone');
    await fields.nth(1).getByRole('button', { name: 'Move up' }).click();
    assert.equal(await fields.nth(0).locator('[data-property="label"]').inputValue(), 'Contact method');
    await fields.nth(0).getByRole('button', { name: 'Move down' }).click();
    assert.equal(await fields.nth(0).locator('[data-property="label"]').inputValue(), 'Patient name');
    await fields.nth(1).getByRole('button', { name: 'Remove field' }).click();
    const payload = JSON.parse(await builder.locator('[data-form-data]').inputValue());
    assert.deepEqual(payload.fields.map(({ id, label, type, required, options }) => ({ id, label, type, required, options })), [
      { id: payload.fields[0].id, label: 'Patient name', type: 'text', required: true, options: undefined },
    ]);
    await page.screenshot({ path: path.join(output, 'templates-builder-manual-desktop.png'), fullPage: false });

    await builder.getByRole('button', { name: 'Save template' }).click();
    await page.getByRole('status').getByText('Template created.').waitFor();
    const createdCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic browser template', exact: true }) });
    await createdCard.waitFor();
    const createdId = await createdCard.locator('input[name="template_id"]').first().inputValue();
    assert.ok(createdId);
    await createdCard.locator('details').filter({ has: page.getByText('Edit fields and details') }).locator('summary').click();
    const editForm = createdCard.locator('form[data-template-builder]').last();
    await editForm.locator('[name="name"]').fill('Synthetic browser template edited');
    await editForm.locator('[name="description"]').fill('Persisted synthetic edit');
    await editForm.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('status').getByText('Template saved.').waitFor();

    const editedCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic browser template edited', exact: true }) });
    await editedCard.waitFor();
    const [templateDownload] = await Promise.all([
      page.waitForEvent('download'),
      editedCard.getByRole('link', { name: 'Export template JSON' }).click(),
    ]);
    const templateExportPath = await templateDownload.path();
    assert.ok(templateExportPath);
    const templateExport = JSON.parse(await fs.readFile(templateExportPath, 'utf8'));
    assert.equal(templateExport.name, 'Synthetic browser template edited');
    assert.equal(templateExport.form_data.fields[0].label, 'Patient name');

    await editedCard.getByRole('button', { name: 'Duplicate' }).click();
    await page.getByRole('status').getByText('Template duplicated.').waitFor();
    const duplicateName = 'Synthetic browser template edited copy';
    const duplicateCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: duplicateName, exact: true }) });
    await duplicateCard.waitFor();
    const duplicateId = await duplicateCard.locator('input[name="template_id"]').first().inputValue();
    await duplicateCard.getByRole('button', { name: 'Make hidden' }).click();
    await page.getByRole('status').getByText('Template visibility updated.').waitFor();
    assert.equal(await duplicateCard.locator('.badge').filter({ hasText: 'Hidden' }).count(), 1);
    await duplicateCard.getByRole('button', { name: 'Make visible' }).click();
    await page.getByRole('status').getByText('Template visibility updated.').waitFor();

    const filters = page.locator('form[role="search"]');
    await filters.locator('[name="q"]').fill('Synthetic browser template');
    await filters.locator('[name="category"]').selectOption('healthcare');
    await filters.locator('[name="sort"]').selectOption('name');
    await filters.getByRole('button', { name: 'Filter' }).click();
    await page.waitForURL(/q=Synthetic\+browser\+template/);
    await page.getByRole('heading', { name: duplicateName, exact: true }).waitFor();

    const deleteDuplicate = page.locator('article.card').filter({ has: page.getByRole('heading', { name: duplicateName, exact: true }) });
    page.once('dialog', (dialog) => dialog.accept());
    await deleteDuplicate.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').getByText('Template deleted.').waitFor();
    assert.equal(await page.getByRole('heading', { name: duplicateName, exact: true }).count(), 0);
    await filters.locator('[name="q"]').fill('no template should match this term');
    await filters.getByRole('button', { name: 'Filter' }).click();
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
    const [firstPrivateDownload] = await Promise.all([
      page.waitForEvent('download'),
      uploadCard.getByRole('button', { name: 'Download private file' }).click(),
    ]);
    assert.deepEqual(await fs.readFile(await firstPrivateDownload.path()), originalFile);
    const privateDetails = uploadCard.locator('details').filter({ has: page.getByText('Private file', { exact: true }) });
    await privateDetails.locator('summary').click();
    const replacementFile = Buffer.from('source,replacement\nprivate,fixture\n');
    await privateDetails.locator('[name="template_file"]').setInputFiles({
      name: 'replacement.csv', mimeType: 'text/csv', buffer: replacementFile,
    });
    await privateDetails.getByRole('button', { name: 'Upload privately' }).click();
    await page.getByRole('status').getByText('Private template file saved.').waitFor();
    const replacementCard = page.locator('article.card').filter({ has: page.getByRole('heading', { name: 'Synthetic private upload', exact: true }) });
    const [replacementDownload] = await Promise.all([
      page.waitForEvent('download'),
      replacementCard.getByRole('button', { name: 'Download private file' }).click(),
    ]);
    assert.deepEqual(await fs.readFile(await replacementDownload.path()), replacementFile);
    page.once('dialog', (dialog) => dialog.accept());
    await replacementCard.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('status').getByText('Template deleted.').waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Synthetic private upload', exact: true }).count(), 0);
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
    await page.screenshot({ path: path.join(output, 'templates-crud-complete-desktop.png'), fullPage: false });
  }
  if (wave === 'w5' && viewport.name === 'mobile') {
    await page.getByRole('button', { name: 'Create template' }).click();
    const builder = page.locator('form[data-template-builder]').first();
    await builder.locator('[name="name"]').fill('Mobile stepper fixture');
    await builder.locator('[name="category"]').selectOption('healthcare');
    await builder.getByRole('button', { name: 'Next' }).click();
    await builder.getByLabel('Build manually').check();
    await builder.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Add field' }).waitFor();
    assert.equal(await page.locator('[data-template-path="manual"]').isVisible(), true);
    const width = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.equal(width[0] > width[1], false, 'template builder stepper should not overflow on mobile');
    await page.screenshot({ path: path.join(output, 'templates-builder-mobile.png'), fullPage: false });
    results.interactions.push({ route: '/templates', state: 'manual builder stepper is reachable at 390px without overflow' });
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
    await page.getByText('Review patient intake', { exact: true }).first().waitFor();
    await page.getByRole('link', { name: 'Next month' }).click();
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
    await page.goto(`${baseUrl}${editHref}`, { waitUntil: 'domcontentloaded' });
    const schedulerEditTitle = page.locator(`details.card form:has(input[name="event_id"][value="${eventId}"]) [name="title"]`);
    assert.equal(await schedulerEditTitle.inputValue(), 'Synthetic browser-created review');
    await schedulerEditTitle.fill('Synthetic browser-updated review');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByRole('status').getByText('Schedule updated.').waitFor();

    const eventAction = (action) => page.locator(`form:has(input[name="event_id"][value="${eventId}"]):has(input[name="action"][value="${action}"])`);
    const openEventActions = async () => {
      const eventDetails = page.locator(`details:has(form input[name="event_id"][value="${eventId}"])`).first();
      if (!(await eventDetails.evaluate((details) => details.open))) {
        await eventDetails.locator(':scope > summary').click();
      }
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
    results.interactions.push({ route: '/scheduler', state: 'search/type filters and empty state, month/week navigation, Today/date selection, create/edit/complete/cancel/confirmed-delete, upcoming events, and statistics work with a mutable synthetic schedule' });
    await page.getByRole('link', { name: 'Week', exact: true }).click();
    assert.match(await calendarTitle.innerText(), /Oct 11/);
    await page.screenshot({ path: path.join(output, 'scheduler-week-desktop.png'), fullPage: false });
  }
  if (wave === 'w6' && slug === 'manage-schedules' && viewport.name === 'desktop') {
    assert.equal(await page.getByRole('link', { name: 'Scheduler settings' }).getAttribute('href'), '/scheduler-settings');
    assert.equal(await page.getByRole('link', { name: 'Edit in scheduler' }).getAttribute('href'), '/scheduler?edit=44444444-4444-4444-8444-444444444444');
    const filters = page.locator('form[role="search"]');
    await filters.locator('[name="q"]').fill('Review patient intake');
    await filters.locator('[name="type"]').selectOption('form_review');
    await filters.locator('[name="status"]').selectOption('scheduled');
    await filters.getByText('Sort results', { exact: true }).click();
    await filters.locator('[name="sort"]').selectOption('title');
    await filters.locator('[name="order"]').selectOption('desc');
    await filters.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByText('Review patient intake', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Review patient intake');
    const selection = page.getByRole('checkbox', { name: 'Select Review patient intake' });
    await selection.check();
    await page.locator('#bulk-action').selectOption('export');
    page.once('dialog', (dialog) => dialog.accept());
    const [scheduleDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).click(),
    ]);
    const exportPath = await scheduleDownload.path();
    assert.ok(exportPath);
    const exportData = JSON.parse(await fs.readFile(exportPath, 'utf8'));
    assert.equal(exportData.events.length, 1);
    assert.equal(exportData.events[0].title, 'Review patient intake');

    await page.goto(`${baseUrl}/manage-schedules?q=Review%20patient%20intake&type=form_review&status=all&sort=title&order=desc`, { waitUntil: 'domcontentloaded' });

    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).check();
    await page.locator('#bulk-action').selectOption('complete');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('status').getByText('1 schedules updated.').waitFor();
    await page.getByRole('cell', { name: 'Completed', exact: true }).waitFor();

    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).check();
    await page.locator('#bulk-action').selectOption('cancel');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('status').getByText('1 schedules updated.').waitFor();
    await page.getByRole('cell', { name: 'Cancelled', exact: true }).waitFor();

    await page.getByRole('checkbox', { name: 'Select Review patient intake' }).check();
    await page.locator('#bulk-action').selectOption('delete');
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#bulk-schedules').getByRole('button', { name: 'Apply' }).click();
    await page.getByText('No schedules match these filters.', { exact: true }).waitFor();
    results.interactions.push({ route: '/manage-schedules', state: 'search/type/status/sort filters, source edit/settings destinations, export bytes, bulk complete/cancel/delete, and empty result pass' });
    await page.screenshot({ path: path.join(output, 'manage-schedules-empty-desktop.png'), fullPage: false });
  }
  if (wave === 'w6' && slug === 'scheduler-settings' && viewport.name === 'mobile') {
    const tabs = page.getByRole('tab');
    assert.equal(await tabs.count(), 6);
    for (const name of ['General', 'Notifications', 'Calendar', 'Privacy', 'Appearance', 'Integrations']) {
      assert.equal(await page.getByRole('tab', { name }).isVisible(), true, `${name} settings tab must be visible on mobile`);
    }
    await page.getByRole('tab', { name: 'Integrations' }).click();
    assert.equal(await page.locator('[data-settings-panel="integrations"]').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.getByRole('tab', { name: 'General' }).click();
    results.interactions.push({ route: '/scheduler-settings', state: 'all six settings tabs remain visible, selectable, and within the mobile viewport' });
  }
  if (wave === 'w6' && slug === 'scheduler-settings' && viewport.name === 'desktop') {
    const tabNames = ['General', 'Notifications', 'Calendar', 'Privacy', 'Appearance', 'Integrations'];
    for (const name of tabNames) {
      const tab = page.getByRole('tab', { name });
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator(`[data-settings-panel="${name.toLowerCase()}"]`).isVisible(), true);
    }
    await page.getByRole('tab', { name: 'General' }).click();
    await page.getByRole('tab', { name: 'General' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Notifications' }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[data-settings-panel="notifications"]').isVisible(), true);
    await page.keyboard.press('Home');
    assert.equal(await page.getByRole('tab', { name: 'General' }).getAttribute('aria-selected'), 'true');
    assert.deepEqual(
      await page.locator('[data-settings-panel="general"] h2, [data-settings-panel="general"] h3, [data-settings-panel="general"] legend').allTextContents(),
      ['General Settings', 'Working Hours', 'Working Days'],
    );
    const expectedUserId = await page.locator('[data-settings-key]').getAttribute('data-settings-user-id');
    const settingsKey = await page.locator('[data-settings-key]').getAttribute('data-settings-key');
    const duration = page.locator('[data-setting="defaultDuration"]');
    await duration.fill('45');
    await page.locator('[data-setting="timezone"]').selectOption('Europe/London');
    await page.locator('[data-settings-save]').click();
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Settings saved in this browser.');
    let stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey));
    assert.equal(stored.defaultDuration, 45);
    assert.equal(stored.timezone, 'Europe/London');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '45');

    await page.locator('[data-settings-reset]').click();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '60');
    await page.locator('[data-settings-save]').click();
    assert.equal(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey)).defaultDuration, 60);

    const importedSettings = {
      defaultDuration: 75,
      timezone: 'Europe/London',
      workingDays: ['monday', 'wednesday', 'friday'],
    };
    await page.locator('[data-settings-import]').setInputFiles({
      name: 'scheduler-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ user_id: expectedUserId, settings: importedSettings })),
    });
    await page.getByText('Settings imported into this form. Save settings to keep them.').waitFor();
    assert.equal(await page.locator('[data-setting="defaultDuration"]').inputValue(), '75');
    await page.locator('[data-settings-save]').click();
    stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey));
    assert.deepEqual(stored.workingDays, ['monday', 'wednesday', 'friday']);

    await page.locator('[data-settings-import]').setInputFiles({
      name: 'invalid-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{'),
    });
    await page.waitForFunction(() => /JSON|property|position/i.test(document.querySelector('[data-settings-status]').textContent));
    await page.locator('[data-settings-import]').setInputFiles({
      name: 'unsupported-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ settings: { theme: 'cosmic' } })),
    });
    await page.getByText('A selected settings option is not supported.', { exact: true }).waitFor();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-settings-export]').click(),
    ]);
    const downloadPath = await download.path();
    assert.ok(downloadPath, 'settings export should produce readable downloaded bytes');
    const exported = JSON.parse(await fs.readFile(downloadPath, 'utf8'));
    assert.equal(exported.user_id, expectedUserId);
    assert.equal(exported.settings.defaultDuration, 75);
    assert.equal(exported.settings.timezone, 'Europe/London');
    assert.deepEqual(exported.settings.workingDays, ['monday', 'wednesday', 'friday']);
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Settings exported.');

    const savedBeforeInvalidValues = await page.evaluate((key) => localStorage.getItem(key), settingsKey);
    await page.evaluate(() => {
      window.__settingsExportObjectCount = 0;
      const createObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (...args) => {
        window.__settingsExportObjectCount += 1;
        return createObjectURL(...args);
      };
    });
    await duration.fill('0');
    await page.locator('[data-settings-save]').click();
    assert.equal(
      await page.locator('[data-settings-status]').innerText(),
      'Default event duration must be a multiple of 15 minutes between 15 and 10080.',
      'saving a source-invalid duration must be rejected',
    );
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalidValues);
    await page.locator('[data-settings-export]').click();
    assert.equal(
      await page.locator('[data-settings-status]').innerText(),
      'Default event duration must be a multiple of 15 minutes between 15 and 10080.',
      'exporting a source-invalid duration must be rejected',
    );
    assert.equal(await page.evaluate(() => window.__settingsExportObjectCount), 0);

    await page.locator('[data-settings-import]').setInputFiles({
      name: 'invalid-duration.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ settings: { defaultDuration: 0 } })),
    });
    await page.getByText('Default event duration must be a multiple of 15 minutes between 15 and 10080.', { exact: true }).waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalidValues);
    await page.locator('[data-settings-import]').setInputFiles({
      name: 'invalid-reminder.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ settings: { defaultReminderMinutes: 7 } })),
    });
    await page.getByText('Choose a supported reminder interval.', { exact: true }).waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalidValues);

    await page.locator('[data-settings-import]').setInputFiles({
      name: 'invalid-working-hours.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ settings: { workingHours: { start: '25:99', end: '17:00' } } })),
    });
    await page.getByText('Working hours must use valid 24-hour times (HH:MM).', { exact: true }).waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalidValues);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-setting="workingHours.start"]').fill('');
    await page.locator('[data-settings-save]').click();
    assert.equal(
      await page.locator('[data-settings-status]').innerText(),
      'Working hours must use valid 24-hour times (HH:MM).',
      'saving an empty time control must be rejected',
    );
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), settingsKey), savedBeforeInvalidValues);
    await page.reload({ waitUntil: 'domcontentloaded' });

    for (const [tabName, controlName] of [
      ['Notifications', 'emailNotifications'],
      ['Privacy', 'shareCalendar'],
      ['Integrations', 'googleCalendarSync'],
    ]) {
      await page.getByRole('tab', { name: tabName }).click();
      await page.locator(`[data-setting="${controlName}"]`).check();
      await page.locator('[data-settings-save]').click();
      const preferences = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), settingsKey));
      assert.equal(preferences[controlName], true, `${controlName} is stored locally`);
    }
    results.interactions.push({
      route: '/scheduler-settings',
      state: 'all six tabs, account-scoped save/reload/reset, local-only toggles, JSON import/export, and rejection of invalid duration/time values without overwriting stored settings pass',
      download_name: download.suggestedFilename(),
      verified_fields: ['user_id', 'defaultDuration', 'timezone', 'workingDays'],
    });
    assert.equal(await page.locator('[data-settings-status]').innerText(), 'Settings saved in this browser.');
    await page.screenshot({ path: path.join(output, 'scheduler-settings-imported-desktop.png'), fullPage: false });

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
    await storagePage.goto(`${baseUrl}/scheduler-settings`, { waitUntil: 'domcontentloaded' });
    await storagePage.getByText('Saved settings could not be read. Defaults are shown; saving will replace the unreadable value.').waitFor();
    await storagePage.locator('[data-settings-save]').click();
    await storagePage.getByText('synthetic storage write denied', { exact: true }).waitFor();
    results.interactions.push({ route: '/scheduler-settings', state: 'localStorage read/write failures announce a recoverable error and retain editable defaults' });
    await storageContext.close();
  }
  if (wave === 'w7' && slug === 'activity-log' && viewport.name === 'desktop') {
    const key = await page.locator('[data-activity-root]').getAttribute('data-activity-key');
    assert.equal(key, 'voiceform_activity_11111111-1111-4111-8111-111111111111');
    await page.evaluate((activityKey) => {
      localStorage.removeItem(activityKey);
      localStorage.setItem('recentActivity', JSON.stringify([
        { id: 'other-account', type: 'form_completed', title: 'Prior account private item', time: new Date().toISOString(), user: 'Other' },
      ]));
    }, key);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Patient Intake - John Smith' }).waitFor();
    assert.equal(await page.getByText('Prior account private item').count(), 0);
    assert.ok(await page.evaluate((activityKey) => localStorage.getItem(activityKey), key));
    assert.ok(await page.evaluate(() => localStorage.getItem('recentActivity')));
    results.interactions.push({ route: '/activitylog', state: 'account-scoped activity ignores but preserves unscoped legacy activity data' });

    const xssTitle = '<img src=x onerror="window.__activityXss=true"> Current account record';
    const items = [
      { id: 'xss', type: 'form_completed', title: xssTitle, description: 'needle first', time: new Date().toISOString(), user: 'Current account' },
      { id: 'recent', type: 'form_started', title: 'Recent synthetic record', description: 'needle second', time: new Date(Date.now() - 2 * 86400000).toISOString(), user: 'Current account' },
      { id: 'old', type: 'template_created', title: 'Older synthetic record', description: 'old item', time: new Date(Date.now() - 8 * 86400000).toISOString(), user: 'Current account' },
    ];
    await page.evaluate(({ activityKey, seeded }) => localStorage.setItem(activityKey, JSON.stringify(seeded)), { activityKey: key, seeded: items });
    await page.reload({ waitUntil: 'domcontentloaded' });
    const activityRows = page.locator('[data-activity-list] article');
    await page.waitForFunction(() => document.querySelectorAll('[data-activity-list] article').length === 3);
    assert.equal(await page.getByRole('heading', { name: xssTitle }).count(), 1);
    assert.equal(await page.locator('[data-activity-list] img').count(), 0);
    assert.equal(await page.evaluate(() => window.__activityXss || false), false);

    const search = page.locator('[data-activity-filter] [name="q"]');
    const type = page.locator('[data-activity-filter] [name="type"]');
    const range = page.locator('[data-activity-filter] [name="range"]');
    await search.fill('needle');
    assert.equal(await activityRows.count(), 2);
    await type.selectOption('form_completed');
    assert.equal(await activityRows.count(), 1);
    await range.selectOption('today');
    assert.equal(await activityRows.count(), 1);
    await type.selectOption('all');
    await search.fill('');
    await range.selectOption('7');
    assert.equal(await activityRows.count(), 2);
    await range.selectOption('30');
    assert.equal(await activityRows.count(), 3);
    await page.screenshot({ path: path.join(output, 'activity-populated-desktop.png'), fullPage: false });

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: `Delete ${xssTitle}` }).click();
    assert.equal(await activityRows.count(), 2);
    assert.equal(await page.evaluate((activityKey) => JSON.parse(localStorage.getItem(activityKey)).some((item) => item.id === 'xss'), key), false);
    await page.evaluate((activityKey) => localStorage.setItem(activityKey, JSON.stringify([
      { id: 'refreshed', type: 'template_created', title: 'Refreshed account item', description: '', time: new Date().toISOString(), user: 'Current account' },
    ])), key);
    await page.locator('[data-activity-refresh]').click();
    await page.getByRole('heading', { name: 'Refreshed account item' }).waitFor();
    assert.equal(await activityRows.count(), 1);
    await search.fill('no matching item');
    await page.getByText('No activity matches these filters.', { exact: true }).waitFor();
    assert.deepEqual(consoleErrors, [], 'activity interactions should not emit browser errors');
    results.interactions.push({ route: '/activitylog', state: 'search/type/date filters, XSS-safe text, confirmed deletion, refresh, and empty state work on account-scoped records' });
  }
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
  assert.equal(await page.locator('input[name="next"]').inputValue(), '/auth/session/');
  assert.equal(await page.locator('form[data-submit-once]').count(), 1);
  await page.screenshot({ path: path.join(output, 'auth-login-desktop.png'), fullPage: false });
  await page.locator('#id_email').fill('browser-auth@example.invalid');
  await page.locator('#id_password').fill('synthetic-passphrase');
  await page.getByRole('button', { name: 'Show password' }).click();
  assert.equal(await page.locator('#id_password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  assert.equal(await page.locator('#id_password').getAttribute('type'), 'password');
  await page.locator('#id_remember_me').check();
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
  assert.match(await loginResponse.headerValue('hx-redirect') || '', /\/auth\/session\//);
  await page.waitForURL('**/auth/session/');
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
    state: 'safe-next rejects an external URL; rapid duplicate click creates one synthetic sign-in call; remember-me produces a bounded persistent session cookie',
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
  assert.equal(await page.getByRole('link', { name: 'Terms of Service' }).getAttribute('href'), '/terms');
  assert.equal(await page.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href'), '/privacy');
  await page.locator('#id_first_name').fill('Browser');
  await page.locator('#id_last_name').fill('Fixture');
  await page.locator('#id_email').fill('new-browser-auth@example.invalid');
  await page.locator('#id_password').fill('synthetic-passphrase');
  await page.locator('#id_confirm_password').fill('synthetic-passphrase');
  await page.locator('#id_accepted_terms').check();
  await page.screenshot({ path: path.join(output, 'auth-signup-mobile.png'), fullPage: false });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/auth/session/');
  await page.getByRole('heading', { name: 'Signed in' }).waitFor();
  assert.equal(await page.getByText('new-browser-auth@example.invalid').count(), 1);
  await page.screenshot({ path: path.join(output, 'auth-signup-session-desktop.png'), fullPage: false });
  results.interactions.push({ route: '/signup', state: 'valid signup creates a synthetic authenticated Django session without provider or email calls' });

  await page.locator('form[action="/logout/"] button[type="submit"]').click();
  await page.waitForURL(/\/login\/?(?:\?.*)?$/);
  const afterLogout = await page.goto(`${baseUrl}/auth/session/`, { waitUntil: 'domcontentloaded' });
  assert.ok([200, 302].includes(afterLogout.status()));
  await page.waitForURL(/\/login\/?(?:\?.*)?$/);
  assert.equal(new URL(page.url()).searchParams.get('next'), '/auth/session/');
  results.interactions.push({ route: '/logout', state: 'logout clears the session and protected route requires sign-in again' });
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
  await validationPage.getByRole('button', { name: 'Sign in' }).click();
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
  await validationPage.getByRole('button', { name: 'Sign in' }).click();
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
  const outageResponse = await Promise.all([
    outagePage.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/login/'),
    outagePage.getByRole('button', { name: 'Sign in' }).click(),
  ]).then(([response]) => response);
  assert.equal(outageResponse.status(), 503);
  await outagePage.getByRole('alert').getByText('Authentication is temporarily unavailable. Please try again.').waitFor();
  assert.equal(await outagePage.getByText('provider-down').count(), 0);
  await outagePage.screenshot({ path: path.join(output, 'auth-provider-unavailable-mobile.png'), fullPage: false });
  results.interactions.push({ route: '/login', state: 'synthetic provider outage shows a safe retryable error without exposing credentials; recovery email and OAuth remain unavailable by contract' });
  await outageContext.close();
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  assert.ok(referenceRun, 'Set P7_REFERENCE_RUN to the exact freshly captured source evidence run.');
  const sourceManifestPath = path.join(sourceOutput, 'capture-results.json');
  sourceReferenceManifest = JSON.parse(await fs.readFile(sourceManifestPath, 'utf8'));
  assert.equal(sourceReferenceManifest.run_id, referenceRun,
    'The selected source manifest must identify the exact requested reference run.');
  assert.equal(sourceReferenceManifest.waves?.[wave]?.wave, wave.toUpperCase(),
    `Source run ${referenceRun} has no ${wave.toUpperCase()} capture.`);
  const currentSourceProvenance = captureSourceProvenance(root);
  assert.deepEqual(sourceReferenceManifest.source_provenance, currentSourceProvenance,
    'The source working tree changed after its captured reference run; recapture source before comparison.');
  sourceReferencePages = sourceReferenceManifest.waves[wave].pages;
  results.source_reference = {
    run_id: referenceRun,
    captured_at: sourceReferenceManifest.captured_at,
    git_revision: currentSourceProvenance.git_revision,
    worktree_digest: currentSourceProvenance.worktree_digest,
    file_count: currentSourceProvenance.file_count,
    source_manifest_sha256: crypto.createHash('sha256').update(await fs.readFile(sourceManifestPath)).digest('hex'),
  };
  results.negative_control_checks = [];
  const browser = await chromium.launch({ headless: true });
  results.browser = browser.version();
  try {
    for (const route of appRoutes[wave]) {
      for (const viewport of viewports) await capture(browser, route, viewport);
    }
    if (wave === 'w3') await checkAuthJourneys(browser);
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
