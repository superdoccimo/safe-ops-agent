const { getDeployCommands } = require('../commands/deploy');
const { prefixSSH } = require('../lib/ssh');
const { shCapture } = require('../lib/exec');
const { check } = require('../commands/check');
const { revalidate } = require('../commands/revalidate');
const { resolveRevalidate } = require('../adapters/next');
const { maskObject, maskString } = require('../lib/mask');

function resolveTarget(config, name) {
  const t = (config.targets || {})[name] || (config.targets || {}).prod || null;
  if (!t) throw new Error(`target not found: ${name}`);
  return t;
}

function plan(recipe, config) {
  const targetName = recipe.target || 'prod';
  const t = resolveTarget(config, targetName);
  const steps = [];
  for (const s of recipe.steps) {
    const k = s.step || s.type || s.kind || s;
    if (k === 'git-pull' || k === 'build' || k === 'pm2-reload' || k === 'deploy') {
      const cmds = getDeployCommands(config, t).map(c => maskString(prefixSSH(t, c)));
      steps.push({ name: 'deploy', commands: cmds, status: 'planned' });
    } else if (k === 'healthcheck' || k === 'health') {
      const urls = (config.healthcheck && config.healthcheck.urls) || [];
      const cmds = urls.map(u => maskString(`curl -sS -o /dev/null -w '%{http_code}' ${u}`));
      steps.push({ name: 'healthcheck', commands: cmds, status: 'planned' });
    } else if (k === 'invalidate' || k === 'revalidate') {
      const info = resolveRevalidate(config, recipe);
      const endpoint = info.endpoint;
      const secret = info.secret;
      const qs = endpoint ? `?secret=${encodeURIComponent(secret)}` : '';
      const body = {};
      if (info.path) body.path = info.path;
      if (info.slug) body.slug = info.slug;
      const bodyStr = Object.keys(body).length ? ` body=${JSON.stringify(body)}` : '';
      const cmd = endpoint ? maskString(`POST ${endpoint}${qs}${bodyStr}`) : 'POST /api/revalidate (not configured)';
      steps.push({ name: 'invalidate', commands: [cmd], status: 'planned' });
    } else {
      steps.push({ name: String(k), commands: [], status: 'planned' });
    }
  }
  return maskObject({ target: targetName, steps });
}

async function run(recipe, config, opts = {}) {
  const dry = !!opts.dryRun;
  const targetName = recipe.target || 'prod';
  const t = resolveTarget(config, targetName);
  const results = [];
  for (const s of recipe.steps) {
    const k = s.step || s.type || s.kind || s;
    const start = Date.now();
    let status = 'skipped';
    let exitCode = 0;
    let stdoutTail = '';
    let stderrTail = '';
    let retries = 0;
    if (k === 'git-pull' || k === 'build' || k === 'pm2-reload' || k === 'deploy') {
      const cmds = getDeployCommands(config, t);
      if (!dry) {
        for (const c of cmds) {
          const wrapped = prefixSSH(t, c);
          try {
            const r = require('../lib/exec').shCapture(wrapped, {});
            stdoutTail = (stdoutTail + (r.stdout || '')).slice(-500);
            stderrTail = (stderrTail + (r.stderr || '')).slice(-500);
            exitCode = r.status || 0;
          } catch (e) {
            exitCode = 1;
            status = 'failed';
            stderrTail = (stderrTail + String(e.message || e)).slice(-500);
            break;
          }
        }
        if (status !== 'failed') status = 'ok';
      }
    } else if (k === 'healthcheck' || k === 'health') {
      if (!dry) {
        try { await check(config, { target: targetName }); status = 'ok'; }
        catch (e) { status = 'failed'; exitCode = 1; stderrTail = String(e.message || e).slice(-500); }
      }
    } else if (k === 'invalidate' || k === 'revalidate') {
      if (!dry) {
        try { await revalidate(config, { 'dry-run': false }); status = 'ok'; }
        catch (e) { status = 'failed'; exitCode = 1; stderrTail = String(e.message || e).slice(-500); }
      }
    } else {
      // noop
    }
    const ms = Date.now() - start;
    results.push({ name: k === 'deploy' ? 'deploy' : String(k), status: dry ? 'planned' : status, ms, exitCode, retries, stdoutTail, stderrTail });
  }
  return results;
}

module.exports = { plan, run };
