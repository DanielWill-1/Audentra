const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const djangoRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(djangoRoot, '..', '..');
const python = process.env.P7_BROWSER_PYTHON || path.join(djangoRoot, '.venv-p2', 'Scripts', 'python.exe');
const reactPort = process.env.P7_REACT_PORT || 15573;
const djangoPort = process.env.P7_DJANGO_PORT || 18875;
const browserDatabase = path.join(djangoRoot, `.p7-browser-${process.pid}.sqlite3`);
const browserEnvironment = {
  DJANGO_SETTINGS_MODULE: 'config.settings.browser',
  P7_BROWSER_DB_PATH: browserDatabase,
};
const serverOutput = new Map();
const mediaOnly = process.argv.includes('--media-only');
const checkOnly = process.argv.includes('--check-only');
const appOnly = process.argv.includes('--app-only');
const sourceOnly = process.argv.includes('--source-only');
const voiceOnly = process.argv.includes('--voice-only');
const timezoneOnly = process.argv.includes('--timezone-only');
const desktopMicOnly = process.argv.includes('--desktop-mic-only');
const focusOnly = process.argv.includes('--focus-only');
const assetOnly = process.argv.includes('--asset-only');

if ([mediaOnly, checkOnly, appOnly, sourceOnly, voiceOnly, timezoneOnly, desktopMicOnly, focusOnly, assetOnly].filter(Boolean).length > 1) {
  throw new Error('Choose only one browser-suite mode.');
}

if (!fs.existsSync(python)) {
  throw new Error('The expected local Python 3.12 runtime is unavailable.');
}

function start(name, executable, args, cwd, env) {
  const child = spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  const append = (chunk) => {
    output = `${output}${chunk}`.slice(-6000);
    serverOutput.set(name, output);
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.once('error', (error) => append(Buffer.from(error.message)));
  serverOutput.set(name, output);
  return child;
}

async function waitFor(url, child, name) {
  const deadline = Date.now() + 20000;
  let lastError = '';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${name} exited before it was ready. ${serverOutput.get(name) || ''}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${name} did not become ready (${lastError}). ${serverOutput.get(name) || ''}`);
}

function runNode(script, args, env, timeout = 20 * 60 * 1000) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const diagnostics = [...serverOutput.entries()]
      .filter(([, output]) => output)
      .map(([name, output]) => `${name} server diagnostics:\n${output}`)
      .join('\n');
    throw new Error(
      `${path.basename(script)} exited with ${result.status}.` +
      (diagnostics ? `\n${diagnostics}` : ''),
    );
  }
}

function migrateBrowserDatabase() {
  const result = spawnSync(python, ['manage.py', 'migrate', '--noinput'], {
    cwd: djangoRoot,
    env: { ...process.env, ...browserEnvironment },
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Isolated browser database migration failed (${result.status}).`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function main() {
  if (!sourceOnly) migrateBrowserDatabase();
  const django = sourceOnly ? null : start(
    'Django',
    python,
    [
      'manage.py',
      'runserver',
      `127.0.0.1:${djangoPort}`,
      '--noreload',
      '--nothreading',
      '--insecure',
    ],
    djangoRoot,
    browserEnvironment,
  );
  const vite = mediaOnly || checkOnly || appOnly || voiceOnly || desktopMicOnly || focusOnly ? null : start(
    'Vite',
    process.execPath,
    [path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host=127.0.0.1', `--port=${reactPort}`, '--strictPort'],
    repoRoot,
    {
      VITE_SUPABASE_URL: 'http://127.0.0.1:9',
      VITE_SUPABASE_ANON_KEY: 'synthetic-browser-capture-only',
    },
  );
  try {
    if (sourceOnly) {
      await waitFor(`http://127.0.0.1:${reactPort}/`, vite, 'Vite');
      const requestedAppWave = process.argv.find((argument) => /^--app-wave=w[3-7]$/.test(argument))?.slice(11);
      if (!requestedAppWave) {
        const publicCapture = path.join(djangoRoot, 'scripts', 'p7_capture_react.cjs');
        runNode(publicCapture, [], { P7_REACT_BASE_URL: `http://127.0.0.1:${reactPort}` });
        runNode(publicCapture, ['--wave=w2'], { P7_REACT_BASE_URL: `http://127.0.0.1:${reactPort}` });
      }
      const capture = path.join(djangoRoot, 'scripts', 'p7_source_app_capture.cjs');
      const captureArgs = process.argv.includes('--auth-only') ? ['--auth-only'] : [];
      if (requestedAppWave) captureArgs.push(`--wave=${requestedAppWave}`);
      runNode(capture, captureArgs, { P7_REACT_BASE_URL: `http://127.0.0.1:${reactPort}` });
      return;
    }
    await waitFor(`http://127.0.0.1:${djangoPort}/login`, django, 'Django');
    if (django.exitCode !== null) {
      throw new Error(`Django server exited after startup. ${serverOutput.get('Django') || ''}`);
    }
    const cssProbe = await fetch(`http://127.0.0.1:${djangoPort}/static/css/app.css`);
    if (!cssProbe.ok || !cssProbe.headers.get('content-type')?.startsWith('text/css')) {
      throw new Error(
        `Django browser settings did not serve app.css (${cssProbe.status}, ` +
        `${cssProbe.headers.get('content-type')}). ` +
        `${serverOutput.get('Django') || ''}`,
      );
    }
    if (assetOnly) {
      await waitFor(`http://127.0.0.1:${reactPort}/`, vite, 'Vite');
      runNode(path.join(djangoRoot, 'scripts', 'p9_asset_check.cjs'), [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P7_REACT_BASE_URL: `http://127.0.0.1:${reactPort}`,
        P9_ASSET_EVIDENCE_DIR: process.env.P9_ASSET_EVIDENCE_DIR || '',
        P7_EVIDENCE_RUN: process.env.P7_EVIDENCE_RUN || '',
      }, 120_000);
      return;
    }
    if (mediaOnly) {
      runNode(path.join(djangoRoot, 'scripts', 'p8_media_check.cjs'), [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
      });
      return;
    }
    if (desktopMicOnly) {
      const micCheck = path.join(djangoRoot, 'scripts', 'p9_desktop_mic_check.cjs');
      runNode(micCheck, [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P9_DEVICE_EVIDENCE_DIR: process.env.P9_DEVICE_EVIDENCE_DIR || '',
      }, 120_000);
      return;
    }
    if (focusOnly) {
      const focusCheck = path.join(djangoRoot, 'scripts', 'p9_focus_check.cjs');
      runNode(focusCheck, [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P9_FOCUS_EVIDENCE_DIR: process.env.P9_FOCUS_EVIDENCE_DIR || '',
        P9_FOCUS_KEYBOARD_ACTIVATION: process.env.P9_FOCUS_KEYBOARD_ACTIVATION || '',
        P9_FOCUS_ROUTE: process.env.P9_FOCUS_ROUTE || '',
        P9_FOCUS_VIEWPORT: process.env.P9_FOCUS_VIEWPORT || '',
      }, 15 * 60 * 1000);
      return;
    }
    if (voiceOnly) {
      runNode(path.join(djangoRoot, 'scripts', 'p8_voice_check.cjs'), [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P8_VOICE_EVIDENCE_DIR: process.env.P8_VOICE_EVIDENCE_DIR || path.join(
          repoRoot,
          'docs',
          'pages',
          'evidence',
          'w7',
          process.env.P7_EVIDENCE_RUN || 'closeout-20261012',
        ),
      });
      return;
    }
    if (timezoneOnly) {
      await waitFor(`http://127.0.0.1:${reactPort}/`, vite, 'Vite');
      runNode(path.join(djangoRoot, 'scripts', 'p7_timezone_browser_check.cjs'), [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P7_REACT_BASE_URL: `http://127.0.0.1:${reactPort}`,
        P7_TIMEZONE_EVIDENCE_DIR: process.env.P7_TIMEZONE_EVIDENCE_DIR || path.join(
          repoRoot,
          'docs',
          'pages',
          'evidence',
          'w6',
          'p7-timezone-20261013',
        ),
      });
      return;
    }
    if (checkOnly) {
      const verify = path.join(djangoRoot, 'scripts', 'p7_browser_check.cjs');
      const evidenceRun = process.env.P7_EVIDENCE_RUN || 'post-wave-review';
      runNode(verify, [], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P7_EVIDENCE_RUN: evidenceRun,
      });
      runNode(verify, ['--wave=w2'], {
        P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
        P7_EVIDENCE_RUN: evidenceRun,
      });
      return;
    }
    if (appOnly) {
      const appCheck = path.join(djangoRoot, 'scripts', 'p7_application_browser_check.cjs');
      const evidenceRun = process.env.P7_EVIDENCE_RUN || 'post-wave-review-20261012';
      const requestedWave = process.argv.find((argument) => /^--wave=w[3-7]$/.test(argument));
      const requestedRoute = process.argv.find((argument) => argument.startsWith('--route='));
      const waves = requestedWave ? [requestedWave.slice(-2)] : ['w3', 'w4', 'w5', 'w6', 'w7'];
      for (const wave of waves) {
        const args = [`--wave=${wave}`];
        if (requestedRoute) args.push(requestedRoute);
        runNode(appCheck, args, {
          P7_DJANGO_BASE_URL: `http://127.0.0.1:${djangoPort}`,
          P7_EVIDENCE_RUN: evidenceRun,
        });
      }
      return;
    }
    await waitFor(`http://127.0.0.1:${reactPort}/`, vite, 'Vite');

    const capture = path.join(djangoRoot, 'scripts', 'p7_capture_react.cjs');
    const verify = path.join(djangoRoot, 'scripts', 'p7_browser_check.cjs');
    const mediaCheck = path.join(djangoRoot, 'scripts', 'p8_media_check.cjs');
    const sourceBase = `http://127.0.0.1:${reactPort}`;
    const djangoBase = `http://127.0.0.1:${djangoPort}`;
    runNode(capture, [], { P7_REACT_BASE_URL: sourceBase });
    runNode(capture, ['--wave=w2'], { P7_REACT_BASE_URL: sourceBase });
    runNode(verify, [], { P7_DJANGO_BASE_URL: djangoBase });
    runNode(verify, ['--wave=w2'], { P7_DJANGO_BASE_URL: djangoBase });
    runNode(mediaCheck, [], { P7_DJANGO_BASE_URL: djangoBase });
  } finally {
    await Promise.all([...(django ? [stop(django)] : []), ...(vite ? [stop(vite)] : [])]);
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const temporaryFile = `${browserDatabase}${suffix}`;
      if (path.dirname(path.resolve(temporaryFile)) === path.resolve(djangoRoot) && fs.existsSync(temporaryFile)) {
        fs.unlinkSync(temporaryFile);
      }
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
