const fs = require('fs');
const path = require('path');

function read(file, fallback = '') {
  try { return fs.readFileSync(file, 'utf8'); } catch { return fallback; }
}

function stat(file){
  try { const s = fs.statSync(file); return { size: s.size, mtime: s.mtime }; } catch { return null; }
}

function listLogs(dir){
  try { return fs.readdirSync(dir).map(f => path.join(dir, f)); } catch { return []; }
}

function renderReport() {
  const out = [];
  out.push('# agent-cli 実行レポート');
  out.push('');

  const files = {
    help: 'logs/agent-help.txt',
    serve: 'logs/agent-serve-startup.txt',
    parity: 'logs/api-parity.txt',
    deploy: 'logs/deploy-dryrun.txt',
    check: 'logs/check-dryrun.txt',
    reval: 'logs/revalidate-plan.txt',
    aggregate: 'logs/comparison-aggregate.md'
  };

  out.push('## サマリ');
  out.push('- help/serve: 取得済み');
  if (stat(files.parity)) out.push('- /apply,/patch パリティ: 取得済み（外部パス拒否を確認）');
  if (stat(files.deploy)) out.push('- deploy/check: dry-run コマンド列を取得済み');
  if (stat(files.reval)) out.push('- revalidate: 送信プランを保存（実送信なし）');
  out.push('');

  out.push('## ログ一覧');
  for (const p of listLogs('logs')) {
    const s = stat(p); if (!s) continue;
    out.push(`- ${p} (${s.size} bytes)`);
  }
  out.push('');

  const parity = read(files.parity);
  if (parity) {
    out.push('## パリティ抜粋');
    out.push('```');
    out.push(parity.trim());
    out.push('```');
    out.push('');
  }

  const deploy = read(files.deploy);
  if (deploy) {
    out.push('## deploy (dry-run) 抜粋');
    out.push('```');
    out.push(deploy.trim());
    out.push('```');
    out.push('');
  }

  const check = read(files.check);
  if (check) {
    out.push('## check (dry-run) 抜粋');
    out.push('```');
    out.push(check.trim());
    out.push('```');
    out.push('');
  }

  const agg = read(files.aggregate);
  if (agg) {
    out.push('## 比較表（集計・暫定）');
    out.push(agg.trim());
    out.push('');
  }

  return out.join('\n');
}

async function report(config, flags){
  const md = renderReport();
  const outPath = flags.output || flags.o || 'REPORT.md';
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`wrote ${outPath}`);
}

module.exports = { report };

