const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = (process.env.P10_PERF_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const credentialsPath = path.resolve(__dirname, '../.state/local-demo-credentials.txt');
let currentStage = 'credential_file';

async function main() {
  const credentials = fs.readFileSync(credentialsPath, 'utf8');
  const email = credentials.match(/^Email: (.+)$/m)?.[1];
  const password = credentials.match(/^Password: (.+)$/m)?.[1];
  if (!email || !password) {
    throw new Error('Local synthetic demo credentials are missing.');
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    currentStage = 'database_readiness';
    const readiness = await page.request.get(baseUrl + '/readyz');
    if (readiness.status() !== 200) {
      throw new Error('Local database readiness failed.');
    }
    await page.goto(baseUrl + '/login/', { waitUntil: 'domcontentloaded' });
    currentStage = 'field_validation';
    await page.locator('form[method="post"]').evaluate((form) => {
      form.noValidate = true;
    });
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('invalid-local-check-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByText('Enter a valid email address.', { exact: true }).waitFor();

    currentStage = 'invalid_credentials';
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('invalid-local-check-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page
      .getByText('Those details could not be accepted. Check them and try again.', { exact: true })
      .waitFor();

    currentStage = 'successful_sign_in';
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((url) => /\/dashboard\/?$/.test(url.pathname), { timeout: 15000 });

    currentStage = 'protected_template';
    const response = await page.goto(baseUrl + '/templates', { waitUntil: 'load' });
    if (!response || response.status() !== 200) {
      throw new Error('The local template workspace did not load.');
    }
    await page.getByRole('heading', { name: 'Demo patient intake' }).waitFor();
    process.stdout.write(
      JSON.stringify({
        ok: true,
        readiness: 'passed',
        validation_error: 'field_specific',
        auth_error: 'sanitized_and_recoverable',
        auth: 'local_supabase',
        template: 'synthetic_demo_patient_intake',
        credential_values_printed: false,
      }) + '\n',
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  void error;
  process.stderr.write('Local demo check failed at ' + currentStage + '.\n');
  process.exitCode = 1;
});
