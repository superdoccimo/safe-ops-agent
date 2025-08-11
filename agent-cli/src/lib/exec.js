
const { spawnSync } = require('child_process');

function sh(cmd, opts = {}) {
  if (opts.dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return { status: 0 };
  }
  const res = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`Command failed: ${cmd}`);
  return res;
}

function shCapture(cmd, opts = {}) {
  if (opts.dryRun) return { status: 0, stdout: '' };
  const res = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`Command failed: ${cmd}\n${res.stderr || ''}`);
  return res;
}

module.exports = { sh, shCapture };
