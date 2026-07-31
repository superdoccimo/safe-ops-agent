
const { sh } = require('../lib/exec');
const { prefixSSH } = require('../lib/ssh');
const { resolveTarget } = require('../lib/target');

async function logs(config, flags) {
  const t = resolveTarget(config, flags.target || 'prod');
  const pm2 = (config.deploy && config.deploy.pm2) || t.pm2 || 'all';
  const cmd = `pm2 logs ${pm2}`;
  const wrapped = prefixSSH(t, cmd);
  sh(wrapped, { dryRun: !!flags['dry-run'] });
}

module.exports = { logs };
