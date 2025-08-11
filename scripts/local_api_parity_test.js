const fs = require('fs');
const path = require('path');
const { applyOps } = require('../agent-cli/src/lib/apply');
const { unifiedToOps } = require('../agent-cli/src/lib/patch');

function writeLog(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data, 'utf8');
}

(async () => {
  const results = { ok: true, steps: [] };
  try {
    // 1) apply ok (dry-run)
    const opsOk = [
      { op: 'write', path: 'tmp/proof.txt', content: 'ok' },
      { op: 'mkdir', path: 'tmp/proofdir' },
      { op: 'delete', path: 'tmp/will-delete.txt' },
    ];
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync('tmp/will-delete.txt', 'x', 'utf8');
    const sumApplyOk = applyOps(opsOk, { dryRun: true });
    results.steps.push({ name: 'apply_ok_dryrun', summary: sumApplyOk });

    // 2) apply escape attempt (should throw)
    let applyEscaped;
    try {
      applyOps([{ op: 'write', path: '../../etc/passwd', content: 'no' }], { dryRun: true });
      applyEscaped = { ok: false, error: 'expected_error_missing' };
    } catch (e) {
      applyEscaped = { ok: true, error: String(e.message || e) };
    }
    results.steps.push({ name: 'apply_escape', result: applyEscaped });

    // 3) patch ok → ops → apply (dry-run)
    const udiffOk = [
      'diff --git a/tmp/u.txt b/tmp/u.txt',
      '--- a/tmp/u.txt',
      '+++ b/tmp/u.txt',
      '@@ -0,0 +1,2 @@',
      '+line1',
      '+line2',
    ].join('\n');
    const opsFromPatch = unifiedToOps(udiffOk, process.cwd());
    const sumPatchApply = applyOps(opsFromPatch, { dryRun: true });
    results.steps.push({ name: 'patch_ok_dryrun', opsCount: opsFromPatch.length, summary: sumPatchApply });

    // 4) patch escape attempt → apply should throw
    const udiffBad = [
      'diff --git a/../../etc/evil b/../../etc/evil',
      '--- a/../../etc/evil',
      '+++ b/../../etc/evil',
      '@@ -0,0 +1,1 @@',
      '+bad',
    ].join('\n');
    const opsFromBad = unifiedToOps(udiffBad, process.cwd());
    let patchEscaped;
    try {
      applyOps(opsFromBad, { dryRun: true });
      patchEscaped = { ok: false, error: 'expected_error_missing' };
    } catch (e) {
      patchEscaped = { ok: true, error: String(e.message || e) };
    }
    results.steps.push({ name: 'patch_escape', ops: opsFromBad, result: patchEscaped });

    writeLog('logs/api-parity.json', JSON.stringify(results, null, 2));
    const lines = [];
    lines.push('[PARITY] apply_ok_dryrun wrote=' + (sumApplyOk.wrote) + ' deleted=' + (sumApplyOk.deleted) + ' mkdir=' + (sumApplyOk.mkdir));
    lines.push('[PARITY] apply_escape blocked=' + applyEscaped.ok + ' msg=' + applyEscaped.error);
    lines.push('[PARITY] patch_ok_dryrun ops=' + (opsFromPatch.length) + ' wrote=' + (sumPatchApply.wrote));
    lines.push('[PARITY] patch_escape blocked=' + patchEscaped.ok + ' msg=' + patchEscaped.error);
    writeLog('logs/api-parity.txt', lines.join('\n') + '\n');
    console.log('Wrote logs/api-parity.json and logs/api-parity.txt');
  } catch (e) {
    results.ok = false;
    results.error = String(e.message || e);
    writeLog('logs/api-parity.json', JSON.stringify(results, null, 2));
    console.error('Failed parity test:', e);
    process.exit(1);
  }
})();

