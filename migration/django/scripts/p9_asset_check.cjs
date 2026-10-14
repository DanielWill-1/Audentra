const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, request } = require('playwright');

const djangoRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(djangoRoot, '..', '..');
const runId = process.env.P7_EVIDENCE_RUN || '';
const outputDirectory = process.env.P9_ASSET_EVIDENCE_DIR || '';
const sourceBase = process.env.P7_REACT_BASE_URL || '';
const djangoBase = process.env.P7_DJANGO_BASE_URL || '';
const manifestPath = path.join(repoRoot, 'docs', 'parity', 'route-manifest.json');
const fontUrl = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..900;1,300..900&family=JetBrains+Mono:wght@400;500;600&display=swap';
const authRoutes = new Set(['/login', '/signup', '/forgot-password']);
const appScripts = {
  '/dashboard': ['js/p7_dashboard.js'],
  '/templates': ['js/p7_templates.js'],
  '/scheduler': ['js/p7_scheduler.js'],
  '/manage-schedules': ['js/p7_scheduler.js'],
  '/scheduler-settings': ['js/p7_settings.js'],
  '/filledtemplates': [],
  '/AIVoiceAutoFill': ['js/p7_media.js', 'js/p7_voice.js'],
  '/activitylog': ['js/p7_activity.js'],
};
const targetStaticPaths = [
  'favicon.svg',
  'css/app.css',
  'js/shell.js',
  'js/pages.js',
  'js/p7_auth_forms.js',
  'js/p7_dashboard.js',
  'js/p7_templates.js',
  'js/p7_scheduler.js',
  'js/p7_settings.js',
  'js/p7_voice.js',
  'js/p7_media.js',
  'js/p7_activity.js',
  'icons/sprite.svg',
  'vendor/htmx-2.0.8.min.js',
];

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function asset(relativePath, license, dimensions = null) {
  const absolutePath = path.join(repoRoot, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    path: relativePath.split(path.sep).join('/'),
    bytes: bytes.length,
    sha256: sha256(bytes),
    license,
    dimensions,
  };
}

function hrefFor(html, pattern) {
  const match = html.match(pattern);
  assert.ok(match, `Expected an asset href matching ${pattern}`);
  return match[1].replaceAll('&amp;', '&');
}

function routeAssetMap(routes) {
  return routes.map(({ path: route, category }) => {
    const sourceAssets = [
      'public/favicon.svg',
      'shared Google Fonts CSS',
      'Vite /src/main.tsx and /src/index.css plus the route/component modules',
      'lucide-react 0.344.0 inline SVGs where used by the route',
    ];
    if (route === '/reset-password') {
      return { route, category, source_assets: sourceAssets, django_assets: [], note: 'Intentional local explanatory 404 has no Django page template.' };
    }
    const common = ['favicon.svg'];
    if (category === 'public') {
      return { route, category, source_assets: sourceAssets, django_assets: [...common, 'remote Google Fonts CSS', 'css/app.css', 'js/shell.js', 'js/pages.js', 'icons/sprite.svg'] };
    }
    if (authRoutes.has(route)) {
      return { route, category, source_assets: sourceAssets, django_assets: [...common, 'remote Google Fonts CSS', 'vendor/htmx-2.0.8.min.js', 'js/p7_auth_forms.js'] };
    }
    const scripts = appScripts[route];
    assert.ok(scripts, `Missing Django asset mapping for ${route}`);
    return { route, category, source_assets: sourceAssets, django_assets: [...common, 'remote Google Fonts CSS', 'css/app.css', 'js/shell.js', 'icons/sprite.svg', ...scripts] };
  });
}

async function capturePage(browser, runtime, route) {
  const baseUrl = runtime === 'source' ? sourceBase : djangoBase;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failures = [];
  const assetResponses = [];
  page.on('requestfailed', (request) => failures.push({ url: request.url(), failure: request.failure()?.errorText || null }));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if ((url.origin === baseUrl && (url.pathname === '/favicon.svg' || url.pathname.startsWith('/static/'))) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      assetResponses.push(response.body().then((body) => ({
        url: response.url(),
        status: response.status(),
        resource_type: response.request().resourceType(),
        content_type: response.headers()['content-type'] || null,
        bytes: body.length,
        sha256: sha256(body),
      })).catch((error) => ({ url: response.url(), status: response.status(), body_error: String(error) })));
    }
  });
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  assert.equal(response?.status(), 200, `${runtime} ${route} should render`);
  await page.evaluate(() => document.fonts.ready);
  const links = await page.locator('link[rel="icon"], link[href*="fonts.googleapis.com"]').evaluateAll((items) => items.map((item) => ({ rel: item.rel, href: item.href })));
  const expectedIcon = runtime === 'source' ? '/favicon.svg' : '/static/favicon.svg';
  assert.ok(links.some((item) => item.rel === 'icon' && new URL(item.href).pathname === expectedIcon), `${runtime} ${route} favicon link`);
  assert.ok(links.some((item) => item.href === fontUrl), `${runtime} ${route} Google Fonts link`);
  const faviconUrl = new URL(expectedIcon, baseUrl).toString();
  const faviconResponse = await page.request.get(faviconUrl);
  const faviconBody = await faviconResponse.body();
  assert.equal(faviconResponse.status(), 200, `${runtime} favicon HTTP response`);
  assert.ok(faviconResponse.headers()['content-type']?.includes('image/svg+xml'), `${runtime} favicon MIME`);
  const responses = await Promise.all(assetResponses);
  assert.deepEqual(failures, [], `${runtime} ${route} asset requests`);
  const fontStylesheet = responses.find((item) => item.url.startsWith(fontUrl));
  assert.equal(fontStylesheet?.status, 200, `${runtime} ${route} Google Fonts stylesheet response`);
  await page.close();
  return {
    route,
    runtime,
    status: response.status(),
    favicon: {
      url: faviconUrl,
      status: faviconResponse.status(),
      content_type: faviconResponse.headers()['content-type'] || null,
      bytes: faviconBody.length,
      sha256: sha256(faviconBody),
    },
    google_fonts_link: fontUrl,
    asset_responses: responses,
    request_failures: failures,
  };
}

async function main() {
  assert.ok(runId && outputDirectory && sourceBase && djangoBase, 'Run ID, evidence path and both local server URLs are required.');
  assert.ok(fs.existsSync(manifestPath), `Route manifest is missing: ${manifestPath}`);
  assert.ok(!fs.existsSync(outputDirectory), `Refusing to overwrite asset evidence: ${outputDirectory}`);
  fs.mkdirSync(outputDirectory, { recursive: false });

  const sourceHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const djangoHtml = fs.readFileSync(path.join(djangoRoot, 'templates', 'base.html'), 'utf8');
  const djangoAuthHtml = fs.readFileSync(path.join(djangoRoot, 'apps', 'accounts', 'templates', 'accounts', 'base.html'), 'utf8');
  const sourceFaviconHref = hrefFor(sourceHtml, /<link\s+rel="icon"[^>]+href="([^"]+)"/i);
  const djangoFaviconHref = hrefFor(djangoHtml, /<link\s+rel="icon"[^>]+href="\{%\s*static\s+'([^']+)'\s*%\}"/i);
  const djangoAuthFaviconHref = hrefFor(djangoAuthHtml, /<link\s+rel="icon"[^>]+href="\{%\s*static\s+'([^']+)'\s*%\}"/i);
  const sourceFontHref = hrefFor(sourceHtml, /<link\s+href="([^"]*fonts\.googleapis\.com[^"]*)"/i);
  const djangoFontHref = hrefFor(djangoHtml, /<link\s+href="([^"]*fonts\.googleapis\.com[^"]*)"/i);
  const djangoAuthFontHref = hrefFor(djangoAuthHtml, /<link\s+href="([^"]*fonts\.googleapis\.com[^"]*)"/i);
  assert.equal(sourceFontHref, fontUrl);
  assert.equal(djangoFontHref, fontUrl);
  assert.equal(djangoAuthFontHref, fontUrl);
  assert.equal(sourceFaviconHref, '/favicon.svg');
  assert.equal(djangoFaviconHref, 'favicon.svg');
  assert.equal(djangoAuthFaviconHref, 'favicon.svg');

  const routes = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).routes;
  assert.equal(routes.length, 25, 'Expected all P9 manifest routes.');
  const sourceFavicon = asset('public/favicon.svg', 'Project asset; no standalone license file.', 'SVG viewBox 32×32; declared 32×32');
  const targetFavicon = asset('migration/django/static/favicon.svg', 'Exact copy of public/favicon.svg.', 'SVG viewBox 32×32; declared 32×32');
  assert.equal(sourceFavicon.sha256, targetFavicon.sha256, 'Source and Django favicon digests must match.');

  const sourceCode = fs.readdirSync(path.join(repoRoot, 'src', 'pages'))
    .map((file) => fs.readFileSync(path.join(repoRoot, 'src', 'pages', file), 'utf8'))
    .join('\n');
  assert.ok(sourceCode.includes("from 'lucide-react'") || sourceCode.includes('from "lucide-react"'));
  const imageReferenceScan = ['src', 'migration/django/templates', 'migration/django/apps']
    .flatMap((directory) => {
      const start = path.join(repoRoot, directory);
      const pending = [start];
      const found = [];
      while (pending.length) {
        const current = pending.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const absolute = path.join(current, entry.name);
          if (entry.isDirectory()) pending.push(absolute);
          else if (/\.(?:tsx?|jsx?|html|css)$/.test(entry.name) && fs.readFileSync(absolute, 'utf8').includes('image.png')) {
            found.push(path.relative(repoRoot, absolute).split(path.sep).join('/'));
          }
        }
      }
      return found;
    });
  assert.deepEqual(imageReferenceScan, [], 'public/image.png must stay listed as unused until a route references it.');

  const localAssets = [
    ...targetStaticPaths.map((relativePath) => asset(path.join('migration', 'django', 'static', relativePath), 'See the corresponding license record below; project static asset.')),
    asset('migration/django/static/vendor/HTMX_LICENSE', 'Zero-Clause BSD license text.'),
    asset('migration/django/static/icons/LICENSE.lucide', 'ISC license text for Lucide icon paths.'),
    asset('node_modules/lucide-react/LICENSE', 'ISC License; lucide-react package 0.344.0.'),
  ];
  const licenseFile = path.join(djangoRoot, 'static', 'vendor', 'HTMX_LICENSE');
  assert.ok(fs.readFileSync(licenseFile, 'utf8').startsWith('Zero-Clause BSD'));
  const spriteText = fs.readFileSync(path.join(djangoRoot, 'static', 'icons', 'sprite.svg'), 'utf8');
  const spriteSymbolCount = (spriteText.match(/<symbol\b/g) || []).length;
  assert.equal(spriteSymbolCount, 29);
  const lucidePackage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'node_modules', 'lucide-react', 'package.json'), 'utf8'));
  assert.equal(lucidePackage.version, '0.344.0');
  assert.equal(lucidePackage.license, 'ISC');
  const png = fs.readFileSync(path.join(repoRoot, 'public', 'image.png'));
  const pngWidth = png.readUInt32BE(16);
  const pngHeight = png.readUInt32BE(20);

  const browser = await chromium.launch({ headless: true });
  try {
    const pageResults = [];
    for (const route of ['/about', '/login', '/documentation']) {
      pageResults.push(await capturePage(browser, 'source', route));
      pageResults.push(await capturePage(browser, 'django', route));
    }
    for (const route of ['/about', '/login', '/documentation']) {
      const sourcePage = pageResults.find((item) => item.runtime === 'source' && item.route === route);
      const djangoPage = pageResults.find((item) => item.runtime === 'django' && item.route === route);
      const sourceFont = sourcePage.asset_responses.find((item) => item.url.startsWith(fontUrl));
      const djangoFont = djangoPage.asset_responses.find((item) => item.url.startsWith(fontUrl));
      assert.equal(sourceFont.sha256, djangoFont.sha256, `${route} remote font stylesheet body should match across runtimes.`);
      const sourceFontFiles = sourcePage.asset_responses
        .filter((item) => new URL(item.url).hostname === 'fonts.gstatic.com')
        .map((item) => `${item.url}:${item.sha256}`)
        .sort();
      const djangoFontFiles = djangoPage.asset_responses
        .filter((item) => new URL(item.url).hostname === 'fonts.gstatic.com')
        .map((item) => `${item.url}:${item.sha256}`)
        .sort();
      assert.deepEqual(djangoFontFiles, sourceFontFiles, `${route} downloaded font files should match across runtimes.`);
    }

    const staticResponses = [];
    const apiContext = await request.newContext();
    try {
      for (const relativePath of targetStaticPaths) {
        const url = new URL(`/static/${relativePath}`, djangoBase).toString();
        const result = await apiContext.get(url);
        const body = await result.body();
        const response = {
          path: relativePath,
          status: result.status(),
          bytes: body.length,
          sha256: sha256(body),
          content_type: result.headers()['content-type'] || null,
        };
        assert.equal(response.status, 200, `${relativePath} should be served locally.`);
        const expected = localAssets.find((item) => item.path === path.join('migration', 'django', 'static', relativePath).split(path.sep).join('/'));
        assert.equal(response.sha256, expected.sha256, `${relativePath} HTTP body must match the local source file.`);
        staticResponses.push(response);
      }
    } finally {
      await apiContext.dispose();
    }
    const targetFaviconBodies = pageResults.filter((item) => item.runtime === 'django').map((item) => item.favicon.sha256);
    assert.ok(targetFaviconBodies.every((digest) => digest === sourceFavicon.sha256), 'Django route favicon responses must match the source SVG.');

    const evidence = {
      run_id: runId,
      status: 'passed',
      boundary: 'Local asset metadata, localhost Django/Vite page loads, and public Google Fonts requests only; no hosted database or speech/extraction provider call.',
      route_count: routes.length,
      route_assets: routeAssetMap(routes),
      asset_files: [
        sourceFavicon,
        targetFavicon,
        asset('public/image.png', 'Project file; no standalone license file; unused by current routes.', `${pngWidth}×${pngHeight} PNG`),
        ...localAssets,
      ],
      source_icons: { package: 'lucide-react', version: lucidePackage.version, license: lucidePackage.license, rendering: 'Inline SVG; no separate runtime image request.' },
      django_icons: { path: 'migration/django/static/icons/sprite.svg', symbol_count: spriteSymbolCount, symbol_viewBox: '24×24', license: 'ISC' },
      remote_fonts: {
        css_url: fontUrl,
        routes: 'All templated public, Auth, and application routes use this URL in both runtimes.',
        license: 'SIL Open Font License 1.1 for Hanken Grotesk and JetBrains Mono; font bytes remain remotely hosted rather than vendored.',
      },
      template_references: {
        source_favicon_href: sourceFaviconHref,
        django_favicon_href: djangoFaviconHref,
        django_auth_favicon_href: djangoAuthFaviconHref,
        source_font_href: sourceFontHref,
        django_font_href: djangoFontHref,
        django_auth_font_href: djangoAuthFontHref,
        image_png_references: imageReferenceScan,
      },
      static_http_responses: staticResponses,
      representative_route_responses: pageResults,
      visual_note: 'Asset presence, byte digests, local response bodies and font request success are checked here. Full route-by-route visual icon/content parity remains in the P9 acceptance matrix and is not signed off by this inventory.',
    };
    const outputPath = path.join(outputDirectory, 'P9_ASSET_RESULTS.json');
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ run_id: runId, status: evidence.status, route_count: routes.length, local_static_assets: staticResponses.length, representative_pages: pageResults.length, output: outputPath })}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
