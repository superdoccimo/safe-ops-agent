function withStrapiDefaults(config) {
  const api = (config.strapi && config.strapi.api) || '';
  const token = (config.strapi && config.strapi.token) || '';
  return { api, token };
}

function createStrapiEntry(data, options = {}) {
  // Force draft mode by removing publishedAt field
  // This ensures all Strapi entries are created as drafts for human review
  const safeData = { ...data };
  delete safeData.publishedAt;
  delete safeData.published_at;
  
  // Add explicit draft status
  safeData.publishedAt = null;
  
  return safeData;
}

module.exports = { withStrapiDefaults, createStrapiEntry };

