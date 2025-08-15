const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safePath(targetPath, workspaceRoot) {
  const resolved = path.resolve(targetPath);
  const normalizedRoot = path.resolve(workspaceRoot);
  
  // Check if the path is within the workspace
  const relative = path.relative(normalizedRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Security violation: Path outside workspace not allowed: ${targetPath}`);
  }
  
  // Block system directories and sensitive paths
  const blocked = [
    '/etc', '/usr', '/var', '/bin', '/sbin', '/boot', '/root', '/home',
    'C:\\Windows', 'C:\\Program Files', 'C:\\Users', '/System', '/Applications'
  ];
  
  for (const blockedPath of blocked) {
    if (resolved.toLowerCase().startsWith(blockedPath.toLowerCase())) {
      throw new Error(`Security violation: System path not allowed: ${targetPath}`);
    }
  }
  
  return resolved;
}

function isSubPath(root, target) {
  try {
    safePath(target, root);
    return true;
  } catch (e) {
    return false;
  }
}

function applyOps(ops, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const dryRun = !!opts.dryRun;
  const summary = { wrote: 0, deleted: 0, mkdir: 0, errors: 0, details: [] };

  for (const op of ops || []) {
    try {
      const kind = op.op || op.type;
      const p = safePath(path.resolve(cwd, op.path), cwd);

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

module.exports = { applyOps, safePath };

