#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseFlags(argv){
  const out = { _: [] };
  for (let i=0;i<argv.length;i++){
    const a = argv[i];
    if (a.startsWith('--')){
      const [k,v] = a.replace(/^--/,'').split('=');
      if (typeof v === 'undefined') { out[k] = argv[i+1]; i++; }
      else out[k] = v;
    } else out._.push(a);
  }
  return out;
}

function render(md){
  return md.join('\n') + '\n';
}

function main(){
  const flags = parseFlags(process.argv.slice(2));
  const input = flags.input || flags.i;
  const output = flags.output || flags.o;
  if (!input) {
    console.error('Usage: node scripts/metrics_to_md.js --input metrics.json [--output out.md]');
    process.exit(1);
  }
  const obj = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), input), 'utf8'));
  const tA = obj.tools.codex;
  const tB = obj.tools.claude;
  const title = obj.task || 'Untitled Task';

  const md = [];
  md.push(`### 実測: ${title}`);
  md.push('');
  md.push('| 指標 | Codex CLI | Claude Code |');
  md.push('| --- | ---:| ---:|');
  md.push(`| ターン数 | ${tA.turns ?? '-'} | ${tB.turns ?? '-'} |`);
  md.push(`| 所要時間(分) | ${tA.minutes ?? '-'} | ${tB.minutes ?? '-'} |`);
  md.push(`| 成功率(%) | ${tA.successRate ?? '-'} | ${tB.successRate ?? '-'} |`);
  md.push(`| 制限遭遇 | ${tA.limits ?? 0} | ${tB.limits ?? 0} |`);
  md.push('');
  md.push('- メモ（Codex）: ' + (tA.notes || '')); 
  md.push('- メモ（Claude）: ' + (tB.notes || ''));
  if (obj.logs && (obj.logs.codex || obj.logs.claude)){
    md.push(`- ログ: ${[obj.logs.codex, obj.logs.claude].filter(Boolean).join(', ')}`);
  }

  const outMd = render(md);
  if (output){
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, outMd, 'utf8');
    console.log(`Wrote ${output}`);
  } else {
    process.stdout.write(outMd);
  }
}

main();

