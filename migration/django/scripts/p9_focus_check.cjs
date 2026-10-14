const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..', '..', '..');
const baseUrl = process.env.P7_DJANGO_BASE_URL || 'http://127.0.0.1:18875';
const requestedOutputDirectory = process.env.P9_FOCUS_EVIDENCE_DIR
  ? path.resolve(process.env.P9_FOCUS_EVIDENCE_DIR)
  : '';
const outputDirectory = requestedOutputDirectory &&
  fs.existsSync(path.join(requestedOutputDirectory, 'P9_FOCUS_RESULTS.json'))
  ? (() => {
    let attempt = 2;
    let candidate = path.join(requestedOutputDirectory, `focus-attempt-${String(attempt).padStart(2, '0')}`);
    while (fs.existsSync(candidate)) {
      attempt += 1;
      candidate = path.join(requestedOutputDirectory, `focus-attempt-${String(attempt).padStart(2, '0')}`);
    }
    return candidate;
  })()
  : requestedOutputDirectory;
const manifestPath = path.join(root, 'docs', 'parity', 'route-manifest.json');
const auditKeyboardDestinations = process.env.P9_FOCUS_KEYBOARD_ACTIVATION === '1';

async function activateLocalLinksByKeyboard(page) {
  const startingUrl = page.url();
  const anchors = await page.locator('a[href]').evaluateAll((elements) => elements.map((element, index) => {
    const style = getComputedStyle(element);
    let details = element.closest('details');
    let hiddenByClosedDetails = false;
    while (details) {
      const summary = details.querySelector(':scope > summary');
      if (!details.open && !summary?.contains(element)) {
        hiddenByClosedDetails = true;
        break;
      }
      details = details.parentElement?.closest('details') || null;
    }
    return {
      index,
      href: element.href,
      raw_href: element.getAttribute('href'),
      name: (element.getAttribute('aria-label') || element.innerText || element.title || '').replace(/\s+/g, ' ').trim(),
      target: element.target,
      download: element.hasAttribute('download'),
      modal_trigger: element.hasAttribute('data-modal-open') || element.hasAttribute('data-template-dialog-open'),
      visible: element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none' &&
        !element.closest('[hidden], [inert], [aria-hidden="true"], dialog:not([open])') && !hiddenByClosedDetails,
      tab_index: element.tabIndex,
    };
  }));
  const results = [];

  for (const anchor of anchors) {
    if (!anchor.visible) continue;
    const target = new URL(anchor.href, startingUrl);
    if (target.protocol === 'mailto:' || target.protocol === 'tel:') {
      results.push({ ...anchor, status: 'inspected_without_invoking_external_handler' });
      continue;
    }
    if (!['http:', 'https:'].includes(target.protocol) || target.origin !== new URL(startingUrl).origin) {
      results.push({ ...anchor, status: 'external_destination_not_opened' });
      continue;
    }
    if (anchor.download || anchor.target && anchor.target.toLowerCase() !== '_self' || anchor.modal_trigger || anchor.raw_href === '#') {
      results.push({ ...anchor, status: 'skipped_special_link', reason: anchor.download ? 'download' : anchor.target ? 'new browsing context' : anchor.modal_trigger ? 'modal trigger' : 'placeholder fragment' });
      continue;
    }
    assert.ok(anchor.tab_index >= 0, `${anchor.name || anchor.href} is a visible link outside the Tab order.`);

    const probe = await page.context().newPage();
    try {
      await probe.goto(startingUrl, { waitUntil: 'domcontentloaded' });
      const link = probe.locator('a[href]').nth(anchor.index);
      assert.equal(await link.getAttribute('href'), anchor.raw_href, `Link ordering changed after resetting ${startingUrl}.`);
      await link.focus();
      const navigation = probe.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
      await probe.keyboard.press('Enter');
      try {
        await probe.waitForFunction((expected) => {
          const actual = new URL(window.location.href);
          const normalizePath = (value) => {
            let normalized = value;
            while (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
            return normalized;
          };
          return actual.origin === expected.origin && normalizePath(actual.pathname) === normalizePath(expected.pathname) &&
            actual.search === expected.search && actual.hash === expected.hash;
        }, { origin: target.origin, pathname: target.pathname, search: target.search, hash: target.hash }, { timeout: 15000 });
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        failure.keyboardDestination = {
          ...anchor,
          status: 'keyboard_destination_failed',
          expected_url: target.href,
          actual_url: probe.url(),
          active_element: await probe.evaluate(() => ({
            tag: document.activeElement?.tagName.toLowerCase() || null,
            href: document.activeElement instanceof HTMLAnchorElement ? document.activeElement.href : null,
            name: document.activeElement?.textContent?.trim() || '',
          })),
        };
        throw failure;
      }
      const response = await navigation;
      results.push({
        ...anchor,
        status: 'keyboard_destination_reached',
        response_status: response?.status() ?? null,
        final_url: probe.url(),
      });
    } finally {
      await probe.close();
    }
  }
  return results;
}

async function inspectRoute(browser, route, viewport, evidenceDirectory) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await context.route('**/*', async (routeHandler) => {
    const requestUrl = new URL(routeHandler.request().url());
    if (auditKeyboardDestinations && requestUrl.origin !== new URL(baseUrl).origin) {
      await routeHandler.abort('blockedbyclient');
      return;
    }
    if (requestUrl.origin === new URL(baseUrl).origin) {
      const headers = await routeHandler.request().allHeaders();
      await routeHandler.continue({ headers: { ...headers, 'X-P7-Fixture-Reset': '1' } });
      return;
    }
    await routeHandler.continue();
  });
  const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded' });
  const expectedStatus = route.category === 'local-404' || route.path === '/reset-password' ? 404 : 200;
  assert.equal(response?.status(), expectedStatus, `${route.path} should return ${expectedStatus}`);
  if (expectedStatus === 404) {
    await context.close();
    return {
      path: route.path,
      viewport: viewport.name,
      response_status: response.status(),
      status: 'expected-local-404',
      focus_not_applicable: true,
      skip_reason: 'The Django route is a documented local 404, so there is no page surface to audit.',
    };
  }

  const expectedControls = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll(
      'a[href],button,input:not([type="hidden"]),select,textarea,summary,[controls],[tabindex]:not([tabindex="-1"])',
    )].filter((element) => {
      const style = getComputedStyle(element);
      let details = element.closest('details');
      let hiddenByClosedDetails = false;
      while (details) {
        const visibleSummary = details.querySelector(':scope > summary');
        if (!details.open && !visibleSummary?.contains(element)) {
          hiddenByClosedDetails = true;
          break;
        }
        details = details.parentElement?.closest('details') || null;
      }
      return element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 &&
        style.visibility !== 'hidden' && style.display !== 'none' &&
        !element.closest('[hidden], [inert], [aria-hidden="true"], dialog:not([open])') &&
        !hiddenByClosedDetails;
    });
    const radioGroups = new Map();
    for (const element of candidates) {
      if (element instanceof HTMLInputElement && element.type === 'radio' && element.name) {
        const group = `${element.form?.id || ''}:${element.name}`;
        radioGroups.set(group, [...(radioGroups.get(group) || []), element]);
      }
    }
    const tabStops = candidates.filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) return true;
      const group = `${element.form?.id || ''}:${element.name}`;
      const radios = radioGroups.get(group) || [];
      return element.checked || (!radios.some((radio) => radio.checked) && radios[0] === element);
    });
    tabStops.forEach((element, index) => { element.dataset.p9FocusIndex = String(index); });
    return tabStops.map((element, index) => {
      const associatedLabel = element.labels?.[0]?.textContent?.trim() || '';
      const name = element.getAttribute('aria-label') || associatedLabel || element.innerText?.trim() ||
        element.getAttribute('title') || element.getAttribute('placeholder') || element.getAttribute('name') || '';
      return {
        index,
        tag: element.tagName.toLowerCase(),
        name: name.replace(/\s+/g, ' ').trim(),
        href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
      };
    });
  });

  const reached = [];
  const focusIndicators = [];
  const tabSequence = [];
  const seenFocusTargets = new Map();
  await page.evaluate(() => document.activeElement?.blur());
  for (let step = 0; step < expectedControls.length * 3 + 8; step += 1) {
    await page.keyboard.press('Tab');
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    const active = await page.evaluate(() => {
      const element = document.activeElement;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const outlineVisible = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
      return {
        index: element instanceof HTMLElement ? element.dataset.p9FocusIndex || null : null,
        tag: element?.tagName?.toLowerCase() || null,
        id: element?.id || '',
        class_name: typeof element?.className === 'string' ? element.className : '',
        input_type: element instanceof HTMLInputElement ? element.type : null,
        tab_index: element instanceof HTMLElement ? element.tabIndex : null,
        text: element?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '',
        outer_html: element instanceof HTMLElement ? element.outerHTML.slice(0, 300) : '',
        bounding_rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        visible: element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        is_focused: element.matches(':focus'),
        focus_visible: element.matches(':focus-visible'),
        indicator_visible: outlineVisible || style.boxShadow !== 'none',
      };
    });
    const identity = active.index === null
      ? `unknown:${active.tag}:${active.id}:${active.class_name}:${active.text}`
      : `control:${active.index}`;
    const previousVisits = seenFocusTargets.get(identity) || 0;
    seenFocusTargets.set(identity, previousVisits + 1);
    tabSequence.push(active);
    const nativeSegmentedInput = ['date', 'time', 'datetime-local', 'month', 'week']
      .includes(active.input_type);
    if (previousVisits > 0 && (reached.length === expectedControls.length || !nativeSegmentedInput || previousVisits >= 8)) {
      break;
    }
    if (active.index === null) continue;
    const index = Number(active.index);
    if (!reached.some((item) => item.index === index)) {
      reached.push({
        index,
        visible: active.visible,
        focus_visible: active.focus_visible,
        indicator_visible: active.indicator_visible,
      });
      focusIndicators.push(active.indicator_visible);
      if (reached.length === expectedControls.length) break;
    }
  }

  const expectedReverse = expectedControls.slice(0, -1).reverse().map((item) => item.index);
  const reverseReached = [];
  const reverseFocusIndicators = [];
  const reverseSequence = [];
  const seenReverseTargets = new Map();
  if (expectedControls.length > 1) {
    for (let step = 0; step < expectedControls.length * 3 + 8; step += 1) {
      await page.keyboard.press('Shift+Tab');
      await page.evaluate(() => new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
      const active = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const outlineVisible = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
        return {
          index: element instanceof HTMLElement ? element.dataset.p9FocusIndex || null : null,
          tag: element?.tagName?.toLowerCase() || null,
          id: element?.id || '',
          class_name: typeof element?.className === 'string' ? element.className : '',
          input_type: element instanceof HTMLInputElement ? element.type : null,
          tab_index: element instanceof HTMLElement ? element.tabIndex : null,
          text: element?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '',
          outline_style: style.outlineStyle,
          outline_width: style.outlineWidth,
          box_shadow: style.boxShadow,
          border_color: style.borderColor,
          bounding_rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          visible: element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none',
          is_focused: element.matches(':focus'),
          focus_visible: element.matches(':focus-visible'),
          indicator_visible: outlineVisible || style.boxShadow !== 'none',
        };
      });
      if (active.index !== null && !active.focus_visible && !active.indicator_visible) {
        const screenshot = path.join(
          evidenceDirectory,
          `${route.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${viewport.name}-shift-tab-${active.index}.png`,
        );
        await page.screenshot({ path: screenshot, fullPage: false });
        active.diagnostic_screenshot = screenshot;
      }
      const identity = active.index === null
        ? `unknown:${active.tag}:${active.id}:${active.class_name}:${active.text}`
        : `control:${active.index}`;
      const previousVisits = seenReverseTargets.get(identity) || 0;
      seenReverseTargets.set(identity, previousVisits + 1);
      reverseSequence.push(active);
      const nativeSegmentedInput = ['date', 'time', 'datetime-local', 'month', 'week']
        .includes(active.input_type);
      if (previousVisits > 0 && (reverseReached.length === expectedReverse.length || !nativeSegmentedInput || previousVisits >= 8)) {
        break;
      }
      if (active.index === null) continue;
      const index = Number(active.index);
      if (!reverseReached.some((item) => item.index === index)) {
        reverseReached.push({
          index,
          visible: active.visible,
          focus_visible: active.focus_visible,
          indicator_visible: active.indicator_visible,
        });
        reverseFocusIndicators.push(active.indicator_visible);
        if (reverseReached.length === expectedReverse.length) break;
      }
    }
  }

  const reachedIndices = new Set(reached.map((item) => item.index));
  const missing = expectedControls.filter((item) => !reachedIndices.has(item.index));
  const missingNames = expectedControls.filter((item) => !item.name);
  const reverseOrderMatches = expectedReverse.length === reverseReached.length &&
    expectedReverse.every((index, position) => reverseReached[position]?.index === index);
  const focusSummary = {
    path: route.path,
    viewport: viewport.name,
    response_status: response.status(),
    expected_tab_stops: expectedControls.length,
    reached_tab_stops: reached.length,
    tab_sequence: tabSequence,
    focusable_controls: expectedControls,
    keyboard_order: reached,
    missing_from_tab_order: missing,
    expected_reverse_tab_stops: expectedReverse.length,
    reached_reverse_tab_stops: reverseReached.length,
    reverse_keyboard_order: reverseReached,
    shift_tab_sequence: reverseSequence,
    reverse_order_matches: reverseOrderMatches,
    missing_from_reverse_tab_order: expectedReverse.filter((index) =>
      !reverseReached.some((item) => item.index === index),
    ),
    controls_without_accessible_name: missingNames,
    every_focus_was_visible: [...reached, ...reverseReached].every((item) =>
      item.visible && (item.focus_visible || item.indicator_visible),
    ),
    focus_indicator_seen: [...focusIndicators, ...reverseFocusIndicators].every(Boolean),
  };
  const violations = [];
  if (missing.length) violations.push(`missing ${missing.length} controls from Tab order`);
  if (!reverseOrderMatches) violations.push('Shift+Tab order differs from reverse Tab order');
  if (!focusSummary.every_focus_was_visible) violations.push('keyboard focus is not visible');
  if (!focusSummary.focus_indicator_seen) violations.push('a focus stop has no visible focus indicator');
  if (missingNames.length) violations.push(`${missingNames.length} controls have no accessible name`);
  if (violations.length) {
    const screenshot = path.join(
      evidenceDirectory,
      `${route.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}-${viewport.name}-focus-failure.png`,
    );
    await page.screenshot({ path: screenshot, fullPage: false });
    const error = new Error(`${route.path} ${viewport.name}: ${violations.join('; ')}`);
    error.focusSummary = { ...focusSummary, violations, screenshot };
    throw error;
  }
  if (auditKeyboardDestinations) {
    try {
      focusSummary.keyboard_destinations = await activateLocalLinksByKeyboard(page);
    } catch (error) {
      error.focusSummary = {
        ...focusSummary,
        keyboard_destination_failure: error && typeof error === 'object' ? error.keyboardDestination || null : null,
      };
      throw error;
    }
  }
  await context.close();
  return focusSummary;
}

async function main() {
  if (!outputDirectory) throw new Error('Set P9_FOCUS_EVIDENCE_DIR to a fresh evidence directory.');
  const outputPath = path.join(outputDirectory, 'P9_FOCUS_RESULTS.json');
  if (fs.existsSync(outputPath)) throw new Error(`Refusing to overwrite evidence: ${outputPath}`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
  const requestedRoute = process.env.P9_FOCUS_ROUTE || '';
  const routesToInspect = requestedRoute
    ? manifest.routes.filter((route) => route.path === requestedRoute)
    : manifest.routes;
  if (requestedRoute && routesToInspect.length === 0) throw new Error(`Unknown focus-check route: ${requestedRoute}`);
  const allViewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  const requestedViewport = process.env.P9_FOCUS_VIEWPORT || '';
  const viewports = requestedViewport
    ? allViewports.filter((viewport) => viewport.name === requestedViewport)
    : allViewports;
  if (requestedViewport && viewports.length === 0) {
    throw new Error(`Unknown focus-check viewport: ${requestedViewport}`);
  }
  const persistentBrowser = auditKeyboardDestinations ? null : await chromium.launch({ headless: true });
  const routes = [];
  let status = 'passed';
  let failure = null;
  try {
    for (const route of routesToInspect) {
      const routeBrowser = persistentBrowser || await chromium.launch({ headless: true });
      try {
        for (const viewport of viewports) {
          try {
            routes.push(await inspectRoute(routeBrowser, route, viewport, outputDirectory));
          } catch (error) {
            status = 'failed';
            failure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            routes.push({
              path: route.path,
              viewport: viewport.name,
              status: 'failed',
              error: failure,
              focus_summary: error && typeof error === 'object' ? error.focusSummary || null : null,
            });
            throw error;
          }
        }
      } finally {
        if (!persistentBrowser) await routeBrowser.close();
      }
    }
  } finally {
    const result = {
      run_id: path.basename(outputDirectory).startsWith('focus-attempt-')
        ? path.basename(path.dirname(outputDirectory))
        : path.basename(outputDirectory),
      captured_at: new Date().toISOString(),
      status,
      boundary: 'Django DEBUG=False browser settings with isolated synthetic identity/data; no hosted writes or live provider calls. Optional keyboard-link mode activates same-origin anchors and records mailto/tel targets without invoking them.',
      keyboard_destination_audit: auditKeyboardDestinations,
      route_count: routesToInspect.length,
      viewport_count: viewports.length,
      routes,
      failure,
    };
    await fs.promises.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    if (persistentBrowser) await persistentBrowser.close();
    process.stdout.write(`${JSON.stringify({ status, route_viewports: routes.length, output: outputPath })}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
