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

function testApplySafety() {
  const { applyOps } = require('../src/lib/apply');
  const cwd = path.resolve(__dirname, '..', '..');
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


console.log('Running tests...');
testPatch();
testApplySafety();
testApplySymlinkSafety();
console.log('OK');
