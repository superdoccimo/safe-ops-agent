function withStrapiDefaults(config) {
  const api = (config.strapi && config.strapi.api) || '';
  const token = (config.strapi && config.strapi.token) || '';
  return { api, token };
}

module.exports = { withStrapiDefaults };

