const fs = require('fs');
const path = require('path');
const { unifiedToOps } = require('../lib/patch');
const { applyOps } = require('../lib/apply');
const { deploy } = require('./deploy');

async function patchCmd(config, flags) {
  const text = await readInput(flags.input);
  const ops = unifiedToOps(text, process.cwd());
  if (flags.apply) {
    const dryRun = !!flags['dry-run'];
    const summary = applyOps(ops, { dryRun });
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
    if (flags.deploy) await deploy(config, flags);
  } else {
    // Default: print ops JSON to stdout (dry-run mode)
    console.log('[patch] Default dry-run mode - use --apply to execute changes');
    process.stdout.write(JSON.stringify(ops, null, 2) + '\n');
  }
}

function readInput(inputPath){
  if (inputPath) return fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  return new Promise((resolve, reject)=>{
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
    if (process.stdin.isTTY) resolve('');
  });
}

module.exports = { patchCmd };

