const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const APP_TSX = path.join(__dirname, 'src', 'App.tsx');
const OUT_DIR = path.join(__dirname, 'page-screenshots');
const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const USE_EXISTING = process.argv.includes('--existing');

const FALLBACK_ROUTES = [
  '/', '/features', '/industries', '/security', '/pricing', '/about',
  '/contact', '/login', '/signup', '/forgot-password', '/reset-password',
  '/dashboard', '/templates', '/scheduler', '/manage-schedules',
  '/scheduler-settings', '/filledtemplates', '/AIVoiceAutoFill',
  '/status', '/help-center', '/documentation', '/terms', '/privacy',
  '/activitylog',
];

function discoverRoutes() {
  try {
    const source = fs.readFileSync(APP_TSX, 'utf8');
    const routes = [];
    const re = /<Route\s+path="([^"]+)"/g;
    let match;
    while ((match = re.exec(source)) !== null) routes.push(match[1]);
    const unique = [...new Set(routes)];
    if (unique.length >= 3) return unique;
  } catch (err) {
    console.warn(`Could not auto-discover routes from ${APP_TSX}: ${err.message}`);
  }
  console.warn('Falling back to the bundled route list.');
  return FALLBACK_ROUTES;
}

function isReachable() {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL);
    const socket = net.connect(Number(url.port || (url.protocol === 'https:' ? 443 : 80)), url.hostname);
    socket.setTimeout(2000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function waitUntilReachable(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function toFileName(route) {
  const name = route === '/' ? 'home' : route.replace(/^\/+/, '');
  return name
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '-'))
    .join('-')
    .replace(/-+/g, '-');
}

async function screenshotRoute(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page
    .waitForFunction(
      () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      { timeout: 8000 }
    )
    .catch(() => {});
  await page.waitForTimeout(300);

  const file = path.join(OUT_DIR, `${toFileName(route)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

(async () => {
  let serverChild = null;

  if (USE_EXISTING) {
    console.log(`Using existing dev server at ${BASE_URL} (--existing).`);
  } else {
    const up = await isReachable();
    if (up) {
      console.log(`Dev server already running at ${BASE_URL} - reusing it.`);
    } else {
      console.log('Starting dev server (npm run dev)...');
      serverChild = spawn('npm', ['run', 'dev'], { shell: true, stdio: 'ignore' });
      const ready = await waitUntilReachable();
      if (!ready) {
        killTree(serverChild);
        console.error(`✗ Dev server did not become reachable at ${BASE_URL}`);
        process.exit(1);
      }
      console.log(`Dev server is up at ${BASE_URL}`);
    }
  }

  const routes = discoverRoutes();
  if (routes[0] !== '/') {
    routes.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let failed = 0;
  const failedRoutes = [];

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      console.log(`[${i + 1}/${routes.length}] Screenshotting ${route}`);
      let success = false;
      for (let attempt = 1; attempt <= 3 && !success; attempt++) {
        try {
          const file = await screenshotRoute(page, route);
          console.log(`✓ ${route} → ${path.relative(process.cwd(), file)}`);
          ok++;
          success = true;
        } catch (err) {
          if (attempt < 3) {
            console.warn(`  retrying ${route} (attempt ${attempt + 1}/3): ${err.message}`);
          } else {
            console.error(`✗ ${route}: ${err.message}`);
            failed++;
            failedRoutes.push(route);
          }
        }
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  if (serverChild) {
    console.log('Stopping dev server...');
    killTree(serverChild);
  }

  console.log(`\n✓ ${ok} screenshots generated`);
  if (failed > 0) {
    console.error(`✗ ${failed} failed: ${failedRoutes.join(', ')}`);
    process.exit(1);
  }
})().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
