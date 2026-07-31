function getOwnTarget(config, name) {
  const targets = config && config.targets;
  if (
    !targets
    || (typeof targets !== 'object' && typeof targets !== 'function')
    || !Object.prototype.hasOwnProperty.call(targets, name)
    || !targets[name]
  ) {
    return null;
  }
  return targets[name];
}

function resolveTarget(config, name) {
  const target = getOwnTarget(config, name);
  if (target) return target;

  const error = new Error('target_not_found');
  error.code = 'TARGET_NOT_FOUND';
  error.statusCode = 400;
  throw error;
}

module.exports = { getOwnTarget, resolveTarget };
