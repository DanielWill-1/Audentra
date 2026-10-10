import assert from 'node:assert/strict';
import { chromium } from 'playwright';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { origin, email, password } = JSON.parse(input);
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const browser = await chromium.launch({ headless: true });
let stage = 'launch';
const sessionKeys = new Set();
let context;
const result = { status: 'passed', http_only_cookie: true, same_site: 'Lax',
  local_storage_empty: true, htmx_version: '2.0.8' };
try {
  context = await browser.newContext();
  const page = await context.newPage();
  const remember = async () => {
    for (const cookie of await context.cookies()) {
      if (cookie.name === 'audentra_session') sessionKeys.add(cookie.value);
    }
  };
  stage = 'htmx_static';
  await page.goto(`${origin}/login/`);
  await page.waitForFunction(() => window.htmx?.version === '2.0.8');
  stage = 'invalid_login_validation';
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-development-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').waitFor();
  stage = 'valid_login';
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${origin}/auth/session/`);
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  await remember();
  const cookie = (await context.cookies()).find(item => item.name === 'audentra_session');
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'Lax');
  assert.equal(await page.evaluate(() => Object.keys(localStorage).length), 0);
  stage = 'htmx_navigation';
  await page.getByRole('link', { name: 'Change password', exact: true }).click();
  await page.getByRole('heading', { name: 'Change password', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Back to account', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  stage = 'htmx_logout';
  await page.getByRole('button', { name: 'Sign out of this session', exact: true }).click();
  await page.waitForURL(`${origin}/login/`);
  await page.goto(`${origin}/auth/session/`);
  await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
  await remember();
} catch {
  result.status = 'failed';
  result.failed_stage = stage;
  console.error(`P4 browser check failed at ${stage}`);
  process.exitCode = 1;
} finally {
  if (context) {
    for (const cookie of await context.cookies()) {
      if (cookie.name === 'audentra_session') sessionKeys.add(cookie.value);
    }
  }
  console.log(JSON.stringify({ ...result, session_keys: [...sessionKeys] }));
  await browser.close();
}
