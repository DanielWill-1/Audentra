const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const runId = process.argv.find((argument) => argument.startsWith('--run-id='))?.slice(9);
const attemptValue = process.argv.find((argument) => argument.startsWith('--attempt='))?.slice(10) || '1';
const attempt = Number(attemptValue);
const runDirectory = runId
  ? path.join(root, 'docs', 'parity', 'evidence', 'p9', runId)
  : '';
const evidenceDirectory = runDirectory ? path.join(runDirectory, `attempt-${String(attempt).padStart(2, '0')}`) : '';
const evidenceDirectories = runDirectory
  ? ['source', 'django'].map((name) => path.join(evidenceDirectory, name))
  : [];
const runner = path.join(__dirname, 'run_p7_browser_suite.cjs');
const commands = [
  { mode: 'source-only', args: ['--source-only'] },
  { mode: 'check-only', args: ['--check-only'] },
  { mode: 'app-only', args: ['--app-only'] },
];

function main() {
  if (!runId || !/^[a-z0-9][a-z0-9_-]{0,47}$/i.test(runId) || !Number.isSafeInteger(attempt) || attempt < 1 || attempt > 99) {
    throw new Error('Usage: node p9_browser_suite.cjs --run-id=<fresh-id> [--attempt=1..99]');
  }
  if (!fs.existsSync(runDirectory)) throw new Error(`P9 run directory does not exist: ${runId}`);
  fs.mkdirSync(evidenceDirectory, { recursive: false });
  for (const directory of evidenceDirectories) {
    if (fs.existsSync(directory)) throw new Error(`Refusing to overwrite existing evidence: ${directory}`);
  }

  const ledger = {
    run_id: runId,
    started_at: new Date().toISOString(),
    boundary: 'Current React/Vite source plus Django browser settings and isolated SQLite fixtures; no hosted data or live providers.',
    commands: [],
    status: 'running',
  };
  const environment = {
    ...process.env,
    P9_EVIDENCE_DIR: evidenceDirectory,
    P7_EVIDENCE_RUN: runId,
    P7_REFERENCE_RUN: runId,
  };

  for (const command of commands) {
    const result = spawnSync(process.execPath, [runner, ...command.args], {
      cwd: root,
      env: environment,
      encoding: 'utf8',
      maxBuffer: 24 * 1024 * 1024,
      timeout: 20 * 60 * 1000,
      windowsHide: true,
    });
    ledger.commands.push({
      command: `node migration/django/scripts/run_p7_browser_suite.cjs ${command.mode}`,
      exit_code: result.status,
      signal: result.signal || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    });
    process.stdout.write(`${JSON.stringify({ mode: command.mode, exit_code: result.status, signal: result.signal || null })}\n`);
    if (result.error) throw new Error(`${command.mode} failed: ${result.error.message}`);
    if (result.status !== 0) {
      ledger.status = 'failed';
      ledger.finished_at = new Date().toISOString();
      fs.writeFileSync(path.join(evidenceDirectory, 'P9_BROWSER_COMMANDS.json'), `${JSON.stringify(ledger, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      process.exitCode = 1;
      return;
    }
  }

  ledger.status = 'passed';
  ledger.finished_at = new Date().toISOString();
  fs.writeFileSync(path.join(evidenceDirectory, 'P9_BROWSER_COMMANDS.json'), `${JSON.stringify(ledger, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
}
