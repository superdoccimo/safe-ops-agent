const { shCapture } = require('../lib/exec');
const { unifiedToOps } = require('../lib/patch');
const { applyOps } = require('../lib/apply');
const { deploy } = require('./deploy');

async function ingest(config, flags) {
  let patchText = '';
  if (flags.file) {
    const fs = require('fs');
    const path = require('path');
    patchText = fs.readFileSync(path.resolve(process.cwd(), flags.file), 'utf8');
  } else {
    const cmd = flags.cmd || (config.ingest && config.ingest.cmd);
    if (!cmd) throw new Error('--cmd is required (or set ingest.cmd in agent.config.json) or use --file');
    const { stdout } = shCapture(cmd, {});
    patchText = stdout;
  }
  const ops = unifiedToOps(patchText, process.cwd());
  if (flags.apply) {
    const summary = applyOps(ops, { dryRun: !!flags['dry-run'] });
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
    if (flags.deploy) await deploy(config, flags);
  } else {
    process.stdout.write(JSON.stringify(ops, null, 2) + '\n');
  }
}

module.exports = { ingest };
