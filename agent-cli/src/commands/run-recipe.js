const fs = require('fs');
const path = require('path');
const { loadRecipe } = require('../core/loader');
const { plan, run } = require('../core/runner');
const { createRunLogDir, writeFileSafe } = require('../lib/log');
const { maskObject, maskString } = require('../lib/mask');

async function runRecipe(config, flags) {
  const recipePath = flags.recipe || flags.file || '';
  if (!recipePath) throw new Error('--recipe <path/to/agent.yml> is required');
  const abs = path.resolve(process.cwd(), recipePath);
  const recipe = loadRecipe(abs);
  const dryRun = !!flags['dry-run'];
  const format = (flags.format || 'text').toLowerCase();
  const planObj = plan(recipe, config);

  // prepare outputs
  let textOut = '';
  if (format === 'json') {
    const json = JSON.stringify(maskObject(planObj), null, 2);
    console.log(json);
    textOut = renderText(planObj);
  } else {
    textOut = renderText(planObj);
    console.log(textOut);
  }

  // logs/YYYYMMDD-HHMM
  const dir = createRunLogDir('logs');
  writeFileSafe(path.join(dir, 'plan.json'), JSON.stringify(maskObject(planObj), null, 2));
  writeFileSafe(path.join(dir, 'run-recipe.log'), textOut);

  // Build run result (planned for dry-run)
  let runObj = null;
  if (dryRun) {
    const now = Date.now();
    runObj = { steps: (planObj.steps || []).map(s => ({ name: s.name, status: 'planned', ms: 0, stdoutTail: '', stderrTail: '', exitCode: 0, retries: 0, start: new Date(now).toISOString(), end: new Date(now).toISOString() })) };
  } else {
    const results = await run(recipe, config, { dryRun: false });
    const start = Date.now();
    runObj = { steps: results.map(r => ({ ...r, start: new Date(start).toISOString(), end: new Date(start + r.ms).toISOString() })) };
  }

  if (format === 'json') {
    writeFileSafe(path.join(dir, 'run.json'), JSON.stringify(maskObject(runObj), null, 2));
  }

  // Append run summary to log
  const lines = [];
  lines.push('');
  lines.push('## Run');
  for (const r of runObj.steps) {
    lines.push(`- ${r.name} status=${r.status} start=${r.start} end=${r.end} ms=${r.ms} retries=${r.retries} exit=${r.exitCode}`);
  }
  fs.appendFileSync(path.join(dir, 'run-recipe.log'), lines.join('\n') + '\n', 'utf8');
}

function renderText(planObj) {
  const out = [];
  out.push('# Plan');
  out.push(`target: ${planObj.target}`);
  for (const s of planObj.steps) {
    out.push(`- [${s.status}] ${s.name}`);
    for (const c of s.commands || []) out.push(`  $ ${maskString(c)}`);
  }
  return out.join('\n') + '\n';
}

module.exports = { runRecipe };
