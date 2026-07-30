const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

function load(f){ return fs.readFileSync(path.resolve(__dirname, f), 'utf8'); }

function testPatch() {
  const { unifiedToOps } = require('../src/lib/patch');
  const cwd = path.resolve(__dirname, '..', '..');
  const diffNew = [
    'diff --git a/tmp/newfile.txt b/tmp/newfile.txt',
    '--- /dev/null',
    '+++ b/tmp/newfile.txt',
    '@@ -0,0 +1,1 @@',
    '+hello',
    ''
  ].join('\n');
  const opsNew = unifiedToOps(diffNew, cwd);
  assert.equal(opsNew[0].op, 'write');
  assert.equal(opsNew[0].path, 'tmp/newfile.txt');
  assert.ok(String(opsNew[0].content).includes('hello'));

  const diffDel = [
    'diff --git a/tmp/will-delete.txt b/tmp/will-delete.txt',
    '--- a/tmp/will-delete.txt',
    '+++ /dev/null',
    '@@ -1,1 +0,0 @@',
    '-bye',
    ''
  ].join('\n');
  const opsDel = unifiedToOps(diffDel, cwd);
  assert.equal(opsDel[0].op, 'delete');
  assert.equal(opsDel[0].path, 'tmp/will-delete.txt');

  const diffRename = [
    'diff --git a/tmp/old.txt b/tmp/newname.txt',
    '--- a/tmp/old.txt',
    '+++ b/tmp/newname.txt',
    ''
  ].join('\n');
  const opsRen = unifiedToOps(diffRename, cwd);
  assert.equal(opsRen[0].op, 'write');
  assert.equal(opsRen[0].path, 'tmp/newname.txt');
}

function testPatchSymlinkReadSafety() {
  const { unifiedToOps } = require('../src/lib/patch');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-ops-agent-patch-'));
  const workspace = path.join(fixtureRoot, 'workspace');
  const outside = path.join(fixtureRoot, 'outside');
  fs.mkdirSync(workspace);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'outside.txt'), 'synthetic outside content\n');
  fs.symlinkSync(outside, path.join(workspace, 'linked-outside'), 'dir');

  const diff = [
    'diff --git a/linked-outside/outside.txt b/linked-outside/outside.txt',
    '--- a/linked-outside/outside.txt',
    '+++ b/linked-outside/outside.txt',
    '@@ -1,1 +1,1 @@',
    '-synthetic outside content',
    '+changed',
    ''
  ].join('\n');

  try {
    assert.throws(
      () => unifiedToOps(diff, workspace),
      /outside workspace|symbolic link/i,
      'should reject patch reads through an in-workspace symlink to an outside file'
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function testApplySafety() {
  const { applyOps, safePath } = require('../src/lib/apply');
  const cwd = path.resolve(__dirname, '..', '..');
  const inside = applyOps(
    [{ op: 'write', path: 'tmp/inside.txt', content: 'x' }],
    { cwd, dryRun: true }
  );
  assert.equal(
    inside.wrote,
    1,
    'should allow a write inside a workspace nested below a broad user-home root'
  );
  if (process.platform !== 'win32' && fs.existsSync('/home')) {
    assert.throws(
      () => safePath('/home', '/home'),
      /system path/i,
      'should continue to reject the broad user-home root itself as a workspace target'
    );
  }
  let threw = false;
  try {
    applyOps([{ op: 'write', path: '../outside.txt', content: 'x' }], { cwd, dryRun: true });
  } catch (e) { threw = true; }
  assert.ok(threw, 'should refuse outside workspace');
}

function testApplySymlinkSafety() {
  const { applyOps } = require('../src/lib/apply');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-ops-agent-'));
  const workspace = path.join(fixtureRoot, 'workspace');
  const outside = path.join(fixtureRoot, 'outside');
  const inside = path.join(workspace, 'inside');
  const insideFile = path.join(inside, 'inside.txt');
  const escapedFile = path.join(outside, 'escaped.txt');
  fs.mkdirSync(workspace);
  fs.mkdirSync(outside);
  fs.mkdirSync(inside);
  fs.symlinkSync(inside, path.join(workspace, 'linked-inside'), 'dir');
  fs.symlinkSync(outside, path.join(workspace, 'linked-outside'), 'dir');

  try {
    applyOps(
      [{ op: 'write', path: 'linked-inside/inside.txt', content: 'inside' }],
      { cwd: workspace }
    );
    assert.equal(
      fs.readFileSync(insideFile, 'utf8'),
      'inside',
      'should preserve symbolic links that resolve inside the workspace'
    );
    assert.throws(
      () => applyOps(
        [{ op: 'write', path: 'linked-outside/escaped.txt', content: 'x' }],
        { cwd: workspace }
      ),
      /outside workspace|symbolic link/i,
      'should refuse an in-workspace symlink that targets outside the workspace'
    );
    assert.ok(
      !fs.existsSync(escapedFile),
      'a rejected symlink escape should not write outside the workspace'
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function testLogSymlinkSafety() {
  const { writeFileSafe } = require('../src/lib/log');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-ops-agent-log-'));
  const workspace = path.join(fixtureRoot, 'workspace');
  const outside = path.join(fixtureRoot, 'outside');
  const inside = path.join(workspace, 'inside');
  const previousCwd = process.cwd();
  fs.mkdirSync(workspace);
  fs.mkdirSync(outside);
  fs.mkdirSync(inside);
  fs.symlinkSync(inside, path.join(workspace, 'linked-inside'), 'dir');
  fs.symlinkSync(outside, path.join(workspace, 'linked-outside'), 'dir');

  try {
    process.chdir(workspace);
    writeFileSafe('linked-inside/inside.log', 'inside');
    assert.equal(
      fs.readFileSync(path.join(inside, 'inside.log'), 'utf8'),
      'inside',
      'should preserve log links that resolve inside the workspace'
    );
    assert.throws(
      () => writeFileSafe('linked-outside/escaped.log', 'outside'),
      /outside workspace|symbolic link/i,
      'should refuse a log symlink that targets outside the workspace'
    );
    assert.ok(
      !fs.existsSync(path.join(outside, 'escaped.log')),
      'a rejected log symlink should not write outside the workspace'
    );
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function testServerApplyAuthorization() {
  const {
    isApplyAllowed,
    isServerMutationAllowed,
    parseLogLines
  } = require('../src/server');

  assert.equal(
    isApplyAllowed({}),
    false,
    'should keep server apply disabled without trusted process configuration'
  );
  assert.equal(
    isApplyAllowed({ forceApply: true }),
    false,
    'should not let an untrusted request body grant apply permission'
  );
  assert.equal(
    isApplyAllowed({ ALLOW_APPLY: 'true' }),
    true,
    'should allow apply when trusted process configuration enables it'
  );
  assert.equal(
    isServerMutationAllowed({ ALLOW_APPLY: 'true' }),
    true,
    'should use the trusted apply opt-in for every server mutation'
  );
  assert.equal(parseLogLines(undefined), 200, 'should preserve the default log line count');
  assert.equal(parseLogLines('25'), 25, 'should accept a bounded positive integer');
  assert.equal(parseLogLines('0'), 200, 'should reject zero log lines');
  assert.equal(parseLogLines('-5'), 200, 'should reject negative log lines');
  assert.equal(parseLogLines('25extra'), 200, 'should reject partial integer input');
  assert.equal(parseLogLines('1000000'), 1000, 'should cap excessive log output');
}

async function invokeServerHandler(handler, { method, url, body = '', headers = {} }) {
  const { Readable } = require('stream');
  const req = Readable.from(body ? [body] : []);
  req.method = method;
  req.url = url;
  req.headers = headers;

  return new Promise((resolve, reject) => {
    const response = {
      statusCode: null,
      headers: null,
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers;
      },
      end(responseBody = '') {
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: responseBody
        });
      }
    };

    Promise.resolve(handler(req, response)).catch(reject);
  });
}

async function testServerMutationAuthorization() {
  const { createRequestHandler } = require('../src/server');
  let deployCalls = 0;
  let revalidateCalls = 0;
  const dependencies = {
    env: {},
    deployRequest: async () => {
      deployCalls += 1;
      return [];
    },
    revalidateRequest: async () => {
      revalidateCalls += 1;
    }
  };
  const handler = createRequestHandler({}, {}, dependencies);

  const deployDenied = await invokeServerHandler(handler, {
    method: 'POST',
    url: '/deploy?target=prod&ALLOW_APPLY=true',
    headers: { 'x-allow-apply': 'true' }
  });
  assert.equal(deployDenied.statusCode, 403);
  assert.deepEqual(
    JSON.parse(deployDenied.body),
    { ok: false, error: 'server_mutations_disabled' },
    'should return a bounded denial without deployment details'
  );
  assert.equal(deployCalls, 0, 'should not call the deployment implementation without trusted authorization');

  const revalidateDenied = await invokeServerHandler(handler, {
    method: 'POST',
    url: '/revalidate',
    body: JSON.stringify({ slug: 'synthetic', ALLOW_APPLY: 'true' })
  });
  assert.equal(revalidateDenied.statusCode, 403);
  assert.deepEqual(
    JSON.parse(revalidateDenied.body),
    { ok: false, error: 'server_mutations_disabled' },
    'should return a bounded denial without revalidation details'
  );
  assert.equal(revalidateCalls, 0, 'should not call the revalidation implementation without trusted authorization');

  const authorizedHandler = createRequestHandler({}, {}, {
    ...dependencies,
    env: { ALLOW_APPLY: 'true' }
  });
  const deployAllowed = await invokeServerHandler(authorizedHandler, {
    method: 'POST',
    url: '/deploy?target=synthetic'
  });
  const revalidateAllowed = await invokeServerHandler(authorizedHandler, {
    method: 'POST',
    url: '/revalidate',
    body: JSON.stringify({ path: '/synthetic' })
  });
  assert.equal(deployAllowed.statusCode, 200, 'should preserve explicitly authorized deployment behavior');
  assert.equal(revalidateAllowed.statusCode, 200, 'should preserve explicitly authorized revalidation behavior');
  assert.equal(deployCalls, 1);
  assert.equal(revalidateCalls, 1);
}

async function testServerUrlParsing() {
  const { createRequestHandler } = require('../src/server');
  const deployTargets = [];
  const handler = createRequestHandler({}, {}, {
    env: { ALLOW_APPLY: 'true' },
    deployRequest: async (_config, targetName) => {
      deployTargets.push(targetName);
      return [];
    }
  });

  const repeatedTarget = await invokeServerHandler(handler, {
    method: 'POST',
    url: '/deploy?target=first&target=second'
  });
  const blankTarget = await invokeServerHandler(handler, {
    method: 'POST',
    url: '/deploy?target='
  });

  assert.equal(repeatedTarget.statusCode, 200, 'should route a request with repeated query values');
  assert.equal(blankTarget.statusCode, 200, 'should route a request with a blank query value');
  assert.deepEqual(
    deployTargets,
    ['first', 'prod'],
    'should use the first repeated value and preserve the default for a blank value'
  );
}

async function testServerMalformedRequestTarget() {
  const { createRequestHandler } = require('../src/server');
  const handler = createRequestHandler({}, {}, {});

  const response = await invokeServerHandler(handler, {
    method: 'GET',
    url: 'http://['
  });

  assert.equal(response.statusCode, 400, 'should reject a malformed request target');
  assert.deepEqual(
    JSON.parse(response.body),
    { ok: false, error: 'invalid_request_target' },
    'should return a bounded error without reflecting the request target'
  );
}

async function testServerJsonBodyLimit() {
  const { createRequestHandler } = require('../src/server');
  const handler = createRequestHandler({}, {}, {
    env: { ALLOW_APPLY: 'true' },
    revalidateRequest: async () => {
      assert.fail('an oversized request body must not reach the mutation implementation');
    }
  });
  const oversizedBody = JSON.stringify({
    path: `/${'x'.repeat((1024 * 1024) + 1)}`
  });

  const response = await invokeServerHandler(handler, {
    method: 'POST',
    url: '/revalidate',
    body: oversizedBody
  });

  assert.equal(response.statusCode, 413, 'should reject an oversized JSON request body');
  assert.deepEqual(
    JSON.parse(response.body),
    { ok: false, error: 'request_body_too_large' },
    'should return a bounded error without reflecting request content'
  );
}

async function testServerMalformedJson() {
  const { createRequestHandler } = require('../src/server');
  const handler = createRequestHandler({}, {}, {});

  const response = await invokeServerHandler(handler, {
    method: 'POST',
    url: '/apply',
    body: '{"ops":'
  });

  assert.equal(response.statusCode, 400, 'should reject malformed JSON as a client error');
  assert.deepEqual(
    JSON.parse(response.body),
    { ok: false, error: 'invalid_json' },
    'should return a bounded error without parser details or request content'
  );
}

async function testServerLoopbackBinding() {
  const http = require('http');
  const originalCreateServer = http.createServer;
  const originalConsoleLog = console.log;
  let listenArgs;

  http.createServer = () => ({
    listen(...args) {
      listenArgs = args;
      const callback = args.find((arg) => typeof arg === 'function');
      if (callback) callback();
    }
  });
  console.log = () => {};

  try {
    const { serve } = require('../src/server');
    await serve({}, { port: 0 });
    assert.equal(
      listenArgs[1],
      '127.0.0.1',
      'should bind the local UI/API to loopback instead of every network interface'
    );
  } finally {
    http.createServer = originalCreateServer;
    console.log = originalConsoleLog;
  }
}


async function main() {
  console.log('Running tests...');
  testPatch();
  testPatchSymlinkReadSafety();
  testApplySafety();
  testApplySymlinkSafety();
  testLogSymlinkSafety();
  testServerApplyAuthorization();
  await testServerMutationAuthorization();
  await testServerUrlParsing();
  await testServerMalformedRequestTarget();
  await testServerJsonBodyLimit();
  await testServerMalformedJson();
  await testServerLoopbackBinding();
  console.log('OK');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
