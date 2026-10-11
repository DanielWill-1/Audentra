const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.P6_BASE_URL || 'http://127.0.0.1:8000';
const evidenceDir = path.resolve(__dirname, '..', '..', '..', 'docs', 'rendering', 'evidence', 'p6');
const results = {
  browser: null,
  base_url: baseUrl,
  viewports: [{ width: 1440, height: 900 }, { width: 390, height: 844 }],
  checks: [],
  asset_responses: [],
};

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(evidenceDir, name), fullPage: true });
}

async function expectVisible(page, selector) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 10000 });
  return locator;
}

async function checkShell(browser, kind, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl && url.pathname.startsWith('/static/')) {
      results.asset_responses.push({ path: url.pathname, status: response.status() });
    }
  });
  const route = kind === 'public' ? '/__p6/public' : '/__p6/app';
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200, `${kind} shell fixture should render`);
  await expectVisible(page, 'h1');

  if (kind === 'public') {
    assert.equal(await page.locator('header nav[aria-label="Main navigation"]').isVisible(), viewport.width >= 768);
    if (viewport.width === 1440) await screenshot(page, 'public-desktop.png');
    if (viewport.width === 390) await screenshot(page, 'public-mobile.png');

    const trigger = page.locator('[data-modal-open="shell-modal"]');
    await trigger.click();
    const dialog = page.locator('#shell-modal');
    assert.equal(await dialog.evaluate((element) => element.open), true);
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Done');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);

    await trigger.click();
    await page.mouse.click(2, 2);
    await dialog.waitFor({ state: 'hidden' });
    results.checks.push(`${kind} modal open, focus wrap, Escape, backdrop, and focus restore at ${viewport.width}px`);
  } else {
    const active = page.locator('aside a[aria-current="page"]');
    assert.equal((await active.textContent()).trim(), 'Home');
    if (viewport.width === 1440) await screenshot(page, 'app-desktop.png');
    if (viewport.width === 390) await screenshot(page, 'app-mobile.png');

    if (viewport.width === 390) {
      const menu = page.getByRole('button', { name: 'Open workspace navigation' });
      await menu.click();
      const drawer = page.locator('#mobile-navigation');
      await drawer.waitFor({ state: 'visible' });
      assert.equal(await drawer.locator('a[href="/templates"]').isVisible(), true);
      assert.equal(await drawer.evaluate((element) => element.open), true);
      await screenshot(page, 'app-mobile-drawer.png');
      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden' });
      assert.equal(await menu.evaluate((element) => document.activeElement === element), true);

      const modalTrigger = page.locator('[data-modal-open="shell-modal"]');
      await modalTrigger.click();
      const dialog = page.locator('#shell-modal');
      await dialog.waitFor({ state: 'visible' });
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))), true);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await modalTrigger.evaluate((element) => document.activeElement === element), true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      results.checks.push('mobile workspace drawer, modal focus, Escape, restoration, and reduced-motion preference');
    }
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, `${kind} shell should not overflow at ${viewport.width}px`);
  results.checks.push(`${kind} shell rendered without horizontal overflow at ${viewport.width}×${viewport.height}`);
  await page.close();
}

async function checkLegacy(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const proxiedAssetResponses = new Map();
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === baseUrl && (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg')) {
      proxiedAssetResponses.set(url.pathname, {
        status: response.status(),
        marker: response.headers()['x-legacy-proxy'] || null,
      });
    }
  });
  const response = await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  assert.equal(response.headers()['x-legacy-proxy'], '1');
  const heading = await expectVisible(page, '#root h1');
  assert.match(await heading.innerText(), /Speak\./);
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0);
  await screenshot(page, viewport.width === 1440 ? 'legacy-home-desktop.png' : 'legacy-home-mobile.png');
  assert.ok(proxiedAssetResponses.get('/assets/index-Dmvoeb2c.js')?.marker === '1');
  assert.ok(proxiedAssetResponses.get('/assets/index-CFJQDHLM.css')?.marker === '1');
  const extraAssets = await page.evaluate(async () => Promise.all(
    ['/favicon.svg', '/image.png'].map(async (assetPath) => {
      const assetResponse = await fetch(assetPath, { cache: 'no-store' });
      return {
        path: assetPath,
        status: assetResponse.status,
        marker: assetResponse.headers.get('x-legacy-proxy'),
      };
    }),
  ));
  for (const item of extraAssets) {
    assert.equal(item.status, 200, `${item.path} should load through the exact asset inventory`);
    assert.equal(item.marker, '1', `${item.path} should use the asset bridge`);
  }
  results.asset_responses.push(...extraAssets);
  for (const [assetPath, item] of proxiedAssetResponses) {
    assert.equal(item.status, 200, `${assetPath} should load through the exact asset inventory`);
    assert.equal(item.marker, '1', `${assetPath} should use the asset bridge`);
  }
  results.asset_responses.push(...Array.from(proxiedAssetResponses, ([assetPath, item]) => ({ path: assetPath, ...item })));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  results.checks.push(`legacy home rendered with its real compiled bundle at ${viewport.width}×${viewport.height}; horizontal overflow=${overflow}`);
  await page.close();
}

async function checkAuthHtmx(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const response = await page.goto(`${baseUrl}/login/`, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('body').getAttribute('hx-boost'), 'true');
  await page.waitForFunction(() => Boolean(window.htmx));
  await page.locator('#id_email').fill('not-an-email');
  await page.locator('#id_password').fill('synthetic-invalid-form');
  await page.locator('form').evaluate((form) => { form.noValidate = true; });
  const invalidPost = page.waitForResponse((item) => (
    item.request().method() === 'POST' && new URL(item.url()).pathname === '/login/'
  ));
  await page.getByRole('button', { name: 'Sign in' }).click();
  assert.equal((await invalidPost).status(), 400);
  await expectVisible(page, '#auth-main ul.errorlist li');
  assert.match(await page.locator('#auth-main').innerText(), /valid email address/i);
  assert.equal(await page.locator('#auth-main').count(), 1);
  await screenshot(page, 'auth-htmx-validation.png');
  results.checks.push('existing Django Auth form submitted invalid synthetic data and HTMX swapped #auth-main validation');
  await page.close();
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  results.browser = browser.version();
  try {
    await checkShell(browser, 'public', { width: 1440, height: 900 });
    await checkShell(browser, 'public', { width: 390, height: 844 });
    await checkShell(browser, 'app', { width: 1440, height: 900 });
    await checkShell(browser, 'app', { width: 390, height: 844 });
    await checkLegacy(browser, { width: 1440, height: 900 });
    await checkLegacy(browser, { width: 390, height: 844 });
    await checkAuthHtmx(browser);
  } finally {
    await browser.close();
  }
  results.asset_responses = Array.from(
    new Map(results.asset_responses.map((entry) => [entry.path, entry])).values(),
  );
  await fs.writeFile(path.join(evidenceDir, 'browser-results.json'), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
