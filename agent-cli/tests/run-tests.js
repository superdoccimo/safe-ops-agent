const assert = require('assert');
const path = require('path');
const fs = require('fs');

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


console.log('Running tests...');
testPatch();
testApplySafety();
console.log('OK');
