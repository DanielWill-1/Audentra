const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const browserLaunchOptions = {
  headless: true,
  ...(process.env.P7_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.P7_CHROMIUM_EXECUTABLE_PATH }
    : {}),
};
const trace = (message) => {
  if (process.env.P7_BROWSER_TRACE === '1') process.stderr.write(`[p7-browser] ${message}\n`);
};

const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:8000';
const root = path.resolve(__dirname, '..', '..', '..');
const wave = process.argv.includes('--wave=w2') ? 'w2' : 'w1';
const routeFilter = process.argv.find((argument) => argument.startsWith('--route='))?.slice(8) || '';
const p9EvidenceDir = process.env.P9_EVIDENCE_DIR ? path.resolve(process.env.P9_EVIDENCE_DIR) : null;
const legacyDir = p9EvidenceDir
  ? path.join(p9EvidenceDir, 'source', wave)
  : path.join(root, 'docs', 'pages', 'evidence', wave, 'legacy');
const evidenceRun = process.env.P7_EVIDENCE_RUN || '';
if (evidenceRun && !/^[a-z0-9][a-z0-9_-]{0,47}$/i.test(evidenceRun)) {
  throw new Error('P7_EVIDENCE_RUN must be a short filesystem-safe label.');
}
const evidenceDir = p9EvidenceDir
  ? path.join(p9EvidenceDir, 'django', wave)
  : path.join(
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
const documentationViewports = [
  ...viewports,
  { name: 'narrow', width: 320, height: 780 },
  { name: 'zoom-200-equivalent', width: 720, height: 900 },
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

async function closeBrowser(browser) {
  const child = typeof browser.process === 'function' ? browser.process() : null;
  let timeoutId;
  const closed = await Promise.race([
    browser.close().then(() => 'closed', () => {
      child?.kill();
      return 'forced-after-close-error';
    }),
    new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        child?.kill();
        resolve('forced-after-timeout');
      }, 5000);
    }),
  ]);
  clearTimeout(timeoutId);
  return closed;
}

async function compareControlContracts(page, sourceMarkup, route) {
  return page.evaluate(({ markup, currentRoute }) => {
    const controls = (root) => [...root.querySelectorAll('input, select, textarea, button')]
      .filter((element) => !(element instanceof HTMLInputElement && element.type === 'hidden'))
      .map((element) => {
        const tag = element.tagName.toLowerCase();
        const labelText = [...(element.labels || [])]
          .map((label) => label.innerText?.replace(/\s+/g, ' ').trim() || label.textContent?.replace(/\s+/g, ' ').trim() || '')
          .filter(Boolean)
          .join(' ');
        const textContent = (node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
          if (node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() === 'svg') return '';
          return [...node.childNodes].map(textContent).filter((value) => value.trim()).join(' ');
        };
        const text = textContent(element).replace(/\s+/g, ' ').trim();
        const type = element.getAttribute('type') || (tag === 'input' ? 'text' : tag === 'button' ? 'submit' : null);
        return {
          tag,
          type,
          label: element.getAttribute('aria-label') || labelText || element.getAttribute('placeholder') || element.getAttribute('title') || text || null,
          placeholder: element.getAttribute('placeholder'),
          required: element.hasAttribute('required'),
          disabled: element.hasAttribute('disabled'),
          options: tag === 'select'
            ? [...element.options].map((option) => ({ label: option.label, value: option.value }))
            : [],
        };
      });
    const sourceDocument = new DOMParser().parseFromString(markup, 'text/html');
    const sourceRoot = sourceDocument.querySelector('#main-content') || sourceDocument.body;
    const djangoRoot = document.querySelector('#main-content') || document.body;
    const sourceControls = controls(sourceRoot);
    const djangoControls = controls(djangoRoot);
    const canonicalize = (control) => ({
      tag: control.tag,
      type: control.tag === 'button'
        ? 'button'
        : currentRoute === '/help-center' && control.tag === 'input'
          ? 'search'
          : control.type,
      label: currentRoute === '/help-center' && control.tag === 'input'
        ? control.placeholder
        : control.label?.replace(/\s+/g, ' ').trim() || null,
      placeholder: control.placeholder,
      required: control.required,
      disabled: control.disabled,
      options: control.options,
    });
    const expectedTargetOnly = currentRoute === '/help-center'
      ? [{ tag: 'button', type: 'button', label: 'Search', placeholder: null, required: false, disabled: false, options: [] }]
      : [];
    const canonicalSource = sourceControls.map(canonicalize);
    const canonicalDjango = djangoControls.map(canonicalize);
    const key = (control) => JSON.stringify(control);
    const remaining = [...canonicalDjango];
    const missingFromDjango = canonicalSource.filter((control) => {
      const index = remaining.findIndex((candidate) => key(candidate) === key(control));
      if (index < 0) return true;
      remaining.splice(index, 1);
      return false;
    });
    const observedAdded = [...remaining];
    const missingMappings = [];
    for (const allowed of expectedTargetOnly) {
      const index = remaining.findIndex((candidate) => key(candidate) === key(allowed));
      if (index >= 0) remaining.splice(index, 1);
      else missingMappings.push(allowed);
    }
    const unreviewedAdded = remaining;
    return {
      source: sourceControls,
      django: djangoControls,
      exact_match: missingFromDjango.length === 0 && unreviewedAdded.length === 0 && missingMappings.length === 0,
      accepted_mappings: [
        'Button activation type is checked behaviorally; source default-submit and Django explicit-button markup are equivalent outside a form.',
        ...(currentRoute === '/help-center' ? [
          'The source text search input maps to a labeled native search field with the same placeholder; W1 verifies Enter search and category-filter behavior.',
          'The target GET form adds one Search submit button; W1 verifies it filters the same reviewed results.',
          'React category state maps to keyboard-operable GET category forms; W1 verifies the expected category results.',
        ] : []),
      ],
      missing_from_django: missingFromDjango,
      added_in_django: unreviewedAdded,
      reviewed_target_only: observedAdded,
      missing_mappings: missingMappings,
    };
  }, { markup: sourceMarkup, currentRoute: route });
}

async function compareSpecialDestinations(page, sourceMarkup) {
  return page.evaluate((markup) => {
    const destinations = (root) => [...root.querySelectorAll('a[href]')]
      .map((anchor) => anchor.getAttribute('href'))
      .filter((href) => href && /^(?:https?:|mailto:|tel:|#)/i.test(href))
      .sort();
    const sourceDocument = new DOMParser().parseFromString(markup, 'text/html');
    const sourceRoot = sourceDocument.querySelector('#main-content') || sourceDocument.body;
    const djangoRoot = document.querySelector('#main-content') || document.body;
    const source = destinations(sourceRoot);
    const django = destinations(djangoRoot);
    return { source, django, exact_match: JSON.stringify(source) === JSON.stringify(django) };
  }, sourceMarkup);
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

  if (route === '/documentation') {
    assert.equal(pageInfo.heading, 'Documentation', 'the rewritten public guide should expose its current heading');
    await saveScreenshot(page, `${slug}-${viewport.name}.png`);
    results.pages.push({
      route,
      viewport,
      ...pageInfo,
      comparison: {
        acceptance_mode: 'current-documentation-contract',
        note: 'The rewritten guide is checked against current content and interactions below, not historical React copy.',
      },
    });
    await page.close();
    return;
  }

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
  const controlContract = await compareControlContracts(page, sourceMarkup, route);
  const specialDestinations = await compareSpecialDestinations(page, sourceMarkup);
  assert.equal(controlContract.exact_match, true,
    `${route} field/control contract has an unmapped source difference: ${JSON.stringify(controlContract)}`);
  assert.equal(specialDestinations.exact_match, true,
    `${route} external/contact/fragment destinations differ: ${JSON.stringify(specialDestinations)}`);
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
    control_contract: controlContract,
    special_destination_contract: specialDestinations,
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
  for (const viewport of viewports) {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
      viewport: { width: viewport.width, height: viewport.height },
    });
    const successPage = await context.newPage();
    const response = await successPage.goto(`${baseUrl}/privacy`, { waitUntil: 'domcontentloaded' });
    assert.equal(response?.status(), 200);
    const copyButton = successPage.getByRole('button', { name: /Copy PGP Key/i });
    await copyButton.focus();
    await successPage.keyboard.press('Enter');
    await successPage.getByText('Copied', { exact: true }).waitFor({ timeout: 3000 });
    const successFeedback = successPage.locator('#pgp-copy-feedback');
    assert.equal(await successFeedback.getAttribute('role'), 'status');
    assert.equal(await successFeedback.getAttribute('aria-live'), 'polite');
    assert.equal(await copyButton.evaluate((element) => document.activeElement === element), true,
      'Privacy clipboard success must preserve focus on its trigger');
    await saveScreenshot(successPage, `privacy-copy-success-${viewport.name}.png`);
    results.interactions.push({ route: '/privacy', viewport: viewport.name, activation: 'Enter', state: 'clipboard write succeeds and transient success is shown' });

    const deniedPage = await context.newPage();
    await deniedPage.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
      });
    });
    await deniedPage.goto(`${baseUrl}/privacy`, { waitUntil: 'domcontentloaded' });
    const deniedCopyButton = deniedPage.getByRole('button', { name: /Copy PGP Key/i });
    await deniedCopyButton.focus();
    await deniedPage.keyboard.press('Space');
    await deniedPage.getByText('Copy failed. Select and copy the key above.', { exact: true }).waitFor();
    const deniedFeedback = deniedPage.locator('#pgp-copy-feedback');
    assert.equal(await deniedFeedback.getAttribute('role'), 'status');
    assert.equal(await deniedFeedback.getAttribute('aria-live'), 'polite');
    assert.equal(await deniedCopyButton.evaluate((element) => document.activeElement === element), true,
      'Privacy clipboard denial must preserve focus on its trigger');
    await saveScreenshot(deniedPage, `privacy-copy-denied-${viewport.name}.png`);
    results.interactions.push({ route: '/privacy', viewport: viewport.name, activation: 'Space', state: 'clipboard denial gives accessible recovery feedback' });

    const toc = successPage.locator('#main-content a[href^="#"]').first();
    assert.ok(await toc.count(), 'Privacy Notice should provide table-of-contents links');
    const href = await toc.getAttribute('href');
    await toc.focus();
    assert.equal(await toc.evaluate((element) => document.activeElement === element), true);
    await toc.press('Enter');
    assert.equal(new URL(successPage.url()).hash, href, 'Privacy table-of-contents link should navigate to its anchor');
    results.interactions.push({ route: '/privacy', viewport: viewport.name, activation: 'Enter', state: 'keyboard-focusable table-of-contents anchor navigation' });
    await context.close();
  }
}

async function checkHelpCenter(browser) {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(`${baseUrl}/help-center`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.getByText('6 articles found', { exact: true }).count(), 1);
    await saveScreenshot(page, `help-center-default-${viewport.name}.png`);

    await page.locator('#help-search').fill('first voice form');
    await page.locator('#help-search').focus();
    await page.keyboard.press('Enter');
    await page.getByText('1 articles found', { exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'How to create your first voice form' }).count(), 1);
    const searchButton = page.getByRole('button', { name: 'Search', exact: true });
    await searchButton.focus();
    await page.keyboard.press('Space');
    await page.getByText('1 articles found', { exact: true }).waitFor();
    const category = page.locator('form[aria-label="Filter help articles by category"] button[value="getting-started"]');
    await category.focus();
    await page.keyboard.press('Space');
    await page.getByText('1 articles found', { exact: true }).waitFor();
    assert.match(page.url(), /category=getting-started/);
    assert.match(page.url(), /q=first\+voice\+form/);
    await saveScreenshot(page, `help-center-search-category-${viewport.name}.png`);
    results.interactions.push({ route: '/help-center', viewport: viewport.name, activation: 'Enter search; Space category', state: 'case-insensitive title search combined with category; count is 1' });

    await page.goto(`${baseUrl}/help-center?category=voice-features`, { waitUntil: 'domcontentloaded' });
    await page.getByText('2 articles found', { exact: true }).waitFor();
    results.interactions.push({ route: '/help-center', viewport: viewport.name, state: 'category filter returns two reviewed Voice Features items' });

    await page.goto(`${baseUrl}/help-center?q=no-such-title`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'No articles found' }).waitFor();
    await saveScreenshot(page, `help-center-no-results-${viewport.name}.png`);
    const browseAll = page.getByRole('link', { name: 'Browse All Articles' });
    await browseAll.focus();
    await page.keyboard.press('Enter');
    await page.getByText('6 articles found', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).search, '');
    results.interactions.push({ route: '/help-center', viewport: viewport.name, activation: 'Enter', state: 'no-match state and browse-all reset' });
    await page.close();
  }
}

async function checkSourceInactiveControls(browser) {
  const controls = [
    { route: '/', names: ['Microphone'] },
    { route: '/features', names: ['Microphone', 'Submit form'] },
    { route: '/industries', names: ['Start Your Free Trial'] },
    { route: '/pricing', names: ['Start Free Trial', 'Contact Sales', 'Start Your Free Trial'] },
    { route: '/status', names: ['Subscribe'] },
    {
      route: '/help-center',
      names: ['Browse Videos', 'Start Chat', 'Contact Us', 'Book Demo', 'Helpful', 'Not helpful', 'Read Article →', 'Start Live Chat', 'Email Support'],
    },
  ];
  for (const viewport of viewports) {
    for (const routeControls of controls) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(`${baseUrl}${routeControls.route}`, { waitUntil: 'domcontentloaded' });
      for (const name of routeControls.names) {
        const matches = await page.getByRole('button', { name, exact: true }).all();
        assert.ok(matches.length, `${routeControls.route} should render the source-inactive ${name} control`);
        for (let index = 0; index < matches.length; index += 1) {
          const button = page.getByRole('button', { name, exact: true }).nth(index);
          const probe = `${viewport.name}-${routeControls.route}-${name}-${index}`;
          assert.equal(await button.isDisabled(), false, `${routeControls.route} ${name} should remain keyboard reachable`);
          const startUrl = page.url();
          const startText = await page.locator('#main-content').innerText();
          await button.evaluate((element, key) => {
            window.__p9ControlKeyboardClicks ||= {};
            window.__p9ControlKeyboardClicks[key] = 0;
            element.addEventListener('click', () => { window.__p9ControlKeyboardClicks[key] += 1; });
          }, probe);
          await button.focus();
          assert.equal(await button.evaluate((element) => document.activeElement === element), true);
          for (const key of ['Enter', 'Space']) {
            await page.keyboard.press(key);
            assert.equal(
              await page.evaluate((value) => window.__p9ControlKeyboardClicks[value], probe),
              key === 'Enter' ? 1 : 2,
              `${routeControls.route} ${name} should dispatch a native click from ${key}`,
            );
            assert.equal(page.url(), startUrl, `${routeControls.route} ${name} is a source-inactive demonstration control`);
            assert.equal(await page.locator('#main-content').innerText(), startText,
              `${routeControls.route} ${name} should keep its source-inactive demonstration state`);
          }
          results.interactions.push({
            route: routeControls.route,
            viewport: viewport.name,
            control: name,
            activation: ['Enter', 'Space'],
            state: 'native keyboard activation dispatches once per key and preserves the source-inactive demonstration state',
          });
        }
      }
      await page.close();
    }
  }
}

async function checkDocumentation(browser) {
  for (const viewport of documentationViewports) {
    trace(`documentation ${viewport.name}: start`);
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
      viewport: { width: viewport.width, height: viewport.height },
    });
    const successPage = await context.newPage();
    await successPage.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
    trace(`documentation ${viewport.name}: loaded`);
    assert.equal(await successPage.getByRole('heading', { name: 'Documentation', level: 1 }).count(), 1);
    assert.equal(await successPage.locator('[data-copy-code]').count(), 3, 'each code example has an explicit copy control');
    assert.equal(await successPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
      `${viewport.name} documentation must not overflow the page width`);
    const copyButton = successPage.locator('[data-copy-code="code-form-fields"]');
    const displayedCode = await successPage.locator('#code-form-fields').textContent();
    await copyButton.focus();
    await successPage.keyboard.press('Enter');
    const copiedButton = successPage.getByRole('button', { name: 'Copied' }).first();
    await copiedButton.waitFor();
    const successFeedback = successPage.locator('#copy-feedback-fields');
    await successFeedback.waitFor();
    assert.equal((await successFeedback.textContent()).trim(), 'Copied this code block to the clipboard.');
    assert.equal(await successFeedback.getAttribute('aria-live'), 'polite');
    assert.equal(await copiedButton.evaluate((element) => document.activeElement === element), true,
      'Documentation clipboard success must preserve focus on its trigger');
    const copiedCode = await successPage.evaluate(() => navigator.clipboard.readText());
    assert.equal(copiedCode.replace(/\r\n/g, '\n'), (displayedCode || '').replace(/\r\n/g, '\n'));
    trace(`documentation ${viewport.name}: first copy`);
    const secondCopy = successPage.locator('[data-copy-code="code-start-local"]');
    await secondCopy.focus();
    await successPage.keyboard.press('Space');
    const secondFeedback = successPage.locator('#copy-feedback-start');
    await secondFeedback.waitFor();
    assert.equal((await secondFeedback.textContent()).trim(), 'Copied this code block to the clipboard.');
    assert.equal(await successPage.evaluate(() => navigator.clipboard.readText()), await successPage.locator('#code-start-local').textContent(),
      'each copy button must use its own code block');
    trace(`documentation ${viewport.name}: second copy`);
    const extractionDetails = successPage.locator('details').filter({ has: successPage.locator('#code-extract-request') });
    await extractionDetails.locator('summary').click();
    const thirdCopy = successPage.locator('[data-copy-code="code-extract-request"]');
    await thirdCopy.focus();
    await successPage.keyboard.press('Enter');
    const thirdFeedback = successPage.locator('#copy-feedback-extract');
    await thirdFeedback.waitFor();
    assert.equal((await thirdFeedback.textContent()).trim(), 'Copied this code block to the clipboard.');
    assert.equal(
      (await successPage.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'),
      (await successPage.locator('#code-extract-request').textContent()).replace(/\r\n/g, '\n'),
      'the third copy control must target its own code block');
    assert.equal(await thirdCopy.evaluate((element) => document.activeElement === element), true);
    trace(`documentation ${viewport.name}: third copy`);
    await saveScreenshot(successPage, `documentation-copy-success-${viewport.name}.png`);
    trace(`documentation ${viewport.name}: success screenshot`);
    results.interactions.push({ route: '/documentation', viewport: viewport.name, activation: ['Enter', 'Space'], state: 'independent copy targets preserve displayed code and trigger focus' });

    const deniedPage = await context.newPage();
    await deniedPage.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
      });
    });
    await deniedPage.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
    const deniedCopy = deniedPage.locator('[data-copy-code="code-form-fields"]');
    await deniedCopy.focus();
    await deniedPage.keyboard.press('Space');
    await deniedPage.getByText('Copy failed. Select and copy the code block above.', { exact: true }).waitFor();
    const deniedFeedback = deniedPage.locator('#copy-feedback-fields');
    assert.equal(await deniedFeedback.getAttribute('aria-live'), 'polite');
    assert.equal(await deniedPage.locator('[data-copy-code="code-form-fields"]')
      .evaluate((element) => document.activeElement === element), true,
    'Documentation clipboard denial must preserve focus on its trigger');
    await saveScreenshot(deniedPage, `documentation-copy-denied-${viewport.name}.png`);
    trace(`documentation ${viewport.name}: denied copy`);
    results.interactions.push({ route: '/documentation', viewport: viewport.name, activation: 'Space', state: 'clipboard denial exposes accessible recovery feedback' });

    const toc = successPage.getByRole('navigation', { name: 'Documentation sections' });
    const sectionLinks = toc.locator('a[href^="#"]');
    assert.equal(await sectionLinks.count(), 10, 'the contents index includes the user and developer sections');
    for (let index = 0; index < await sectionLinks.count(); index += 1) {
      const link = sectionLinks.nth(index);
      const href = await link.getAttribute('href');
      assert.equal(await link.isVisible(), true, `${viewport.name} contents link ${href} must be visible`);
      assert.equal(await successPage.locator(href).count(), 1, `${href} must target a section`);
      await link.focus();
      assert.equal(await link.evaluate((element) => document.activeElement === element), true,
        `${viewport.name} contents link ${href} must receive keyboard focus`);
      await Promise.all([
        successPage.waitForURL((url) => url.hash === href, { timeout: 3000 }),
        successPage.keyboard.press('Enter'),
      ]);
      assert.equal(new URL(successPage.url()).hash, href, `keyboard navigation should reach ${href}`);
    }
    results.interactions.push({ route: '/documentation', viewport: viewport.name, activation: 'Enter', state: 'all ten visible contents links target a section at this viewport' });
    trace(`documentation ${viewport.name}: anchors`);
    await context.close();
    trace(`documentation ${viewport.name}: complete`);
  }
}

async function checkDocumentationWithoutJavaScript(browser) {
  trace('documentation no-js: start');
  const viewport = { name: 'narrow-no-javascript', width: 320, height: 780 };
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    javaScriptEnabled: false,
  });
  const response = await page.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
  assert.equal(response?.status(), 200);
  assert.equal(await page.getByRole('heading', { name: 'Documentation', level: 1 }).count(), 1);
  assert.equal(await page.locator('[data-copy-code]:visible').count(), 0,
    'copy controls stay hidden without their JavaScript handler; code remains available for manual selection');
  assert.equal(await page.getByText('From template to saved form', { exact: true }).count(), 1);
  assert.equal(await page.getByText('Start the current app locally', { exact: true }).count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
    'narrow Documentation must not overflow without JavaScript');
  const links = await page.locator('nav[aria-label="Documentation sections"] a[href^="#"]').evaluateAll((items) =>
    items.map((item) => item.getAttribute('href')));
  assert.equal(links.length, 10);
  for (const href of links) assert.equal(await page.locator(href).count(), 1, `${href} must resolve without JavaScript`);
  await page.locator('nav[aria-label="Documentation sections"] a[href="#pipeline"]').click();
  assert.equal(new URL(page.url()).hash, '#pipeline', 'section navigation should work without JavaScript');
  await saveScreenshot(page, 'documentation-no-javascript-narrow.png');
  results.interactions.push({
    route: '/documentation',
    viewport: viewport.name,
    state: 'complete content and all ten in-page links work without JavaScript; copy controls are hidden for manual code selection',
  });
  await page.close();
  trace('documentation no-js: complete');
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
  const browser = await chromium.launch(browserLaunchOptions);
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
  const routesToCheck = routes.filter(([, route]) => !routeFilter || route === routeFilter);
  assert.ok(routesToCheck.length, `No ${wave.toUpperCase()} route matches ${routeFilter || 'the requested route set'}.`);
  const browser = await chromium.launch(browserLaunchOptions);
  trace('browser launched');
  results.browser = browser.version();
  let browserCleanup = 'closed';
  try {
    for (const [slug, route] of routesToCheck) {
      const routeViewports = route === '/documentation' ? documentationViewports : viewports;
      for (const viewport of routeViewports) {
        await checkPage(browser, slug, route, viewport, references);
      }
    }
    if (wave === 'w1') {
      if (!routeFilter || routeFilter === '/privacy') await checkPrivacy(browser);
      if (!routeFilter) {
        await checkHelpCenter(browser);
        await checkSourceInactiveControls(browser);
        await checkLocalDenials(browser);
      }
    } else if (routesToCheck.some(([, route]) => route === '/documentation')) {
      await checkDocumentation(browser);
      await checkDocumentationWithoutJavaScript(browser);
    }
  } finally {
    browserCleanup = await closeBrowser(browser);
    trace(`browser ${browserCleanup}`);
  }
  trace('writing browser results');
  results.browser_cleanup = browserCleanup;
  await fs.writeFile(path.join(evidenceDir, 'browser-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  trace('browser results written');
  const summary = {
    pages: results.pages.length,
    interactions: results.interactions,
    local_probes: results.local_probes,
    overflows: results.pages.filter((page) => page.document_width > page.viewport_width).map((page) => page.route),
    browser_cleanup: browserCleanup,
    output: evidenceDir,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`, () => {
    if (browserCleanup !== 'closed') process.exit(0);
  });
}

const task = process.argv.includes('--rollback') ? checkCompiledRollback() : main();

task.catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
