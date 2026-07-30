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
  const { isApplyAllowed } = require('../src/server');

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
}


console.log('Running tests...');
testPatch();
testPatchSymlinkReadSafety();
testApplySafety();
testApplySymlinkSafety();
testLogSymlinkSafety();
testServerApplyAuthorization();
console.log('OK');
