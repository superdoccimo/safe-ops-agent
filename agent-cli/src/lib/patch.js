const fs = require('fs');
const path = require('path');

function stripPrefix(p){
  if (!p) return p;
  return p.replace(/^a\//,'').replace(/^b\//,'');
}

function parseUnifiedPatch(text){
  const lines = text.split(/\r?\n/);
  const files = [];
  let cur = null;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('diff --git ')) {
      if (cur) files.push(cur);
      cur = { a:null, b:null, hunks:[], newFile:false, deleted:false };
      i++; continue;
    }
    if (line.startsWith('--- ')) {
      const p = line.slice(4).trim();
      cur.a = p === '/dev/null' ? null : stripPrefix(p);
      if (p === '/dev/null') cur.newFile = true;
      i++; continue;
    }
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).trim();
      cur.b = p === '/dev/null' ? null : stripPrefix(p);
      if (p === '/dev/null') cur.deleted = true;
      i++; continue;
    }
    const m = line.match(/^@@\s+-([0-9]+)(?:,([0-9]+))?\s+\+([0-9]+)(?:,([0-9]+))?\s+@@/);
    if (m) {
      const h = { oldStart: parseInt(m[1],10)||1, oldCount: parseInt(m[2]||'0',10)||0, newStart: parseInt(m[3],10)||1, newCount: parseInt(m[4]||'0',10)||0, lines: [] };
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('diff --git ') || l.startsWith('--- ') || l.startsWith('@@ ')) break;
        if (l.startsWith(' ') || l.startsWith('+') || l.startsWith('-')) {
          h.lines.push({ tag: l[0], text: l.slice(1) });
        } else if (l.startsWith('\\ No newline at end of file')) {
          // ignore marker
        } else if (l.trim() === '') {
          // empty line is valid context: treat as space with empty text
          h.lines.push({ tag: ' ', text: '' });
        } else {
          // non-standard line; break hunk
          break;
        }
        i++;
      }
      cur.hunks.push(h);
      continue;
    }
    i++;
  }
  if (cur) files.push(cur);
  return files;
}

function applyHunksToContent(origText, hunks){
  const orig = origText.split(/\r?\n/);
  const out = [];
  let pos = 0; // index into orig
  for (const h of hunks) {
    const targetPos = Math.max(0, (h.oldStart||1) - 1);
    while (pos < targetPos) { out.push(orig[pos++] ?? ''); }
    for (const ln of h.lines) {
      if (ln.tag === ' ') {
        const cur = orig[pos++] ?? '';
        if (cur !== ln.text) throw new Error(`context mismatch around line ${pos}`);
        out.push(cur);
      } else if (ln.tag === '-') {
        const cur = orig[pos++] ?? '';
        if (cur !== ln.text) throw new Error(`deletion mismatch around line ${pos}`);
        // skip output
      } else if (ln.tag === '+') {
        out.push(ln.text);
      }
    }
  }
  while (pos < orig.length) out.push(orig[pos++]);
  // Normalize trailing newline handling: join with \n without forcing trailing \n
  // If the original ended with a trailing newline, maintain it when unchanged;
  // otherwise, rely on join() behavior (no trailing newline).
  return out.join('\n');
}

function unifiedToOps(text, cwd = process.cwd()){
  const files = parseUnifiedPatch(text);
  const ops = [];
  for (const f of files) {
    const a = f.a; const b = f.b;
    if (f.deleted && a && !b) {
      ops.push({ op: 'delete', path: a });
      continue;
    }
    if (f.newFile && b) {
      // Build new content from hunks: include ' ' and '+' lines
      const lines = [];
      for (const h of f.hunks) {
        for (const ln of h.lines) if (ln.tag === ' ' || ln.tag === '+') lines.push(ln.text);
      }
      ops.push({ op: 'write', path: b, content: lines.join('\n') });
      continue;
    }
    // Modified or renamed file
    const target = b || a;
    let content = '';
    const hasChange = (f.hunks||[]).some(h => (h.lines||[]).some(ln => ln.tag === '+' || ln.tag === '-'));
    if (hasChange) {
      const p = path.resolve(cwd, target);
      if (fs.existsSync(p)) {
        const orig = fs.readFileSync(p, 'utf8');
        content = applyHunksToContent(orig, f.hunks);
      } else {
        // If original file is missing, synthesize content from '+' and ' ' lines
        const lines = [];
        for (const h of f.hunks) {
          for (const ln of h.lines) if (ln.tag === ' ' || ln.tag === '+') lines.push(ln.text);
        }
        content = lines.join('\n');
      }
    } else if (a && b && a !== b) {
      // rename only (no changes)
      const srcPath = path.resolve(cwd, a);
      if (fs.existsSync(srcPath)) content = fs.readFileSync(srcPath, 'utf8');
      else content = '';
    } else {
      // no-op change; keep as-is
      const p = path.resolve(cwd, target);
      if (fs.existsSync(p)) content = fs.readFileSync(p, 'utf8');
      else content = '';
    }
    ops.push({ op: 'write', path: target, content });
    if (a && b && a !== b) ops.push({ op: 'delete', path: a });
  }
  return ops;
}

module.exports = { unifiedToOps };
