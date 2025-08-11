const { check } = require('./check');

async function health(config, flags) {
  // alias to check
  return check(config, flags);
}

module.exports = { health };

