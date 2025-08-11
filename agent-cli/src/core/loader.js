const fs = require('fs');
const path = require('path');

function parseMaybeYaml(text) {
  const t = String(text || '').trim();
  // Accept JSON (YAML superset) to avoid external deps
  if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t);
  // Extremely tiny YAML subset: key: value, steps as - item
  // This parser is intentionally minimal; prefer JSON-in-YAML examples.
  const lines = t.split(/\r?\n/);
  const root = {};
  let curKey = null;
  for (let raw of lines) {
    const line = raw.replace(/\t/g, '  ').trimEnd();
    if (!line || line.startsWith('#')) continue;
    if (/^\w[\w-]*:\s*(.*)$/.test(line)) {
      const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
      curKey = m[1];
      const val = m[2];
      if (val === '' || val === null) root[curKey] = [];
      else root[curKey] = val;
      continue;
    }
    if (line.startsWith('- ')) {
      if (!curKey) throw new Error('Invalid YAML: list item without key');
      const item = line.slice(2).trim();
      if (!Array.isArray(root[curKey])) root[curKey] = [];
      // allow simple scalars or step:kind
      if (/^\w[\w-]*$/.test(item)) root[curKey].push(item);
      else if (/^(\w[\w-]*):\s*(.*)$/.test(item)) {
        const mm = item.match(/^(\w[\w-]*):\s*(.*)$/);
        const obj = {}; obj[mm[1]] = mm[2];
        root[curKey].push(obj);
      } else {
        root[curKey].push(item);
      }
    }
  }
  return root;
}

function loadRecipe(recipePath) {
  const abs = path.resolve(process.cwd(), recipePath);
  if (!fs.existsSync(abs)) throw new Error(`recipe not found: ${recipePath}`);
  const text = fs.readFileSync(abs, 'utf8');
  const data = parseMaybeYaml(text);
  // Normalize structure
  const out = {
    name: data.name || path.basename(recipePath),
    target: data.target || 'default',
    steps: [],
    // carry selected top-level fields for adapters
    revalidate: data.revalidate || undefined
  };
  const steps = data.steps || [];
  for (const s of steps) {
    if (typeof s === 'string') out.steps.push({ step: s });
    else if (s && typeof s === 'object') out.steps.push({ ...s });
  }
  return out;
}

module.exports = { loadRecipe };
