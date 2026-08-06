export const TECH_CATEGORIES = [
  'frontend',
  'backend',
  'fullstack',
  'devops',
  'mobile',
  'data_ml',
  'system_design',
  'security',
  'dsa',
  'other'
];

const LEGACY_CATEGORIES = new Set([
  'singing',
  'travel',
  'gaming',
  'study',
  'coding',
  'music',
  'art',
  'fitness',
  'cooking'
]);

const CATEGORY_KEYWORDS = {
  frontend: ['frontend', 'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte', 'css', 'tailwind', 'html', 'ui'],
  backend: ['backend', 'node', 'nodejs', 'express', 'api', 'mongodb', 'mongoose', 'postgres', 'database', 'django', 'fastapi', 'spring'],
  fullstack: ['fullstack', 'full-stack', 'mern', 'next', 'nestjs'],
  devops: ['devops', 'docker', 'kubernetes', 'k8s', 'ci-cd', 'cicd', 'render', 'vercel', 'aws', 'terraform'],
  mobile: ['mobile', 'react-native', 'flutter', 'android', 'ios', 'swift', 'kotlin'],
  data_ml: ['data', 'ml', 'machine-learning', 'ai', 'python', 'pandas', 'tensorflow', 'pytorch'],
  system_design: ['system-design', 'architecture', 'scalability', 'distributed-systems'],
  security: ['security', 'auth', 'jwt', 'oauth', 'xss', 'csrf', 'vulnerability'],
  dsa: ['dsa', 'algorithm', 'algorithms', 'leetcode', 'data-structures']
};

export const normalizeCategory = (category) => {
  if (typeof category !== 'string') return 'other';

  const normalized = category.trim().toLowerCase();
  if (TECH_CATEGORIES.includes(normalized)) return normalized;
  if (LEGACY_CATEGORIES.has(normalized)) return 'other';

  return 'other';
};

export const inferCategoryFromTags = (tags = []) => {
  const normalizedTags = Array.isArray(tags)
    ? tags.map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : '')).filter(Boolean)
    : [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (normalizedTags.some((tag) => keywords.includes(tag))) {
      return category;
    }
  }

  return 'other';
};
