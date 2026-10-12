// Independent, local-only review probes. No hosted writes or live providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const repo = path.resolve(__dirname, '../../../..');
const django = path.join(repo, 'migration/django');
const python = path.join(django, '.venv-p2/Scripts/python.exe');
const database = path.join(django, `.session-review-${process.pid}.sqlite3`);
const base = 'http://127.0.0.1:18975';
const result = { reviewed_at: new Date().toISOString(), boundary: 'local synthetic browser fixtures; no hosted writes/providers', findings: [] };

function probeSourceGate() {
  const code = fs.readFileSync(path.join(django, 'scripts/p7_application_browser_check.cjs'), 'utf8');
  const context = { assert };
  vm.createContext(context);
  vm.runInContext(code.slice(code.indexOf('const ROUTE_CONTRACTS ='), code.indexOf('async function capture'))
    + '\nthis.contracts = ROUTE_CONTRACTS; this.negativeControls = checkContractNegativeControls;', context);
  const sourceGuardStart = code.indexOf('  if (contract.source_heading) {', code.indexOf('async function capture'));
  const sourceGuardEnd = code.indexOf('  assertRouteContract({ ...djangoInfo', sourceGuardStart);
  const sourceGuard = new vm.Script(code.slice(sourceGuardStart, sourceGuardEnd));
  const evidence = JSON.parse(fs.readFileSync(path.join(repo, 'docs/pages/evidence/w4/closeout-20261012/django/browser-results.json'), 'utf8'));
  const source = evidence.pages[0].comparison;
  context.contract = context.contracts.dashboard;
  context.route = '/dashboard';
  const sourceInfo = {
    heading: source.source_heading,
    section_headings: source.source_section_headings,
    field_names: source.source_field_names,
    button_labels: source.source_button_labels,
    local_destinations: source.source_local_destinations,
    text: 'retained source content',
  };
  const mutations = {
    removed_source_sections: { ...sourceInfo, section_headings: [] },
    removed_source_controls: { ...sourceInfo, button_labels: [] },
    removed_source_destinations: { ...sourceInfo, local_destinations: [] },
    changed_source_fields: { ...sourceInfo, field_names: ['unexpected_field'] },
    removed_source_copy: { ...sourceInfo, text: '' },
  };
  const accepted = [];
  for (const [name, changed] of Object.entries(mutations)) {
    context.sourceInfo = changed;
    assert.doesNotThrow(() => sourceGuard.runInContext(context));
    accepted.push(name);
  }
  result.findings.push({ id: 'SR-1', source_guard: code.slice(sourceGuardStart, sourceGuardEnd).trim(), source_mutations_not_rejected: accepted, existing_toy_negative_controls: context.negativeControls(), limit: 'executes the exact source-side guard against recorded source metadata; not a whole Playwright rerun with edited source files' });
}

async function ready(child) {
  for (let count = 0; count < 80; count += 1) {
    if (child.exitCode !== null) throw new Error(`Review server exited: ${child.exitCode}`);
    try { if ((await fetch(`${base}/login`, { signal: AbortSignal.timeout(500) })).status < 500) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Review server did not become ready.');
}

async function main() {
  probeSourceGate();
  const env = { ...process.env, DJANGO_SETTINGS_MODULE: 'config.settings.browser', P7_BROWSER_DB_PATH: database };
  const migrated = spawnSync(python, ['manage.py', 'migrate', '--noinput'], { cwd: django, env, encoding: 'utf8', windowsHide: true });
  if (migrated.status !== 0) throw new Error(migrated.stderr || migrated.error?.message || 'Isolated migration failed.');
  const server = spawn(python, ['manage.py', 'runserver', '127.0.0.1:18975', '--noreload', '--insecure'], { cwd: django, env, stdio: 'ignore', windowsHide: true });
  let browser;
  try {
    await ready(server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/*', (route) => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await page.goto(`${base}/scheduler-settings`, { waitUntil: 'domcontentloaded' });
    const key = await page.locator('[data-settings-key]').getAttribute('data-settings-key');
    await page.locator('[data-setting="defaultDuration"]').fill('0');
    await page.locator('[data-settings-save]').click();
    const duration = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)).defaultDuration, key);
    const durationStatus = await page.locator('[data-settings-status]').innerText();
    assert.equal(duration, 0);
    assert.equal(durationStatus, 'Settings saved in this browser.');
    result.findings.push({ id: 'SR-3a', entered_duration: 0, input_min: await page.locator('[data-setting="defaultDuration"]').getAttribute('min'), saved_duration: duration, status: durationStatus });

    await page.locator('[data-settings-import]').setInputFiles({ name: 'invalid-working-hours.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ workingHours: { start: '25:99', end: '17:00' } })) });
    await page.waitForFunction(() => document.querySelector('[data-settings-status]').textContent.includes('Settings imported'));
    const importStatus = await page.locator('[data-settings-status]').innerText();
    const renderedStart = await page.locator('[data-setting="workingHours.start"]').inputValue();
    await page.locator('[data-settings-save]').click();
    const savedHours = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)).workingHours, key);
    assert.equal(renderedStart, '');
    assert.equal(savedHours.start, '');
    result.findings.push({ id: 'SR-3b', imported_start: '25:99', rendered_start: renderedStart, saved_hours: savedHours, import_status: importStatus, save_status: await page.locator('[data-settings-status]').innerText() });
    await page.screenshot({ path: path.join(__dirname, 'settings-invalid-values-saved.png') });

    await page.goto(`${base}/AIVoiceAutoFill?template=33333333-3333-4333-8333-333333333333`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-record-start]').waitFor();
    const lifecycle = await page.evaluate(() => {
      const button = document.querySelector('[data-record-start]');
      const before = button.disabled;
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      return { before, after: button.disabled };
    });
    assert.equal(lifecycle.before, false);
    assert.equal(lifecycle.after, true);
    result.findings.push({ id: 'OBS-1', synthetic_persisted_page_events: lifecycle, limit: 'does not prove browser BFCache eligibility or an actual back/forward restoration; P9 must exercise real navigation' });
    result.status = 'review findings reproduced';
    fs.writeFileSync(path.join(__dirname, 'session-review-results.json'), JSON.stringify(result, null, 2) + '\n');
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } finally {
    if (browser) await browser.close();
    server.kill();
    await new Promise((resolve) => server.exitCode !== null ? resolve() : server.once('exit', resolve));
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const target = database + suffix;
      if (path.dirname(target) === django && fs.existsSync(target)) fs.unlinkSync(target);
    }
  }
}

main().catch((error) => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
