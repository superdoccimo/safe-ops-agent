
const { sh } = require('../lib/exec');
const { prefixSSH } = require('../lib/ssh');

async function logs(config, flags) {
  const t = (config.targets || {})[flags.target || 'prod'];
  if (!t) throw new Error(`target not found: ${flags.target || 'prod'}`);
  const pm2 = (config.deploy && config.deploy.pm2) || t.pm2 || 'all';
  const cmd = `pm2 logs ${pm2}`;
  const wrapped = prefixSSH(t, cmd);
  sh(wrapped, { dryRun: !!flags['dry-run'] });
}

module.exports = { logs };
