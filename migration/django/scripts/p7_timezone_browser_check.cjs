const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const reactUrl = process.env.P7_REACT_BASE_URL || 'http://127.0.0.1:15573';
const djangoUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const output = process.env.P7_TIMEZONE_EVIDENCE_DIR || path.join(
  root, 'docs', 'pages', 'evidence', 'w6', 'p7-timezone-20261013',
);
const userId = '11111111-1111-4111-8111-111111111111';
const templateId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const fixtureUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'synthetic@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { first_name: 'Demo', last_name: 'User' },
};
const cases = [
  { id: 'utc-midnight', instant: '2026-10-13T00:30:00.000Z', zone: 'UTC' },
  { id: 'positive-offset-midnight', instant: '2026-10-12T20:30:00.000Z', zone: 'Asia/Kolkata' },
  { id: 'negative-offset-midnight', instant: '2026-10-13T00:30:00.000Z', zone: 'America/Los_Angeles' },
  { id: 'spring-before-transition', instant: '2026-03-08T09:30:00.000Z', zone: 'America/Los_Angeles' },
  { id: 'spring-after-transition', instant: '2026-03-08T10:30:00.000Z', zone: 'America/Los_Angeles' },
  { id: 'fall-after-transition', instant: '2026-11-01T08:30:00.000Z', zone: 'America/Los_Angeles' },
];

function eventFixture(day) {
  return {
    id: eventId,
    title: 'Review patient intake',
    description: 'Synthetic browser-capture schedule',
    date: day,
    time: '09:30:00',
    duration: 30,
    type: 'form_review',
    priority: 'high',
    attendees: ['Demo User'],
    location: 'Review room',
    form_id: templateId,
    reminder_minutes: 15,
    status: 'scheduled',
    created_by: userId,
    created_at: '2026-10-11T10:00:00.000Z',
    updated_at: '2026-10-11T10:00:00.000Z',
  };
}

function fixtureRows(request, day) {
  const url = new URL(request.url());
  const table = url.pathname.split('/').filter(Boolean).at(-1);
  const event = eventFixture(day);
  if (url.pathname.endsWith('/auth/v1/user')) return fixtureUser;
  if (table === 'templates') return [{
    id: templateId,
    name: 'Patient intake',
    category: 'healthcare',
    description: 'Synthetic browser-capture template',
    form_data: { fields: [{ id: 'patient_name', label: 'Patient name', type: 'text', required: true }] },
    visibility: 'visible',
    created_by: userId,
    created_at: '2026-10-11T10:00:00.000Z',
    updated_at: '2026-10-11T10:00:00.000Z',
    uploaded_file: null,
    shared_with: [],
    reviews: [],
  }];
  if (table !== 'scheduled_events') return [];

  const filters = url.searchParams.getAll('date');
  const after = filters.find((value) => value.startsWith('gte.'))?.slice(4);
  const before = filters.find((value) => value.startsWith('lte.'))?.slice(4);
  if ((after && day < after) || (before && day > before)) return [];
  if (url.searchParams.get('status') === 'eq.completed') return [];
  return [event];
}

function freezeBrowserClock(instant) {
  const timestamp = new Date(instant).getTime();
  const realDate = Date;
  class FrozenDate extends realDate {
    constructor(...args) {
      super(...(args.length ? args : [timestamp]));
    }
    static now() { return timestamp; }
  }
  Object.setPrototypeOf(FrozenDate, realDate);
  FrozenDate.parse = realDate.parse;
  FrozenDate.UTC = realDate.UTC;
  globalThis.Date = FrozenDate;
}

async function inspectSource(page, item) {
  await page.goto(`${reactUrl}/scheduler`, { waitUntil: 'commit', timeout: 60000 });
  await page.locator('h1').filter({ hasText: 'Scheduler' }).waitFor();
  await page.waitForTimeout(700);
  const values = await page.evaluate(() => {
    const pad = (part) => String(part).padStart(2, '0');
    const now = new Date();
    const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const cells = [...document.querySelectorAll('div')]
      .filter((node) => node.classList.contains('min-h-[120px]'));
    const todayCell = cells.find((cell) =>
      [...cell.querySelectorAll(':scope > div')].some((node) => node.classList.contains('bg-blue-600')),
    );
    const eventCells = cells.filter((cell) => cell.innerText.includes('Review patient intake'));
    const month = [...document.querySelectorAll('h2')]
      .map((node) => node.innerText.trim())
      .find((text) => /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(text));
    const cellDay = (cell) => {
      const value = cell?.querySelector(':scope > div')?.innerText.trim() || '';
      return /^\d+$/.test(value) ? Number(value) : null;
    };
    return {
      local_date: localDate,
      month,
      highlighted_today_day: cellDay(todayCell),
      event_days: eventCells.map(cellDay).filter((value) => value !== null),
      browser_zone_label: new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).format(now),
    };
  });
  return { ...values, screenshot: `source-${item.id}.png` };
}

async function inspectDjango(page, item, eventDate) {
  await page.route(`${djangoUrl}/**`, async (route) => {
    const headers = await route.request().allHeaders();
    await route.continue({
      headers: {
        ...headers,
        'x-p7-fixture-reset': '1',
        'x-p7-fixture-event-date': eventDate,
        'x-p7-frozen-now': item.instant,
      },
    });
  });
  const response = await page.goto(`${djangoUrl}/scheduler`, { waitUntil: 'commit', timeout: 60000 });
  assert.equal(response?.status(), 200, `Django scheduler returned ${response?.status()} at ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 300)}`);
  assert.equal(new URL(page.url()).pathname, '/scheduler', `Django scheduler redirected to ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 300)}`);
  await page.locator('#calendar-title').waitFor();
  const values = await page.evaluate(() => {
    const grid = document.querySelector('[role="grid"]');
    const links = [...(grid?.querySelectorAll('a[aria-label^="Show week containing"]') || [])];
    const selected = links.find((link) => link.classList.contains('text-blue-700'));
    const eventCells = links.filter((link) => {
      let cell = link.parentElement;
      while (cell && !(cell.classList.contains('border-b') && cell.classList.contains('border-r') && cell.querySelector('ul'))) {
        cell = cell.parentElement;
      }
      return cell?.innerText.includes('Review patient intake') || false;
    });
    return {
      month: document.querySelector('#calendar-title')?.innerText.trim() || null,
      selected_today_link: selected?.getAttribute('href') || null,
      selected_today_label: selected?.getAttribute('aria-label') || null,
      event_dates: eventCells.map((link) => new URL(link.href, location.href).searchParams.get('date')),
      today_target: [...document.querySelectorAll('#calendar-title ~ * a')]
        .find((link) => link.textContent.trim() === 'Today')?.getAttribute('href') || null,
      local_date: (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      })(),
    };
  });
  return { ...values, screenshot: `django-${item.id}.png` };
}

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = {
    captured_at: new Date().toISOString(),
    source_boundary: 'Current React Scheduler with intercepted synthetic Supabase responses and frozen browser Date',
    django_boundary: 'Django scheduler page with isolated synthetic data and browser-only frozen UTC request header',
    contract: 'P5 stores entered date/time values and derives date boundaries in UTC. React calendar labels/today are browser-local; month matching calls toISOString on local midnight.',
    cases: [],
  };
  try {
    for (const item of cases) {
      const utcDate = item.instant.slice(0, 10);
      const sourceContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        timezoneId: item.zone,
      });
      await sourceContext.addInitScript(freezeBrowserClock, item.instant);
      await sourceContext.addInitScript(({ eventDate }) => {
        const now = Math.floor(Date.now() / 1000);
        localStorage.setItem('sb-127-auth-token', JSON.stringify({
          access_token: 'synthetic-browser-capture-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          refresh_token: 'synthetic-browser-capture-refresh',
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'synthetic@example.invalid',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { first_name: 'Demo', last_name: 'User' },
          },
        }));
      }, { eventDate: utcDate });
      const sourcePage = await sourceContext.newPage();
      const sourceErrors = [];
      sourcePage.on('pageerror', (error) => sourceErrors.push(error.message));
      sourcePage.on('console', (message) => { if (message.type() === 'error') sourceErrors.push(message.text()); });
      await sourcePage.route('http://127.0.0.1:9/**', async (route) => {
        const body = fixtureRows(route.request(), utcDate);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': '0-0/1' },
          body: JSON.stringify(body),
        });
      });
      await sourcePage.route('http://localhost:3001/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
      const source = await inspectSource(sourcePage, item);
      await sourcePage.screenshot({ path: path.join(output, source.screenshot), fullPage: false });
      await sourceContext.close();

      const djangoContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        timezoneId: item.zone,
      });
      await djangoContext.addInitScript(freezeBrowserClock, item.instant);
      const djangoPage = await djangoContext.newPage();
      const djangoErrors = [];
      djangoPage.on('pageerror', (error) => djangoErrors.push(error.message));
      djangoPage.on('console', (message) => { if (message.type() === 'error') djangoErrors.push(message.text()); });
      const django = await inspectDjango(djangoPage, item, utcDate);
      await djangoPage.screenshot({ path: path.join(output, django.screenshot), fullPage: false });
      await djangoContext.close();

      assert.equal(django.local_date, source.local_date, `${item.id}: both browsers must observe the same local frozen date`);
      assert.equal(source.highlighted_today_day, Number(source.local_date.slice(-2)),
        `${item.id}: the source calendar highlight must follow its browser-local Today date`);
      assert.equal(new URL(django.selected_today_link, djangoUrl).searchParams.get('date'), utcDate,
        `${item.id}: the Django Today selection must follow the P5 UTC date-only boundary`);
      assert.equal(django.selected_today_label, `Show week containing ${new Date(`${utcDate}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })}`,
        `${item.id}: Django selected calendar day must follow the P5 UTC date`);
      assert.ok(django.event_dates.includes(utcDate),
        `${item.id}: Django must render the date-only event on its stored P5 date ${utcDate}`);
      assert.deepEqual(sourceErrors, [], `${item.id}: source page must render without browser errors`);
      assert.deepEqual(djangoErrors, [], `${item.id}: Django page must render without browser errors`);

      results.cases.push({
        id: item.id,
        frozen_instant_utc: item.instant,
        browser_zone: item.zone,
        p5_utc_calendar_date: utcDate,
        source,
        django,
        browser_errors: { source: sourceErrors, django: djangoErrors },
        observed_difference: source.local_date === utcDate
          ? 'Source local Today and the Django/P5 UTC Today date agree.'
          : `Source local Today is ${source.local_date}; Django/P5 UTC Today is ${utcDate}.`,
        source_event_day_difference: source.event_days.some((day) => day !== Number(utcDate.slice(-2)))
          ? `Source places the UTC date-only event on local day ${source.event_days.join(', ')}.`
          : 'Source and Django show the date-only event on the stored calendar day.',
      });
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(output, 'timezone-comparison-results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ cases: results.cases.length, output }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
