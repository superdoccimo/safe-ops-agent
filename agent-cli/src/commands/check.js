
const { sh } = require('../lib/exec');
const { prefixSSH } = require('../lib/ssh');

async function check(config, flags) {
  const t = (config.targets || {})[flags.target || 'prod'];
  const urls = (config.healthcheck && config.healthcheck.urls) || [];
  if (urls.length === 0) throw new Error('no healthcheck.urls configured');

  for (const url of urls) {
    const cmd = `bash -lc "code=$(curl -sS -o /dev/null -w '%{http_code}' ${url} || echo 000); echo '[HC] ${url} -> '$code; test $code -ge 200 -a $code -lt 400"`;
    const wrapped = t ? prefixSSH(t, cmd) : cmd;
    sh(wrapped, { dryRun: !!flags['dry-run'] });
  }
}

module.exports = { check };
