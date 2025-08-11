const fs = require('fs');
const path = require('path');

function loadConfig(){
  const p = path.resolve(process.cwd(), 'agent.config.json');
  if (!fs.existsSync(p)) throw new Error('agent.config.json not found in CWD');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main(){
  const cfg = loadConfig();
  const ep = cfg.revalidate && cfg.revalidate.endpoint;
  const sec = cfg.revalidate && cfg.revalidate.secret;
  if (!ep || !sec) throw new Error('revalidate.endpoint/secret not configured');
  const u = new URL(ep);
  u.searchParams.set('secret', sec);
  const body = { slug: 'hello-strapi' };
  const plan = {
    method: 'POST',
    url: u.toString(),
    headers: { 'Content-Type': 'application/json' },
    body,
    note: 'Preview only; do not execute in restricted environment.'
  };
  fs.mkdirSync('logs', { recursive: true });
  fs.writeFileSync('logs/revalidate-plan.json', JSON.stringify(plan, null, 2));
  fs.writeFileSync('logs/revalidate-plan.txt', `[revalidate-plan] POST ${plan.url} body=${JSON.stringify(body)}`);
}

main();

