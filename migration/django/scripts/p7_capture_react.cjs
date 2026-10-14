const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.P7_REACT_BASE_URL || 'http://localhost:5173';
const root = path.resolve(__dirname, '..', '..', '..');
const wave = process.argv.includes('--wave=w2') ? 'w2' : 'w1';
const p9EvidenceDir = process.env.P9_EVIDENCE_DIR ? path.resolve(process.env.P9_EVIDENCE_DIR) : null;
const output = p9EvidenceDir
  ? path.join(p9EvidenceDir, 'source', wave)
  : path.join(root, 'docs', 'pages', 'evidence', wave, 'legacy');
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
const results = { wave: wave.toUpperCase(), source: 'current React/Vite development server', base_url: baseUrl, pages: [], interactions: [] };

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    for (const [slug, route] of routes) {
      let desktopMarkup = '';
      for (const viewport of viewports) {
        const page = await context.newPage();
        const consoleErrors = [];
        const failedRequests = [];
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }));
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 60000 });
        assert.equal(response?.status(), 200, `${route} should render from current React source`);
        await page.locator('#root main').waitFor({ state: 'visible', timeout: 60000 });
        await page.waitForTimeout(500);
        const markup = await page.locator('#root main').innerHTML();
        assert.ok(markup.length > 100, `${route} main body should contain page content`);
        const pageInfo = await page.evaluate(() => ({
          title: document.title,
          heading: document.querySelector('main h1')?.innerText.trim() ?? null,
          bodyFont: getComputedStyle(document.body).fontFamily,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          fontStatus: document.fonts.status,
        }));
        if (viewport.name === 'desktop') desktopMarkup = markup;
        await fs.writeFile(path.join(output, `${slug}-${viewport.name}.png`), await page.screenshot({ fullPage: true }));
        results.pages.push({
          route,
          viewport,
          response_status: response.status(),
          ...pageInfo,
          horizontal_overflow: pageInfo.documentWidth > pageInfo.viewportWidth,
          main_html_bytes: Buffer.byteLength(markup),
          console_errors: consoleErrors,
          failed_requests: failedRequests,
        });
        await page.close();
      }
      await fs.writeFile(path.join(output, `${slug}.html`), desktopMarkup, 'utf8');
    }

    if (wave === 'w1') {
    const privacy = await context.newPage({ viewport: viewports[0] });
    await privacy.goto(`${baseUrl}/privacy`, { waitUntil: 'domcontentloaded' });
    await privacy.getByRole('button', { name: /Copy PGP Key/i }).click();
    await privacy.getByText('Copied', { exact: true }).waitFor({ timeout: 3000 });
    await fs.writeFile(path.join(output, 'privacy-copy-success.png'), await privacy.screenshot({ fullPage: true }));
    results.interactions.push({ route: '/privacy', state: 'clipboard write success feedback' });
    await privacy.close();

    const help = await context.newPage({ viewport: viewports[0] });
    await help.goto(`${baseUrl}/help-center`, { waitUntil: 'domcontentloaded' });
    await help.getByPlaceholder('Search for help articles, tutorials, or features...').fill('first voice form');
    await help.getByRole('button', { name: /Getting Started/ }).click();
    await help.getByText('1 articles found').waitFor();
    await fs.writeFile(path.join(output, 'help-center-search-category.png'), await help.screenshot({ fullPage: true }));
    results.interactions.push({ route: '/help-center', state: 'title search combined with Getting Started category' });
    await help.close();
    } else {
      const docs = await context.newPage({ viewport: viewports[0] });
      await docs.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
      const code = docs.locator('pre code').first();
      const expected = await code.textContent();
      await docs.getByRole('button', { name: 'Copy' }).first().click();
      await docs.getByRole('button', { name: 'Copied' }).first().waitFor();
      const copied = await docs.evaluate(() => navigator.clipboard.readText());
      assert.equal(copied.replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'));
      await fs.writeFile(path.join(output, 'documentation-copy-success.png'), await docs.screenshot({ fullPage: true }));
      results.interactions.push({ route: '/documentation', state: 'copy writes the exact displayed code to clipboard' });
      await docs.close();

      const denied = await context.newPage({ viewport: viewports[0] });
      await denied.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
        });
      });
      await denied.goto(`${baseUrl}/documentation`, { waitUntil: 'domcontentloaded' });
      await denied.getByRole('button', { name: 'Copy' }).first().click();
      await fs.writeFile(path.join(output, 'documentation-copy-denied.png'), await denied.screenshot({ fullPage: true }));
      results.interactions.push({ route: '/documentation', state: 'source React copy denial logs an error without accessible feedback' });
      await denied.close();
    }
    await fs.writeFile(path.join(output, 'capture-results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify({ pages: results.pages.length, interactions: results.interactions.length, output }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
