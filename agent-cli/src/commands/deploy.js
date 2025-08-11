
const { sh } = require('../lib/exec');
const { prefixSSH } = require('../lib/ssh');

function getDeployCommands(config, t) {
  return [
    'git pull --ff-only || true',
    config.deploy?.build || 'npm run build',
    (t.pm2 ? `pm2 reload ${t.pm2}` : (config.deploy?.pm2 ? `pm2 reload ${config.deploy.pm2}` : 'pm2 reload all'))
  ];
}

async function deploy(config, flags) {
  const t = (config.targets || {})[flags.target || 'prod'];
  if (!t) throw new Error(`target not found: ${flags.target || 'prod'}`);

  const cmds = getDeployCommands(config, t);
  for (const c of cmds) {
    const wrapped = prefixSSH(t, c);
    sh(wrapped, { dryRun: !!flags['dry-run'] });
  }
}

module.exports = { deploy, getDeployCommands };
