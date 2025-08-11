#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseFlags(argv){
  const out = {};
  for (let i=0;i<argv.length;i++){
    const a = argv[i];
    if (a.startsWith('--')){
      const [k,v] = a.replace(/^--/,'').split('=');
      out[k] = v;
    }
  }
  return out;
}

function readJSON(p){
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf8'));
}

function avg(nums){
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a,b)=>a+Number(b||0),0)/nums.length)*100)/100;
}

function sum(nums){
  return nums.reduce((a,b)=>a+Number(b||0),0);
}

function renderTable(agg){
  const md = [];
  md.push('| 指標 | Codex CLI | Claude Code |');
  md.push('| --- | ---:| ---:|');
  md.push(`| ターン数(平均) | ${agg.codex.turns} | ${agg.claude.turns} |`);
  md.push(`| 所要時間(分, 平均) | ${agg.codex.minutes} | ${agg.claude.minutes} |`);
  md.push(`| 成功率(%, 平均) | ${agg.codex.successRate} | ${agg.claude.successRate} |`);
  md.push(`| 制限遭遇(合計) | ${agg.codex.limits} | ${agg.claude.limits} |`);
  return md.join('\n') + '\n';
}

function main(){
  const { inputs, output } = parseFlags(process.argv.slice(2));
  if (!inputs){
    console.error('Usage: node scripts/aggregate_metrics.js --inputs tmp/a.json,tmp/b.json [--output logs/comparison-aggregate.md]');
    process.exit(1);
  }
  const files = inputs.split(',').map(s=>s.trim()).filter(Boolean);
  const records = files.map(readJSON);
  const pick = (tool, key) => records.map(r => (r.tools && r.tools[tool] && r.tools[tool][key]) || 0);
  const agg = {
    codex: {
      turns: avg(pick('codex','turns')),
      minutes: avg(pick('codex','minutes')),
      successRate: avg(pick('codex','successRate')),
      limits: sum(pick('codex','limits'))
    },
    claude: {
      turns: avg(pick('claude','turns')),
      minutes: avg(pick('claude','minutes')),
      successRate: avg(pick('claude','successRate')),
      limits: sum(pick('claude','limits'))
    }
  };
  const out = renderTable(agg);
  if (output){
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, out, 'utf8');
    console.log(`Wrote ${output}`);
  } else {
    process.stdout.write(out);
  }
}

main();

