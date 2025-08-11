
function q(s){ return `'${String(s).replace(/'/g, `'\''`)}'`; }
function escapeSh(s){ return s.replace(/(["$`\\])/g, '\\$1'); }

function prefixSSH(target, cmd) {
  if (!target) return cmd;
  const host = `${target.user || 'root'}@${target.host}`;
  const port = target.port ? `-p ${target.port}` : '';
  const id = target.identity ? `-i ${target.identity}` : '';
  const cwd = target.cwd ? `cd ${escapeSh(target.cwd)} && ` : '';
  const remote = `${cwd}${cmd}`;
  return `ssh ${port} ${id} ${host} ${q(remote)}`;
}

module.exports = { prefixSSH };
