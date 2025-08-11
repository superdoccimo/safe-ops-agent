
const https = require('https');
const http = require('http');
const { URL } = require('url');

async function revalidate(config, flags) {
  const endpoint = config.revalidate && config.revalidate.endpoint;
  const secret = config.revalidate && config.revalidate.secret;
  if (!endpoint || !secret) throw new Error('revalidate.endpoint/secret not configured');

  const url = new URL(endpoint);
  url.searchParams.set('secret', secret);
  const body = {};
  if (flags.slug) body.slug = flags.slug;
  if (flags.path) body.path = flags.path;

  const payload = JSON.stringify(body);
  if (flags['dry-run']) {
    const { maskString, maskObject } = require('../lib/mask');
    console.log('[revalidate][dry-run] POST', maskString(String(url)), JSON.stringify(maskObject(JSON.parse(payload))));
    return;
  }
  const opts = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };

  const client = url.protocol === 'https:' ? https : http;
  await new Promise((resolve, reject) => {
    const req = client.request(url, opts, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[revalidate] OK ${res.statusCode} ${data}`);
          resolve();
        } else {
          reject(new Error(`[revalidate] ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { revalidate };
