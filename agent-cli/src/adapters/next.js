function resolveRevalidate(config, recipe) {
  // Environment has highest priority
  const envEndpoint = process.env.NEXT_REVALIDATE_ENDPOINT || process.env.REVALIDATE_ENDPOINT;
  const envSecret = process.env.NEXT_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;
  const endpoint = envEndpoint || (config.revalidate && config.revalidate.endpoint) || '';
  const secret = envSecret || (config.revalidate && config.revalidate.secret) || '';
  const path = (recipe && recipe.revalidate && recipe.revalidate.path) || undefined;
  const slug = (recipe && recipe.revalidate && recipe.revalidate.slug) || undefined;
  return { endpoint, secret, path, slug };
}

module.exports = { resolveRevalidate };
