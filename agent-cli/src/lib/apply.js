const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isSubPath(root, target) {
  const rel = path.relative(root, target);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function applyOps(ops, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const dryRun = !!opts.dryRun;
  const summary = { wrote: 0, deleted: 0, mkdir: 0, errors: 0, details: [] };

  for (const op of ops || []) {
    try {
      const kind = op.op || op.type;
      const p = path.resolve(cwd, op.path);
      if (!isSubPath(cwd, p)) throw new Error(`Refuse to touch outside workspace: ${op.path}`);

      if (kind === 'write') {
        ensureDir(path.dirname(p));
        if (dryRun) {
          summary.details.push({ op: 'write', path: p, bytes: Buffer.byteLength(String(op.content || '')) });
        } else {
          fs.writeFileSync(p, String(op.content || ''), 'utf8');
        }
        summary.wrote++;
      } else if (kind === 'delete') {
        if (dryRun) {
          summary.details.push({ op: 'delete', path: p });
        } else if (fs.existsSync(p)) {
          const st = fs.statSync(p);
          if (st.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
          else fs.unlinkSync(p);
        }
        summary.deleted++;
      } else if (kind === 'mkdir') {
        if (!dryRun) ensureDir(p);
        summary.mkdir++;
      } else {
        throw new Error(`Unknown op: ${kind}`);
      }
    } catch (e) {
      summary.errors++;
      summary.details.push({ error: e.message });
      if (!opts.continueOnError) throw e;
    }
  }
  return summary;
}

module.exports = { applyOps };

