import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// 計測シナリオ定義
const scenarios = [
  { name: 'startup', command: 'node scripts/start-server.js', metric: 'time' },
  { name: 'api_latency', command: 'node scripts/api-test.js', metric: 'ms' },
  { name: 'content_gen', command: 'node scripts/content-gen.js', metric: 'sec' },
];

const results = {};
const timestamp = new Date().toISOString();

scenarios.forEach(s => {
  const start = process.hrtime.bigint();
  execSync(s.command, { stdio: 'inherit' });
  const end = process.hrtime.bigint();
  const diff = Number(end - start) / 1e6; // ms
  results[s.name] = diff;
});

fs.writeFileSync(
  path.join('results', `metrics-${timestamp}.json`),
  JSON.stringify({ timestamp, results }, null, 2)
);
console.log('計測完了:', results);
