
const fs = require('fs');
const path = require('path');
const { deploy } = require('./commands/deploy');
const { check } = require('./commands/check');
const { revalidate } = require('./commands/revalidate');
const { logs } = require('./commands/logs');
const { fix } = require('./commands/fix');
const { serve } = require('./server');
const { report } = require('./commands/report');
const { patchCmd } = require('./commands/patch');
const { ingest } = require('./commands/ingest');
const { runRecipe } = require('./commands/run-recipe');
const { health } = require('./commands/health');
const { invalidate } = require('./commands/invalidate');

const args = process.argv.slice(2);
const cmd = args[0];
const flags = parseFlags(args.slice(1));
const config = loadConfig();

function parseFlags(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith('--')) {
      const [k, v] = a.replace(/^--/, '').split('=');
      if (typeof v === 'undefined') {
        const next = list[i+1];
        if (next && !next.startsWith('--')) { out[k] = next; i++; }
        else out[k] = true;
      } else out[k] = v;
    }
  }
  return out;
}

function loadConfig() {
  const p = path.resolve(process.cwd(), 'agent.config.json');
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return { targets: {}, healthcheck: {}, revalidate: {}, deploy: {} };
}

async function main() {
  try {
    switch (cmd) {
      case 'deploy':    await deploy(config, flags); break;
      case 'check':     await check(config, flags); break;
      case 'revalidate':await revalidate(config, flags); break;
      case 'health':    await health(config, flags); break;
      case 'invalidate':await invalidate(config, flags); break;
      case 'logs':      await logs(config, flags); break;
      case 'fix':       await fix(config, flags); break;
      case 'serve':     await serve(config, flags); break;
      case 'patch':     await patchCmd(config, flags); break;
      case 'ingest':    await ingest(config, flags); break;
      case 'run-recipe':await runRecipe(config, flags); break;
      case 'report':    await report(config, flags); break;
      case 'help':
      case undefined:
        printHelp(); break;
      default:
        console.error(`[ERR] Unknown command: ${cmd}`);
        printHelp(); process.exit(1);
    }
  } catch (e) {
    console.error(`[ERR] ${e.message || e}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`agent <command> [options]

Commands:
  run-recipe   Run agent.yml recipe (plan or execute)
  deploy       Deploy via SSH (git pull → build → PM2 reload)
  health       Healthcheck (alias of check)
  invalidate   Content invalidate (alias of revalidate)
  check        Healthcheck via curl
  revalidate   Call Next.js /api/revalidate
  logs         Tail PM2/app logs
  fix          Apply local diff operations (write/delete/mkdir)
  serve        Start minimal local HTTP UI/API
  patch        Convert unified diff to ops JSON (use --apply to apply)
  ingest       Run command to get unified diff (use --cmd "…")

Options:
  --target <name>     Target name from agent.config.json
  --slug <slug>       For revalidate
  --path <path>       For revalidate
  --recipe <path>     Path to agent.yml (for run-recipe)
  --dry-run           Print actions without executing
  --input <file>      JSON file for 'fix' ops
  --port <port>       Port for 'serve' (default 8787)
  --apply             Apply converted ops (for 'patch')
  --cmd <command>     Command to execute (for 'ingest')
`);
}

main();
