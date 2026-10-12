const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function collectFiles(directory, root, files) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(absolute, root, files);
    else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
}

function captureSourceProvenance(root) {
  const files = [];
  for (const directory of ['src', 'new pages']) collectFiles(path.join(root, directory), root, files);
  for (const name of [
    'index.html',
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
  ]) {
    if (fs.existsSync(path.join(root, name))) files.push(name);
  }

  files.sort();
  const fileDigests = {};
  const treeHash = crypto.createHash('sha256');
  for (const relative of files) {
    const bytes = fs.readFileSync(path.join(root, relative));
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    fileDigests[relative] = digest;
    treeHash.update(relative);
    treeHash.update('\0');
    treeHash.update(bytes);
    treeHash.update('\0');
  }

  return {
    git_revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    worktree_digest: treeHash.digest('hex'),
    file_count: files.length,
    file_digests: fileDigests,
  };
}

module.exports = { captureSourceProvenance };
