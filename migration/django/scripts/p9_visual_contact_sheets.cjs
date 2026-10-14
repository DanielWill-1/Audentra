const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const runId = process.argv.find((argument) => argument.startsWith('--run-id='))?.slice(9);
const attemptValue = process.argv.find((argument) => argument.startsWith('--attempt='))?.slice(10) || '10';
const sourceAttempt = Number(process.argv.find((argument) => argument.startsWith('--source-attempt='))?.slice(17) || attemptValue);
const djangoAttempt = Number(process.argv.find((argument) => argument.startsWith('--django-attempt='))?.slice(17) || attemptValue);
const djangoFallbackValue = process.argv.find((argument) => argument.startsWith('--django-fallback-attempt='))?.slice(26);
const djangoFallbackAttempt = djangoFallbackValue ? Number(djangoFallbackValue) : null;
const evidenceRoot = path.join(root, 'docs', 'parity', 'evidence', 'p9', runId || '');
const sourceAttemptRoot = path.join(evidenceRoot, `attempt-${String(sourceAttempt).padStart(2, '0')}`);
const djangoAttemptRoot = path.join(evidenceRoot, `attempt-${String(djangoAttempt).padStart(2, '0')}`);
const djangoFallbackRoot = djangoFallbackAttempt === null
  ? null
  : path.join(evidenceRoot, `attempt-${String(djangoFallbackAttempt).padStart(2, '0')}`);
const outputArgument = process.argv.find((argument) => argument.startsWith('--output-dir='))?.slice(13);
const outputDirectory = outputArgument ? path.resolve(root, outputArgument) : path.join(sourceAttemptRoot, 'visual-review');
const resolvedScreenshots = new Map();
const routes = [
  ['/', 'home'],
  ['/features', 'features'],
  ['/industries', 'industries'],
  ['/security', 'security'],
  ['/pricing', 'pricing'],
  ['/about', 'about'],
  ['/contact', 'contact'],
  ['/status', 'status'],
  ['/help-center', 'help-center'],
  ['/documentation', 'documentation'],
  ['/terms', 'terms'],
  ['/privacy', 'privacy'],
  ['/open', 'open'],
  ['/login', 'login'],
  ['/signup', 'signup'],
  ['/forgot-password', 'forgot-password'],
  ['/reset-password', 'reset-password'],
  ['/dashboard', 'dashboard'],
  ['/templates', 'templates'],
  ['/scheduler', 'scheduler'],
  ['/manage-schedules', 'manage-schedules'],
  ['/scheduler-settings', 'scheduler-settings'],
  ['/filledtemplates', 'filled-templates'],
  ['/AIVoiceAutoFill', 'voice-autofill'],
  ['/activitylog', 'activity-log'],
];

function allFiles(directory) {
  const results = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(absolute);
      else if (entry.isFile()) results.push(absolute);
    }
  }
  return results;
}

function findScreenshot(runtime, basename) {
  const candidates = runtime === 'source'
    ? [sourceAttemptRoot]
    : [djangoAttemptRoot, djangoFallbackRoot].filter(Boolean);
  for (const attemptRoot of candidates) {
    if (!fs.existsSync(attemptRoot)) continue;
    const directory = path.join(attemptRoot, runtime);
    const matches = allFiles(directory).filter((file) => path.basename(file) === basename);
    if (matches.length > 1) {
      throw new Error(`Expected at most one ${runtime} screenshot named ${basename} in ${attemptRoot}; found ${matches.length}.`);
    }
    if (matches.length === 1) {
      resolvedScreenshots.set(`${runtime}:${basename}`, matches[0]);
      return matches[0];
    }
  }
  throw new Error(`No ${runtime} screenshot named ${basename} was found in the selected attempts.`);
}

function dataUri(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function sectionHtml(routeGroup, viewport) {
  return routeGroup.map(([route, slug]) => {
    const source = findScreenshot('source', `${slug}-${viewport}.png`);
    const django = findScreenshot('django', `${slug}-${viewport}.png`);
    return `<section class="route"><h2>${route}</h2><figure><figcaption>React source — ${viewport}</figcaption><img src="${dataUri(source)}"></figure><figure><figcaption>Django — ${viewport}</figcaption><img src="${dataUri(django)}"></figure><footer>Source: ${path.relative(evidenceRoot, source).replaceAll('\\', '/')}<br>Django: ${path.relative(evidenceRoot, django).replaceAll('\\', '/')}</footer></section>`;
  }).join('');
}

async function main() {
  assert.ok(runId && /^[a-z0-9][a-z0-9_-]{0,47}$/i.test(runId), 'A valid --run-id is required.');
  assert.ok(Number.isSafeInteger(sourceAttempt) && sourceAttempt > 0, 'A positive --source-attempt or --attempt number is required.');
  assert.ok(Number.isSafeInteger(djangoAttempt) && djangoAttempt > 0, 'A positive --django-attempt or --attempt number is required.');
  assert.ok(djangoFallbackAttempt === null || (Number.isSafeInteger(djangoFallbackAttempt) && djangoFallbackAttempt > 0), 'A positive --django-fallback-attempt is required when provided.');
  assert.ok(fs.existsSync(sourceAttemptRoot), `Source evidence attempt does not exist: ${sourceAttemptRoot}`);
  assert.ok(fs.existsSync(djangoAttemptRoot), `Django evidence attempt does not exist: ${djangoAttemptRoot}`);
  for (const [, slug] of routes) {
    for (const runtime of ['source', 'django']) {
      for (const viewport of ['desktop', 'mobile']) findScreenshot(runtime, `${slug}-${viewport}.png`);
    }
  }
  assert.ok(!fs.existsSync(outputDirectory), `Refusing to overwrite visual review evidence: ${outputDirectory}`);
  fs.mkdirSync(outputDirectory, { recursive: false });

  const browser = await chromium.launch({ headless: true });
  const sheets = [];
  try {
    const groups = [];
    for (let index = 0; index < routes.length; index += 5) groups.push(routes.slice(index, index + 5));
    for (const viewport of ['desktop', 'mobile']) {
      for (let index = 0; index < groups.length; index += 1) {
        const group = groups[index];
        const mobile = viewport === 'mobile';
        const imageWidth = mobile ? 190 : 340;
        const pageWidth = mobile ? 760 : 940;
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>
          *{box-sizing:border-box}body{margin:0;padding:20px;background:#f3f4f6;color:#172033;font:14px/1.4 system-ui,sans-serif}
          h1{margin:0 0 16px;font-size:22px}.route{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin:0 0 20px;padding:12px;background:#fff;border:1px solid #d7dbe2;border-radius:8px;break-inside:avoid}
          .route h2{grid-column:1/-1;margin:0;font:600 16px/1.3 system-ui,sans-serif}.route figure{margin:0;min-width:0}.route figcaption{margin-bottom:5px;font-size:12px;font-weight:600;color:#526077}
          .route img{display:block;width:${imageWidth}px;height:auto;max-width:100%;border:1px solid #cbd0d8;background:#fff}.route footer{grid-column:1/-1;color:#687386;font:10px/1.35 ui-monospace,monospace;overflow-wrap:anywhere}
        </style></head><body><h1>P9 paired ${viewport} captures — routes ${index * 5 + 1}–${Math.min(routes.length, index * 5 + group.length)} of ${routes.length}</h1>${sectionHtml(group, viewport)}</body></html>`;
        const page = await browser.newPage({ viewport: { width: pageWidth, height: 1200 }, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'load' });
        const filename = `${viewport}-${String(index + 1).padStart(2, '0')}.png`;
        const output = path.join(outputDirectory, filename);
        await page.screenshot({ path: output, fullPage: true });
        await page.close();
        sheets.push({ viewport, file: path.relative(evidenceRoot, output).split(path.sep).join('/'), routes: group.map(([route]) => route) });
      }
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    run_id: runId,
    source_attempt: sourceAttempt,
    django_attempt: djangoAttempt,
    django_fallback_attempt: djangoFallbackAttempt,
    status: 'ready_for_manual_review',
    route_count: routes.length,
    sheets,
    capture_sources: Object.fromEntries(resolvedScreenshots),
    boundary: 'Contact sheets compare default-state captures from the selected source and Django attempts; they are a review aid, not an automated visual score or full matrix pass.',
  };
  const output = path.join(outputDirectory, 'P9_VISUAL_CONTACT_SHEETS.json');
  fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ run_id: runId, source_attempt: sourceAttempt, django_attempt: djangoAttempt, django_fallback_attempt: djangoFallbackAttempt, route_count: routes.length, sheets: sheets.length, output })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
