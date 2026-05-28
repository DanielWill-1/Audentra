const { chromium } = require('playwright');

const routes = [
  '/',
  '/features',
  '/industries',
  '/security',
  '/pricing',
  '/about',
  '/contact',
  '/dashboard',
  '/templates',
  '/scheduler',
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 3000 }
  });

  for (const route of routes) {
    await page.goto(`http://localhost:5173${route}`);

    await page.screenshot({
      path: `.${route === '/' ? '/home' : route}.png`,
      fullPage: true
    });

    console.log(`Captured ${route}`);
  }

  await browser.close();
})();