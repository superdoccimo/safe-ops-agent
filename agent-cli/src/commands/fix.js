const fs = require('fs');
const path = require('path');
const { applyOps } = require('../lib/apply');
const { deploy } = require('./deploy');

async function fix(config, flags) {
  let ops = null;
  if (flags.input) {
    const p = path.resolve(process.cwd(), flags.input);
    ops = JSON.parse(fs.readFileSync(p, 'utf8'));
  } else {
    const data = await readStdin();
    ops = JSON.parse(data);
  }

  const dryRun = !!flags['dry-run'];
  const summary = applyOps(ops, { dryRun });
  console.log(`[fix] wrote=${summary.wrote} deleted=${summary.deleted} mkdir=${summary.mkdir} errors=${summary.errors}`);
  if (dryRun && summary.details?.length) {
    for (const d of summary.details) console.log(`[dry]`, d);
  }

  if (flags.deploy) {
    await deploy(config, flags);
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
    if (process.stdin.isTTY) resolve('[]');
  });
}

module.exports = { fix };

