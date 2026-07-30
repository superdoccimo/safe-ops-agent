const http = require('http');
const { URL } = require('node:url');
const fs = require('fs');
const path = require('path');
const { applyOps } = require('./lib/apply');
const { unifiedToOps } = require('./lib/patch');
const { getDeployCommands } = require('./commands/deploy');
const { check: hc } = require('./commands/check');
const { revalidate } = require('./commands/revalidate');
const { prefixSSH } = require('./lib/ssh');
const { shCapture } = require('./lib/exec');

const MAX_JSON_BODY_BYTES = 1024 * 1024;
const DEFAULT_LOG_LINES = 200;
const MAX_LOG_LINES = 1000;

function parseLogLines(value) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return DEFAULT_LOG_LINES;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    return DEFAULT_LOG_LINES;
  }
  return Math.min(Number(value), MAX_LOG_LINES);
}

function readJson(req, maxBytes = MAX_JSON_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    let settled = false;
    req.on('data', (c) => {
      if (settled) return;
      bytes += Buffer.byteLength(c);
      if (bytes > maxBytes) {
        settled = true;
        const error = new Error('request_body_too_large');
        error.statusCode = 413;
        reject(error);
        return;
      }
      data += c;
    });
    req.on('end', () => {
      if (settled) return;
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function isServerMutationAllowed(env = process.env) {
  return env.ALLOW_APPLY === 'true';
}

const isApplyAllowed = isServerMutationAllowed;

async function executeDeployRequest(config, targetName) {
  const t = (config.targets || {})[targetName];
  if (!t) throw new Error(`target not found: ${targetName}`);
  const cmds = getDeployCommands(config, t);
  const logs = [];
  for (const c of cmds) {
    const wrapped = prefixSSH(t, c);
    const { stdout = '', stderr = '' } = shCapture(wrapped, {});
    logs.push({ cmd: c, stdout, stderr });
  }
  return logs;
}

async function executeRevalidateRequest(config, body) {
  await revalidate(config, { slug: body.slug, path: body.path });
}

function writeMutationDenied(res) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'server_mutations_disabled' }));
}

function createRequestHandler(config, flags, dependencies = {}) {
  const uiDir = path.resolve(__dirname, 'ui');
  const serverEnv = dependencies.env || process.env;
  const deployRequest = dependencies.deployRequest || executeDeployRequest;
  const revalidateRequest = dependencies.revalidateRequest || executeRevalidateRequest;

  return async (req, res) => {
    try {
      const parsed = new URL(req.url, 'http://127.0.0.1');
      const p = parsed.pathname || '/';
      if (req.method === 'GET' && p === '/') {
        const indexPath = path.join(uiDir, 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (req.method === 'GET' && p === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === 'POST' && p === '/apply') {
        const body = await readJson(req);
        const allowApply = isServerMutationAllowed(serverEnv);
        const dryRun = allowApply ? !!body.dryRun : true; // Default to dry-run unless explicitly allowed
        const ops = body.ops || body;
        const summary = applyOps(ops, { dryRun });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, summary, dryRun }));
        return;
      }
      if (req.method === 'POST' && p === '/patch') {
        const body = await readJson(req);
        const text = body.patch || '';
        const ops = unifiedToOps(text, process.cwd());
        if (body.apply) {
          const allowApply = isServerMutationAllowed(serverEnv);
          const dryRun = allowApply ? !!body.dryRun : true; // Default to dry-run unless explicitly allowed
          const summary = applyOps(ops, { dryRun });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, summary, dryRun }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, ops }));
        }
        return;
      }
      if (req.method === 'POST' && p === '/deploy') {
        if (!isServerMutationAllowed(serverEnv)) {
          writeMutationDenied(res);
          return;
        }
        const targetName = parsed.searchParams.get('target') || 'prod';
        const logs = await deployRequest(config, targetName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, logs }));
        return;
      }
      if (req.method === 'POST' && p === '/check') {
        await hc(config, { target: parsed.searchParams.get('target') || 'prod', 'dry-run': !!flags['dry-run'] });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === 'POST' && p === '/revalidate') {
        if (!isServerMutationAllowed(serverEnv)) {
          writeMutationDenied(res);
          return;
        }
        const body = await readJson(req);
        await revalidateRequest(config, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (req.method === 'GET' && p === '/logs') {
        const targetName = parsed.searchParams.get('target') || 'prod';
        const t = (config.targets || {})[targetName];
        if (!t) throw new Error(`target not found: ${targetName}`);
        const pm2 = (config.deploy && config.deploy.pm2) || t.pm2 || 'all';
        const lines = parseLogLines(parsed.searchParams.get('lines'));
        const cmd = `bash -lc "tail -n ${lines} ~/.pm2/logs/${pm2}-out.log; echo '--- STDERR ---'; tail -n ${lines} ~/.pm2/logs/${pm2}-error.log"`;
        const wrapped = prefixSSH(t, cmd);
        const { stdout } = shCapture(wrapped, {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, logs: stdout }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'not_found' }));
    } catch (e) {
      const invalidRequestTarget = e && e.code === 'ERR_INVALID_URL';
      const statusCode = invalidRequestTarget ? 400 : (e.statusCode === 413 ? 413 : 500);
      const error = invalidRequestTarget
        ? 'invalid_request_target'
        : (statusCode === 413 ? 'request_body_too_large' : String(e.message || e));
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error }));
    }
  };
}

async function serve(config, flags, dependencies = {}) {
  const port = Number(flags.port || 8787);
  const server = http.createServer(createRequestHandler(config, flags, dependencies));

  server.listen(port, '127.0.0.1', () => {
    console.log(`[serve] listening on http://127.0.0.1:${port}`);
  });
}

module.exports = {
  serve,
  createRequestHandler,
  isApplyAllowed,
  isServerMutationAllowed,
  parseLogLines
};
