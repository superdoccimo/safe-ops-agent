const { revalidate } = require('./revalidate');

async function invalidate(config, flags) {
  // alias to revalidate
  return revalidate(config, flags);
}

module.exports = { invalidate };

