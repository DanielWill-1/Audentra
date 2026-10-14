const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { captureSourceProvenance } = require('./p7_source_provenance.cjs');

const root = path.resolve(__dirname, '..', '..', '..');
const runId = process.argv.find((argument) => argument.startsWith('--run-id='))?.slice(9);
const stage = process.argv.find((argument) => argument.startsWith('--stage='))?.slice(8) || 'start';
const runDirectory = runId
  ? path.join(root, 'docs', 'parity', 'evidence', 'p9', runId)
  : '';
const output = runDirectory ? path.join(runDirectory, `P9_${stage.toUpperCase()}_METADATA.json`) : '';

function filesIn(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '__pycache__' || entry.name === '.pytest_cache') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) filesIn(absolute, files);
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function digestFiles(paths, prefix) {
  const records = [];
  for (const file of paths) {
    if (!fs.existsSync(file)) continue;
    records.push({ file, relative: path.relative(prefix, file).split(path.sep).join('/'), bytes: fs.readFileSync(file) });
  }
  records.sort((left, right) => left.relative.localeCompare(right.relative));
  const digest = crypto.createHash('sha256');
  for (const record of records) {
    digest.update(record.relative);
    digest.update('\0');
    digest.update(record.bytes);
    digest.update('\0');
  }
  return { sha256: digest.digest('hex'), file_count: records.length };
}

function captureDjangoDigest() {
  const djangoRoot = path.join(root, 'migration', 'django');
  const directories = ['apps', 'config', 'templates', 'static', 'scripts', 'tests'];
  const files = directories.flatMap((directory) => filesIn(path.join(djangoRoot, directory)));
  files.push(path.join(djangoRoot, 'assets', 'tailwind.input.css'));
  return digestFiles(files, djangoRoot);
}

async function main() {
  if (!runId || !/^[a-z0-9][a-z0-9_-]{0,47}$/i.test(runId)) {
    throw new Error('Usage: node p9_run_metadata.cjs --run-id=<fresh-id> [--stage=start|final|closeout]');
  }
  if (!['start', 'final', 'closeout'].includes(stage)) throw new Error('Metadata stage must be start, final or closeout.');
  if (!fs.existsSync(runDirectory)) throw new Error(`P9 run directory does not exist: ${runId}`);
  if (fs.existsSync(output)) throw new Error(`Metadata already exists; refusing to overwrite: ${output}`);

  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
  });
  const source = captureSourceProvenance(root);
  const manifest = fs.readFileSync(path.join(root, 'docs', 'parity', 'route-manifest.json'));
  const djangoDigest = captureDjangoDigest();
  const browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  await browser.close();
  const metadata = {
    run_id: runId,
    stage,
    captured_at: new Date().toISOString(),
    branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    worktree_status_sha256: crypto.createHash('sha256').update(status).digest('hex'),
    working_tree_entry_count: status.split(/\r?\n/).filter(Boolean).length,
    source: {
      git_revision: source.git_revision,
      worktree_digest_sha256: source.worktree_digest,
      file_count: source.file_count,
    },
    django: {
      digest_algorithm: 'sha256 over sorted relative paths and bytes for apps/config/templates/static/scripts/tests plus Tailwind input',
      content_digest: djangoDigest.sha256,
      file_count: djangoDigest.file_count,
    },
    route_manifest_sha256: crypto.createHash('sha256').update(manifest).digest('hex'),
    runtime: {
      node: process.version,
      python_expected: '3.12.10 (project lock/runtime; refreshed by the execution command ledger)',
      django_expected: '5.2.18 (project lock; refreshed by the execution command ledger)',
      playwright: require('playwright/package.json').version,
      browser: browserVersion,
    },
    boundary: 'Local metadata calculation only; no HTTP/database query, hosted fixture, provider call or device access.',
  };
  fs.writeFileSync(output, `${JSON.stringify(metadata, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ run_id: runId, stage, output, source_file_count: source.file_count, django_file_count: metadata.django.file_count, browser: metadata.runtime.browser })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
