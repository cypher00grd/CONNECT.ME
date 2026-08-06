export const TECH_TAXONOMY = {
  javascript: { domain: 'frontend', frameworks: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nodejs', 'express'] },
  typescript: { domain: 'frontend', frameworks: ['react', 'angular', 'nextjs', 'nestjs', 'nodejs'] },
  python: { domain: 'backend', frameworks: ['django', 'flask', 'fastapi', 'pytorch', 'tensorflow', 'pandas'] },
  java: { domain: 'backend', frameworks: ['spring', 'spring boot', 'quarkus'] },
  go: { domain: 'backend', frameworks: ['gin', 'echo', 'fiber'] },
  rust: { domain: 'backend', frameworks: ['actix', 'rocket', 'tokio'] },
  react: { domain: 'frontend', frameworks: ['nextjs', 'redux', 'tailwind'] },
  nodejs: { domain: 'backend', frameworks: ['express', 'nestjs', 'mongodb', 'redis'] },
  mongodb: { domain: 'backend', frameworks: ['mongoose', 'nodejs', 'express'] },
  docker: { domain: 'devops', frameworks: ['github actions', 'ci-cd', 'render'] },
  kubernetes: { domain: 'devops', frameworks: ['docker', 'terraform', 'aws'] },
  auth: { domain: 'security', frameworks: ['jwt', 'oauth', 'session', 'csrf'] },
};

export const RELATED_TAGS = {
  react: ['nextjs', 'javascript', 'typescript', 'redux', 'frontend', 'tailwind'],
  nextjs: ['react', 'vercel', 'typescript', 'frontend', 'nodejs'],
  nodejs: ['express', 'nestjs', 'javascript', 'typescript', 'backend', 'mongodb'],
  express: ['nodejs', 'javascript', 'backend', 'api'],
  mongodb: ['mongoose', 'nosql', 'database', 'backend', 'nodejs'],
  redis: ['cache', 'queue', 'backend', 'nodejs'],
  docker: ['devops', 'ci-cd', 'deployment', 'render', 'kubernetes'],
  'github actions': ['ci-cd', 'devops', 'deployment'],
  stripe: ['payments', 'webhook', 'backend', 'nodejs'],
  jwt: ['auth', 'security', 'oauth', 'session'],
  auth: ['jwt', 'oauth', 'security', 'session'],
  python: ['django', 'fastapi', 'pandas', 'data_ml', 'backend'],
  django: ['python', 'backend', 'api'],
  fastapi: ['python', 'backend', 'api'],
  system_design: ['architecture', 'scalability', 'distributed-systems', 'backend'],
  dsa: ['algorithms', 'data-structures', 'leetcode'],
};

const normalizeTag = (tag) => (
  String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
);

export const normalizeTechTags = (tags = []) => (
  [...new Set(
    (Array.isArray(tags) ? tags : [tags])
      .map(normalizeTag)
      .filter(Boolean)
  )]
);

export const getDomainForTag = (tag) => {
  const normalized = normalizeTag(tag);
  return TECH_TAXONOMY[normalized]?.domain || normalized;
};

export const expandTechTags = (tags = []) => {
  const direct = normalizeTechTags(tags);
  const related = new Set();
  const domains = new Set();

  direct.forEach((tag) => {
    const taxonomy = TECH_TAXONOMY[tag];
    if (taxonomy?.domain) domains.add(taxonomy.domain);
    taxonomy?.frameworks?.forEach((framework) => related.add(normalizeTag(framework)));
    RELATED_TAGS[tag]?.forEach((relatedTag) => related.add(normalizeTag(relatedTag)));
  });

  direct.forEach((tag) => related.delete(tag));

  return {
    direct,
    related: [...related],
    domains: [...domains],
    all: [...new Set([...direct, ...related, ...domains])],
  };
};

export const getUserTechTags = (user = {}) => {
  const stack = user.techStack || {};
  return normalizeTechTags([
    ...(user.skills || []),
    ...(stack.languages || []),
    ...(stack.frameworks || []),
    ...(stack.tools || []),
    user.specialization,
  ]);
};

export const scoreTechMatch = (ticketTags = [], user = {}) => {
  const expanded = expandTechTags(ticketTags);
  const userTags = new Set(getUserTechTags(user));
  let score = 0;

  expanded.direct.forEach((tag) => {
    if (userTags.has(tag)) score += 100;
  });

  expanded.related.forEach((tag) => {
    if (userTags.has(tag)) score += 45;
  });

  expanded.domains.forEach((domain) => {
    if (userTags.has(domain)) score += 20;
  });

  score += Number(user.rating || 0) * 4;
  score += Math.min(Number(user.reputationPoints || 0) / 25, 20);
  score += Math.min(Number(user.reviewsCount || 0), 20);

  if (user.experienceLevel && ['senior', 'staff', 'principal', 'lead'].includes(user.experienceLevel)) {
    score += 10;
  }

  return score;
};
