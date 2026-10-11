const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:8000';
const root = path.resolve(__dirname, '..', '..', '..');
const wave = process.argv.includes('--wave=w2') ? 'w2' : 'w1';
const legacyDir = path.join(root, 'docs', 'pages', 'evidence', wave, 'legacy');
const evidenceRun = process.env.P7_EVIDENCE_RUN || '';
if (evidenceRun && !/^[a-z0-9][a-z0-9_-]{0,47}$/i.test(evidenceRun)) {
  throw new Error('P7_EVIDENCE_RUN must be a short filesystem-safe label.');
}
const evidenceDir = path.join(
  root,
  'docs',
  'pages',
  'evidence',
  wave,
  ...(evidenceRun ? [evidenceRun] : []),
  'django',
);
const w1Routes = [
  ['terms', '/terms'],
  ['privacy', '/privacy'],
  ['open', '/open'],
  ['about', '/about'],
  ['security', '/security'],
  ['pricing', '/pricing'],
  ['industries', '/industries'],
  ['features', '/features'],
  ['contact', '/contact'],
  ['status', '/status'],
  ['help-center', '/help-center'],
];
const routes = wave === 'w2' ? [['home', '/'], ['documentation', '/documentation']] : w1Routes;
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const results = {
  source: `Django pages, ${wave.toUpperCase()} test settings (DEBUG=false; preview and legacy fallback disabled)`,
  base_url: baseUrl,
  browser: null,
  pages: [],
  interactions: [],
  local_probes: [],
};

function assertContentParity(comparison) {
  assert.equal(
    comparison.source_heading,
    comparison.django_heading,
    `${comparison.route} must preserve its source heading`,
  );
  assert.equal(
    comparison.normalized_page_text_matches,
    true,
    `${comparison.route} must preserve visible text and section order`,
  );
  assert.deepEqual(
    comparison.local_link_destinations_missing_from_django,
    [],
    `${comparison.route} must preserve every source local destination`,
  );
  assert.deepEqual(
    comparison.local_link_destinations_added_in_django,
    [],
    `${comparison.route} must not add unreviewed local destinations`,
  );
}

function verifyContentParityGuard() {
  const passing = {
    route: '/features',
    source_heading: 'Features',
    django_heading: 'Features',
    normalized_page_text_matches: true,
    local_link_destinations_missing_from_django: [],
    local_link_destinations_added_in_django: [],
  };
  assert.doesNotThrow(() => assertContentParity(passing));
  assert.throws(
    () => assertContentParity({ ...passing, normalized_page_text_matches: false }),
    /visible text and section order/,
    'a missing or reordered section must fail the content gate',
  );
  assert.throws(
    () => assertContentParity({
      ...passing,
      local_link_destinations_missing_from_django: ['/pricing'],
    }),
    /source local destination/,
    'a removed source destination must fail the link gate',
  );
}

async function saveScreenshot(page, filename) {
  await page.screenshot({ path: path.join(evidenceDir, filename), fullPage: true });
}

async function checkPage(browser, slug, route, viewport, references) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const failedRequests = [];
  const localResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || null });
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl) localResponses.push({ path: url.pathname, status: response.status() });
  });

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200, `${route} should render through Django`);
  assert.equal(response?.headers()['x-legacy-proxy'], undefined, `${route} must not use legacy fallback`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const pageInfo = await page.evaluate(() => {
    const main = document.querySelector('#main-content');
    return {
      title: document.title,
      heading: main?.querySelector('h1')?.innerText.trim() ?? null,
      body_font: getComputedStyle(document.body).fontFamily,
      document_width: document.documentElement.scrollWidth,
      viewport_width: document.documentElement.clientWidth,
      font_status: document.fonts.status,
      has_react_root: Boolean(document.querySelector('#root,[data-reactroot]')),
      has_react_bootstrap: [...document.scripts].some((script) =>
        script.type === 'module' || /\/assets\/index-/.test(script.src)),
      local_links: [...(main?.querySelectorAll('a[href]') || [])]
        .map((anchor) => anchor.getAttribute('href'))
        .filter((href) => href && !/^(?:https?:|mailto:|tel:|#)/i.test(href))
        .sort(),
    };
  });
  assert.deepEqual(consoleErrors, [], `${route} should not emit browser console errors`);
  assert.deepEqual(failedRequests, [], `${route} should not have failed browser requests`);
  assert.ok(localResponses.every((item) => item.status < 400), `${route} should load its local assets`);
  assert.ok(pageInfo.heading, `${route} should have a page heading`);
  assert.equal(pageInfo.has_react_root, false, `${route} should not mount React`);
  assert.equal(pageInfo.has_react_bootstrap, false, `${route} should not load a React bundle`);
  assert.equal(pageInfo.document_width > pageInfo.viewport_width, false,
    `${route} should not overflow at ${viewport.width}px`);

  const source = references.pages.find((item) =>
    item.route === route && item.viewport.width === viewport.width);
  assert.ok(source, `current React baseline is required for ${route} at ${viewport.width}px`);
  const sourceMarkup = await fs.readFile(path.join(legacyDir, `${slug}.html`), 'utf8');
  const sourceLinks = await page.evaluate((markup) => {
    const document = new DOMParser().parseFromString(markup, 'text/html');
    return [...document.querySelectorAll('a[href]')]
      .map((anchor) => anchor.getAttribute('href'))
      .filter((href) => href && !/^(?:https?:|mailto:|tel:|#)/i.test(href))
      .sort();
  }, sourceMarkup);
  const sourceText = await page.evaluate((markup) => {
    const document = new DOMParser().parseFromString(markup, 'text/html');
    document.body.querySelectorAll('.sr-only,[aria-hidden="true"]').forEach((element) => element.remove());
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.nodeValue || '');
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }, sourceMarkup);
  const djangoTextResult = await page.locator('#main-content').evaluate((element, currentRoute) => {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('.sr-only,[aria-hidden="true"]').forEach((item) => item.remove());
    let reviewedVisibleText = [];
    if (currentRoute === '/help-center') {
      const searchButton = copy.querySelector('button[type="submit"]');
      const label = searchButton?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
      reviewedVisibleText = [{ element: 'button[type="submit"]', text: label }];
      if (label === 'Search') searchButton.remove();
    }
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.nodeValue || '');
    return {
      text: parts.join(' ').replace(/\s+/g, ' ').trim(),
      reviewed_visible_text: reviewedVisibleText,
    };
  }, route);
  const djangoText = djangoTextResult.text;
  const sourceWords = sourceText.split(/\s+/);
  const djangoWords = djangoText.split(/\s+/);
  const sourceCounts = new Map();
  const djangoCounts = new Map();
  for (const word of sourceWords) sourceCounts.set(word, (sourceCounts.get(word) || 0) + 1);
  for (const word of djangoWords) djangoCounts.set(word, (djangoCounts.get(word) || 0) + 1);
  const missingText = [];
  const addedText = [];
  for (const [word, count] of sourceCounts) {
    const difference = count - (djangoCounts.get(word) || 0);
    for (let index = 0; index < difference; index++) missingText.push(word);
  }
  for (const [word, count] of djangoCounts) {
    const difference = count - (sourceCounts.get(word) || 0);
    for (let index = 0; index < difference; index++) addedText.push(word);
  }
  const difference = (left, right) => {
    const remaining = new Map();
    for (const value of right) remaining.set(value, (remaining.get(value) || 0) + 1);
    return left.filter((value) => {
      const count = remaining.get(value) || 0;
      if (count === 0) return true;
      remaining.set(value, count - 1);
      return false;
    });
  };
  const comparison = {
    route,
    viewport: `${viewport.width}x${viewport.height}`,
    source_heading: source.heading,
    django_heading: pageInfo.heading,
    source_body_font: source.bodyFont,
    django_body_font: pageInfo.body_font,
    source_horizontal_overflow: source.horizontal_overflow,
    django_horizontal_overflow: pageInfo.document_width > pageInfo.viewport_width,
    legacy_html_bytes: source.main_html_bytes,
    normalized_page_text_matches: sourceText === djangoText,
    reviewed_visible_text_allowlist: djangoTextResult.reviewed_visible_text,
    source_text_characters: sourceText.length,
    django_text_characters: djangoText.length,
    text_tokens_missing_from_django: missingText,
    text_tokens_added_in_django: addedText,
    local_link_destinations_missing_from_django: difference(sourceLinks, pageInfo.local_links),
    local_link_destinations_added_in_django: difference(pageInfo.local_links, sourceLinks),
    django_local_links: pageInfo.local_links,
    console_errors: consoleErrors,
    failed_requests: failedRequests,
    local_responses: localResponses,
  };
  if (route === '/help-center') {
    assert.deepEqual(
      comparison.reviewed_visible_text_allowlist,
      [{ element: 'button[type="submit"]', text: 'Search' }],
      'Help Center must retain exactly the reviewed visible Search button label',
    );
  } else {
    assert.deepEqual(comparison.reviewed_visible_text_allowlist, []);
  }
  assertContentParity(comparison);
  await saveScreenshot(page, `${slug}-${viewport.name}.png`);
  results.pages.push({ route, viewport, ...pageInfo, comparison });
  await page.close();
}

async function checkPrivacy(browser) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const successPage = await context.newPage({ viewport: viewports[0] });
  const response = await successPage.goto(`${baseUrl}/privacy`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  const copyButton = successPage.getByRole('button', { name: /Copy PGP Key/i });
  await copyButton.click();
  await successPage.getByText('Copied', { exact: true }).waitFor({ timeout: 3000 });
  await saveScreenshot(successPage, 'privacy-copy-success.png');
  results.interactions.push({ route: '/privacy', state: 'clipboard write succeeds and transient success is shown' });

  const deniedPage = await context.newPage({ viewport: viewports[0] });
  await deniedPage.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
    });
  });
  await deniedPage.goto(`${baseUrl}/privacy`, { waitUntil: 'domcontentloaded' });
  await deniedPage.getByRole('button', { name: /Copy PGP Key/i }).click();
  await deniedPage.getByText('Copy failed. Select and copy the key above.', { exact: true }).waitFor();
  await saveScreenshot(deniedPage, 'privacy-copy-denied.png');
  results.interactions.push({ route: '/privacy', state: 'clipboard denial gives accessible recovery feedback' });

  const toc = successPage.locator('#main-content a[href^="#"]').first();
  assert.ok(await toc.count(), 'Privacy Notice should provide table-of-contents links');
  const href = await toc.getAttribute('href');
  await toc.focus();
  assert.equal(await toc.evaluate((element) => document.activeElement === element), true);
  await toc.press('Enter');
  assert.equal(new URL(successPage.url()).hash, href, 'Privacy table-of-contents link should navigate to its anchor');
  results.interactions.push({ route: '/privacy', state: 'keyboard-focusable table-of-contents anchor navigation' });
  await context.close();
}

async function checkHelpCenter(browser) {
  const page = await browser.newPage({ viewport: viewports[0] });
  await page.goto(`${baseUrl}/help-center`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByText('6 articles found', { exact: true }).count(), 1);
  await saveScreenshot(page, 'help-center-default.png');

  await page.locator('#help-search').fill('first voice form');
  await page.locator('#help-search').press('Enter');
  await page.getByText('1 articles found', { exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'How to create your first voice form' }).count(), 1);
  await page.locator('form[aria-label="Filter help articles by category"] button[value="getting-started"]').click();
  await page.getByText('1 articles found', { exact: true }).waitFor();
  assert.match(page.url(), /category=getting-started/);
  assert.match(page.url(), /q=first\+voice\+form/);
  await saveScreenshot(page, 'help-center-search-category.png');
  results.interactions.push({ route: '/help-center', state: 'case-insensitive title search combined with category; count is 1' });

  await page.goto(`${baseUrl}/help-center?category=voice-features`, { waitUntil: 'domcontentloaded' });
  await page.getByText('2 articles found', { exact: true }).waitFor();
  results.interactions.push({ route: '/help-center', state: 'category filter returns two reviewed Voice Features items' });

  await page.goto(`${baseUrl}/help-center?q=no-such-title`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'No articles found' }).waitFor();
  await saveScreenshot(page, 'help-center-no-results.png');
  await page.getByRole('link', { name: 'Browse All Articles' }).click();
  await page.getByText('6 articles found', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).search, '');
  results.interactions.push({ route: '/help-center', state: 'no-match state and browse-all reset' });
  await page.close();
}

async function checkDocumentation(browser) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const successPage = await context.newPage({ viewport: viewports[0] });
  await successPage.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
  const copyButton = successPage.getByRole('button', { name: 'Copy' }).first();
  const displayedCode = await successPage.locator('pre code').first().textContent();
  await copyButton.click();
  await successPage.getByRole('button', { name: 'Copied' }).first().waitFor();
  await successPage.getByText('Copied code to clipboard.', { exact: true }).waitFor();
  const copiedCode = await successPage.evaluate(() => navigator.clipboard.readText());
  assert.equal(copiedCode.replace(/\r\n/g, '\n'), (displayedCode || '').replace(/\r\n/g, '\n'));
  await saveScreenshot(successPage, 'documentation-copy-success.png');
  results.interactions.push({ route: '/documentation', state: 'copy preserves displayed code and reports clipboard success' });

  const deniedPage = await context.newPage({ viewport: viewports[0] });
  await deniedPage.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
    });
  });
  await deniedPage.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
  await deniedPage.getByRole('button', { name: 'Copy' }).first().click();
  await deniedPage.getByText('Copy failed. Select and copy this block above.', { exact: true }).waitFor();
  await saveScreenshot(deniedPage, 'documentation-copy-denied.png');
  results.interactions.push({ route: '/documentation', state: 'clipboard denial exposes accessible recovery feedback' });

  const toc = successPage.locator('a[href="#pipeline"]').first();
  await toc.focus();
  await toc.press('Enter');
  assert.equal(new URL(successPage.url()).hash, '#pipeline');
  results.interactions.push({ route: '/documentation', state: 'keyboard-operable section navigation' });
  await context.close();
}

async function checkLocalDenials(browser) {
  const page = await browser.newPage({ viewport: viewports[0] });
  for (const [url, expectedStatus] of [
    [`${baseUrl}/reset-password`, 404],
    [`${baseUrl}/terms?access_token=synthetic`, 400],
  ]) {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), expectedStatus, `denied route probe ${url}`);
    results.local_probes.push({
      path: new URL(url).pathname,
      status: response.status(),
      legacy_proxy_marker: response.headers()['x-legacy-proxy'] || null,
    });
  }
  const encoded = await page.goto(`${baseUrl}/%66eatures`, { waitUntil: 'domcontentloaded' });
  assert.ok([200, 400].includes(encoded?.status()), 'encoded migrated path must resolve or deny locally');
  assert.equal(encoded?.headers()['x-legacy-proxy'], undefined);
  results.local_probes.push({
    path: '/%66eatures',
    status: encoded.status(),
    legacy_proxy_marker: null,
    note: 'Chromium/Django runserver normalizes this encoded migrated route before the page view.',
  });
  await page.close();
}

async function checkCompiledRollback() {
  const rollbackResults = {
    source: 'reviewed compiled legacy bundle; P7 rollback owner=/features; preview is loopback-only',
    base_url: baseUrl,
    browser: null,
    route: '/features',
    expected_fallback_page_counts: { before: 10, selected_rollback: 11, restored: 10 },
    fallback_count_evidence:
      'W1 10/11/10 is measured from the archived W1 route inventory by test_w1_snapshot_rollback_counts_are_measured_from_its_route_inventory; final-state 0/1/0 owner changes for public and protected routes are measured by test_route_rollback_changes_actual_owner_and_restores_fallback_count',
    pages: [],
    bundle_assets: [],
  };
  const inventory = JSON.parse(await fs.readFile(
    path.join(root, 'migration', 'django', 'config', 'p6_legacy_assets.json'),
    'utf8',
  ));
  const expectedBundles = inventory.assets
    .filter((asset) => asset.path.startsWith('/assets/'))
    .map((asset) => asset.path);
  const browser = await chromium.launch({ headless: true });
  rollbackResults.browser = browser.version();
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const consoleErrors = [];
      const failedRequests = [];
      const assetResponses = new Map();
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      page.on('requestfailed', (request) => failedRequests.push(request.url()));
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === baseUrl && url.pathname.startsWith('/assets/')) {
          assetResponses.set(url.pathname, {
            status: response.status(),
            legacy_proxy_marker: response.headers()['x-legacy-proxy'] || null,
          });
        }
      });
      const response = await page.goto(`${baseUrl}/features`, { waitUntil: 'domcontentloaded' });
      assert.equal(response?.status(), 200);
      assert.equal(response?.headers()['x-legacy-proxy'], '1', 'selected rollback must use the approved bridge');
      await page.locator('#root main').waitFor({ state: 'visible' });
      await page.waitForFunction(() => Boolean(document.querySelector('#root main h1')));
      await page.waitForLoadState('networkidle');
      const pageInfo = await page.evaluate(() => ({
        title: document.title,
        heading: document.querySelector('#root main h1')?.innerText.trim() || null,
        document_width: document.documentElement.scrollWidth,
        viewport_width: document.documentElement.clientWidth,
        react_root_present: Boolean(document.querySelector('#root')),
      }));
      assert.ok(pageInfo.heading, 'compiled React route should render its actual page content');
      assert.ok(pageInfo.react_root_present);
      for (const assetPath of expectedBundles) {
        const asset = assetResponses.get(assetPath);
        assert.equal(asset?.status, 200, `${assetPath} should be served from the reviewed bundle`);
        assert.equal(asset?.legacy_proxy_marker, '1', `${assetPath} should use the exact asset bridge`);
      }
      assert.deepEqual(consoleErrors, []);
      assert.deepEqual(failedRequests, []);
      const screenshotPath = path.join(evidenceDir, `features-rollback-${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      rollbackResults.pages.push({
        viewport,
        ...pageInfo,
        response_status: response.status(),
        response_proxy_marker: response.headers()['x-legacy-proxy'],
        bundle_assets: Object.fromEntries(assetResponses),
        console_errors: consoleErrors,
        failed_requests: failedRequests,
        screenshot: path.basename(screenshotPath),
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  rollbackResults.bundle_assets = expectedBundles;
  await fs.writeFile(
    path.join(evidenceDir, 'rollback-results.json'),
    `${JSON.stringify(rollbackResults, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(rollbackResults, null, 2)}\n`);
}

async function main() {
  verifyContentParityGuard();
  await fs.mkdir(evidenceDir, { recursive: true });
  const references = JSON.parse(await fs.readFile(path.join(legacyDir, 'capture-results.json'), 'utf8'));
  const browser = await chromium.launch({ headless: true });
  results.browser = browser.version();
  try {
    for (const [slug, route] of routes) {
      for (const viewport of viewports) {
        await checkPage(browser, slug, route, viewport, references);
      }
    }
    if (wave === 'w1') {
      await checkPrivacy(browser);
      await checkHelpCenter(browser);
      await checkLocalDenials(browser);
    } else {
      await checkDocumentation(browser);
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(evidenceDir, 'browser-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    pages: results.pages.length,
    interactions: results.interactions,
    local_probes: results.local_probes,
    overflows: results.pages.filter((page) => page.document_width > page.viewport_width).map((page) => page.route),
    output: evidenceDir,
  }, null, 2)}\n`);
}

const task = process.argv.includes('--rollback') ? checkCompiledRollback() : main();

task.catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
