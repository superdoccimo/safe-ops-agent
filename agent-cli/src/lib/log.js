const fs = require('fs');
const path = require('path');

function tsFolder() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}${m}${day}-${hh}${mm}`;
}

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

function isSubPath(root, target) {
  const rel = path.relative(root, target);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function createRunLogDir(base = 'logs') {
  const cwd = process.cwd();
  const dir = path.resolve(cwd, base, tsFolder());
  if (!isSubPath(cwd, dir)) throw new Error('Refuse to create logs outside workspace');
  ensureDir(dir);
  return dir;
}

function writeFileSafe(targetPath, content) {
  const cwd = process.cwd();
  const abs = path.resolve(cwd, targetPath);
  if (!isSubPath(cwd, abs)) throw new Error('Refuse to write outside workspace');
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

module.exports = { createRunLogDir, writeFileSafe };

