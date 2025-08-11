function maskString(str, keys = ["secret", "token", "authorization"]) {
  if (!str) return str;
  let out = String(str);
  const rxKeys = keys.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const rx = new RegExp(`((?:${rxKeys.join('|')}))=([^&\s]+)`, 'gi');
  out = out.replace(rx, (_, k) => `${k}=***`);
  // Authorization header patterns
  out = out.replace(/(Authorization\s*:\s*)([^\r\n]+)/gi, (_, p1) => `${p1}***`);
  return out;
}

function maskObject(obj, keys = ["secret", "token", "authorization"]) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return maskString(obj, keys);
  if (Array.isArray(obj)) return obj.map(v => maskObject(v, keys));
  if (typeof obj === 'object') {
    const out = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      const isKeyMatch = keys.some(key => String(k).toLowerCase().includes(key.toLowerCase()));
      if (isKeyMatch && (typeof v === 'string' || typeof v === 'number' || v == null)) out[k] = '***';
      else if (typeof v === 'string') out[k] = maskString(v, keys);
      else out[k] = maskObject(v, keys);
    }
    return out;
  }
  return obj;
}

module.exports = { maskString, maskObject };

